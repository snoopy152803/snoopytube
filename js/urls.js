// urls.js — Real URLs: /watch/TemLSMDKSMw, not /#/watch/TemLSMDKSMw.
//
// SnoopyTube is one page — index.html loads once and JavaScript redraws the middle —
// so there is no file on the server at /watch/TemLSMDKSMw. Two things make plain paths
// work anyway:
//   • the server is told to hand back index.html for any path it doesn't recognise
//     (vercel.json in production, the fallback at the bottom of dev.js locally), and
//   • navigation here goes through history.pushState instead of setting location, so
//     the browser changes the address bar without asking the server for anything.
// The Back button still works, because popstate re-renders (js/app.js).
//
// Everything after the video id is decoration the router ignores, so a link can carry
// the title, the channel and the stats and still open the same video. Pick the length
// in Settings:
//
//   short   /watch/TemLSMDKSMw
//   medium  /watch/TemLSMDKSMw/The-BEST-Beginner-Chess-Opening/GothamChess
//   long    ...GothamChess/5.1M/3yearsago#chess#gothamchess#levy#best#beginner#opening
//
// The long style keeps its tags after the "#" because that part of a URL — the
// fragment — is the one place a "#" is allowed to sit unescaped. In a path it would
// have to be written %23 on every tag, which rather spoils the effect.
//
// Only the id is ever read back (see videoId), so an old link, a shared link or a
// hand-typed one all still work whatever style it was made in.

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
  if(!v || !v.id) return "/";
  const style = urlStyle();
  if(style === "short") return "/watch/" + v.id;
  const base = `/watch/${v.id}/${slug(v.title)}/${slug(v.ch, 40)}`;
  if(style === "medium") return base;
  const tags = (v.tags || []).slice(0, 8).map(t => "#" + squash(t)).join("");
  return `${base}/${v.views ? fmtViews(v.views) : "new"}/${squash(v.age)}${tags}`;
}
// For click handlers, which only have the id to hand.
const watchHref = id => videoHref(byId[id] || { id });

/* ---------- reading the address bar ---------- */
// The path without the query or the fragment, always starting with "/".
const routePath = () => location.pathname.replace(/\/+$/, "") || "/";
// The id is the second piece of the path, whatever follows it.
function videoId(path = location.pathname){
  const m = String(path).match(/^\/watch\/([\w-]{11})/);
  return m ? m[1] : null;
}
const onVideo = id => videoId() === id;

/* ---------- changing it ----------
   Every internal link and every scripted navigation ends up here. pushState doesn't
   fire popstate, so render() is called directly. */
function navigate(url, replace = false){
  const here = location.pathname + location.search + location.hash;
  if(url === here) return;
  history[replace ? "replaceState" : "pushState"](null, "", url);
  render();
}
// Is this a link we handle ourselves, rather than letting the browser load a new page?
function internalLink(a){
  if(!a || a.target === "_blank" || a.hasAttribute("download")) return false;
  const href = a.getAttribute("href") || "";
  return href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api/");
}

// Shown in Settings so you can see what you're choosing before you choose it.
function exampleUrl(style){
  const was = state.urlStyle; state.urlStyle = style;
  const v = byId["TemLSMDKSMw"] || VIDEOS[0];
  const out = location.origin.replace(/^https?:\/\/localhost.*/, "https://snoopytube.vercel.app") + videoHref(v);
  state.urlStyle = was;
  return out;
}
