// api/suggest.js — GET /api/suggest?q=twoset
//
// The dropdown under the search box. These are YouTube's own suggestions, from the
// endpoint its search box uses; a browser can't call it directly (no CORS header), so
// it goes through here like api/search.js does.
//
// The response is ["twoset", ["twoset", "twosetviolin prodigy", ...], ...] — only the
// second element matters.

const { kidsStateFor } = require("./kids.js");
const { blockedWord } = require("./_kidwords.js");
const { cacheFor } = require("./_cache.js");

const ENDPOINT = "https://suggestqueries-clients6.youtube.com/complete/search";

async function suggest(q){
  const r = await fetch(`${ENDPOINT}?client=firefox&ds=yt&hl=en&q=${encodeURIComponent(q)}`, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9" },
  });
  if(!r.ok) throw new Error("suggest HTTP " + r.status);
  const data = JSON.parse(await r.text());
  return Array.isArray(data[1]) ? data[1].filter(s => typeof s === "string") : [];
}

const phraseBlocked = s => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).some(blockedWord);

module.exports = async function handler(req, res){
  const q = (new URL(req.url, "http://x").searchParams.get("q") || "").trim();
  res.setHeader("Content-Type", "application/json");

  const locked = await kidsStateFor(req);
  cacheFor(res, locked, 3600);
  // Catalogue-only means nothing leaves for YouTube, suggestions included. The page
  // still offers matches from the built-in videos.
  if(locked.catalogueOnly) return res.end(JSON.stringify({ suggestions: [], catalogueOnly: true }));
  if(!q) return res.end(JSON.stringify({ suggestions: [] }));

  try{
    let out = await suggest(q);
    // In Kids mode a suggestion is a thing we're putting in front of a child, so it
    // goes through the same word list as everything else.
    if(locked.on) out = out.filter(s => !phraseBlocked(s));
    res.end(JSON.stringify({ suggestions: out.slice(0, 10) }));
  }catch(e){
    // A broken dropdown shouldn't look like a broken site — an empty list just means
    // no suggestions appear, and typing a search still works.
    res.end(JSON.stringify({ suggestions: [], error: e.message }));
  }
};
