/**
 * Firebase Admin SDK (server only) — Firestore + Auth.
 *
 * On Firebase App Hosting no key is needed: the backend's compute service
 * account (firebase-app-hosting-compute@) has roles/firebase.sdkAdminServiceAgent
 * and the SDK picks it up through Application Default Credentials.
 *
 * For local dev, use a service account for the `grant-align` project:
 * Project Settings > Service accounts > Generate new private key, then set
 *   FIREBASE_PROJECT_ID=grant-align
 *   FIREBASE_CLIENT_EMAIL=<service-account email>
 *   FIREBASE_PRIVATE_KEY="<private key, \\n newlines preserved>"
 * in .env (or run `gcloud auth application-default login` and leave them unset).
 */

import 'server-only';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { SESSION_COOKIE_NAME } from '@/lib/session';

export { SESSION_COOKIE_NAME };
/** 5 days, the maximum Firebase session cookie lifetime. */
const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

let app: App | null = null;

function adminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApp();
    return app;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'grant-align';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? '';
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
  if (!clientEmail || !rawKey) {
    // No explicit key: fall back to Application Default Credentials (App
    // Hosting's service account, or `gcloud auth application-default login`).
    app = initializeApp({ projectId });
    return app;
  }
  // Private keys are stored with literal \n in env vars; restore real newlines.
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
  app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  return app;
}

let db: Firestore | null = null;
let auth: Auth | null = null;

export function adminDb(): Firestore {
  if (db) return db;
  db = getFirestore(adminApp());
  // Ignore undefined fields so partial updates never throw.
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

export function adminAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(adminApp());
  return auth;
}

/** Mint a session cookie from a client-side Firebase ID token. */
export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

/** Verify the `__session` cookie; returns the Firebase uid + email. */
export async function verifySessionCookie(
  cookie: string,
): Promise<{ uid: string; email?: string }> {
  const decoded = await adminAuth().verifySessionCookie(cookie, true);
  return { uid: decoded.uid, email: decoded.email };
}
