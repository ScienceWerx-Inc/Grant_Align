/**
 * Firebase client SDK (browser + server-action REST use).
 *
 * Project: grant-align (us-east4 App Hosting backend `grant-align`).
 * All values come from the Firebase console:
 * Project settings > General > Your apps > Web app config.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

function clientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'grant-align',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/** Initialized lazily so a missing env var fails at use, not at import. */
export function firebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length ? getApp() : initializeApp(clientConfig());
  return app;
}

export function firebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(firebaseApp());
  return auth;
}

/** Firebase Web API key, needed by server actions for email/password auth. */
export function webApiKey(): string {
  const key =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? process.env.FIREBASE_WEB_API_KEY ?? '';
  if (!key) throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY is not set.');
  return key;
}
