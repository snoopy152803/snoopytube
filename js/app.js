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
  main.innerHTML=html; renderNav();
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

/* ---------- EVENTS ---------- */
document.getElementById("menuBtn").onclick=()=>{state.mini=!state.mini;save();document.body.classList.toggle("mini",state.mini)};
document.body.classList.toggle("mini",state.mini);
document.getElementById("searchForm").onsubmit=e=>{e.preventDefault();const q=document.getElementById("searchInput").value.trim();if(q)location.hash="#/search/"+encodeURIComponent(q)};
document.addEventListener("click",e=>{
  const menuBtn=e.target.closest("[data-menu]");
  document.querySelectorAll(".menu.open").forEach(m=>{ if(!menuBtn||m.id!=="menu-"+menuBtn.dataset.menu) m.classList.remove("open"); });
  document.querySelectorAll(".more.open").forEach(m=>m.classList.remove("open"));
  if(menuBtn){ e.preventDefault(); e.stopPropagation(); const m=document.getElementById("menu-"+menuBtn.dataset.menu); m.classList.toggle("open"); menuBtn.classList.toggle("open",m.classList.contains("open")); return; }
  const act=e.target.closest("[data-act]");
  if(act){ const id=act.dataset.id; if(act.dataset.act==="like"){toggleLike(id);render();} else if(act.dataset.act==="yt") window.open("https://www.youtube.com/watch?v="+id,"_blank","noopener"); else if(act.dataset.act==="ni") notInterested(id); return; }
  if(e.target.closest("[data-stop]")) return;              // channel link inside a card
  const c=e.target.closest(".card"); if(c){ location.hash="#/watch/"+c.dataset.id; return; }
  const sub=e.target.closest("[data-sub]"); if(sub){ toggleSub(sub.dataset.sub); render(); return; }
  const like=e.target.closest("[data-like]"); if(like){ toggleLike(like.dataset.like); render(); return; }
  const dis=e.target.closest("[data-dislike]"); if(dis){ toggleDislike(dis.dataset.dislike); render(); return; }
  const sh=e.target.closest("[data-share]"); if(sh){ navigator.clipboard?.writeText("https://www.youtube.com/watch?v="+sh.dataset.share).then(()=>toast("YouTube link copied")).catch(()=>toast("https://youtu.be/"+sh.dataset.share)); return; }
  if(e.target.closest("[data-addvideo]")){ openAddDialog(); return; }
  if(e.target.closest("[data-closedialog]")||e.target.id==="dialog"){ closeDialog(); return; }
  if(e.target.closest("#addGo")){ submitAddDialog(); return; }
  if(e.target.closest("#clearHist")){ clearHistory(); return; }
  if(e.target.closest("#resetBtn")){ e.preventDefault(); resetAll(); return; }
});
let toastT; function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2600); }
document.addEventListener("keydown",e=>{
  if(e.key==="Escape") closeDialog();
  if(e.key==="Enter"&&e.target.id==="addLink") submitAddDialog();
});

/* ---------- START ---------- */
mergeCustomVideos(state.custom);   // videos you added from YouTube links
buildIndex();
render();
