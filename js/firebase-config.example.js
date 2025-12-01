/*
  Copy this file to `js/firebase-config.js` and fill with your Firebase project's config.

  Example usage:
  1. Create a Firebase project at https://console.firebase.google.com
  2. Enable Authentication -> Sign-in methods -> Google
  3. Create a Firestore database (in test mode to start)
  4. Copy your project's config below and save as `js/firebase-config.js`

  Then open the app in a browser.
*/

// Replace the placeholder values with your project's config
window.firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// Initialize Firebase (compat). The index.html includes Firebase SDKs.
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(window.firebaseConfig);
}
