// api/search.js — Vercel serverless function: GET /api/search?q=minecraft+pvp
//
// Does what you'd do by hand: opens YouTube's search results page, and pulls
// out the video links. YouTube puts all the results in a big JSON blob called
// ytInitialData inside the page, so we find that and read the videos from it.
// No API key needed. Runs on the server because browsers can't fetch youtube.com
// directly (CORS).

const MAX_RESULTS = 20;
const { kidsOnFor } = require("./kids.js");
const KID_BLOCKWORDS = require("./_kidwords.js");

async function searchYouTube(query, kids){
  const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query) + "&sp=EgIQAQ%253D%253D"; // sp = "videos only"
  // "YouTube-Restrict: Strict" is the header YouTube documents for restricting
  // content on a network, so in Kids mode YouTube filters the results itself
  // rather than us guessing from titles.
  const html = await (await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "CONSENT=YES+1; SOCS=CAI",   // skips the EU cookie-consent page
      ...(kids ? { "YouTube-Restrict": "Strict" } : {}),
    },
  })).text();

  const start = html.indexOf("var ytInitialData = ");
  if(start < 0) throw new Error("YouTube didn't return search results (page layout changed or request blocked)");
  const jsonStart = start + "var ytInitialData = ".length;
  const jsonEnd = html.indexOf(";</script>", jsonStart);
  const data = JSON.parse(html.slice(jsonStart, jsonEnd));

  let videos = [];
  walk(data, videos);
  // Restricted Mode alone still lets some horror/violence titles through, so in Kids
  // mode we also drop anything whose title matches the word list — server-side, so a
  // tampered page can't skip it.
  if(kids) videos = videos.filter(v => !titleBlocked(v.title));
  return videos.slice(0, MAX_RESULTS);
}

function titleBlocked(title){
  return String(title).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).some(w => KID_BLOCKWORDS.includes(w));
}

// Recursively look through the JSON for {videoRenderer: {...}} objects.
function walk(node, out){
  if(!node || typeof node !== "object") return;
  if(node.videoRenderer){ const v = toVideo(node.videoRenderer); if(v) out.push(v); return; }
  for(const key in node) walk(node[key], out);
}

const text = t => t ? (t.simpleText || (t.runs || []).map(r => r.text).join("")) : "";
function toVideo(r){
  if(!r.videoId) return null;
  return {
    id: r.videoId,
    title: text(r.title),
    ch: text(r.ownerText) || text(r.shortBylineText),
    dur: text(r.lengthText) || (r.badges?.some(b => /LIVE/i.test(text(b.metadataBadgeRenderer?.label))) ? "LIVE" : ""),
    views: parseViews(text(r.viewCountText)),
    age: text(r.publishedTimeText),
    avatar: r.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url || "",
  };
}
function parseViews(s){
  const m = String(s).replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if(!m) return 0;
  return Math.round(parseFloat(m[1]) * ({K:1e3, M:1e6, B:1e9}[(m[2]||"").toUpperCase()] || 1));
}

// Plain Node http handler — works on Vercel and in dev.js.
module.exports = async function handler(req, res){
  const params = new URL(req.url, "http://x").searchParams;
  const q = params.get("q") || "";
  // The page can ask for Kids mode, but if the household has it locked on the server
  // says so regardless — that's what stops it being turned off in devtools.
  const kids = params.get("kids") === "1" || await kidsOnFor(req);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
  res.setHeader("Vary", "Accept");   // Vercel caches each query for 10 min
  if(!q.trim()){ res.statusCode = 400; return res.end(JSON.stringify({error: "missing q"})); }
  try{
    res.end(JSON.stringify({videos: await searchYouTube(q, kids)}));
  }catch(e){
    res.statusCode = 502; res.end(JSON.stringify({error: e.message}));
  }
};
module.exports.searchYouTube = searchYouTube;
