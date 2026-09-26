# SnoopyTube

**https://snoopytube.vercel.app**

A YouTube-style site where Snoopy learns what you like and fetches videos for you.

- Every video is a real YouTube video, played through YouTube's own embedded player.
  Thumbnails come from `i.ytimg.com`. Nothing is copied or re-hosted.
- **Search searches YouTube.** `api/search.js` opens YouTube's results page on the
  server and pulls out the video links — the same thing you'd do by right-clicking a
  video and copying its URL — so any search finds real, current YouTube videos.
  No API key. Results you watch or like are saved so they stay in your history.
- ~275 videos are built in (`js/data/`): Minecraft PvP (Wemmbu, FlameFrags, ParrotX2,
  ClownPierce, Mapicc, Spoke, PrinceZam, Technoblade, Dream…), Chess (GothamChess,
  Hikaru, agadmator, Anna Cramling, Eric Rosen, Naroditsky, Botez…), plus science,
  coding, education, cooking, fitness, nature and space.
- **Sign in with Google** (Firebase Auth), then **Connect YouTube** from your avatar
  menu, and your likes, dislikes and subscriptions on SnoopyTube are applied to your
  real YouTube account through the YouTube Data API. Sign-in and YouTube access are
  separate steps, so sign-in works even before the YouTube API setup is finished.
  Google shows an "unverified app" screen the first time (Advanced → Go to); the app
  explains this before opening the popup. Owner setup lives in SETUP.md.
  It also imports your YouTube subscriptions into Snoopy's notes. Needs a free Firebase
  project — setup steps are at the top of `js/firebase-config.js`. (YouTube refuses
  duplicate subscriptions, so this can't be used to "subscribe twice".)
- **+ Add video** pastes any YouTube link straight into the catalogue.
- **Download** (in the ⋮ menu on any video) saves an MP4 or MP3 using yt-dlp + ffmpeg.
  This only works when you run SnoopyTube locally with `node dev.js` and have
  `yt-dlp` and `ffmpeg` installed — Vercel can't run them, so the live site says so.
- Recommendations are computed in your browser from what you watch, like, dislike and
  subscribe to. Everything is stored in `localStorage`; nothing leaves your machine.

## Kids mode

Top of the sidebar. Four layers:

1. Searches go out with `YouTube-Restrict: Strict`, so YouTube applies Restricted Mode
2. Only categories in `KID_CATEGORIES` (`js/kids.js`) appear
3. Titles and tags are matched against a word list — on the **server** as well as the
   client, so a tampered page still gets filtered results
4. Optionally, only videos the creator labelled "Made for kids" (YouTube Data API,
   needs YouTube connected). Very restrictive — most channels never use that label.

There's also **built-in videos only**, which switches off live YouTube search
entirely: search, "Up next" and adding videos by link all stay inside the ~274
hand-checked videos. It's the one airtight setting, because nothing is fetched from
YouTube at all. The server refuses to search for that household either way.

The on/off state lives on the server behind an HttpOnly cookie and a PIN, so it can't
be switched off from the console. See SETUP.md for the Blob store and for what the
lock does and doesn't cover.

## Mobile

Works on phones: the sidebar becomes a slide-in drawer, there's a bottom tab bar,
search collapses to an icon, thumbnails go full-bleed, and safe-area insets keep
things clear of the iPhone home bar. Installable to the home screen — or to the desktop as its own app — via
`manifest.json` and `sw.js`; see "Desktop app" below.

## URLs

Pages have real paths — `/watch/TemLSMDKSMw/The-BEST-Beginner-Chess-Opening/GothamChess`,
not `/#/watch/...`. Only the video id is read; everything after it is decoration, so old
and shared links keep working whatever length they were made at. Choose Short, Medium or
Long in Settings.

This works because the server hands back `index.html` for any path it doesn't recognise
(`vercel.json` in production, the fallback in `dev.js` locally) and the page routes itself
with `history.pushState`. One consequence: opening `index.html` straight off disk no longer
works — use `node dev.js`.

## Downloads

The Download items run yt-dlp (plus ffmpeg, which it needs to join YouTube's separate
video and audio streams). **There is no browser-only version of this.** A page can only
save files it is allowed to fetch, and YouTube serves its streams with no CORS header for
other origins, so the bytes are unreachable from JavaScript; the player is YouTube's own
iframe, sealed off from the page around it.

So downloads work when the machine *serving* the page has both tools — i.e. `node dev.js`
on your own computer. The Vercel copy can't, and says so with a dialog that explains why
and hands you the command, rather than a toast that just says no.

## Desktop app

SnoopyTube installs as a real app with its own window and its own icon — no Electron,
no download. `manifest.json` describes the app and `sw.js` is a small service worker
that keeps a copy of the shell so the app still opens on a bad connection.

* **Chrome / Edge** — an **Install app** button appears in the header. (There's also
  the install icon in the address bar, or ⋮ → Cast, save and share → Install page as app.)
* **Safari on macOS** — File → Add to Dock.
* **iPhone / Android** — Share → Add to Home Screen.

The service worker never caches `/api/*`, so Kids mode is still decided by the server
on every single call — an installed app can't be used to serve a stale "off".

## No ads, no tracking

SnoopyTube shows no ads of its own and collects nothing — your history and
recommendations live in your browser's localStorage. Videos play in YouTube's
embedded player, so YouTube's own ads still appear on videos that have them.

## Files

| File | What it does |
|---|---|
| `index.html` | Page skeleton: header, sidebar, main area, dialog |
| `css/style.css` | YouTube's dark layout with a Peanuts palette |
| `api/search.js` | Serverless function: search YouTube and return the video links |
| `api/download.js` | Runs yt-dlp/ffmpeg and sends the file (local only) |
| `dev.js` | Local server that serves the site *and* runs `api/search.js` |
| `js/catalogue.js` | The `VIDEOS` list and `addVideos()` helper (loaded first) |
| `js/data/*.js` | The built-in videos, one file per group; `channels.js` has channel photos |
| `js/firebase-config.js` | Firebase web config (public by design; see SETUP.md) |
| `js/auth.js` | Google sign-in and the YouTube like/subscribe sync |
| `js/state.js` | History / likes / subs / added videos in localStorage, and the actions |
| `js/recommend.js` | The recommendation engine — the brain |
| `js/components.js` | Card, thumbnail, chip and icon HTML builders |
| `js/pages.js` | Sidebar nav and every page |
| `js/urls.js` | Readable video links (Short / Medium / Long) and the router's URL helpers |
| `js/download.js` | The Download menu items, and what to say when the server can't |
| `vercel.json` | Sends unknown paths to index.html, so /watch/abc works without a "#" |
| `js/settings.js` | The Settings page: light/dark, link length, muted topics |
| `js/install.js` | Registers `sw.js` and shows the "Install app" button |
| `js/app.js` | Hash router, click handling, dialog, startup |
| `manifest.json`, `sw.js` | What makes it installable as a desktop app |

## Running it

```
node dev.js
```
then open http://localhost:8765. (Opening `index.html` directly also works, but live
YouTube search needs the `/api/search` function, which `dev.js` and Vercel provide.)
