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

The on/off state lives on the server behind an HttpOnly cookie and a PIN, so it can't
be switched off from the console. See SETUP.md for the Blob store and for what the
lock does and doesn't cover.

## Mobile

Works on phones: the sidebar becomes a slide-in drawer, there's a bottom tab bar,
search collapses to an icon, thumbnails go full-bleed, and safe-area insets keep
things clear of the iPhone home bar. Installable to the home screen via
`manifest.webmanifest`.

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
| `js/app.js` | Hash router, click handling, dialog, startup |

## Running it

```
node dev.js
```
then open http://localhost:8765. (Opening `index.html` directly also works, but live
YouTube search needs the `/api/search` function, which `dev.js` and Vercel provide.)
