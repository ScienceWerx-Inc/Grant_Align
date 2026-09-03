/**
 * Live web search on Mistral, via its Agents API.
 *
 * Mistral's plain chat completions cannot search, which left donor research
 * able to read only the funder's own site - useless for a foundation whose site
 * blocks scrapers or renders in JavaScript, and blind to the aggregators in
 * requirements section 4. The Agents API exposes a `web_search` connector that
 * closes exactly that gap, on the same key, with citations.
 *
 * This talks to the REST API directly rather than through Genkit: the Agents
 * API is a different surface from chat completions (agents and conversations,
 * not messages), and the OpenAI-compatibility layer Genkit uses does not reach
 * it. It is one fetch either way.
 *
 * The agent is created once and reused. Agents persist on the account, so
 * creating one per search would litter it with thousands of identical agents.
 */

import type { GroundedResearch, ResearchSource } from '@/ai/web-research';
import { withRetry } from '@/ai/retry';

const API = 'https://api.mistral.ai/v1';
const AGENT_NAME = 'grant-align-web-search';
const SEARCH_TIMEOUT_MS = 90_000;

const AGENT_INSTRUCTIONS = `You are a research assistant for a grant-matching service.

Search the live web and report what you find as plain notes. Name the source for every claim. Be exact about dates and dollar amounts, and never invent a deadline - if the sources do not give one, say so. Where sources disagree, say that too rather than picking one silently.`;

function headers(): Record<string, string> {
  return {
    authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
    'content-type': 'application/json',
  };
}

/**
 * Resolved once per process. The in-flight promise is cached rather than the
 * id, so concurrent donor refreshes at startup cannot each create an agent.
 */
let agentPromise: Promise<string> | null = null;

async function findOrCreateAgent(): Promise<string> {
  // An explicitly configured agent wins, so a deployment can pin one rather
  // than relying on lookup by name.
  const pinned = process.env.MISTRAL_SEARCH_AGENT_ID;
  if (pinned) return pinned;

  const list = await fetch(`${API}/agents?page_size=100`, { headers: headers() });
  if (list.ok) {
    const body = await list.json();
    const agents: any[] = Array.isArray(body) ? body : (body?.data ?? []);
    const existing = agents.find(agent => agent?.name === AGENT_NAME);
    if (existing?.id) return existing.id;
  }

  const created = await fetch(`${API}/agents`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: process.env.MISTRAL_SEARCH_MODEL || 'mistral-medium-latest',
      name: AGENT_NAME,
      description: 'Web research for donor giving criteria.',
      instructions: AGENT_INSTRUCTIONS,
      tools: [{ type: 'web_search' }],
    }),
  });
  if (!created.ok) {
    throw new Error(`Could not create the Mistral search agent: ${created.status} ${await created.text()}`);
  }
  const agent = await created.json();
  if (!agent?.id) throw new Error('Mistral returned no agent id.');
  return agent.id;
}

function agentId(): Promise<string> {
  if (!agentPromise) {
    agentPromise = findOrCreateAgent().catch(err => {
      // Don't cache a failure: a transient error at startup would otherwise
      // disable search for the lifetime of the process.
      agentPromise = null;
      throw err;
    });
  }
  return agentPromise;
}

/** Pulls the assistant text and its citations out of a conversation response. */
export function parseOutputs(outputs: any[]): { text: string; sources: ResearchSource[]; searched: boolean } {
  let text = '';
  const sources: ResearchSource[] = [];
  const seen = new Set<string>();

  // Mistral reports the connector call as its own output entry. Its presence is
  // the only reliable signal that the model actually searched rather than
  // answering from memory - the same distinction Gemini's groundingMetadata
  // draws, and the reason `grounded` can be trusted downstream.
  const searched = outputs.some(
    output => output?.type === 'tool.execution' && output?.name === 'web_search',
  );

  for (const output of outputs) {
    if (output?.type !== 'message.output') continue;
    const content = output.content;

    if (typeof content === 'string') {
      text += content;
      continue;
    }

    for (const chunk of Array.isArray(content) ? content : []) {
      if (chunk?.type === 'text' && typeof chunk.text === 'string') {
        text += chunk.text;
      } else if (chunk?.type === 'tool_reference') {
        const url: string | undefined = chunk.url;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        sources.push({ title: chunk.title || url, url });
      }
    }
  }

  return { text: text.trim(), sources: sources.slice(0, 8), searched };
}

/** Runs one web search and returns what it found as free text plus citations. */
export async function mistralWebSearch(prompt: string): Promise<GroundedResearch> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const id = await agentId();

    // This is a raw fetch rather than a Genkit call, so it does not pass
    // through the retry wrapper the flows get for free. Free-tier keys rate
    // limit readily and a 429 here would otherwise sink a whole donor refresh.
    const body = await withRetry('mistralWebSearch', async () => {
      const response = await fetch(`${API}/conversations`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ agent_id: id, inputs: prompt }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 200);
        const error: any = new Error(`Mistral web search failed: ${response.status} ${detail}`);
        // withRetry reads `status` to decide what is worth retrying.
        error.status = response.status;
        throw error;
      }

      return response.json();
    });
    const { text, sources, searched } = parseOutputs(body?.outputs ?? []);

    if (!searched) {
      // Answered without searching, so nothing here is verified. Labelling it
      // researched would put a citation-shaped badge on plain model recall.
      return {
        dossier: text,
        sources: [],
        grounded: false,
        groundingError: 'Mistral answered without running a web search, so nothing in this result is verified.',
      };
    }

    if (!text) {
      return {
        dossier: '',
        sources,
        grounded: false,
        groundingError: 'Mistral searched but returned an empty answer.',
      };
    }

    return { dossier: text, sources, grounded: true };
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return {
      dossier: '',
      sources: [],
      grounded: false,
      groundingError: aborted
        ? `Mistral web search timed out after ${SEARCH_TIMEOUT_MS / 1000}s.`
        : `Mistral web search failed: ${err?.message ?? err}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
