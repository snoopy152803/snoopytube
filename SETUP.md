# Setting up Google sign-in (owner only)

Visitors don't need any of this — it's what the site owner does once so that
**Connect YouTube** works. Everything is free.

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
   (Analytics off is fine)
2. Project overview → **</> Add app (Web)** → register → copy the `firebaseConfig`
   values into `js/firebase-config.js`
3. Build → **Authentication** → Get started → Sign-in method → **Google** → Enable
4. Authentication → Settings → **Authorized domains** → add your site's domain
   (`localhost` is already allowed)
5. Same project in [console.cloud.google.com](https://console.cloud.google.com) →
   APIs & Services → Library → **YouTube Data API v3** → **Enable**, then wait 2–3
   minutes. Check the project picker is on the right project.
6. APIs & Services → **OAuth consent screen**
   - *Data access* → add the scope `https://www.googleapis.com/auth/youtube.force-ssl`
   - *Audience* → **Publish app** (production). In *Testing* mode every consent
     expires after 7 days; in production it doesn't.

## About the "Google hasn't verified this app" screen

It appears for any app requesting YouTube access that Google hasn't formally
reviewed. Users click **Advanced** → **Go to …(unsafe)** once. Removing it requires
Google's verification process: a privacy policy on a domain you own, branding, a
written scope justification and a demo video, reviewed by a person at Google
(they quote 3–5 business days). Unverified apps are capped at 100 users total.

## Why does YouTube need reconnecting sometimes?

Google access tokens last about an hour — that's Google's rule, not something the
app chooses. SnoopyTube keeps the token in localStorage so closing the tab doesn't
lose it, and when one does run out a **Reconnect** button appears in the header.
Whatever you were doing (the like or subscribe) is replayed once you reconnect.

## Is the Firebase config secret?

No. A Firebase **web** config identifies the project and is designed to ship in
client-side code — the app cannot authenticate without it. What protects it is the
**Authorized domains** list, which stops the config working from anyone else's site.
The things you must never commit are *service account* keys and OAuth **client
secrets**; this project uses neither.
