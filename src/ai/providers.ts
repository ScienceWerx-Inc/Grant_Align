import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Single Genkit instance for the app. Flows ask for `googleai/*` model refs, so
 * the Google AI plugin has to be registered for those refs to resolve at all.
 */

/** Used by prompts that don't name a model of their own. */
export const DEFAULT_MODEL = 'googleai/gemini-2.5-flash';

/** Reasoning-heavier calls: match scoring and the one-pager. */
export const WRITING_MODEL = 'googleai/gemini-2.5-pro';

const GENAI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export const ai = genkit({
  plugins: [googleAI({ apiKey: GENAI_API_KEY })],
  // Genkit has no implicit default model; without this, any prompt that omits
  // `model:` throws "Must supply a `model` to `generate()` calls".
  model: DEFAULT_MODEL,
});

export const aiConfigured = Boolean(GENAI_API_KEY);
