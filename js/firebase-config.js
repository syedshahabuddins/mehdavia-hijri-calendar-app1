// Copy of firebase-config.example but auto-configures the emulator when run locally.
window.firebaseConfig = window.firebaseConfig || {
  apiKey: "demo",
  authDomain: "demo",
  projectId: "demo-project",
  storageBucket: "demo",
  messagingSenderId: "demo",
  appId: "demo"
};

if (typeof firebase !== 'undefined') {
  firebase.initializeApp(window.firebaseConfig);

  // If running locally with the emulator, point SDKs to the emulator endpoints.
  try{
    // Detect likely local environment
    const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    if(isLocal){
      // Auth emulator
      firebase.auth().useEmulator('http://127.0.0.1:9099/');
      // Firestore emulator
      firebase.firestore().useEmulator('127.0.0.1', 8080);
      // Functions emulator
      firebase.functions().useEmulator('127.0.0.1', 5001);
      console.log('Using Firebase Emulators for Auth/Firestore/Functions');
    }
  }catch(e){ console.warn('Emulator setup failed', e); }
}
