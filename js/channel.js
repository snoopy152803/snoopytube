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

async function channelStats(name){
  if(CH_STATS.has(name)) return CH_STATS.get(name);
  let stats = null;
  try{
    const r = await fetch("/api/channel?name=" + encodeURIComponent(name));
    const j = await r.json();
    stats = (r.ok && !j.error && !j.catalogueOnly) ? j : null;
  }catch(e){}                        // offline, or no API here — fall back to local only
  CH_STATS.set(name, stats);
  return stats;
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
