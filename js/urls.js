// urls.js — Readable video links.
//
// A YouTube link tells you nothing: /watch?v=TemLSMDKSMw. SnoopyTube can do better,
// because everything after the video id is decoration the router simply ignores — so
// a link can carry the title, the channel and even the stats and still open the same
// video. Pick the length in Settings:
//
//   short   #/watch/TemLSMDKSMw
//   medium  #/watch/TemLSMDKSMw/The-BEST-Beginner-Chess-Opening/GothamChess
//   long    ...GothamChess/#chess#gothamchess#levy#best#beginner#opening/5.1M/3yearsago
//
// Only the id is ever read back (see videoIdFromHash), so an old link, a shared link
// or a hand-typed one all still work whatever style it was made in.

const URL_STYLES = ["short", "medium", "long"];
const urlStyle = () => URL_STYLES.includes(state.urlStyle) ? state.urlStyle : "medium";

// Title -> The-BEST-Beginner-Chess-Opening. Case is kept, everything a URL would have
// to escape is dropped, and the result is capped so links stay a sane length.
function slug(s, max = 60){
  return String(s || "").normalize("NFKD").replace(/[^\w\s-]/g, "")
    .trim().split(/\s+/).join("-").slice(0, max).replace(/-+$/, "") || "video";
}
const squash = s => slug(s).toLowerCase().replace(/-/g, "");     // "3 years ago" -> "3yearsago"

function videoHref(v){
  if(!v || !v.id) return "#/";
  const style = urlStyle();
  if(style === "short") return "#/watch/" + v.id;
  const base = `#/watch/${v.id}/${slug(v.title)}/${slug(v.ch, 40)}`;
  if(style === "medium") return base;
  const tags = (v.tags || []).slice(0, 8).map(t => "#" + squash(t)).join("") || "#video";
  return `${base}/${tags}/${v.views ? fmtViews(v.views) : "new"}/${squash(v.age)}`;
}
// For click handlers, which only have the id to hand.
const watchHref = id => videoHref(byId[id] || { id });

// The id is always the third slash-separated piece of the hash, whatever follows it.
function videoIdFromHash(hash = location.hash){
  const m = String(hash).match(/^#\/watch\/([\w-]{11})/);
  return m ? m[1] : null;
}
const onVideo = id => videoIdFromHash() === id;

// Shown in Settings so you can see what you're choosing before you choose it.
function exampleUrl(style){
  const was = state.urlStyle; state.urlStyle = style;
  const v = byId["TemLSMDKSMw"] || VIDEOS[0];
  const out = "https://snoopytube.vercel.app/" + videoHref(v);
  state.urlStyle = was;
  return out;
}
