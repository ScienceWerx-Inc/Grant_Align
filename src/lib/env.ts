/**
 * Reads an environment variable as the value someone meant to set.
 *
 * Values copied out of a .env file into a hosting console tend to keep their
 * quotes: `"mistral"` instead of `mistral`. That fails silently and badly - a
 * quoted AI_PROVIDER fell through to the other provider, and a quoted API key
 * is rejected as invalid - so surrounding quotes and whitespace are stripped.
 */
export function env(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const value = raw.trim().replace(/^(['"])([\s\S]*)\1$/, '$2').trim();
  return value === '' ? undefined : value;
}
