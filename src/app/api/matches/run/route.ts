import { revalidatePath } from 'next/cache';
import { runMatches } from '@/lib/matching';
import { aiConfigured, AI_KEY_VAR } from '@/ai/providers';

export const maxDuration = 300;

/**
 * Runs the matching engine, streaming one NDJSON event per scored pair.
 *
 * A plain JSON response was wrong for this: scoring every pair takes minutes on
 * a rate-limited key, and the client could show nothing until the whole run
 * finished. Streaming gives the UI a real event per pair, so the progress it
 * reports is the actual state of the run rather than an animation pretending to
 * be one.
 *
 * Events are newline-delimited JSON:
 *   {"type":"start","total":n}
 *   {"type":"pair","index":i,"total":n,"outcome":{...}}
 *   {"type":"done","evaluated":n,"skipped":[...]}
 *   {"type":"error","error":"..."}
 */
export async function POST(request: Request) {
  if (!aiConfigured) {
    return Response.json({ error: `${AI_KEY_VAR} is not set, so the matching engine is unavailable.` }, { status: 503 });
  }

  const { seekerId, donorId } = (await request.json()) as { seekerId?: string; donorId?: string };
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        let announced = false;
        const outcomes = await runMatches({ seekerId, donorId }, progress => {
          // The total is only known once both sides have been loaded, which
          // happens inside runMatches - so the start event rides along with
          // the first progress callback rather than being sent up front.
          if (!announced) {
            announced = true;
            send({ type: 'start', total: progress.total });
          }
          send({ type: 'pair', index: progress.index, total: progress.total, outcome: progress.outcome });
        });

        if (!announced) send({ type: 'start', total: 0 });

        revalidatePath('/matches');
        if (seekerId) revalidatePath(`/seekers/${seekerId}`);
        if (donorId) revalidatePath(`/donors/${donorId}`);

        send({
          type: 'done',
          evaluated: outcomes.filter(o => !o.skippedReason).length,
          skipped: outcomes.filter(o => o.skippedReason),
        });
      } catch (err: any) {
        send({ type: 'error', error: err?.message ?? 'The matching run failed.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      // Proxies that buffer would defeat the point of streaming entirely.
      'x-accel-buffering': 'no',
    },
  });
}
