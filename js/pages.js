// pages.js — Sidebar nav and every page (home, watch, search, history, ...).

/* ---------- NAV ---------- */
function renderNav(){
  const route=location.hash||"#/";
  const item=(href,icon,label)=>`<a class="navitem ${route.split("?")[0]===href?"active":""}" href="${href}">${icon}<span>${label}</span></a>`;
  const tags=topTags(6); const maxW=tags.length?tags[0][1]:1;
  document.getElementById("nav").innerHTML=`
  <div class="navsec">
    <a class="navitem kidsitem${state.kids?" kidson":""}" href="#" data-kids><span class="kidsicon">🧸</span><span>Kids mode</span>${state.kids?`<span class="kidsbadge">ON</span>`:""}</a>
    ${item("#/",ICONS.home,"Home")}
    ${item("#/trending",ICONS.trending,"Trending")}
    ${item("#/subscriptions",ICONS.subs,"Subscriptions")}
  </div>
  <div class="navsec">
    <div class="navtitle">You</div>
    ${item("#/history",ICONS.history,"History")}
    ${item("#/liked",ICONS.liked,"Liked videos")}
  </div>
  <div class="navsec hidemini">
    <div class="navtitle">Snoopy's notes on you</div>
    ${tags.length?`<div class="taste">${tags.map(([t,w])=>`<div class="tag"><span style="width:82px;overflow:hidden;text-overflow:ellipsis">${esc(t)}</span><div class="bar"><i style="width:${Math.round(w/maxW*100)}%"></i></div></div>`).join("")}</div>
    <div class="navsub">Woodstock has taken notes on ${state.history.length} watch${state.history.length===1?"":"es"} and ${state.liked.length} like${state.liked.length===1?"":"s"}.</div>`
    :`<div class="navsub">Nothing in the doghouse yet. Watch a few videos and Snoopy will start fetching things you'll like.</div>`}
  </div>
  <div class="navsec hidemini">
    <div class="navtitle">Subscriptions</div>
    ${state.subs.length?state.subs.map(ch=>`<a class="navitem" href="#/channel/${encodeURIComponent(ch)}">${avatar(ch)}<span style="overflow:hidden;text-overflow:ellipsis">${esc(ch)}</span></a>`).join(""):`<div class="navsub">Subscribe to a channel from a video page and it'll show up here.</div>`}
  </div>
  <div class="navsec hidemini">
    <div class="navtitle">Explore</div>
    ${CATS.slice(1).map(c=>`<a class="navitem" href="#/?cat=${encodeURIComponent(c)}"><span style="width:24px;text-align:center">${catEmoji(c)}</span><span>${c}</span></a>`).join("")}
  </div>
  <div class="navsec hidemini">
    ${item("#/added",ICONS.plus,"Added by you")}
    <a class="navitem" href="#/reset" id="resetBtn">${ICONS.reset}<span>Reset SnoopyTube</span></a>
    <div class="navsub">SnoopyTube plays real YouTube videos through YouTube's own player. Your history never leaves this browser.</div>
  </div>`;
}
// Bottom tab bar (phones only — see the media query in style.css).
function renderTabBar(){
  const el=document.getElementById("tabbar"); if(!el) return;
  const here=(location.hash||"#/").split("?")[0];
  const tab=(href,icon,label)=>`<a class="${here===href?"active":""}" href="${href}">${icon}<span>${label}</span></a>`;
  el.innerHTML=tab("#/",ICONS.home,"Home")+tab("#/trending",ICONS.trending,"Trending")
    +tab("#/subscriptions",ICONS.subs,"Subs")+tab("#/history",ICONS.history,"History")
    +`<a href="#" data-openmenu>${ICONS.more}<span>More</span></a>`;
}
const catEmoji=c=>({"Minecraft PvP":"⚔️",Chess:"♟️",YouTube:"▶️",Education:"🎓",Science:"🔬",Coding:"💻",Gaming:"🎮",Entertainment:"🎪",Movies:"🎬",Comedy:"😂",Cooking:"🍳",Fitness:"💪",Nature:"🌿",Space:"🚀"}[c]||"📺");

/* ---------- PAGES ---------- */
/* ---------- LOAD MORE ----------
   Pages show PAGE_SIZE cards, then a "Load more" button. The rest of the list
   waits in PENDING; app.js appends the next batch into the grid when clicked
   (no re-render, so the order — and any playing video — is left alone). */
const PAGE_SIZE=20; let PENDING=[];
function loadMore(rest){
  PENDING=rest;
  return rest.length?`<div class="loadmore"><button class="pill" id="loadMore">${ICONS.plus}Load more (${rest.length} more)</button></div>`:"";
}
function appendMore(){
  const grid=document.querySelector(".grid"), btn=document.getElementById("loadMore"); if(!grid||!btn) return;
  const batch=PENDING.slice(0,PAGE_SIZE); PENDING=PENDING.slice(PAGE_SIZE);
  const again=grid.querySelector(".shelf.again");           // keep "Watch again" at the bottom
  if(again) again.insertAdjacentHTML("beforebegin",batch.map(card).join("")); else grid.insertAdjacentHTML("beforeend",batch.map(card).join(""));
  if(PENDING.length) btn.innerHTML=`${ICONS.plus}Load more (${PENDING.length} more)`; else btn.parentElement.remove();
}

function pageHome(cat){
  const p=buildProfile();
  const recs=recommend({cat});
  const last=state.history[0]&&byId[state.history[0].id];
  let html=chips(cat,"#/");
  if(!state.history.length){
    html+=`<div class="notice"><svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg><div><b>Welcome to SnoopyTube!</b> Right now you're seeing what's popular. Watch, like or subscribe to anything and Snoopy will start fetching videos you'll love. Search for anything and Snoopy fetches results straight from YouTube.</div></div>`;
  }
  if(!recs.length){ html+=`<div class="empty"><h2>Nothing left to recommend here</h2>You've watched everything in this category. Check History to watch again.</div>`; }
  const first=recs.slice(0,8), rest=recs.slice(8);
  html+=`<div class="grid">${first.map(card).join("")}`;
  if(last && cat==="All"){
    const sim=similar(last,4).filter(r=>!p.watched.has(r.v.id));
    if(sim.length) html+=`<div class="shelf"><h2><span class="ic">${ICONS.spark}</span>Because you watched <em style="font-style:normal;color:var(--text2)">&nbsp;${esc(last.title.length>50?last.title.slice(0,50)+"…":last.title)}</em></h2><div class="row">${sim.map(card).join("")}</div></div>`;
  }
  html+=rest.slice(0,PAGE_SIZE-8).map(card).join("");
  if(state.history.length && cat==="All"){
    const again=state.history.slice(0,4).map(h=>byId[h.id]).filter(Boolean);
    html+=`<div class="shelf again"><h2><span class="ic">${ICONS.history}</span>Watch again<small><a href="#/history">View all</a></small></h2><div class="row">${again.map(v=>card({v})).join("")}</div></div>`;
  }
  html+=`</div>`+loadMore(recs.slice(PAGE_SIZE));
  return `<div class="page">${html}</div>`;
}
function pageTrending(cat){
  const list=VIDEOS.filter(v=>kidsAllows(v)&&(cat==="All"||v.cat===cat)).sort((a,b)=>b.views-a.views);
  return `<div class="page">${chips(cat,"#/trending")}<h1 class="pagetitle">🔥 Trending in the neighbourhood</h1><div class="grid">${list.slice(0,PAGE_SIZE).map(v=>card({v})).join("")}</div>${loadMore(list.slice(PAGE_SIZE).map(v=>({v})))}</div>`;
}
function pageSearch(q){
  const p=buildProfile(); const ql=q.toLowerCase().split(/\s+/).filter(Boolean);
  // 1. Instant results from videos SnoopyTube already knows (catalogue + ones you've saved)
  const words=str=>str.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(Boolean);
  const hit=(list,w)=>list.some(x=>x===w||(w.length>=4&&x.startsWith(w)));   // whole words (or a 4+ letter prefix), not substrings
  const res=VIDEOS.filter(v=>kidsAllows(v)&&!(v.fromSearch&&!v.custom)).map(v=>{
    const t=words(v.title), c=words(v.ch), g=[...v.tags,v.cat.toLowerCase()];
    let m=0, matched=0;
    ql.forEach(w=>{ if(hit(t,w)){m+=3;matched++;} else if(hit(c,w)){m+=2;matched++;} else if(hit(g,w)){m+=1;matched++;} });
    if(matched<ql.length) return null;                        // every search word must match somewhere
    const sc=scoreVideo(v,p); return {v,s:m*2+sc.s*0.1,why:sc.why};
  }).filter(Boolean).sort((a,b)=>b.s-a.s);
  // 2. Live results from YouTube — unless Kids mode is set to built-in videos only
  if(!catalogueOnly()) setTimeout(()=>fillYouTubeResults(q),0);
  return `<div class="page"><h1 class="pagetitle">Results for “${esc(q)}”</h1>
  ${res.length?`<div class="list">${res.map(r=>listCard(r)).join("")}</div>`:""}
  ${catalogueOnly() ? `<p class="note" style="max-width:1100px">🧸 Kids mode is set to built-in videos only, so SnoopyTube isn't searching YouTube.${res.length?"":" Nothing here matched — try another word."}</p>`
    : `<h2 class="ytheading"><span class="ytlogo">▶</span> From YouTube</h2>
  <div class="list" id="ytResults"><div class="searching">${ICONS.spark} Snoopy is sniffing around YouTube for “${esc(q)}”…</div></div>`}</div>`;
}
async function fillYouTubeResults(q){
  const box=document.getElementById("ytResults"); if(!box) return;
  try{
    const list=await searchYouTubeLive(q);
    if(!document.getElementById("ytResults")) return;                  // user already navigated away
    box.innerHTML=list.length?list.map(v=>listCard({v})).join(""):`<div class="empty">YouTube had nothing for that either.</div>`;
  }catch(e){
    box.innerHTML=`<div class="ytfallback">
      <div><b>Couldn't reach YouTube search</b> (${esc(e.message)}). You can still open YouTube and paste a link.</div>
      <a class="pill yt" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}" target="_blank" rel="noopener">Search YouTube for “${esc(q)}”</a>
      <button class="pill" data-addvideo>${ICONS.plus}Paste a link to add it</button>
    </div>`;
  }
}
function pageHistory(){
  const list=state.history.map(h=>({v:byId[h.id],h})).filter(x=>x.v);
  return `<div class="page"><div class="pagehead"><h1 class="pagetitle">Watch history</h1>${list.length?`<button class="btn" id="clearHist">${ICONS.reset}Clear all watch history</button>`:""}</div>
  ${list.length?`<div class="list">${list.map(({v,h})=>listCard({v},` • Watched ${timeAgo(h.t)}${h.n>1?` • ${h.n} times`:""}`)).join("")}</div>`:`<div class="empty"><h2>Nothing in the doghouse yet</h2>Watch history isn't just a list — it's what Snoopy uses to pick your recommendations.</div>`}</div>`;
}
function pageLiked(){
  const list=state.liked.map(id=>byId[id]).filter(Boolean);
  return `<div class="page"><h1 class="pagetitle">Liked videos</h1>${list.length?`<div class="list">${list.map(v=>listCard({v})).join("")}</div>`:`<div class="empty"><h2>No liked videos yet</h2>Liking a video strongly boosts similar videos in your feed.</div>`}</div>`;
}
function pageSubs(){
  if(!state.subs.length) return `<div class="page"><h1 class="pagetitle">Subscriptions</h1><div class="empty"><h2>Don't miss new videos</h2>Subscribe to a channel from any video page to see its videos here.</div></div>`;
  const list=VIDEOS.filter(v=>state.subs.includes(v.ch));
  return `<div class="page"><h1 class="pagetitle">Latest from your subscriptions</h1><div class="grid">${list.map(v=>card({v})).join("")}</div></div>`;
}
function pageAdded(){
  const list=state.custom.map(v=>byId[v.id]).filter(Boolean).reverse();
  return `<div class="page"><div class="pagehead"><h1 class="pagetitle">Added by you</h1><button class="pill primary" data-addvideo>${ICONS.plus}Add video</button></div>
  ${list.length?`<div class="grid">${list.map(v=>card({v})).join("")}</div>`:`<div class="empty"><h2>Bring any YouTube video into SnoopyTube</h2>Paste a YouTube link and it joins the catalogue — Snoopy will recommend it like any other video.</div>`}</div>`;
}
function pageChannel(ch){
  const list=VIDEOS.filter(v=>v.ch===ch); if(!list.length) return `<div class="page"><div class="empty"><h2>Channel not found</h2></div></div>`;
  const total=list.reduce((a,v)=>a+v.views,0); const subbed=state.subs.includes(ch);
  return `<div class="page"><div style="display:flex;align-items:center;gap:24px;padding:32px 0 16px;border-bottom:1px solid var(--line);margin-bottom:8px">
    ${avatar(ch)}<style>.page>div>.avatar{width:128px;height:128px;font-size:48px}</style>
    <div><h1 style="font-size:32px;font-weight:700">${esc(ch)}</h1><div class="cmeta">${fmtViews(total)} total views • ${list.length} video${list.length===1?"":"s"}</div>
    <button class="pill ${subbed?"subbed":"primary"}" data-sub="${esc(ch)}" style="margin-top:12px">${subbed?"Subscribed ✓":"Subscribe"}</button></div>
  </div><div class="grid">${list.map(v=>card({v})).join("")}</div></div>`;
}
function pageWatch(id){
  const v=byId[id]; if(!v) return `<div class="page"><div class="empty"><h2>Video not found</h2></div></div>`;
  if(!state.history[0]||state.history[0].id!==id) recordWatch(id);
  return `<div class="watch"><div class="wmain">
    <div class="player"><iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0" title="${esc(v.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
    <h1 class="wtitle">${esc(v.title)}</h1>
    <div class="wrow" id="wrow">${watchRow(v)}</div>
    <div class="desc" id="descBox">
      <div class="stats">${v.views?fmtViews(v.views)+" views • ":""}${esc(v.age)}</div>
      <div class="tags">${v.tags.map(t=>`<a href="#/search/${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")}</div>
      <div class="txt">${esc(v.title)} — from ${esc(v.ch)}.

This video is embedded from YouTube. If it says "Video unavailable" the uploader has disabled embedding — use the Watch on YouTube button above.

Category: ${v.cat}</div>
    </div>
  </div>
  <div class="wside" id="wside">${upNext(v)}</div></div>`;
}
// The channel + like/dislike/subscribe/menu row. Kept separate so refreshWatch()
// can redraw just this bit — re-rendering the whole page would restart the video.
function watchRow(v){
  const id=v.id, liked=state.liked.includes(id), disliked=state.disliked.includes(id), subbed=state.subs.includes(v.ch);
  return `<div class="wch">${avatar(v.ch)}<div><a class="name" href="#/channel/${encodeURIComponent(v.ch)}">${esc(v.ch)}</a><div class="subs">${fmtViews(Math.round((v.views||1e5)/40))} subscribers</div></div>
      <button class="pill ${subbed?"subbed":"primary"}" data-sub="${esc(v.ch)}" style="margin-left:12px">${subbed?"Subscribed ✓":"Subscribe"}</button></div>
    <div class="wacts">
      <div class="likegroup">
        <button class="${liked?"on":""}" data-like="${id}">${ICONS.liked}${fmtViews(Math.round((v.views||1e5)/60)+(liked?1:0))}</button>
        <button class="${disliked?"on":""}" data-dislike="${id}"><span style="display:inline-flex;transform:rotate(180deg)">${ICONS.liked}</span></button>
      </div>
      <a class="pill yt" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">${ICONS.yt}Watch on YouTube</a>
      <div class="wmore"><button class="pill" data-menu="${id}">${ICONS.more}More</button>
        <div class="menu" id="menu-${id}">${menuItems(v)}</div></div>
    </div>`;
}
function upNext(v){
  if(!catalogueOnly()) setTimeout(()=>fillUpNext(v),0);
  return `<h3>Up next</h3><div id="upnextLocal">${similar(v, catalogueOnly()?20:8).map(sideCard).join("")}</div>
    ${catalogueOnly() ? "" : `<div id="upnextYt"><div class="searching small">${ICONS.spark} Finding related videos on YouTube…</div></div>`}`;
}
// Ask YouTube for videos like this one: the channel name plus a couple of title words.
// Works for any video, including ones that came from search and have no catalogue neighbours.
async function fillUpNext(v){
  const box=document.getElementById("upnextYt"); if(!box) return;
  const words=v.title.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>3&&!STOPWORDS.has(w)).slice(0,3);
  try{
    const list=await searchYouTubeLive(v.ch+" "+words.join(" "));
    if(!document.getElementById("upnextYt")||location.hash!=="#/watch/"+v.id) return;
    const shown=new Set([v.id,...[...document.querySelectorAll("#upnextLocal .card")].map(c=>c.dataset.id)]);
    const fresh=list.filter(x=>!shown.has(x.id)&&!state.notInterested.includes(x.id)).slice(0,12);
    box.innerHTML=fresh.map(x=>sideCard({v:x,why:x.ch===v.ch?{t:"More from "+x.ch,k:"ch"}:{t:"Related on YouTube",k:"tag"}})).join("");
  }catch(e){ box.innerHTML=""; }
}
function refreshWatch(id){
  const v=byId[id], row=document.getElementById("wrow"); if(!v||!row) return;
  row.innerHTML=watchRow(v); renderNav();
}
function refreshUpNext(id){ const v=byId[id], side=document.getElementById("wside"); if(v&&side) side.innerHTML=upNext(v); }
const onWatchPage=()=>location.hash.startsWith("#/watch/");
const timeAgo=t=>{const d=Date.now()-t,m=Math.floor(d/6e4),h=Math.floor(m/60),dd=Math.floor(h/24);return dd>0?`${dd} day${dd>1?"s":""} ago`:h>0?`${h} hour${h>1?"s":""} ago`:m>0?`${m} min ago`:"just now"};

/* ---------- ADD VIDEO DIALOG ---------- */
function addDialogHtml(){
  return `<div class="dialog">
    <h2>${ICONS.plus} Add a YouTube video</h2>
    <p>Paste any YouTube link. Snoopy fetches the title, channel and thumbnail from YouTube and adds it to the catalogue.</p>
    <form id="addForm">
      <input id="addLink" type="text" placeholder="https://www.youtube.com/watch?v=..." autocomplete="off">
      <label>Category <select id="addCat">${CATS.slice(1).map(c=>`<option>${c}</option>`).join("")}</select></label>
      <div class="err" id="addErr"></div>
      <div class="dlgbtns"><button type="button" class="pill" data-closedialog>Cancel</button><button type="submit" class="pill primary" id="addGo">Add to SnoopyTube</button></div>
    </form>
  </div>`;
}
