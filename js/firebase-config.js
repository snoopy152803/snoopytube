// firebase-config.js — Your Firebase project's web config. Paste it in and Google
// sign-in turns on. (This config is meant to be public — it identifies the project,
// it isn't a secret. Access is controlled by the Firebase console settings below.)
//
// SETUP (about 10 minutes, all in the browser):
//  1. https://console.firebase.google.com → Add project (any name, Analytics off is fine)
//  2. Project overview → </> Add app (Web) → register → copy the firebaseConfig values here
//  3. Build → Authentication → Get started → Sign-in method → Google → Enable → Save
//  4. Authentication → Settings → Authorized domains → Add "snoopytube.vercel.app"
//     (localhost is already allowed)
//  5. Open the same project at https://console.cloud.google.com →
//     APIs & Services → Library → "YouTube Data API v3" → Enable
//  6. APIs & Services → OAuth consent screen → Audience: add your Google account as a
//     test user (while the app is in "Testing" mode only listed users can sign in)
//     → Data access: add scope  https://www.googleapis.com/auth/youtube.force-ssl
//
// Leave apiKey empty and the Sign in button explains these steps instead.

const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
};
