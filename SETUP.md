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

## Silent token refresh (one console step)

Google access tokens last about an hour. SnoopyTube refreshes them in the background
with Google Identity Services so nobody has to keep clicking Reconnect — but Google
only allows that from origins you've listed on the OAuth client.

1. [Google Cloud → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Under **OAuth 2.0 Client IDs**, open the **Web client (auto created by Google Service)**
3. Under **Authorized JavaScript origins**, add:
   - `https://snoopytube.vercel.app`
   - `http://localhost:8765` (only if you run it locally)
4. **Save**, then wait a few minutes — Google is slow to apply this one

Until that's done everything still works; the token just can't refresh silently, so
the **Reconnect** button appears when one expires. The app detects the origin
rejection and stops retrying rather than looping.

Whatever you were doing (a like or subscribe) is replayed once the token comes back,
whether that was silent or via the button.

## Is the Firebase config secret?

No. A Firebase **web** config identifies the project and is designed to ship in
client-side code — the app cannot authenticate without it. What protects it is the
**Authorized domains** list, which stops the config working from anyone else's site.
The things you must never commit are *service account* keys and OAuth **client
secrets**; this project uses neither.

## Locking Kids mode (Vercel Blob)

Kids mode is enforced by the server, not the browser: `api/kids.js` keeps the on/off
state against a household id in an **HttpOnly** cookie (page JavaScript can't read or
change it), and `api/search.js` applies Restricted Mode and the word filter based on
that, whatever the page asks for. Turning it off needs the PIN, checked on the server,
and the PIN is stored only as a scrypt hash.

That state needs somewhere to live:

* **Locally (`node dev.js`)** — a JSON file in your temp folder. Nothing to set up.
* **On Vercel** — a Blob store:
  1. Vercel dashboard → project → **Storage** → **Create Database** → **Blob**
  2. **Access: Private.** Public blobs are readable by anyone with the URL, and this
     record holds the PIN hash. *The access mode cannot be changed later.*
  3. **Connect to Project** → **Redeploy** (env vars only reach new deployments).

The read-write token checkbox is optional: inside Vercel Functions the SDK
authenticates with OIDC using `BLOB_STORE_ID`, which connecting adds for you. Tick it
only if you want to run against the real store from your own machine.

Creating the store does not switch Kids mode on for anyone. Kids mode is per browser
and starts off; the store only makes the choice stick.

Without the token in production the lock falls back to being per-request only, so
create the store before relying on it.

### Built-in videos only

The strongest setting. Word filters reduce what gets through but can't eliminate it —
a search for "horror movie kills" still surfaced titles like "Michael Myers not so
heartless after all?" that contain no blocked word. Switching to built-in videos only
removes that whole class of problem: `api/search.js` returns nothing for the
household, so no YouTube result can reach the page regardless of what it asks for.

The trade is real: no live search, and no adding videos by link.

### How strong is the lock?

Strong enough that it can't be switched off from devtools, by editing localStorage,
or by changing the request the page sends — all of those were the easy bypasses
before. It is **not** device-level parental control:

* Clearing cookies gives the browser a new household id, and a new household starts
  with Kids mode off.
* `HttpOnly` stops page JavaScript reading the cookie, but DevTools → Application →
  Cookies still shows it. That alone doesn't unlock anything — the PIN is checked on
  the server — but don't think of the household id as a secret.
* Nothing stops anyone opening youtube.com directly.

For real enforcement use Screen Time / Family Link on the device, or lock YouTube
Restricted Mode at the router — those cover the whole device, not just this site.
