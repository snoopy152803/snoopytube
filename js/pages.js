// pages.js — Sidebar nav and every page (home, watch, search, history, ...).

/* ---------- NAV ---------- */
function renderNav(){
  const route=location.hash||"#/";
  const item=(href,icon,label)=>`<a class="navitem ${route.split("?")[0]===href?"active":""}" href="${href}">${icon}<span>${label}</span></a>`;
  const tags=topTags(6); const maxW=tags.length?tags[0][1]:1;
  document.getElementById("nav").innerHTML=`
  <div class="navsec">
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
const catEmoji=c=>({Music:"🎵",Education:"🎓",Science:"🔬",Coding:"💻",Gaming:"🎮",Entertainment:"🎪",Movies:"🎬",Comedy:"😂",Cooking:"🍳",Fitness:"💪",Nature:"🌿",Space:"🚀"}[c]||"📺");

/* ---------- PAGES ---------- */
function pageHome(cat){
  const p=buildProfile();
  const recs=recommend({cat});
  const last=state.history[0]&&byId[state.history[0].id];
  let html=chips(cat,"#/");
  if(!state.history.length){
    html+=`<div class="notice"><svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg><div><b>Welcome to SnoopyTube!</b> Right now you're seeing what's popular. Watch, like or subscribe to anything and Snoopy will start fetching videos you'll love. Can't find something? Hit <b>+ Add video</b> and paste any YouTube link.</div></div>`;
  }
  if(!recs.length){ html+=`<div class="empty"><h2>Nothing left to recommend here</h2>You've watched everything in this category. Check History to watch again.</div>`; }
  const first=recs.slice(0,8), rest=recs.slice(8);
  html+=`<div class="grid">${first.map(card).join("")}`;
  if(last && cat==="All"){
    const sim=similar(last,4).filter(r=>!p.watched.has(r.v.id));
    if(sim.length) html+=`<div class="shelf"><h2><span class="ic">${ICONS.spark}</span>Because you watched <em style="font-style:normal;color:var(--text2)">&nbsp;${esc(last.title.length>50?last.title.slice(0,50)+"…":last.title)}</em></h2><div class="row">${sim.map(card).join("")}</div></div>`;
  }
  html+=rest.map(card).join("");
  if(state.history.length && cat==="All"){
    const again=state.history.slice(0,4).map(h=>byId[h.id]).filter(Boolean);
    html+=`<div class="shelf"><h2><span class="ic">${ICONS.history}</span>Watch again<small><a href="#/history">View all</a></small></h2><div class="row">${again.map(v=>card({v})).join("")}</div></div>`;
  }
  html+=`</div>`;
  return `<div class="page">${html}</div>`;
}
function pageTrending(cat){
  const list=VIDEOS.filter(v=>cat==="All"||v.cat===cat).sort((a,b)=>b.views-a.views);
  return `<div class="page">${chips(cat,"#/trending")}<h1 class="pagetitle">🔥 Trending in the neighbourhood</h1><div class="grid">${list.map(v=>card({v})).join("")}</div></div>`;
}
function pageSearch(q){
  const p=buildProfile(); const ql=q.toLowerCase().split(/\s+/).filter(Boolean);
  const res=VIDEOS.map(v=>{
    const hay=(v.title+" "+v.ch+" "+v.cat+" "+v.tags.join(" ")).toLowerCase();
    let m=0; ql.forEach(w=>{ if(v.title.toLowerCase().includes(w)) m+=3; else if(v.ch.toLowerCase().includes(w)) m+=2; else if(hay.includes(w)) m+=1; });
    if(ql.length && m===0) return null;
    const sc=scoreVideo(v,p); return {v,s:m*2+sc.s*0.6,why:sc.why};
  }).filter(Boolean).sort((a,b)=>b.s-a.s);
  return `<div class="page"><h1 class="pagetitle">Results for “${esc(q)}”</h1>${res.length?`<div class="list">${res.map(r=>listCard(r)).join("")}</div>`:`<div class="empty"><h2>Snoopy couldn't sniff that out</h2>Try different keywords, or search all of YouTube below.</div>`}
  <div class="ytfallback">
    <div><b>Not here?</b> SnoopyTube only knows ${VIDEOS.length} videos so far.</div>
    <a class="pill yt" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}" target="_blank" rel="noopener">Search YouTube for “${esc(q)}”</a>
    <button class="pill" data-addvideo>${ICONS.plus}Paste a link to add it here</button>
  </div></div>`;
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
  if(!state.history[0]||state.history[0].id!==id) recordWatch(id);   // re-renders of the same page (like/subscribe) don't double count
  const liked=state.liked.includes(id), disliked=state.disliked.includes(id), subbed=state.subs.includes(v.ch);
  const next=similar(v,20);
  return `<div class="watch"><div class="wmain">
    <div class="player"><iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0" title="${esc(v.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
    <h1 class="wtitle">${esc(v.title)}</h1>
    <div class="wrow">
      <div class="wch">${avatar(v.ch)}<div><a class="name" href="#/channel/${encodeURIComponent(v.ch)}">${esc(v.ch)}</a><div class="subs">${fmtViews(Math.round(v.views/40))} subscribers</div></div>
        <button class="pill ${subbed?"subbed":"primary"}" data-sub="${esc(v.ch)}" style="margin-left:12px">${subbed?"Subscribed ✓":"Subscribe"}</button></div>
      <div class="wacts">
        <div class="likegroup">
          <button class="${liked?"on":""}" data-like="${id}"><svg viewBox="0 0 24 24"><path d="M18.77 11h-4.23l1.52-4.94C16.38 5.03 15.54 4 14.38 4c-.58 0-1.14.24-1.52.65L7 11H3v10h4h1h9.43c1.06 0 1.98-.67 2.19-1.61l1.34-6C21.23 12.15 20.18 11 18.77 11zM7 20H4v-8h3V20zM19.98 13.17l-1.34 6C18.54 19.65 18.03 20 17.43 20H8v-8.61l5.6-6.06C13.79 5.12 14.08 5 14.38 5c.26 0 .5.11.63.3.07.1.15.26.09.47l-1.52 4.94L13.18 12h1.35h4.23c.41 0 .8.17 1.03.46.12.15.25.4.19.71z"/></svg>${fmtViews(Math.round(v.views/60)+(liked?1:0))}</button>
          <button class="${disliked?"on":""}" data-dislike="${id}"><svg viewBox="0 0 24 24" style="transform:rotate(180deg)"><path d="M18.77 11h-4.23l1.52-4.94C16.38 5.03 15.54 4 14.38 4c-.58 0-1.14.24-1.52.65L7 11H3v10h4h1h9.43c1.06 0 1.98-.67 2.19-1.61l1.34-6C21.23 12.15 20.18 11 18.77 11zM7 20H4v-8h3V20zM19.98 13.17l-1.34 6C18.54 19.65 18.03 20 17.43 20H8v-8.61l5.6-6.06C13.79 5.12 14.08 5 14.38 5c.26 0 .5.11.63.3.07.1.15.26.09.47l-1.52 4.94L13.18 12h1.35h4.23c.41 0 .8.17 1.03.46.12.15.25.4.19.71z"/></svg></button>
        </div>
        <a class="pill yt" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M10 9.35 15 12l-5 2.65zM21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8z"/></svg>Watch on YouTube</a>
        <button class="pill" data-share="${v.id}"><svg viewBox="0 0 24 24"><path d="M15 5.63 20.66 12 15 18.37V14h-1c-3.96 0-7.14 1-9.75 3.09 1.84-4.07 5.11-6.4 9.89-7.1l.86-.13V5.63M14 3v6C6.22 10.13 3.11 15.33 2 21c2.78-3.88 6.44-5.66 12-5.66V21l8-9-8-9z"/></svg>Share</button>
      </div>
    </div>
    <div class="desc" id="descBox">
      <div class="stats">${fmtViews(v.views)} views • ${esc(v.age)}</div>
      <div class="tags">${v.tags.map(t=>`<a href="#/search/${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")}</div>
      <div class="txt">${esc(v.title)} — from ${esc(v.ch)}.\n\nThis video is embedded from YouTube. If it says "Video unavailable" the uploader has disabled embedding — use the Watch on YouTube button above.\n\nCategory: ${v.cat}</div>
    </div>
  </div>
  <div class="wside"><h3>Up next</h3>${next.map(sideCard).join("")}</div></div>`;
}
const timeAgo=t=>{const d=Date.now()-t,m=Math.floor(d/6e4),h=Math.floor(m/60),dd=Math.floor(h/24);return dd>0?`${dd} day${dd>1?"s":""} ago`:h>0?`${h} hour${h>1?"s":""} ago`:m>0?`${m} min ago`:"just now"};

/* ---------- ADD VIDEO DIALOG ---------- */
function addDialogHtml(){
  return `<div class="dialog">
    <h2>${ICONS.plus} Add a YouTube video</h2>
    <p>Paste any YouTube link. Snoopy fetches the title, channel and thumbnail from YouTube and adds it to the catalogue.</p>
    <input id="addLink" type="text" placeholder="https://www.youtube.com/watch?v=..." autocomplete="off">
    <label>Category <select id="addCat">${CATS.slice(1).map(c=>`<option>${c}</option>`).join("")}</select></label>
    <div class="err" id="addErr"></div>
    <div class="dlgbtns"><button class="pill" data-closedialog>Cancel</button><button class="pill primary" id="addGo">Add to SnoopyTube</button></div>
  </div>`;
}
