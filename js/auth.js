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
const auth = { user: null, token: null };

const authConfigured = () => typeof firebase !== "undefined" && FIREBASE_CONFIG.apiKey;
const ytConnected = () => !!(auth.user && auth.token);

function initAuth(){
  if(!authConfigured()) return renderAuthButton();
  firebase.initializeApp(FIREBASE_CONFIG);
  // Firebase remembers the user, but not the Google access token — we keep that for the session.
  try{ const t = JSON.parse(sessionStorage.getItem("snoopytube.yt") || "null"); if(t && t.exp > Date.now()) auth.token = t.token; }catch(e){}
  firebase.auth().onAuthStateChanged(u => { auth.user = u; renderAuthButton(); });
}

async function signIn(){
  if(!authConfigured()) return openSetupDialog();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/youtube.force-ssl");
  try{
    const res = await firebase.auth().signInWithPopup(provider);
    auth.user = res.user; auth.token = res.credential?.accessToken || null;
    if(auth.token) sessionStorage.setItem("snoopytube.yt", JSON.stringify({ token: auth.token, exp: Date.now() + 55 * 60 * 1000 }));
    if(!auth.token) toast("Signed in, but YouTube permission wasn't granted — sign out and back in, and tick the YouTube box");
    else { toast("Signed in as " + res.user.displayName + " — likes and subscriptions now sync to YouTube"); importSubscriptions(); }
  }catch(e){ toast("Sign-in failed: " + (e.message || e.code)); }
  renderAuthButton();
}
function signOut(){
  firebase.auth().signOut(); auth.user = null; auth.token = null;
  sessionStorage.removeItem("snoopytube.yt"); toast("Signed out — SnoopyTube is back to local-only"); renderAuthButton();
}

/* ---------- YouTube API ---------- */
async function ytApi(method, path, body){
  const r = await fetch(YT_API + path, { method, headers: { Authorization: "Bearer " + auth.token, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if(r.status === 204) return {};
  const j = await r.json().catch(() => ({}));
  if(!r.ok){
    if(r.status === 401){ auth.token = null; sessionStorage.removeItem("snoopytube.yt"); renderAuthButton(); throw new Error("YouTube session expired — click your avatar to reconnect"); }
    const reason = j.error?.errors?.[0]?.reason || "";
    throw Object.assign(new Error(FRIENDLY[reason] || j.error?.message || "YouTube API error " + r.status), { reason });
  }
  return j;
}
// Plain-English versions of the API errors you're most likely to hit.
const FRIENDLY = {
  accessNotConfigured: "YouTube Data API v3 isn't enabled on your Firebase project yet — enable it in Google Cloud, then reload",
  quotaExceeded: "Your project's YouTube API quota for today is used up — it resets at midnight Pacific time",
  insufficientPermissions: "SnoopyTube wasn't granted YouTube permission — sign out and back in, and tick the YouTube box",
  forbidden: "YouTube refused that — your Google account may not have a YouTube channel yet",
  subscriptionDuplicate: "You're already subscribed on YouTube (it only counts once)",
};
const syncFail = e => toast(e.reason === "subscriptionDuplicate" ? FRIENDLY.subscriptionDuplicate : "Couldn't sync to YouTube: " + e.message);

async function ytRate(id, rating){                 // rating: "like" | "dislike" | "none"
  if(!ytConnected()) return;
  try{ await ytApi("POST", `videos/rate?id=${id}&rating=${rating}`); toast(rating === "none" ? "Rating removed on YouTube too" : `Also ${rating}d on YouTube ✓`); }
  catch(e){ syncFail(e); }
}
async function channelIdFor(v){
  if(v.channelId) return v.channelId;
  const j = await ytApi("GET", `videos?part=snippet&id=${v.id}`);
  v.channelId = j.items?.[0]?.snippet.channelId; return v.channelId;
}
async function ytSubscribe(chName, on){
  if(!ytConnected()) return;
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
  box.innerHTML = `<div class="wmore"><button class="avatar authavatar ${auth.token ? "" : "stale"}" data-menu="auth" title="${esc(auth.user.displayName || "")}">${pic}</button>
    <div class="menu" id="menu-auth">
      <div class="menuinfo"><b>${esc(auth.user.displayName || "")}</b><br><small>${esc(auth.user.email || "")}</small></div>
      <div class="menuinfo ${auth.token ? "ok" : "warn"}">${auth.token ? "✓ Likes & subscriptions sync to YouTube" : "⚠ YouTube link expired"}</div>
      ${auth.token ? "" : `<div data-signin>${ICONS.google}Reconnect YouTube</div>`}
      <div data-signout>${ICONS.block}Sign out</div>
    </div></div>`;
}
function openSetupDialog(){
  const d = document.getElementById("dialog");
  d.innerHTML = `<div class="dialog"><h2>${ICONS.google} Google sign-in isn't set up yet</h2>
    <p>Signing in lets your likes, dislikes and subscriptions on SnoopyTube apply to your real YouTube account. It needs a free Firebase project — the steps are in <code>js/firebase-config.js</code>:</p>
    <ol class="steps">
      <li>Create a Firebase project and add a Web app; paste its config into <code>js/firebase-config.js</code></li>
      <li>Authentication → Sign-in method → enable <b>Google</b></li>
      <li>Authentication → Settings → Authorized domains → add <b>snoopytube.vercel.app</b></li>
      <li>In Google Cloud (same project): enable <b>YouTube Data API v3</b>, add the <b>youtube.force-ssl</b> scope and yourself as a test user</li>
    </ol>
    <div class="dlgbtns"><button class="pill primary" data-closedialog>Got it</button></div></div>`;
  d.classList.add("open");
}
