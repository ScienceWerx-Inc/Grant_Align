import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAICompatible } from '@genkit-ai/compat-oai';
import { env } from '@/lib/env';

/**
 * Single Genkit instance for the app, backed by whichever provider is
 * configured.
 *
 * Two providers are supported because Gemini quota is not always available:
 * a Google Cloud project with no billing and no free-tier grant returns
 * `quota_limit_value: 0` on every GenerateContent call, in every region, with a
 * perfectly valid API key. Mistral's free tier is the fallback that keeps the
 * app demonstrable in that situation.
 *
 * Mistral is reached through the official OpenAI-compatibility plugin rather
 * than a community Mistral plugin: `genkitx-mistral` is pinned to the Genkit
 * 0.9/1.0 era, while `@genkit-ai/compat-oai` tracks the same 1.42 line as the
 * rest of this project.
 *
 * Both providers can search the live web, by different routes: Gemini attaches
 * Google Search as a tool to an ordinary generate call, while Mistral needs its
 * separate Agents API. src/ai/web-research.ts dispatches between them, so the
 * research pipeline behaves the same either way.
 */

export type AiProvider = 'gemini' | 'mistral';

export const AI_PROVIDER: AiProvider =
  env('AI_PROVIDER')?.toLowerCase() === 'mistral' ? 'mistral' : 'gemini';

const GEMINI_API_KEY = env('GEMINI_API_KEY') || env('GOOGLE_API_KEY');
export const MISTRAL_API_KEY = env('MISTRAL_API_KEY');

/** Sensible defaults per provider; both overridable by env. */
const PROVIDER_DEFAULTS: Record<AiProvider, { fast: string; writing: string }> = {
  // Flash for both by default: Pro frequently has no free-tier quota at all,
  // so defaulting to it makes scoring and the 1-pager the first things to break
  // on a free key. Point GENAI_WRITING_MODEL at Pro on a billed key.
  // Gemini goes through the fallback chain defined below, not one model.
  gemini: { fast: 'grantalign/text', writing: 'grantalign/text' },
  // Small handles the interview and extraction; the heavier scoring and
  // 1-pager prompts benefit from Medium, which is still on the free tier.
  mistral: { fast: 'mistral/mistral-small-latest', writing: 'mistral/mistral-medium-latest' },
};

const defaults = PROVIDER_DEFAULTS[AI_PROVIDER];

/** Used by prompts that don't name a model of their own. */
export const DEFAULT_MODEL = env('GENAI_MODEL') || defaults.fast;

/** Reasoning-heavier calls: match scoring and the one-pager. */
export const WRITING_MODEL =
  env('GENAI_WRITING_MODEL') || env('GENAI_MODEL') || defaults.writing;

export const ai = genkit({
  plugins:
    AI_PROVIDER === 'mistral'
      ? [
          openAICompatible({
            name: 'mistral',
            apiKey: MISTRAL_API_KEY,
            baseURL: 'https://api.mistral.ai/v1',
          }),
        ]
      : [googleAI({ apiKey: GEMINI_API_KEY })],
  // Genkit has no implicit default model; without this, any prompt that omits
  // `model:` throws "Must supply a `model` to `generate()` calls".
  model: DEFAULT_MODEL,
});

/** Whether the configured provider has a usable key. */
export const aiConfigured = Boolean(AI_PROVIDER === 'mistral' ? MISTRAL_API_KEY : GEMINI_API_KEY);

/** Name of the env var the configured provider needs, for error messages. */
export const AI_KEY_VAR = AI_PROVIDER === 'mistral' ? 'MISTRAL_API_KEY' : 'GEMINI_API_KEY';

/**
 * Whether the configured provider can search the live web.
 *
 * Gemini does it inside a normal generate call, with Search attached as a tool.
 * Mistral cannot do it there at all, but exposes the same capability through
 * its Agents API - see src/ai/search-mistral.ts. Both routes are real search
 * with citations, so donor research works on either provider.
 */
export const supportsWebSearch = AI_PROVIDER === 'gemini' || AI_PROVIDER === 'mistral';

// ── grantalign/text: one model over a chain of real Gemini models ────────────
//
// The free tier allows about 20 requests per model per day, and Google retires
// models from under new keys (2.5 Flash now answers a 404). Each model has its
// own daily quota, so instead of failing when one runs out, the request moves
// to the next model in the chain. Tools (Google Search), output schemas and
// config pass straight through, so the flows cannot tell the difference.
//
//   GENAI_TEXT_MODELS  comma-separated chain, in order (default below).
//
// A 503 ("high demand") gets one retry on the same model; a retired model, an
// exhausted quota or a model that stays busy moves on to the next.

export const TEXT_MODEL_CHAIN = (env('GENAI_TEXT_MODELS') || 'gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.8-flash,gemini-flash-latest')
  .split(',')
  .map(m => m.trim().replace(/^googleai\//, ''))
  .filter(Boolean);

const MOVE_ON = new Set(['NOT_FOUND', 'RESOURCE_EXHAUSTED', 'PERMISSION_DENIED', 'UNIMPLEMENTED']);
const RETRY_SAME = new Set(['UNAVAILABLE', 'DEADLINE_EXCEEDED', 'INTERNAL', 'ABORTED']);
const statusOf = (err: unknown) => String((err as { status?: string })?.status ?? '');
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

if (AI_PROVIDER === 'gemini') {
  ai.defineModel(
    {
      name: 'grantalign/text',
      label: 'Gemini with fallback',
      supports: { multiturn: true, tools: true, media: true, systemRole: true, constrained: 'all', output: ['text', 'json'] },
    },
    async request => {
      let lastError: unknown;
      for (const name of TEXT_MODEL_CHAIN) {
        const model = await ai.registry.lookupAction(`/model/googleai/${name}`);
        if (!model) continue;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            return (await model(request)) as never;
          } catch (err) {
            lastError = err;
            const status = statusOf(err);
            if (MOVE_ON.has(status) || !RETRY_SAME.has(status)) break;
            await pause(500 + Math.random() * 500);
          }
        }
        const status = statusOf(lastError);
        // Anything other than "this model can't serve you" is a real error
        // (bad prompt, schema mismatch): surface it rather than try the rest.
        if (!MOVE_ON.has(status) && !RETRY_SAME.has(status)) throw lastError;
        console.warn(`[ai] ${name} unavailable (${status}), trying the next model`);
      }
      throw lastError ?? new Error('No Gemini model is configured (GENAI_TEXT_MODELS).');
    },
  );
}
