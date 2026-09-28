// api/channel.js — GET /api/channel?name=TwoSetViolin  (or ?id=UCAzKFALPuF_EPe-AEI0WFFw)
//
// Real subscriber / video / view counts for a channel, read off YouTube's own About
// page the same way api/search.js reads the results page. No API key needed.
//
// Why this exists: SnoopyTube only knows the handful of videos it has actually seen,
// so anything it adds up itself — "18 videos", "23M total views" — is a fact about
// SnoopyTube's catalogue, not about the channel. Those numbers were being shown as if
// they described the channel, which is simply wrong: TwoSetViolin has 1,735 videos and
// 1.5 billion views. Now the channel's own figures come from YouTube, and SnoopyTube's
// count is labelled as its own.

const { kidsStateFor } = require("./kids.js");
const { cacheFor } = require("./_cache.js");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Cookie": "CONSENT=YES+1; SOCS=CAI",       // skips the EU cookie-consent page
};

const get = async url => (await fetch(url, { headers: HEADERS })).text();

// The blob every YouTube page carries its data in.
function initialData(html){
  const i = html.indexOf("var ytInitialData = ");
  if(i < 0) return null;
  return html.slice(i + "var ytInitialData = ".length, html.indexOf(";</script>", i));
}

// "4.37M subscribers" -> 4370000, "1,555,729,693 views" -> 1555729693, "1,735 videos" -> 1735
function parseCount(s){
  const m = String(s || "").replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if(!m) return null;
  return Math.round(parseFloat(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1));
}

// Channel name -> channel id, by asking YouTube's search for channels (sp = channels only).
async function findChannelId(name){
  const s = initialData(await get("https://www.youtube.com/results?search_query="
    + encodeURIComponent(name) + "&sp=EgIQAg%253D%253D"));
  if(!s) return null;
  // The first channelRenderer is the best match for the name we searched.
  const m = s.match(/"channelRenderer":\{"channelId":"(UC[\w-]+)"/);
  return m ? m[1] : null;
}

const field = (s, key) => (s.match(new RegExp('"' + key + '":"([^"]+)"')) || [])[1] || null;

async function aboutPage(url){
  const s = initialData(await get(url));
  if(!s || !s.includes("aboutChannelViewModel")) return null;
  const subsText = field(s, "subscriberCountText");
  const viewsText = field(s, "viewCountText");
  const videosText = field(s, "videoCountText");
  if(!subsText && !viewsText) return null;
  return {
    id: field(s, "channelId"),
    url: (field(s, "canonicalChannelUrl") || "").replace(/^http:/, "https:"),
    avatar: (s.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/) || [])[1] || null,
    country: field(s, "country"),
    // Both the text YouTube itself shows (already rounded, e.g. "4.37M subscribers")
    // and a number for sorting. The text is what gets displayed — rounding it a second
    // time would only lose accuracy.
    subsText, viewsText, videosText,
    subs: parseCount(subsText), views: parseCount(viewsText), videos: parseCount(videosText),
  };
}

async function channelStats({ id, name }){
  // A handle is worth one cheap guess when the name could be one; otherwise, and when
  // that misses, fall back to searching YouTube for the channel.
  if(!id && /^[\w.-]{3,30}$/.test(name || "")){
    const direct = await aboutPage("https://www.youtube.com/@" + encodeURIComponent(name) + "/about");
    if(direct) return direct;
  }
  const chId = id || await findChannelId(name);
  if(!chId) return null;
  return aboutPage("https://www.youtube.com/channel/" + chId + "/about");
}

module.exports = async function handler(req, res){
  const q = new URL(req.url, "http://x").searchParams;
  const id = q.get("id"), name = q.get("name");
  res.setHeader("Content-Type", "application/json");

  // Kids mode set to built-in videos only means "never reach out to YouTube" — that
  // includes this. The page falls back to showing only what it knows locally.
  // A channel's totals barely move; an hour at the edge saves a lot of scraping.
  const locked = await kidsStateFor(req);
  cacheFor(res, locked, 3600);
  if(locked.catalogueOnly) return res.end(JSON.stringify({ catalogueOnly: true }));

  if(!id && !name){ res.statusCode = 400; return res.end(JSON.stringify({ error: "missing name or id" })); }
  try{
    const stats = await channelStats({ id, name });
    if(!stats){ res.statusCode = 404; return res.end(JSON.stringify({ error: "Couldn't find that channel on YouTube" })); }
    res.end(JSON.stringify(stats));
  }catch(e){
    res.statusCode = 502; res.end(JSON.stringify({ error: e.message }));
  }
};
module.exports.channelStats = channelStats;
