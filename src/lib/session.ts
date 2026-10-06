/**
 * Shared session-cookie name.
 *
 * Lives in its own module with zero dependencies so it can be imported from
 * the edge middleware (which cannot bundle the Firebase Admin SDK).
 */
export const SESSION_COOKIE_NAME = '__session';
