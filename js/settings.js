// settings.js — The Settings page (/settings) and the light/dark theme.
//
// Everything here is saved in this browser only, like the rest of your state. Kids
// mode is the exception: it lives on the server (api/kids.js), so this page just
// opens the same dialog the sidebar does.

/* ---------- THEME ----------
   state.theme is "dark", "light" or "system". applyTheme() resolves "system" against
   the OS setting and writes the answer to <html data-theme>, which is what css/style.css
   keys off — so the stylesheet never has to know about "system". */
const prefersLight = () => window.matchMedia("(prefers-color-scheme: light)").matches;
const resolvedTheme = () => state.theme === "system" ? (prefersLight() ? "light" : "dark") : (state.theme || "dark");

function applyTheme(){
  const t = resolvedTheme();
  document.documentElement.dataset.theme = t;
  // Colours the browser paints itself: the phone status bar and the desktop app's
  // title bar. Without this a light page keeps a black bar above it.
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = t === "light" ? "#ffffff" : "#0f0f0f";
}
function setTheme(t){
  state.theme = t; save(); applyTheme();
  toast(t === "system" ? "Following your device" : t === "light" ? "Light mode on" : "Dark mode on");
  render();
}
// Follow the OS while "system" is chosen.
window.matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => { if(state.theme === "system") { applyTheme(); render(); } });

function setUrlStyle(s){
  state.urlStyle = s; save();
  const id = videoId();
  if(id) history.replaceState(null, "", watchHref(id));    // relabel the link you're on
  toast("Links are now " + s); render();
}

/* ---------- THE PAGE ---------- */
function radioRow(name, value, current, label, note){
  return `<label class="setrow${value === current ? " on" : ""}">
    <input type="radio" name="${name}" value="${value}" ${value === current ? "checked" : ""}>
    <span class="setmain"><b>${label}</b>${note ? `<span class="setnote">${note}</span>` : ""}</span></label>`;
}

function pageSettings(){
  const theme = state.theme || "dark";
  const style = urlStyle();
  const muted = state.mutedTags || [];
  return `<div class="page settings">
    <h1 class="pagetitle">Settings</h1>

    <section class="setsec">
      <h2>Appearance</h2>
      <div class="setgroup" data-set="theme">
        ${radioRow("theme", "dark", theme, "Dark mode", "The doghouse at night — the original look.")}
        ${radioRow("theme", "light", theme, "Light mode", "Same layout, paper-white background.")}
        ${radioRow("theme", "system", theme, "Match my device", "Follows your system light/dark setting.")}
      </div>
    </section>

    <section class="setsec">
      <h2>Link length</h2>
      <p class="setintro">Only the video id in a link is actually read, so the rest is there to make links readable. Longer links are still ordinary links — you can copy, share and open them as usual.</p>
      <div class="setgroup" data-set="url">
        ${radioRow("url", "short", style, "Short", `<code>${esc(exampleUrl("short"))}</code>`)}
        ${radioRow("url", "medium", style, "Medium", `<code>${esc(exampleUrl("medium"))}</code>`)}
        ${radioRow("url", "long", style, "Long", `<code>${esc(exampleUrl("long"))}</code>`)}
      </div>
    </section>

    <section class="setsec">
      <h2>Topics you've muted</h2>
      <p class="setintro">Woodstock learns by topic, so subscribing to a chess channel can bring you opening theory you never asked for. Mute a topic and it's dropped completely — even from channels you follow. Muting <i>opening</i> also covers <i>openings</i>.</p>
      <form class="muteform" id="muteForm">
        <input id="muteInput" type="text" placeholder="e.g. openings" autocomplete="off">
        <button class="pill primary" type="submit">Mute topic</button>
      </form>
      ${muted.length ? `<div class="mutelist">${muted.map(t => `<button class="mutechip" data-unmute="${esc(t)}" title="Unmute ${esc(t)}">${esc(tagLabel(t))} <span>×</span></button>`).join("")}</div>`
        : `<p class="setnote">Nothing muted. You can also mute a topic from the ⋮ menu on any video.</p>`}
      ${muted.length ? `<p class="setnote">${countMuted()} video${countMuted() === 1 ? "" : "s"} in the catalogue are hidden by these.</p>` : ""}
    </section>

    <section class="setsec">
      <h2>Kids mode</h2>
      <p class="setintro">Kids mode is kept on the server rather than in this browser, so it can't be switched off from the console — it needs the PIN. ${state.kids ? "It's on right now." : "It's off right now."}</p>
      <button class="pill ${state.kids ? "subbed" : "primary"}" data-kids>${ICONS.kids}${state.kids ? "Turn Kids mode off" : "Turn Kids mode on"}</button>
    </section>

    <section class="setsec">
      <h2>Your data</h2>
      <p class="setintro">Your history, likes, subscriptions and settings are saved in this browser and nowhere else. Woodstock has ${state.history.length} watch${state.history.length === 1 ? "" : "es"} and ${state.liked.length} like${state.liked.length === 1 ? "" : "s"} noted down${state.kids ? "" : `, across ${tasteShares(6).topics} topic${tasteShares(6).topics === 1 ? "" : "s"}`}.</p>
      <div class="setbtns">
        <button class="btn" id="clearHist">${ICONS.reset}Clear watch history</button>
        <a class="btn" href="/reset" id="resetBtn">${ICONS.reset}Reset everything</a>
      </div>
    </section>
  </div>`;
}
// How much the mute list is actually hiding — vague to say "it works", honest to count.
function countMuted(){
  const m = mutedTags();
  return VIDEOS.filter(v => !(v.fromSearch && !v.custom) && !notMuted(v, m)).length;
}

function submitMute(){
  const el = document.getElementById("muteInput"); if(!el) return;
  const t = el.value.trim(); if(!t) return;
  muteTag(t); render();
}
