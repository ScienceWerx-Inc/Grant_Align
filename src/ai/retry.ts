/**
 * Retry wrapper for model calls that hit a rate limit.
 *
 * Free-tier Gemini keys allow only a handful of requests per minute, and the
 * matching engine walks every seeker/donor pair in sequence. Without this, a
 * demo run gets a few pairs in and then fills the rest of the table with
 * "Scoring failed" - which looks like a broken product rather than a quota
 * ceiling.
 *
 * Only 429s and 503s are retried. Everything else - a bad prompt, a schema
 * mismatch, an invalid key - fails immediately, because retrying those wastes
 * the very quota this is protecting.
 *
 * A quota with a limit of ZERO is also not retried: no amount of waiting adds
 * headroom to a project that has none, so it fails fast with a message saying
 * so rather than after four pointless minutes of backoff.
 */

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 12_000;

function status(err: any): number | null {
  const message = String(err?.message ?? err);
  if (err?.status === 429 || /RESOURCE_EXHAUSTED|\[429\b/.test(message)) return 429;
  if (err?.status === 503 || /UNAVAILABLE|\[503\b/.test(message)) return 503;
  return null;
}

/** True when the project has no quota at all, as opposed to being throttled. */
function quotaIsZero(err: any): boolean {
  return /"quota_limit_value":\s*"0"/.test(String(err?.message ?? err));
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const code = status(err);

      if (code === 429 && quotaIsZero(err)) {
        throw new Error(
          `${label}: this API key's project has a generation quota of zero, so no request will ever succeed. ` +
            'Enable billing on the project, or use a key from a project with free-tier quota.',
        );
      }
      if (code === null || attempt === MAX_ATTEMPTS) throw err;

      // Linear rather than exponential: per-minute limits refill on a fixed
      // schedule, so waiting a minute total beats waiting sixteen.
      const delay = BASE_DELAY_MS * attempt;
      console.warn(
        `[retry] ${label}: ${code}, waiting ${delay / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}
