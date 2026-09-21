# SnoopyTube

**https://snoopytube.vercel.app**

A YouTube-style site where Snoopy learns what you like and fetches videos for you.

- Every video is a real YouTube video, played through YouTube's own embedded player.
  Thumbnails come from `i.ytimg.com`. Nothing is copied or re-hosted.
- ~370 videos are built in (`js/data/`). Hit **+ Add video** and paste *any* YouTube
  link to add more — the title, channel and thumbnail are fetched from YouTube's public
  oEmbed endpoint, no API key needed.
- Recommendations are computed in your browser from what you watch, like, dislike and
  subscribe to. Everything is stored in `localStorage`; nothing leaves your machine.

## Files

| File | What it does |
|---|---|
| `index.html` | Page skeleton: header, sidebar, main area, dialog |
| `css/style.css` | YouTube's dark layout with a Peanuts palette |
| `js/catalogue.js` | The `VIDEOS` list and `addVideos()` helper (loaded first) |
| `js/data/*.js` | The built-in videos, one file per group |
| `js/state.js` | History / likes / subs / added videos in localStorage, and the actions |
| `js/recommend.js` | The recommendation engine — the brain |
| `js/components.js` | Card, thumbnail, chip and icon HTML builders |
| `js/pages.js` | Sidebar nav and every page |
| `js/app.js` | Hash router, click handling, dialog, startup |

Open `index.html` directly or run any static server — there's no build step.
