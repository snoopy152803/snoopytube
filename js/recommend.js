// recommend.js — Recommendation engine: builds a taste profile from your activity and scores every video.

/* ---------- RECOMMENDATION ENGINE ----------
   buildProfile()  : turns your history / likes / dislikes / subscriptions into
                     tag + channel weights (recent watches count more).
   scoreVideo()    : scores one video against that profile and explains why.
   recommend()     : sorted, filtered feed for the home page, with a variety pass
                     so one channel or topic can't take over.
   similar()       : "Up next" — videos genuinely related to the one playing.
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

// Dampen weights: watching 30 chess videos shouldn't make chess 30× stronger than
// something you watched twice. log(1+w) keeps big interests big but not overwhelming.
const damp=w=>Math.sign(w)*Math.log1p(Math.abs(w));

function scoreVideo(v,p){
  let s=0, best=null, bestW=0;
  v.tags.forEach(t=>{ const w=p.tags[t]||0; s+=damp(w); if(w>bestW){bestW=w;best=t;} });
  s+=damp(p.tags["cat:"+v.cat]||0)*0.6;
  s/=Math.sqrt(v.tags.length+1);
  const cw=p.chans[v.ch]||0; s+=damp(cw)*0.9;
  s+=Math.log10(v.views+1)*0.06;          // small popularity prior
  s+=Math.random()*0.5;                    // exploration, so new things get a look in
  let why=null;
  if(state.subs.includes(v.ch)) why={t:"From "+v.ch+" — subscribed",k:"sub"};
  else if(cw>=1.2) why={t:"More from "+v.ch,k:"ch"};
  else if(bestW>=0.8) why={t:"Because you watch "+best,k:"tag"};
  else if((p.tags["cat:"+v.cat]||0)>=0.9) why={t:"Because you like "+v.cat,k:"tag"};
  return {s,why};
}

// Variety pass: walk the ranked list in blocks of 20 and cap how many videos from
// one channel (3) or one category (8) can appear in each block. Overflow just slides
// to a later block, so nothing is lost — the feed just isn't wall-to-wall chess.
function diversify(list,block=20,perChannel=3,perCategory=8){
  const out=[]; let pool=list.slice();
  while(pool.length){
    const chunk=[], ch={}, cat={}, later=[];
    for(const r of pool){
      if(chunk.length>=block){ later.push(r); continue; }
      if((ch[r.v.ch]||0)>=perChannel || (cat[r.v.cat]||0)>=perCategory){ later.push(r); continue; }
      chunk.push(r); ch[r.v.ch]=(ch[r.v.ch]||0)+1; cat[r.v.cat]=(cat[r.v.cat]||0)+1;
    }
    if(!chunk.length){ out.push(...later); break; }     // only capped items left — just append them
    out.push(...chunk); pool=later;
  }
  return out;
}

function recommend({exclude=[],cat="All",limit=Infinity,includeWatched=false}={}){
  const p=buildProfile(); const ex=new Set(exclude);
  const ranked=VIDEOS.filter(v=>!ex.has(v.id) && kidsAllows(v) && !(v.fromSearch&&!v.custom) && (cat==="All"||v.cat===cat) && (includeWatched||!p.watched.has(v.id)) && !state.notInterested.includes(v.id))
    .map(v=>({v,...scoreVideo(v,p)})).sort((a,b)=>b.s-a.s);
  return diversify(ranked, 20, 3, cat==="All"?8:20).slice(0,limit);
}

// Related videos from the catalogue. Only videos that actually share something with
// the seed (same channel, or overlapping tags) qualify — your general taste is just a
// small tie-breaker, so a Hello video won't get chess next to it.
function similar(seed,limit=20){
  const p=buildProfile(); const st=new Set(seed.tags.filter(t=>t!=="youtube"));
  return VIDEOS.filter(v=>v.id!==seed.id && kidsAllows(v) && !(v.fromSearch&&!v.custom) && !state.notInterested.includes(v.id)).map(v=>{
    const overlap=v.tags.filter(t=>st.has(t)).length, sameCh=v.ch===seed.ch;
    if(!overlap && !sameCh) return null;
    let s=overlap*1.6 + (sameCh?2.2:0) + (v.cat===seed.cat?0.7:0) + scoreVideo(v,p).s*0.15;
    if(p.watched.has(v.id)) s-=1.2;
    const why=sameCh?{t:"More from "+v.ch,k:"ch"}:{t:"Similar to what you're watching",k:"tag"};
    return {v,s,why};
  }).filter(Boolean).sort((a,b)=>b.s-a.s).slice(0,limit);
}
function topTags(n=6){
  const p=buildProfile();
  return Object.entries(p.tags).filter(([k,w])=>!k.startsWith("cat:")&&w>0).sort((a,b)=>b[1]-a[1]).slice(0,n);
}
