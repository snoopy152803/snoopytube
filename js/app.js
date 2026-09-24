// app.js — Hash router, click handling and the toast. Loaded last.

/* ---------- ROUTER ---------- */
function render(){
  const hash=location.hash||"#/";
  const [path,qs]=hash.slice(1).split("?");
  const params=new URLSearchParams(qs||""); const cat=params.get("cat")||"All";
  const seg=path.split("/").filter(Boolean);
  const main=document.getElementById("main");
  let html="";
  if(seg.length===0) html=pageHome(cat);
  else if(seg[0]==="watch") html=pageWatch(seg[1]);
  else if(seg[0]==="search") html=pageSearch(decodeURIComponent(seg.slice(1).join("/")||""));
  else if(seg[0]==="trending") html=pageTrending(cat);
  else if(seg[0]==="history") html=pageHistory();
  else if(seg[0]==="liked") html=pageLiked();
  else if(seg[0]==="subscriptions") html=pageSubs();
  else if(seg[0]==="added") html=pageAdded();
  else if(seg[0]==="channel") html=pageChannel(decodeURIComponent(seg[1]||""));
  else if(seg[0]==="reset"){ resetAll(); location.hash="#/"; return; }
  else html=pageHome("All");
  main.innerHTML=html; renderNav(); renderTabBar(); closeDrawer();
  if(seg[0]!=="watch") window.scrollTo(0,0); else window.scrollTo({top:0});
  document.getElementById("searchInput").value=seg[0]==="search"?decodeURIComponent(seg[1]||""):"";
  document.title=(seg[0]==="watch"&&byId[seg[1]]?byId[seg[1]].title+" - ":"")+"SnoopyTube";
}
window.addEventListener("hashchange",render);

/* ---------- ADD VIDEO DIALOG ---------- */
function openAddDialog(){
  const d=document.getElementById("dialog"); d.innerHTML=addDialogHtml(); d.classList.add("open");
  setTimeout(()=>document.getElementById("addLink").focus(),50);
}
function closeDialog(){ document.getElementById("dialog").classList.remove("open"); }
async function submitAddDialog(){
  const link=document.getElementById("addLink").value, cat=document.getElementById("addCat").value, err=document.getElementById("addErr"), go=document.getElementById("addGo");
  err.textContent=""; go.disabled=true; go.textContent="Fetching…";
  try{
    const v=await addCustomVideo(link,cat);
    closeDialog(); toast("Added “"+v.title.slice(0,40)+(v.title.length>40?"…":"")+"”"); location.hash="#/watch/"+v.id; render();
  }catch(e){ err.textContent=e.message; go.disabled=false; go.textContent="Add to SnoopyTube"; }
}

/* ---------- SHARE & DOWNLOAD ---------- */
function shareVideo(id){
  const url="https://www.youtube.com/watch?v="+id;
  if(navigator.share) navigator.share({title:byId[id]?.title,url}).catch(()=>{});
  else navigator.clipboard?.writeText(url).then(()=>toast("YouTube link copied")).catch(()=>toast(url));
}
async function downloadVideo(id,fmt){
  // api/download.js runs yt-dlp (+ffmpeg for MP3) on the server. That only exists
  // when SnoopyTube runs locally with `node dev.js` — Vercel can't run yt-dlp.
  const name=(byId[id]?.title||id).replace(/[\/:*?"<>|]+/g,"").slice(0,80);
  const url=`/api/download?id=${id}&fmt=${fmt}&name=${encodeURIComponent(name)}`;
  toast("Checking Snoopy's download tools…");
  try{
    const r=await fetch(url+"&check=1"); const j=await r.json();
    if(!r.ok) return toast(j.error||"Downloads aren't available here");
    toast(`Snoopy is fetching the ${fmt.toUpperCase()} — this can take a minute…`);
    window.location.href=url;                 // server replies with a file attachment
  }catch(e){ toast("Downloads only work when running SnoopyTube locally (node dev.js)"); }
}

/* ---------- EVENTS ---------- */
// On a phone the button opens the drawer; on a desktop it collapses the sidebar.
const isPhone=()=>window.matchMedia("(max-width:800px)").matches;
const closeDrawer=()=>document.body.classList.remove("drawer");
document.getElementById("menuBtn").onclick=()=>{
  if(isPhone()) return document.body.classList.toggle("drawer");
  state.mini=!state.mini; save(); document.body.classList.toggle("mini",state.mini);
};
document.body.classList.toggle("mini",state.mini);
document.getElementById("searchToggle").onclick=()=>{
  document.body.classList.add("searching");
  document.getElementById("searchInput").focus();
};
document.getElementById("searchInput").addEventListener("blur",()=>setTimeout(()=>document.body.classList.remove("searching"),150));
document.getElementById("searchForm").onsubmit=e=>{e.preventDefault();const q=document.getElementById("searchInput").value.trim();document.body.classList.remove("searching"); document.getElementById("searchInput").blur(); if(q)location.hash="#/search/"+encodeURIComponent(q)};
document.addEventListener("click",e=>{
  const menuBtn=e.target.closest("[data-menu]");
  document.querySelectorAll(".menu.open").forEach(m=>{ if(!menuBtn||m.id!=="menu-"+menuBtn.dataset.menu) m.classList.remove("open"); });
  document.querySelectorAll(".more.open").forEach(m=>m.classList.remove("open"));
  if(menuBtn){ e.preventDefault(); e.stopPropagation(); const m=document.getElementById("menu-"+menuBtn.dataset.menu); m.classList.toggle("open"); menuBtn.classList.toggle("open",m.classList.contains("open")); return; }
  const act=e.target.closest("[data-act]");
  if(act){
    const id=act.dataset.id, a=act.dataset.act;
    if(a==="like"){ toggleLike(id); onWatchPage()?refreshWatch(id):render(); }
    else if(a==="share") shareVideo(id);
    else if(a==="dl") downloadVideo(id,act.dataset.fmt);
    else if(a==="yt") window.open("https://www.youtube.com/watch?v="+id,"_blank","noopener");
    else if(a==="ni"){ notInterested(id); onWatchPage()?refreshUpNext(location.hash.split("/")[2]):render(); }
    return;
  }
  if(e.target.closest("[data-stop]")) return;              // channel link inside a card
  const c=e.target.closest(".card"); if(c){ location.hash="#/watch/"+c.dataset.id; return; }
  // On the watch page these only redraw the controls row, so the video keeps playing.
  const cur=()=>location.hash.split("/")[2];
  const sub=e.target.closest("[data-sub]"); if(sub){ toggleSub(sub.dataset.sub); onWatchPage()?refreshWatch(cur()):render(); return; }
  const like=e.target.closest("[data-like]"); if(like){ toggleLike(like.dataset.like); onWatchPage()?refreshWatch(cur()):render(); return; }
  const dis=e.target.closest("[data-dislike]"); if(dis){ toggleDislike(dis.dataset.dislike); onWatchPage()?refreshWatch(cur()):render(); return; }
  if(e.target.closest("#scrim")){ closeDrawer(); return; }
  if(e.target.closest("[data-openmenu]")){ e.preventDefault(); document.body.classList.toggle("drawer"); return; }
  if(e.target.closest("nav a")) closeDrawer();
  if(e.target.closest("[data-signin]")){ signIn(); return; }
  if(e.target.closest("[data-signout]")){ signOut(); return; }
  if(e.target.closest("[data-connectyt]")){ closeDialog(); connectYouTube(); return; }
  if(e.target.closest("[data-ythelp]")){ openYouTubeHelp(); return; }
  if(e.target.closest("[data-kids]")){ e.preventDefault(); closeDrawer(); openKidsDialog(); return; }
  if(e.target.closest("#kidsOn")){ enableKids(); return; }
  if(e.target.closest("#kidsOff")){ disableKids(); return; }
  if(e.target.closest("[data-addvideo]")){ openAddDialog(); return; }
  if(e.target.closest("[data-closedialog]")||e.target.id==="dialog"){ closeDialog(); return; }
  if(e.target.closest("#loadMore")){ appendMore(); return; }
  if(e.target.closest("#clearHist")){ clearHistory(); return; }
  if(e.target.closest("#resetBtn")){ e.preventDefault(); resetAll(); return; }
});
let toastT; function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2600); }
document.addEventListener("submit",e=>{ if(e.target.id==="addForm"){ e.preventDefault(); submitAddDialog(); } });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeDialog(); closeDrawer(); } });

/* ---------- START ---------- */
mergeCustomVideos(state.custom);   // videos you added from YouTube links
buildIndex();
render();
initAuth();
