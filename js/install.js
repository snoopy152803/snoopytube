// install.js — Turns SnoopyTube into an installable desktop app.
//
// Nothing here changes how the site works in a normal tab. It registers sw.js (see
// that file for what the worker does and doesn't cache) and, when the browser says
// the site is installable, puts an "Install app" button in the header. Chrome and
// Edge fire `beforeinstallprompt`; Safari doesn't, so there's a hint for it instead.

if("serviceWorker" in navigator && location.protocol !== "file:"){
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

// True once the app is running in its own window rather than a browser tab.
const standalone = () => window.matchMedia("(display-mode: standalone)").matches
  || window.matchMedia("(display-mode: window-controls-overlay)").matches
  || navigator.standalone === true;

let installEvent = null;

function installButton(){
  const box = document.getElementById("installBox");
  if(!box) return;
  if(standalone() || !installEvent){ box.innerHTML = ""; return; }
  box.innerHTML = `<button class="pill installbtn" id="installBtn" title="Install SnoopyTube as an app">
    <svg viewBox="0 0 24 24"><path d="M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z"/></svg><span>Install app</span></button>`;
}

// The browser hands us this event instead of showing its own prompt, so we keep it
// and fire it from our button — a prompt has to come from a real click.
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvent = e; installButton(); });
window.addEventListener("appinstalled", () => {
  installEvent = null; installButton();
  if(typeof toast === "function") toast("Installed! Snoopy now has his own window 🐶");
});

async function runInstall(){
  if(!installEvent) return;
  const e = installEvent; installEvent = null; installButton();
  e.prompt();
  const { outcome } = await e.userChoice.catch(() => ({ outcome: "dismissed" }));
  if(outcome !== "accepted"){ installEvent = e; installButton(); }   // they said no — offer again later
}

document.body.classList.toggle("app", standalone());
installButton();
