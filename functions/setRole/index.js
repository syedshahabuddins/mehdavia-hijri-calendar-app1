const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Callable function example: only users with master_admin custom claim can call this to promote/demote users.
exports.setRole = functions.https.onCall(async (data, context) => {
  if(!context.auth) throw new functions.https.HttpsError('unauthenticated','Must be signed in');
  // Only master admins can call
  const callerClaims = context.auth.token || {};
  if(!callerClaims.master_admin) throw new functions.https.HttpsError('permission-denied','Only master admins can set roles');

  const { uid, role } = data;
  if(!uid || !role) throw new functions.https.HttpsError('invalid-argument','Missing uid or role');

  // Validate role
  const allowed = ['user','admin','master_admin'];
  if(!allowed.includes(role)) throw new functions.https.HttpsError('invalid-argument','Invalid role');

  // Set custom claim
  const claims = {};
  if(role === 'master_admin') claims.master_admin = true;
  if(role === 'admin') claims.admin = true;

  try{
    await admin.auth().setCustomUserClaims(uid, claims);
    // Also update Firestore user doc's role field
    const db = admin.firestore();
    await db.collection('users').doc(uid).update({ role });
    return { success: true };
  }catch(err){
    throw new functions.https.HttpsError('internal','Error setting role: '+err.message);
  }
});
