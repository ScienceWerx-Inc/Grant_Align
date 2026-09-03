import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAICompatible } from '@genkit-ai/compat-oai';

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
  process.env.AI_PROVIDER === 'mistral' ? 'mistral' : 'gemini';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

/** Sensible defaults per provider; both overridable by env. */
const PROVIDER_DEFAULTS: Record<AiProvider, { fast: string; writing: string }> = {
  // Flash for both by default: Pro frequently has no free-tier quota at all,
  // so defaulting to it makes scoring and the 1-pager the first things to break
  // on a free key. Point GENAI_WRITING_MODEL at Pro on a billed key.
  gemini: { fast: 'googleai/gemini-2.5-flash', writing: 'googleai/gemini-2.5-flash' },
  // Small handles the interview and extraction; the heavier scoring and
  // 1-pager prompts benefit from Medium, which is still on the free tier.
  mistral: { fast: 'mistral/mistral-small-latest', writing: 'mistral/mistral-medium-latest' },
};

const defaults = PROVIDER_DEFAULTS[AI_PROVIDER];

/** Used by prompts that don't name a model of their own. */
export const DEFAULT_MODEL = process.env.GENAI_MODEL || defaults.fast;

/** Reasoning-heavier calls: match scoring and the one-pager. */
export const WRITING_MODEL =
  process.env.GENAI_WRITING_MODEL || process.env.GENAI_MODEL || defaults.writing;

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
