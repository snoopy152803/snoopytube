// suggest.js — The dropdown under the search box.
//
// Three kinds of row, in the order YouTube uses them:
//   1. searches you've made before that still match what you're typing (clock icon),
//   2. channels and videos already in SnoopyTube (they open straight away),
//   3. YouTube's own suggestions, via api/suggest.js.
//
// Nothing here is required for searching — if the request fails or Kids mode has
// blocked it, the list just shows the local matches, or nothing at all.

const RECENT_MAX = 12;
let sgItems = [], sgActive = -1, sgTimer = null, sgSeq = 0;
// Set when the list is dismissed on purpose (Enter, Escape, picking a row). Without
// it, work already in flight — the debounce timer, or a reply from api/suggest that
// hadn't arrived yet — reopened the list a moment after it closed, which is why the
// box kept coming back and took several clicks to get rid of. Cleared by the next
// deliberate focus or keystroke.
let sgSuppressed = false;

const sgBox = () => document.getElementById("suggestBox");
const sgInput = () => document.getElementById("searchInput");

/* ---------- searches you've made before ---------- */
function rememberSearch(q){
  if(state.suggest === false) return;          // nothing offered, so nothing kept
  const t = String(q || "").trim(); if(!t) return;
  state.recent = [t, ...(state.recent || []).filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, RECENT_MAX);
  save();
}
function forgetSearch(q){
  state.recent = (state.recent || []).filter(x => x !== q); save(); showSuggestions();
}

/* ---------- building the list ---------- */
function localMatches(q){
  const ql = q.toLowerCase(); const out = [];
  const seen = new Set();
  for(const ch of new Set(VIDEOS.filter(v => kidsAllows(v)).map(v => v.ch))){
    if(ch.toLowerCase().includes(ql) && !seen.has(ch)){ seen.add(ch); out.push({ kind: "channel", text: ch }); }
    if(out.length >= 3) break;
  }
  for(const v of VIDEOS){
    if(out.length >= 6) break;
    if(!kidsAllows(v) || (v.fromSearch && !v.custom)) continue;
    if(v.title.toLowerCase().includes(ql)) out.push({ kind: "video", text: v.title, id: v.id });
  }
  return out;
}

async function showSuggestions(){
  const box = sgBox(), input = sgInput(); if(!box || !input) return;
  if(sgSuppressed) return;          // dismissed on purpose; the next focus or keystroke re-arms it
  if(state.suggest === false){ sgClose(); return; }
  const q = input.value.trim();
  const recent = (state.recent || []).filter(r => !q || r.toLowerCase().startsWith(q.toLowerCase())).slice(0, q ? 3 : 8);

  // With an empty box, YouTube shows recent searches and nothing else.
  if(!q){ sgRender(recent.map(text => ({ kind: "recent", text }))); return; }

  sgRender([...recent.map(text => ({ kind: "recent", text })), ...localMatches(q)]);

  const mine = ++sgSeq;                       // ignore answers to keystrokes since overtaken
  try{
    const r = await fetch("/api/suggest?q=" + encodeURIComponent(q));
    const j = await r.json();
    if(mine !== sgSeq || sgInput().value.trim() !== q) return;
    const have = new Set([...recent, ...localMatches(q).map(x => x.text)].map(t => t.toLowerCase()));
    const fresh = (j.suggestions || []).filter(s => !have.has(s.toLowerCase())).map(text => ({ kind: "yt", text }));
    sgRender([...recent.map(text => ({ kind: "recent", text })), ...localMatches(q), ...fresh].slice(0, 12));
  }catch(e){}                                  // keep whatever is already on screen
}

function sgRender(items){
  const box = sgBox(); if(!box || sgSuppressed) return;
  sgItems = items; sgActive = -1;
  if(!items.length){ sgClose(); return; }
  box.innerHTML = items.map((it, i) => `<div class="sgrow" data-i="${i}">
      <span class="sgicon">${it.kind === "recent" ? ICONS.history : it.kind === "channel" ? ICONS.subs : it.kind === "video" ? ICONS.yt : ICONS.search}</span>
      <span class="sgtext">${esc(it.text)}</span>
      ${it.kind === "recent" ? `<button class="sgx" data-forget="${esc(it.text)}" title="Remove from your searches">×</button>` : ""}
    </div>`).join("");
  box.classList.add("open");
  document.body.classList.add("suggesting");
}
// close() is also what the rest of the app calls when a search is submitted, so it
// cancels everything outstanding rather than just hiding the box.
function sgClose(){
  sgSuppressed = true; clearTimeout(sgTimer); sgSeq++;
  const box = sgBox(); if(!box) return;
  box.classList.remove("open"); box.innerHTML = ""; sgItems = []; sgActive = -1;
  document.body.classList.remove("suggesting");
}
// The next thing the person actually does re-arms it.
const sgWake = () => { sgSuppressed = false; };
function sgHighlight(n){
  const box = sgBox(); if(!box || !sgItems.length) return;
  sgActive = (n + sgItems.length) % sgItems.length;
  box.querySelectorAll(".sgrow").forEach((el, i) => el.classList.toggle("on", i === sgActive));
  sgInput().value = sgItems[sgActive].text;
}
// Picking a row: a video opens, anything else runs as a search.
function sgChoose(i){
  const it = sgItems[i]; if(!it) return;
  sgClose(); sgInput().blur(); document.body.classList.remove("searching");
  if(it.kind === "video") return navigate(watchHref(it.id));
  if(it.kind === "channel") return navigate("/channel/" + encodeURIComponent(it.text));
  rememberSearch(it.text);
  sgInput().value = it.text;
  navigate("/search/" + encodeURIComponent(it.text));
}

/* ---------- wiring ---------- */
function initSuggest(){
  const input = sgInput(); if(!input) return;
  input.setAttribute("autocomplete", "off");
  input.addEventListener("input", () => { sgWake(); clearTimeout(sgTimer); sgTimer = setTimeout(showSuggestions, 120); });
  input.addEventListener("focus", () => { sgWake(); showSuggestions(); });
  input.addEventListener("keydown", e => {
    if(!sgItems.length) return;
    if(e.key === "ArrowDown"){ e.preventDefault(); sgHighlight(sgActive + 1); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); sgHighlight(sgActive - 1); }
    else if(e.key === "Enter" && sgActive >= 0){ e.preventDefault(); sgChoose(sgActive); }
    else if(e.key === "Escape"){ sgClose(); }
  });
  // mousedown, not click: the input's blur would otherwise close the list first.
  sgBox()?.addEventListener("mousedown", e => {
    e.preventDefault();
    const forget = e.target.closest("[data-forget]");
    if(forget) return forgetSearch(forget.dataset.forget);
    const row = e.target.closest(".sgrow");
    if(row) sgChoose(+row.dataset.i);
  });
  input.addEventListener("blur", () => setTimeout(sgClose, 150));
}
