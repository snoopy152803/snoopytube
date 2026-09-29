// channel.js — Real channel figures, from YouTube (api/channel.js).
//
// SnoopyTube only knows the videos it has actually seen, so anything it adds up itself
// describes its own catalogue and nothing else. Showing "18 videos · 23M total views"
// under a channel name claimed those were the channel's totals; TwoSetViolin's real
// ones are 1,735 videos and 1.5 billion views. So: the channel's numbers come from
// YouTube, SnoopyTube's are labelled as SnoopyTube's, and neither is invented.
//
// Fetched once per channel per session, then filled into the page in place — no
// re-render, so nothing restarts a video that's playing.

const CH_STATS = new Map();          // name -> stats object, or null if YouTube had none
const CH_PENDING = new Map();        // name -> the in-flight promise, so we ask only once

/* Each lookup is a page fetch on the server, and the sidebar asks about every channel
   you subscribe to at once. Two at a time keeps that polite and still fills the list
   quickly; the rest wait their turn. */
let chActive = 0; const chQueue = [];
function runQueue(){
  while(chActive < 2 && chQueue.length){
    const job = chQueue.shift(); chActive++;
    job().finally(() => { chActive--; runQueue(); });
  }
}

function channelStats(name){
  if(CH_STATS.has(name)) return Promise.resolve(CH_STATS.get(name));
  if(CH_PENDING.has(name)) return CH_PENDING.get(name);
  const p = new Promise(resolve => {
    chQueue.push(async () => {
      let stats = null;
      try{
        const r = await fetch("/api/channel?name=" + encodeURIComponent(name));
        const j = await r.json();
        stats = (r.ok && !j.error && !j.catalogueOnly) ? j : null;
      }catch(e){}                    // offline, or no API here — fall back to local only
      CH_STATS.set(name, stats); CH_PENDING.delete(name);
      resolve(stats);
    });
    runQueue();
  });
  CH_PENDING.set(name, p);
  return p;
}

/* ---------- filling the page ----------
   Anywhere a channel figure belongs, the page renders a placeholder carrying the
   channel name and the kind of figure wanted. When the answer arrives every matching
   placeholder is filled, including ones added after the request went out. */
function chSlot(name, kind, fallback = ""){
  return `<span class="chstat" data-ch="${esc(name)}" data-kind="${kind}">${esc(fallback)}</span>`;
}

// "subs" is the subscriber line on a watch page; "summary" is the whole figures line
// on a channel page. Building the summary here rather than from three separate slots
// keeps the separators right without having to guess which parts will turn up.
function slotText(kind, stats){
  if(!stats) return "";
  if(kind === "subs") return stats.subsText || "";
  return [stats.subsText, stats.videosText, stats.views ? fmtViews(stats.views) + " views" : null]
    .filter(Boolean).join(" • ");
}
function fillChannelSlots(name, stats){
  document.querySelectorAll(`.chstat[data-ch="${CSS.escape(name)}"]`).forEach(el => {
    el.textContent = slotText(el.dataset.kind, stats);
    el.classList.toggle("unknown", !stats);
    // Nothing came back — say so on the channel page, but stay quiet on a watch page,
    // where an error line under the channel name would just be noise.
    if(!stats && el.dataset.kind === "summary") el.textContent = "YouTube didn't answer — showing only what SnoopyTube knows";
  });
}

// Call after rendering anything with channel slots in it.
function loadChannelStats(name){
  if(!name) return;
  channelStats(name).then(s => fillChannelSlots(name, s));
}

/* ---------- what SnoopyTube itself knows ----------
   Kept clearly separate, and described as SnoopyTube's own tally rather than the
   channel's. "seen" counts every video from this channel the site has come across —
   the built-in catalogue plus anything a search turned up. */
function localTally(ch){
  const list = VIDEOS.filter(v => v.ch === ch);
  return { videos: list.length, views: list.reduce((a, v) => a + (v.views || 0), 0) };
}

/* ---------- sorting a channel's videos ----------
   YouTube gives a channel Latest / Popular / Oldest, and it needs an actual date to do
   that. All SnoopyTube has is the "3 years ago" / "9mo ago" text that came with the
   video, so that gets turned back into an age. It's only as precise as the text — a
   video "1 year ago" could be 12 or 23 months old — which is fine for ordering, and is
   why the label stays as YouTube wrote it rather than being turned into a date. */
const AGE_UNITS = { second:1, sec:1, minute:60, min:60, hour:3600, hr:3600, h:3600,
  day:86400, d:86400, week:604800, w:604800, month:2629800, mo:2629800,
  year:31557600, y:31557600 };

// "4 months ago" / "9mo ago" / "1y ago" -> roughly that many seconds. Unknown text
// sorts last rather than pretending to be new.
function ageSeconds(age){
  const m = String(age || "").toLowerCase().match(/(\d+)\s*([a-z]+)/);
  if(!m) return null;
  const unit = Object.keys(AGE_UNITS).filter(u => m[2].startsWith(u)).sort((a, b) => b.length - a.length)[0];
  return unit ? +m[1] * AGE_UNITS[unit] : null;
}
// "1:00:22" -> 3622. Live streams and unknown durations count as long, not short.
function durSeconds(dur){
  if(!dur || dur === "LIVE") return Infinity;
  const p = String(dur).split(":").map(Number);
  return p.some(isNaN) ? Infinity : p.reduce((a, n) => a * 60 + n, 0);
}
const isShort = v => durSeconds(v.dur) <= 60;

const CHANNEL_SORTS = { latest: "Latest", popular: "Popular", oldest: "Oldest" };
function sortVideos(list, sort){
  const withAge = v => { const s = ageSeconds(v.age); return s === null ? Infinity : s; };
  const copy = list.slice();
  if(sort === "popular") return copy.sort((a, b) => (b.views || 0) - (a.views || 0));
  if(sort === "oldest")  return copy.sort((a, b) => withAge(b) - withAge(a));
  return copy.sort((a, b) => withAge(a) - withAge(b));      // latest
}
