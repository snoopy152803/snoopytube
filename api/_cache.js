// api/_cache.js — Cache headers for the endpoints that reach out to YouTube.
//
// These three (search, suggest, channel) all answer differently depending on the
// household's Kids-mode state, which makes caching them a safety question rather than
// a performance one.
//
// The hole this closes: with only "s-maxage=3600" on a 200 response, a browser is
// allowed to reuse it heuristically. So a suggestion list fetched before Kids mode was
// switched on came straight back out of the browser cache afterwards — the server was
// correctly answering "catalogue only, nothing for you", and the page never asked it.
// Turning the lock on has to take effect immediately, so:
//
//   • Kids mode on  -> no-store. Never written to any cache, by anyone.
//   • Kids mode off -> the browser must revalidate every time (max-age=0), while the
//     shared cache may still hold it — but keyed per household (Vary: Cookie), because
//     the household id is what decides the answer. Without that, one household's
//     unfiltered results could be served to another household that has the lock on.
function cacheFor(res, locked, seconds = 600){
  res.setHeader("Vary", "Cookie");
  if(locked && (locked.on || locked.catalogueOnly)) return res.setHeader("Cache-Control", "no-store");
  res.setHeader("Cache-Control", `public, max-age=0, must-revalidate, s-maxage=${seconds}, stale-while-revalidate=${seconds * 6}`);
}
module.exports = { cacheFor };
