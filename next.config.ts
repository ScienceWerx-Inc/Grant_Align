import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Genkit pulls in optional Node-only transports (OpenTelemetry exporters,
  // handlebars) that webpack tries to statically resolve inside route bundles.
  // Keeping them external leaves them as plain Node requires at runtime.
  serverExternalPackages: ['genkit', '@genkit-ai/google-genai', 'handlebars'],
};

export default nextConfig;
