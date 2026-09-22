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
- **Sign in with Google** (Firebase Auth) and your likes, dislikes and subscriptions
  on SnoopyTube are applied to your real YouTube account through the YouTube Data API.
  It also imports your YouTube subscriptions into Snoopy's notes. Needs a free Firebase
  project — setup steps are at the top of `js/firebase-config.js`. (YouTube refuses
  duplicate subscriptions, so this can't be used to "subscribe twice".)
- **+ Add video** pastes any YouTube link straight into the catalogue.
- **Download** (in the ⋮ menu on any video) saves an MP4 or MP3 using yt-dlp + ffmpeg.
  This only works when you run SnoopyTube locally with `node dev.js` and have
  `yt-dlp` and `ffmpeg` installed — Vercel can't run them, so the live site says so.
- Recommendations are computed in your browser from what you watch, like, dislike and
  subscribe to. Everything is stored in `localStorage`; nothing leaves your machine.

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
| `js/firebase-config.js` | Your Firebase web config + the setup steps |
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
