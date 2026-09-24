// kids.js — Kids mode.
//
// Three layers, because no single one is enough:
//   1. Searches go through YouTube's own Restricted Mode (api/search.js sends the
//      "YouTube-Restrict: Strict" header), so YouTube does the filtering.
//   2. Categories: only the ones below are shown.
//   3. A word list, checked against titles and tags, for anything that slips past.
//
// It is a kid-friendly filter, not a guarantee — see the note in the dialog.

// Categories allowed in Kids mode. Acts as an allowlist, so anything added later
// has to be listed here deliberately before children can see it.
const KID_CATEGORIES = ["Minecraft PvP", "Chess", "Education", "Science", "Coding",
  "Entertainment", "Cooking", "Nature", "Space", "Fitness"];
const KID_BLOCKWORDS = ("kill kills killing death dead die dying murder blood gore horror scary nightmare creepy "
  + "gun guns shoot shooting weapon war nuclear bomb suicide drug drugs alcohol beer wine vodka cocktail drunk "
  + "sex sexy nsfw curse cursed swear damn hell nihilism dies corpse violent violence torture").split(" ");

const kidsOn = () => !!state.kids;

// Is this video allowed while Kids mode is on?
function kidsAllows(v){
  if(!kidsOn()) return true;
  if(v.cat !== "YouTube" && !KID_CATEGORIES.includes(v.cat)) return false;
  const words = (v.title + " " + (v.tags || []).join(" ")).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
  return !words.some(w => KID_BLOCKWORDS.includes(w));
}

/* ---------- turning it on and off ----------
   The PIN is a speed bump so a younger sibling can't just switch it off. It lives
   in this browser, so it isn't real parental control and the dialog says so. */
function openKidsDialog(){
  const d = document.getElementById("dialog");
  d.innerHTML = kidsOn() ? `<div class="dialog"><h2>🧸 Turn off Kids mode</h2>
      ${state.kidsPin ? `<p>Enter the 4-digit PIN to turn Kids mode off.</p>
        <input id="kidsPin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off">` : `<p>Kids mode is on. Turn it off?</p>`}
      <div class="err" id="kidsErr"></div>
      <div class="dlgbtns"><button class="pill" data-closedialog>Keep it on</button><button class="pill primary" id="kidsOff">Turn off</button></div></div>`
    : `<div class="dialog"><h2>🧸 Kids mode</h2>
      <p>Shows only kid-friendly categories, runs every search through YouTube's Restricted Mode, and hides videos whose titles suggest scary or grown-up content.</p>
      <label>Optional PIN to turn it back off
        <input id="kidsPin" type="password" inputmode="numeric" maxlength="4" placeholder="4 digits — leave blank for none" autocomplete="off"></label>
      <p class="note"><b>A filter, not a guarantee.</b> It relies on YouTube's own Restricted Mode plus word matching, so something unsuitable can still get through. The PIN is stored in this browser only — it won't stop someone determined.</p>
      <div class="dlgbtns"><button class="pill" data-closedialog>Cancel</button><button class="pill primary" id="kidsOn">Turn on</button></div></div>`;
  d.classList.add("open");
  setTimeout(() => document.getElementById("kidsPin")?.focus(), 50);
}

function enableKids(){
  const pin = (document.getElementById("kidsPin")?.value || "").trim();
  if(pin && !/^\d{4}$/.test(pin)) return document.getElementById("kidsErr")?.replaceChildren("PIN must be 4 digits");
  state.kids = true; state.kidsPin = pin || null; save();
  closeDialog(); toast("Kids mode on — Snoopy will keep things friendly 🧸"); render();
}
function disableKids(){
  const err = document.getElementById("kidsErr");
  if(state.kidsPin){
    const pin = (document.getElementById("kidsPin")?.value || "").trim();
    if(pin !== state.kidsPin){ if(err) err.textContent = "Wrong PIN"; return; }
  }
  state.kids = false; state.kidsPin = null; save();
  closeDialog(); toast("Kids mode off"); render();
}
