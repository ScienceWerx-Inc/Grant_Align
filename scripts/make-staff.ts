/**
 * Grants the STAFF role to an existing account.
 *
 * STAFF can never be chosen at sign-up, so the first administrator has to be
 * made here; after that, staff can promote others on /staff/people.
 *
 *   npm run make-staff -- someone@sciencewerx.org
 *
 * The person signs up normally first. Uses the Firebase Admin credentials from
 * .env, or Application Default Credentials (`gcloud auth application-default
 * login`) when those are unset.
 */

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error('Usage: npm run make-staff -- <email>');
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'grant-align';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  initializeApp(
    clientEmail && privateKey
      ? { credential: cert({ projectId, clientEmail, privateKey }), projectId }
      : { projectId },
  );

  const user = await getAuth().getUserByEmail(email).catch(() => null);
  if (!user) {
    console.error(`No account for ${email}. Sign up at /signup first, then rerun.`);
    process.exit(1);
  }

  await getFirestore()
    .collection('users')
    .doc(user.uid)
    .set(
      {
        email,
        role: 'STAFF',
        // Staff see every organization; a membership would only confuse the nav.
        orgId: null,
        requestedOrgId: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  console.log(`${email} is now staff. Sign out and back in to pick up the new role.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
