/*
  E2E test script for the Firebase Emulator environment.
  Steps:
  1. Create master admin user (syedshahabuddins@gmail.com) and a regular user (testuser@example.com)
  2. Sign in master admin via Auth emulator to obtain idToken
  3. Call the callable function `setRole` on the Functions emulator to promote testuser to admin
  4. Sign in as testuser and try to create an event in Firestore via REST with idToken (should be allowed if rules permit)

  Usage:
    node scripts/e2e-test.js

  Requires the Firebase emulators running at the default ports.
*/

const fetch = require('node-fetch');

const AUTH_EMULATOR = 'http://127.0.0.1:9099';
const FUNCTIONS_EMULATOR = 'http://127.0.0.1:5001';
const FIRESTORE_EMULATOR = 'http://127.0.0.1:8080';
const PROJECT_ID = 'demo-project';

async function signUp(email, password){
  const url = `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=owner`;
  const res = await fetch(url, {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({email, password, returnSecureToken: true})
  });
  const j = await res.json();
  if(j.error) throw new Error(JSON.stringify(j.error));
  return j; // contains idToken, localId
}

async function signIn(email, password){
  const url = `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=owner`;
  const res = await fetch(url, {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({email, password, returnSecureToken: true})
  });
  const j = await res.json();
  if(j.error) throw new Error(JSON.stringify(j.error));
  return j; // idToken, localId
}

async function callSetRole(idToken, uid, role){
  const url = `${FUNCTIONS_EMULATOR}/${PROJECT_ID}/us-central1/setRole`;
  const res = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({ data: { uid, role } })
  });
  const j = await res.json();
  return j;
}

async function createEventWithIdToken(idToken, docId, ownerId, title, date){
  const url = `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/events?documentId=${docId}`;
  const body = {
    fields: {
      title: { stringValue: title },
      date: { stringValue: date },
      ownerId: { stringValue: ownerId }
    }
  };
  const res = await fetch(url, { method: 'POST', headers: { 'content-type':'application/json', 'Authorization': `Bearer ${idToken}` }, body: JSON.stringify(body) });
  const j = await res.json();
  return j;
}

async function run(){
  console.log('Creating master admin and regular user in Auth emulator...');
  const masterEmail = 'syedshahabuddins@gmail.com';
  const masterPass = 'MasterPass123!';
  const userEmail = 'testuser@example.com';
  const userPass = 'UserPass123!';

  const master = await signUp(masterEmail, masterPass).catch(e=>{ console.warn('master signup:', e.message); return signIn(masterEmail, masterPass).catch(()=>{ throw e; }); });
  console.log('Master auth response:', master.localId || master.localId);
  const testuser = await signUp(userEmail, userPass).catch(e=>{ console.warn('testuser signup:', e.message); return signIn(userEmail, userPass).catch(()=>{ throw e; }); });
  console.log('Test user id:', testuser.localId);

  // Ensure Firestore user docs exist for setRole to update
  console.log('Creating Firestore user docs for master and testuser...');
  const userDoc = (uid, email)=>({ fields: { uid: { stringValue: uid }, email: { stringValue: email }, role: { stringValue: 'user' } } });
  await fetch(`${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?documentId=${master.localId}`, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(userDoc(master.localId, masterEmail)) }).catch(()=>{});
  await fetch(`${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?documentId=${testuser.localId}`, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(userDoc(testuser.localId, userEmail)) }).catch(()=>{});

  // Use Firebase Admin SDK pointing to the Auth emulator to set custom claims for master
  console.log('Setting master custom claim via firebase-admin (emulator)');
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const admin = require('firebase-admin');
  try{
    admin.initializeApp({ projectId: PROJECT_ID });
  }catch(e){}
  await admin.auth().setCustomUserClaims(master.localId, { master_admin: true });
  console.log('master custom claim set');

  // Refresh master's idToken by signing in again
  const masterSignIn = await signIn(masterEmail, masterPass);
  const masterIdToken = masterSignIn.idToken;

  // Promote testuser to admin by calling the setRole function with master's fresh idToken
  console.log('Calling setRole as master...');
  const promoteRes = await callSetRole(masterIdToken, testuser.localId, 'admin');
  console.log('setRole response:', promoteRes);

  // Now sign in as testuser (to get idToken) and create an event via Firestore REST
  const signInResp = await signIn(userEmail, userPass);
  console.log('testuser signed in, idToken length:', (signInResp.idToken||'').length);

  const docId = 'evt-' + Math.floor(Date.now()/1000);
  const createEventRes = await createEventWithIdToken(signInResp.idToken, docId, testuser.localId, 'E2E Test Event', '2025-12-01');
  console.log('create event response:', createEventRes);

  console.log('E2E script finished. Check Emulator UI at http://127.0.0.1:4000 to inspect data.');
}

run().catch(err=>{ console.error('E2E error:', err); process.exit(1); });
