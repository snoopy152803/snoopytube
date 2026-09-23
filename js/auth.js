// auth.js — Google sign-in (Firebase Auth) and mirroring your likes / dislikes /
// subscriptions onto your real YouTube account through the YouTube Data API.
//
// How it works: signing in with Google asks for the "youtube.force-ssl" permission.
// Google hands back an access token, and we call YouTube's API with it:
//   like/dislike  →  POST videos/rate
//   subscribe     →  POST subscriptions   (YouTube refuses duplicates, so you can't
//                                          "subscribe twice" — it only ever counts once)
//   unsubscribe   →  DELETE subscriptions
// Nothing here runs without a signed-in user; SnoopyTube's local history is unaffected.

const YT_API = "https://www.googleapis.com/youtube/v3/";
const YT_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";
const auth = { user: null, token: null, busy: false };

const authConfigured = () => typeof firebase !== "undefined" && FIREBASE_CONFIG.apiKey;
const ytConnected = () => !!(auth.user && auth.token);

/* ---------- keeping the YouTube token ----------
   Firebase remembers who you are, but not Google's access token, so we store that
   ourselves. It lives in localStorage (sessionStorage is wiped when you close the
   tab, which used to log you out of YouTube every time). Google's tokens last about
   an hour, so when one runs out we ask for a new one with a single click and then
   finish whatever you were doing. */
const TOKEN_KEY = "snoopytube.yt", EVER_KEY = "snoopytube.ytconnected";
let pendingSync = null;                      // the like/subscribe to replay after reconnecting

function saveToken(token, lifetimeSec = 3600){
  auth.token = token;
  try{ localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, exp: Date.now() + (lifetimeSec - 120) * 1000 })); localStorage.setItem(EVER_KEY, "1"); }catch(e){}
}
function loadToken(){
  try{
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
    if(t && t.exp > Date.now()){ auth.token = t.token; return true; }
    localStorage.removeItem(TOKEN_KEY);
  }catch(e){}
  return false;
}
function clearToken(){ auth.token = null; try{ localStorage.removeItem(TOKEN_KEY); }catch(e){} }
const everConnected = () => { try{ return localStorage.getItem(EVER_KEY) === "1"; }catch(e){ return false; } };

function initAuth(){
  if(!authConfigured()) return renderAuthButton();
  firebase.initializeApp(FIREBASE_CONFIG);
  loadToken();
  firebase.auth().onAuthStateChanged(u => { auth.user = u; if(!u) clearToken(); renderAuthButton(); });
}

// Two steps on purpose:
//   signIn()          — plain Google sign-in. Works with a stock Firebase project.
//   connectYouTube()  — asks for the extra youtube.force-ssl permission, which needs
//                       the YouTube Data API enabled and the scope on your OAuth
//                       consent screen. Kept separate so a hiccup there can't stop
//                       you signing in at all.
async function popup(scopes){
  if(auth.busy) return null;                       // a second popup cancels the first
  auth.busy = true;
  try{
    const provider = new firebase.auth.GoogleAuthProvider();
    (scopes || []).forEach(sc => provider.addScope(sc));
    return await firebase.auth().signInWithPopup(provider);
  } finally { auth.busy = false; }
}
async function signIn(){
  if(!authConfigured()) return openSetupDialog();
  try{
    const res = await popup(); if(!res) return;
    auth.user = res.user;
    toast("Signed in as " + (res.user.displayName || res.user.email));
  }catch(e){ toast(authError(e)); }
  renderAuthButton();
}
async function connectYouTube(){
  try{
    const res = await popup([YT_SCOPE]); if(!res) return;
    auth.user = res.user;
    const token = res.credential?.accessToken || null;
    if(!token) return toast("Google didn't grant YouTube access — try again and tick the YouTube permission");
    const first = !everConnected();
    saveToken(token);
    toast("YouTube connected — likes and subscriptions now sync ✓");
    if(first) importSubscriptions();          // only the first time, so it can't undo later changes
    flushPending();
  }catch(e){ toast(authError(e)); }
  renderAuthButton();
}
// Firebase's error codes, in plain English.
function authError(e){
  const code = (e && e.code || "").replace("auth/", "");
  return {
    "popup-closed-by-user": "Sign-in window was closed before finishing",
    "cancelled-popup-request": "Another sign-in window was already open — try once more",
    "popup-blocked": "Your browser blocked the sign-in popup — allow popups for this site",
    "operation-not-allowed": "Google sign-in isn't enabled in the Firebase console yet",
    "unauthorized-domain": "Sign-in isn't allowed from this address",
    "internal-error": "Google turned the request down — YouTube syncing may not be switched on for this site yet",
  }[code] || ("Sign-in failed: " + (e.message || code));
}
function signOut(){
  firebase.auth().signOut(); auth.user = null; pendingSync = null; clearToken();
  try{ localStorage.removeItem(EVER_KEY); }catch(e){}
  toast("Signed out — SnoopyTube is back to local-only"); renderAuthButton();
}

/* ---------- YouTube API ---------- */
async function ytApi(method, path, body){
  const r = await fetch(YT_API + path, { method, headers: { Authorization: "Bearer " + auth.token, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if(r.status === 204) return {};
  const j = await r.json().catch(() => ({}));
  if(!r.ok){
    if(r.status === 401){ clearToken(); renderAuthButton(); throw Object.assign(new Error("Your YouTube session ran out"), { reason: "expired" }); }
    const reason = j.error?.errors?.[0]?.reason || "";
    throw Object.assign(new Error(FRIENDLY[reason] || j.error?.message || "YouTube API error " + r.status), { reason });
  }
  return j;
}
// Plain-English versions of the API errors you're most likely to hit.
const FRIENDLY = {
  accessNotConfigured: "YouTube syncing is switched off on this site right now — your likes are still saved here",
  quotaExceeded: "SnoopyTube has hit YouTube's daily limit — it resets at midnight Pacific time. Your likes are still saved here",
  insufficientPermissions: "YouTube permission wasn't granted — reconnect from your avatar menu and tick the YouTube box",
  forbidden: "YouTube refused that — your Google account may not have a YouTube channel yet",
  subscriptionDuplicate: "You're already subscribed on YouTube (it only counts once)",
};
function syncFail(e){
  if(e.reason === "subscriptionDuplicate") return toast(FRIENDLY.subscriptionDuplicate);
  toast("Couldn't sync to YouTube: " + e.message);
  // These two are fixed in the Google Cloud console — open the help dialog so the
  // links are one click away instead of buried in a toast.
  if(e.reason === "insufficientPermissions" || e.reason === "expired") setTimeout(openYouTubeHelp, 600);
}

// Called when a sync is wanted but the token has run out: keep the action, ask once.
function needsReconnect(action){
  if(!auth.user || !everConnected()) return;      // never connected — don't nag
  pendingSync = action;
  toast("Your YouTube session ran out — reconnect to sync that");
  renderAuthButton(); setTimeout(openYouTubeHelp, 500);
}
function flushPending(){
  const a = pendingSync; pendingSync = null;
  if(!a || !ytConnected()) return;
  a.kind === "rate" ? ytRate(a.id, a.rating) : ytSubscribe(a.ch, a.on);
}

async function ytRate(id, rating){                 // rating: "like" | "dislike" | "none"
  if(!auth.user) return;
  if(!auth.token) return needsReconnect({ kind: "rate", id, rating });
  try{ await ytApi("POST", `videos/rate?id=${id}&rating=${rating}`); toast(rating === "none" ? "Rating removed on YouTube too" : `Also ${rating}d on YouTube ✓`); }
  catch(e){ syncFail(e); }
}
async function channelIdFor(v){
  if(v.channelId) return v.channelId;
  const j = await ytApi("GET", `videos?part=snippet&id=${v.id}`);
  v.channelId = j.items?.[0]?.snippet.channelId; return v.channelId;
}
async function ytSubscribe(chName, on){
  if(!auth.user) return;
  if(!auth.token) return needsReconnect({ kind: "sub", ch: chName, on });
  const v = VIDEOS.find(x => x.ch === chName); if(!v) return;
  try{
    const channelId = await channelIdFor(v); if(!channelId) throw new Error("channel not found");
    if(on){
      await ytApi("POST", "subscriptions?part=snippet", { snippet: { resourceId: { kind: "youtube#channel", channelId } } });
      toast("Subscribed on YouTube too ✓");
    }else{
      const j = await ytApi("GET", `subscriptions?part=id&mine=true&forChannelId=${channelId}`);
      const sid = j.items?.[0]?.id;
      if(sid){ await ytApi("DELETE", `subscriptions?id=${sid}`); toast("Unsubscribed on YouTube too"); }
    }
  }catch(e){ syncFail(e); }
}
// Pull your real YouTube subscriptions in so Snoopy's notes start from what you already like.
async function importSubscriptions(){
  try{
    const j = await ytApi("GET", "subscriptions?part=snippet&mine=true&maxResults=50");
    let n = 0; (j.items || []).forEach(i => { const nm = i.snippet.title; if(!state.subs.includes(nm)){ state.subs.push(nm); n++; } });
    if(n){ save(); renderNav(); toast(`Imported ${n} of your YouTube subscriptions into Snoopy's notes`); }
  }catch(e){}
}

/* ---------- header button ---------- */
function renderAuthButton(){
  const box = document.getElementById("authBox"); if(!box) return;
  if(!auth.user){
    box.innerHTML = `<button class="pill" data-signin title="Sign in with Google to sync likes & subscriptions to YouTube">${ICONS.google}<span>Sign in</span></button>`;
    return;
  }
  const pic = auth.user.photoURL ? `<img src="${esc(auth.user.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc((auth.user.displayName || "?")[0]);
  const reconnect = (!auth.token && everConnected()) ? `<button class="pill reconnect" data-ythelp title="Your YouTube session ran out">${ICONS.yt}<span>Reconnect</span></button>` : "";
  box.innerHTML = reconnect + `<div class="wmore"><button class="avatar authavatar ${auth.token ? "" : "stale"}" data-menu="auth" title="${esc(auth.user.displayName || "")}">${pic}</button>
    <div class="menu" id="menu-auth">
      <div class="menuinfo"><b>${esc(auth.user.displayName || "")}</b><br><small>${esc(auth.user.email || "")}</small></div>
      <div class="menuinfo ${auth.token ? "ok" : "warn"}">${auth.token ? "✓ Likes & subscriptions sync to YouTube" : "⚠ Not connected to YouTube — likes stay on SnoopyTube"}</div>
      ${auth.token ? "" : `<div data-ythelp>${ICONS.yt}Connect YouTube</div>`}
      <div data-signout>${ICONS.block}Sign out</div>
    </div></div>`;
}
function openSetupDialog(){
  const d = document.getElementById("dialog");
  d.innerHTML = `<div class="dialog"><h2>${ICONS.google} Sign-in isn't available here</h2>
    <p>Signing in isn't available on this copy of SnoopyTube. Everything else works — your history and recommendations are saved in this browser.</p>
    <div class="dlgbtns"><button class="pill primary" data-closedialog>Got it</button></div></div>`;
  d.classList.add("open");
}
// Shown from the menu when YouTube sync isn't working yet.
// Shown before the Google popup, and from the avatar menu. Written for whoever is
// using the site — no console links or project settings; those live in SETUP.md.
function openYouTubeHelp(){
  const host = (FIREBASE_CONFIG.authDomain || "").replace(/\/$/, "");
  const d = document.getElementById("dialog");
  d.innerHTML = `<div class="dialog"><h2>${ICONS.yt} Connecting YouTube</h2>
    <p>This lets your likes, dislikes and subscriptions here apply to your real YouTube account. Google will ask your permission in a popup.</p>
    <p class="note"><b>You'll see a warning — that's expected.</b><br>
      Google shows “<i>Google hasn't verified this app</i>” for any small app asking for YouTube access. To continue:<br><br>
      1. Click <b>Advanced</b> (bottom left of that screen)<br>
      2. Click <b>Go to ${esc(host)} (unsafe)</b><br>
      3. Tick the YouTube permission and press <b>Continue</b></p>
    <p>You can skip this entirely — SnoopyTube works fine without it, your likes just stay on this site.</p>
    <div class="dlgbtns"><button class="pill" data-closedialog>Not now</button><button class="pill primary" data-connectyt>Continue to Google</button></div></div>`;
  d.classList.add("open");
}
