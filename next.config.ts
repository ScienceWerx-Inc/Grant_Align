import type { NextConfig } from 'next';

/*
 * Node 24+ exposes a `localStorage` global. Without --localstorage-file it is
 * an object with no methods: `typeof localStorage` is "object", but
 * `localStorage.getItem` is undefined.
 *
 * Next 15.3's dev overlay feature-detects with a typeof check, passes, and
 * then throws `localStorage.getItem is not a function` while server-rendering
 * the HTML document - so on Node 24+ every page that renders a document 500s
 * in development. The RSC payload is unaffected, which is what makes it look
 * like a routing problem rather than a Node one.
 *
 * Nothing in this application uses browser storage: sessions are cookies via
 * @supabase/ssr, and all data is Postgres through Prisma. So the global has no
 * legitimate reader here and removing it is safe.
 *
 * Done here rather than through NODE_OPTIONS=--no-experimental-webstorage
 * because next.config is loaded by the server process on every platform,
 * whereas an inline env var in an npm script does not work under cmd.exe.
 */
if (typeof globalThis.localStorage === 'object' && typeof globalThis.localStorage?.getItem !== 'function') {
  // @ts-expect-error - removing a global Node defines but did not finish wiring up.
  delete globalThis.localStorage;
  // @ts-expect-error - same for its sibling.
  delete globalThis.sessionStorage;
}

const nextConfig: NextConfig = {
  // Genkit pulls in optional Node-only transports (OpenTelemetry exporters,
  // handlebars) that webpack tries to statically resolve inside route bundles.
  // Keeping them external leaves them as plain Node requires at runtime.
  serverExternalPackages: ['genkit', '@genkit-ai/google-genai', 'handlebars'],
};

export default nextConfig;
