// recommend.js — Recommendation engine: builds a taste profile from your activity and scores every video.

/* ---------- RECOMMENDATION ENGINE ----------
   buildProfile()  : turns your history / likes / dislikes / subscriptions into
                     tag + channel weights (recent watches count more).
   scoreVideo()    : scores one video against that profile and explains why.
   recommend()     : sorted, filtered feed for the home page.
   similar()       : "Up next" — similarity to the current video blended with your taste.
   ------------------------------------------- */
function buildProfile(){
  const tags={}, chans={};
  const bump=(o,k,w)=>{o[k]=(o[k]||0)+w};
  const add=(v,w)=>{ if(!v) return; v.tags.forEach(t=>bump(tags,t,w)); bump(tags,"cat:"+v.cat,w*0.6); bump(chans,v.ch,w); };
  // newest first; each older watch counts a bit less
  state.history.forEach((h,i)=>add(byId[h.id], Math.pow(0.9,i)*(h.n||1)));
  state.liked.forEach(id=>add(byId[id],1.5));
  state.disliked.forEach(id=>add(byId[id],-1.5));
  state.notInterested.forEach(id=>add(byId[id],-1.2));
  state.subs.forEach(ch=>bump(chans,ch,2.5));
  const watched=new Set(state.history.map(h=>h.id));
  const strength=Object.values(tags).reduce((a,b)=>a+Math.max(0,b),0);
  return {tags,chans,watched,strength};
}
function scoreVideo(v,p){
  let s=0, best=null, bestW=0;
  v.tags.forEach(t=>{ const w=p.tags[t]||0; s+=w; if(w>bestW){bestW=w;best=t;} });
  s+=(p.tags["cat:"+v.cat]||0)*0.6;
  s/=Math.sqrt(v.tags.length+1);
  const cw=p.chans[v.ch]||0; s+=cw*1.2;
  s+=Math.log10(v.views+1)*0.06;          // small popularity prior
  s+=Math.random()*0.35;                   // a little exploration so the feed isn't static
  let why=null;
  if(state.subs.includes(v.ch)) why={t:"From "+v.ch+" — subscribed",k:"sub"};
  else if(cw>=1.2) why={t:"More from "+v.ch,k:"ch"};
  else if(bestW>=0.8) why={t:"Because you watch "+best,k:"tag"};
  else if((p.tags["cat:"+v.cat]||0)>=0.9) why={t:"Because you like "+v.cat,k:"tag"};
  return {s,why};
}
function recommend({exclude=[],cat="All",limit=Infinity,includeWatched=false}={}){
  const p=buildProfile(); const ex=new Set(exclude);
  return VIDEOS.filter(v=>!ex.has(v.id) && (cat==="All"||v.cat===cat) && (includeWatched||!p.watched.has(v.id)) && !state.notInterested.includes(v.id))
    .map(v=>({v,...scoreVideo(v,p)})).sort((a,b)=>b.s-a.s).slice(0,limit);
}
function similar(seed,limit=20){
  const p=buildProfile(); const st=new Set(seed.tags);
  return VIDEOS.filter(v=>v.id!==seed.id && !state.notInterested.includes(v.id)).map(v=>{
    const overlap=v.tags.filter(t=>st.has(t)).length;
    let s=overlap*1.6 + (v.ch===seed.ch?2.2:0) + (v.cat===seed.cat?0.7:0) + scoreVideo(v,p).s*0.45;
    if(p.watched.has(v.id)) s-=1.2;
    let why=null;
    if(v.ch===seed.ch) why={t:"More from "+v.ch,k:"ch"};
    else if(overlap>=2) why={t:"Similar to what you're watching",k:"tag"};
    else why=scoreVideo(v,p).why;
    return {v,s,why};
  }).sort((a,b)=>b.s-a.s).slice(0,limit);
}
function topTags(n=6){
  const p=buildProfile();
  return Object.entries(p.tags).filter(([k,w])=>!k.startsWith("cat:")&&w>0).sort((a,b)=>b[1]-a[1]).slice(0,n);
}
