// kids.js — Kids mode.
//
// Three layers, because no single one is enough:
//   1. Searches go through YouTube's own Restricted Mode (api/search.js sends the
//      "YouTube-Restrict: Strict" header), so YouTube does the filtering.
//   2. Categories: only the ones below are shown.
//   3. A word list, checked against titles and tags, for anything that slips past.
//   4. Optionally, only videos the creator labelled "Made for kids" (Data API).
//
// It is a kid-friendly filter, not a guarantee — see the note in the dialog.

// Categories allowed in Kids mode. Acts as an allowlist, so anything added later
// has to be listed here deliberately before children can see it.
const KID_CATEGORIES = ["Minecraft PvP", "Chess", "Education", "Science", "Coding",
  "Entertainment", "Cooking", "Nature", "Space", "Fitness"];
const KID_BLOCKWORDS = (
  "kill kills killed killing death deaths dead die dies dying murder murders blood bloody gore "
  +   "gory horror scary terrifying disturbing nightmare creepy haunted haunting ghost ghosts "
  +   "demon demonic possessed zombie zombies slasher massacre stab stabbed knife machete chainsaw "
  +   "torture tortured brutal savage gun guns shoot shooting shot weapon weapons war warfare "
  +   "nuclear bomb bombing explosion suicide drug drugs weed vape alcohol beer wine vodka whisky "
  +   "cocktail drunk smoking cigarette sex sexy nude nsfw porn curse cursed swear swearing damn "
  +   "hell nihilism corpse violent violence creepypasta jumpscare grusome gruesome mutilated "
  +   "decapitated").split(" ");

// Prefix matches, so "kill" also catches killer / killing / killed. Only stems that
// are unambiguous as prefixes go here — "die" would match "diet", for instance.
const KID_BLOCKSTEMS = ["kill", "murder", "horror", "gore", "gory", "zombie", "torture", "decapitat", "mutilat", "stab", "slaughter", "behead", "massacre", "corpse", "suicid", "strangl", "brutal", "gruesome", "creepy", "haunt", "demon", "possess", "satan", "nightmar", "terrif", "disturb", "violen", "bloody"];
function blockedWord(w){
  return KID_BLOCKWORDS.includes(w) || KID_BLOCKSTEMS.some(st => w.startsWith(st));
}

const kidsOn = () => !!state.kids;
// Kids mode with live YouTube search switched off entirely — only the built-in,
// hand-checked catalogue is reachable. Enforced by the server too (api/search.js).
const catalogueOnly = () => !!(state.kids && state.kidsCatalogueOnly);
const kidsStrict = () => !!(state.kids && state.kidsStrict);

/* ---------- layer 4: the creator's "Made for kids" label ----------
   Only the YouTube Data API exposes this, so it needs YouTube connected (auth.js).
   Answers are cached per video id; unknown ids are treated as allowed until we've
   looked them up, then the feed re-renders with them removed. */
const mfk = new Map();                       // id -> true/false
let mfkQueue = new Set(), mfkTimer = null;

function madeForKidsOk(v){
  if(!kidsStrict()) return true;
  if(mfk.has(v.id)) return mfk.get(v.id);
  if(ytConnected()){ mfkQueue.add(v.id); scheduleMfkLookup(); }
  return true;                               // provisional, until the lookup lands
}
function scheduleMfkLookup(){
  if(mfkTimer) return;
  mfkTimer = setTimeout(async () => {
    mfkTimer = null;
    const ids = [...mfkQueue].slice(0, 50); mfkQueue = new Set([...mfkQueue].slice(50));
    if(!ids.length) return;
    try{
      const j = await ytApi("GET", `videos?part=status&id=${ids.join(",")}`);
      const seen = new Set();
      (j.items || []).forEach(i => { mfk.set(i.id, !!i.status.madeForKids); seen.add(i.id); });
      ids.forEach(id => { if(!seen.has(id)) mfk.set(id, false); });   // unknown video: hide it
      render();
    }catch(e){ ids.forEach(id => mfk.set(id, true)); }                // API unavailable: don't blank the site
    if(mfkQueue.size) scheduleMfkLookup();
  }, 300);
}

// Is this video allowed while Kids mode is on?
function kidsAllows(v){
  if(!kidsOn()) return true;
  if(v.cat !== "YouTube" && !KID_CATEGORIES.includes(v.cat)) return false;
  const words = (v.title + " " + (v.tags || []).join(" ")).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
  if(words.some(blockedWord)) return false;
  return madeForKidsOk(v);
}

/* ---------- the lock ----------
   The on/off state lives on the server (api/kids.js), keyed to an HttpOnly cookie,
   so it can't be flipped from the console and the search API keeps filtering even
   if the page is tampered with. We mirror it locally only so the UI can render
   before the server answers. */
async function syncKids(){
  try{
    const r = await fetch("/api/kids", { credentials: "same-origin" });
    const j = await r.json();
    if(state.kids !== j.on){ state.kids = j.on; save(); render(); }
    state.kidsHasPin = j.hasPin; state.kidsDurable = j.durable !== false;
    if(state.kidsCatalogueOnly !== !!j.catalogueOnly){ state.kidsCatalogueOnly = !!j.catalogueOnly; save(); render(); }
  }catch(e){}                 // offline or no API (file:// ) — fall back to the local flag
}
// Re-check now and then: flipping state.kids in the console would otherwise unfilter
// the built-in catalogue until the next reload. (Live search stays filtered either
// way, because the server decides that.)
function watchKids(){
  setInterval(syncKids, 60000);
  document.addEventListener("visibilitychange", () => { if(!document.hidden) syncKids(); });
}

async function setKids(on, pin, opts = {}){
  const r = await fetch("/api/kids", {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: on ? "on" : "off", pin: pin || "", catalogueOnly: !!opts.catalogueOnly }),
  });
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(j.error || "Couldn't reach the server");
  state.kids = j.on; state.kidsHasPin = j.hasPin; state.kidsCatalogueOnly = !!j.catalogueOnly; state.kidsDurable = j.durable !== false; save();
  return j;
}

/* ---------- dialogs ---------- */
function openKidsDialog(){
  const d = document.getElementById("dialog");
  d.innerHTML = kidsOn() ? `<div class="dialog"><h2>🧸 Turn off Kids mode</h2>
      ${state.kidsHasPin ? `<p>Enter the PIN to turn Kids mode off.</p>
        <input id="kidsPin" type="password" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off">`
        : `<p>Kids mode is on, without a PIN. Turn it off?</p>`}
      <div class="err" id="kidsErr"></div>
      <div class="dlgbtns"><button class="pill" data-closedialog>Keep it on</button><button class="pill primary" id="kidsOff">Turn off</button></div></div>`
    : `<div class="dialog"><h2>🧸 Kids mode</h2>
      <p>Runs every search through YouTube's Restricted Mode, limits categories to kid-friendly ones, and hides videos whose titles suggest scary or grown-up content.</p>
      <label>PIN to turn it back off
        <input id="kidsPin" type="password" inputmode="numeric" maxlength="8" placeholder="4–8 digits — leave blank for none" autocomplete="off"></label>
      <label class="check"><input type="checkbox" id="kidsCat" ${state.kidsCatalogueOnly ? "checked" : ""}>
        <span>Don't search YouTube at all — only the ${VIDEOS.filter(v => !v.fromSearch).length} videos built into SnoopyTube</span></label>
      <p class="note strictnote">The only airtight setting: nothing unexpected can appear, because nothing is fetched from YouTube. Search and “Up next” stay inside the built-in list, and adding videos by link is switched off.</p>
      <label class="check"><input type="checkbox" id="kidsStrict" ${state.kidsStrict ? "checked" : ""}>
        Only videos their creator marked <b>“Made for kids”</b></label>
      <p class="note strictnote">Very restrictive: most channels don't use that label (it switches off their comments), so this hides nearly everything except young-children content. Needs YouTube connected.</p>
      ${state.kidsDurable === false ? `<p class="note warn"><b>This site can't lock Kids mode yet.</b> The setting won't stick reliably until a Blob store is connected in Vercel (see SETUP.md). It will still filter — it just can't be relied on to stay on.</p>` : ""}
      <div class="err" id="kidsErr"></div>
      <div class="dlgbtns"><button class="pill" data-closedialog>Cancel</button><button class="pill primary" id="kidsOn">Turn on</button></div></div>`;
  d.classList.add("open");
  setTimeout(() => document.getElementById("kidsPin")?.focus(), 50);
}

const kidsErr = m => { const e = document.getElementById("kidsErr"); if(e) e.textContent = m; };

async function enableKids(){
  const pin = (document.getElementById("kidsPin")?.value || "").trim();
  if(pin && !/^\d{4,8}$/.test(pin)) return kidsErr("PIN must be 4–8 digits");
  state.kidsStrict = !!document.getElementById("kidsStrict")?.checked;
  const catOnly = !!document.getElementById("kidsCat")?.checked;
  try{
    await setKids(true, pin, { catalogueOnly: catOnly });
    closeDialog(); toast("Kids mode on — Snoopy will keep things friendly 🧸"); render();
  }catch(e){ kidsErr(e.message); }
}
async function disableKids(){
  const pin = (document.getElementById("kidsPin")?.value || "").trim();
  try{
    await setKids(false, pin);
    closeDialog(); toast("Kids mode off"); render();
  }catch(e){ kidsErr(e.message); }
}
