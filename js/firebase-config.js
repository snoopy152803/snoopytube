// firebase-config.js — Firebase web config for Google sign-in.
//
// A Firebase web config is public by design: the app can't authenticate without it,
// and it only works from the domains listed under Authentication → Settings →
// Authorized domains. No secrets here. Setup steps: see SETUP.md.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA8ng8duYMQ2j17NRq4LycSydgKTUq8v-M",
  authDomain: "snoopytube152803.firebaseapp.com",
  projectId: "snoopytube152803",
  storageBucket: "snoopytube152803.firebasestorage.app",
  messagingSenderId: "90167556283",
  appId: "1:90167556283:web:ec56bf9df52eba5449d19e",
  measurementId: "G-VQX35T3Z3C",
};

// The OAuth client Firebase created for this project. Public, like the config above.
// Used to refresh the YouTube token in the background so you aren't asked to
// reconnect every hour. For that to work, this site's address must be listed under
// the client's "Authorized JavaScript origins" — see SETUP.md.
const OAUTH_CLIENT_ID = "90167556283-6252hkhhkd59p6rkhtku33u9bhcet5gs.apps.googleusercontent.com";
