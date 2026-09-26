// recommend.js — Recommendation engine: builds a taste profile from your activity and scores every video.

/* ---------- RECOMMENDATION ENGINE ----------
   buildProfile()  : turns your history / likes / dislikes / subscriptions into
                     tag + channel weights (recent watches count more).
   scoreVideo()    : scores one video against that profile and explains why.
   recommend()     : sorted, filtered feed for the home page, with a variety pass
                     and a discovery quota so your subscriptions can't fill the top.
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
  // Subscribing says "keep an eye on this channel", not "show me nothing else", so
  // this is a nudge rather than a landslide — the discovery quota below does the rest.
  state.subs.forEach(ch=>bump(chans,ch,1.6));
  const watched=new Set(state.history.map(h=>h.id));
  const strength=Object.values(tags).reduce((a,b)=>a+Math.max(0,b),0);
  return {tags,chans,watched,strength};
}

// Dampen weights: watching 30 chess videos shouldn't make chess 30x stronger than
// something you watched twice. log(1+w) keeps big interests big but not overwhelming.
const damp=w=>Math.sign(w)*Math.log1p(Math.abs(w));

function scoreVideo(v,p){
  let s=0, best=null, bestW=0;
  // Every tag counts towards the score, but only a *telling* tag (see catalogue.js)
  // may become the "Because you watch ..." label — otherwise a search result tagged
  // "almost" or "youtube" produces a label that explains nothing.
  v.tags.forEach(t=>{ const w=p.tags[t]||0; s+=damp(w); if(w>bestW&&tellingTag(t)){bestW=w;best=t;} });
  s+=damp(p.tags["cat:"+v.cat]||0)*0.6;
  s/=Math.sqrt(v.tags.length+1);
  const cw=p.chans[v.ch]||0; s+=damp(cw)*0.9;
  s+=Math.log10(v.views+1)*0.06;          // small popularity prior
  s+=Math.random()*0.5;                    // exploration, so new things get a look in
  let why=null;
  if(state.subs.includes(v.ch)) why={t:"From "+v.ch+" — subscribed",k:"sub"};
  else if(cw>=1.2) why={t:"More from "+v.ch,k:"ch"};
  else if(best&&bestW>=0.8) why={t:"Because you watch "+tagLabel(best),k:"tag"};
  else if((p.tags["cat:"+v.cat]||0)>=0.9&&v.cat!=="YouTube") why={t:"Because you like "+v.cat,k:"tag"};
  return {s,why};
}

// Variety pass: walk the ranked list in blocks and cap how many videos from one
// channel or one category can appear in each block. Overflow just slides to a later
// block, so nothing is lost — the feed just isn't wall-to-wall chess.
function diversify(list,block=20,perChannel=2,perCategory=8){
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

/* ---------- DISCOVERY QUOTA ----------
   Scoring alone makes a predictable feed: subscribe to one channel and its videos
   sweep the top, because they win on channel weight before anything else is even
   considered. So certain positions in every block of 20 are reserved for videos that
   are NOT from a channel you follow and NOT in the categories you watch most.

   The positions are fixed rather than "anywhere in the block", because a reserve that
   only fills up from the bottom is a reserve you never scroll to. What goes into them
   is still the best-scoring candidate available — this widens the shortlist, it doesn't
   pick at random. */
// "Different" has to mean a different *category*. Judging it by tags doesn't work:
// most tags are words lifted from titles, so two chess videos from different channels
// look unrelated to each other while being exactly the same thing to a viewer.
const unfamiliar=(r,subs,cats)=>!subs.has(r.v.ch) && !cats.has(r.v.cat);
function topCats(n=2){
  const p=buildProfile();
  return new Set(Object.entries(p.tags).filter(([k,w])=>k.startsWith("cat:")&&w>0)
    .sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k])=>k.slice(4)));
}
const DISCOVERY_SLOTS=[2,6,10,14,18];         // 3rd, 7th, 11th … of each block

function mixDiscovery(list,block=20,slots=DISCOVERY_SLOTS){
  const subs=new Set(state.subs), top=topCats(2);
  if(!top.size) return list;                   // nothing watched yet — everything is new
  const out=[]; let pool=list.slice();
  while(pool.length){
    const take=pool.slice(0,block); let rest=pool.slice(block);
    for(const at of slots){
      if(at>=take.length) break;
      if(unfamiliar(take[at],subs,top)) continue;              // already something new
      const found=rest.findIndex(r=>unfamiliar(r,subs,top));
      if(found<0) break;                                      // nothing new left to offer
      const moved=take[at];
      take[at]={...rest[found],why:{t:"Something different for you",k:"new"}};
      rest.splice(found,1,moved);                             // the bumped pick slides down
    }
    out.push(...take); pool=rest;
  }
  return out;
}

/* ---------- MUTED TOPICS ----------
   "Not interested in this video" only ever nudges the numbers. Muting a topic is a
   flat no: subscribing to a chess channel shouldn't keep producing opening theory
   once you've said you don't want openings. Plurals count as the same topic, so
   muting "opening" also covers "openings". Manage the list in Settings. */
const tagKey=t=>String(t).toLowerCase().replace(/s$/,"");
const mutedTags=()=>new Set((state.mutedTags||[]).map(tagKey));
function notMuted(v,muted){
  const m=muted||mutedTags();
  return !m.size || !v.tags.some(t=>m.has(tagKey(t)));
}

function recommend({exclude=[],cat="All",limit=Infinity,includeWatched=false}={}){
  const p=buildProfile(); const ex=new Set(exclude); const muted=mutedTags();
  const ranked=VIDEOS.filter(v=>!ex.has(v.id) && kidsAllows(v) && notMuted(v,muted) && !(v.fromSearch&&!v.custom) && (cat==="All"||v.cat===cat) && (includeWatched||!p.watched.has(v.id)) && !state.notInterested.includes(v.id))
    .map(v=>({v,...scoreVideo(v,p)})).sort((a,b)=>b.s-a.s);
  const varied=diversify(ranked, 20, 2, cat==="All"?8:20);
  return (cat==="All"?mixDiscovery(varied):varied).slice(0,limit);
}

// Related videos from the catalogue. Only videos that actually share something with
// the seed (same channel, or overlapping tags) qualify — your general taste is just a
// small tie-breaker, so a Hello video won't get chess next to it.
function similar(seed,limit=20){
  const p=buildProfile(); const st=new Set(seed.tags.filter(t=>t!=="youtube")); const muted=mutedTags();
  return VIDEOS.filter(v=>v.id!==seed.id && kidsAllows(v) && notMuted(v,muted) && !(v.fromSearch&&!v.custom) && !state.notInterested.includes(v.id)).map(v=>{
    const overlap=v.tags.filter(t=>st.has(t)).length, sameCh=v.ch===seed.ch;
    if(!overlap && !sameCh) return null;
    let s=overlap*1.6 + (sameCh?2.2:0) + (v.cat===seed.cat?0.7:0) + scoreVideo(v,p).s*0.15;
    if(p.watched.has(v.id)) s-=1.2;
    const why=sameCh?{t:"More from "+v.ch,k:"ch"}:{t:"Similar to what you're watching",k:"tag"};
    return {v,s,why};
  }).filter(Boolean).sort((a,b)=>b.s-a.s).slice(0,limit);
}

/* ---------- WOODSTOCK'S NOTES ----------
   Your strongest interests. Only telling tags are counted, so the chart reads as
   topics rather than stray words from video titles. tasteShares() also works out what
   share of the notes each topic accounts for: the shares are over every topic, not
   just the six shown, so they are honest — whatever is left over is reported as
   "the other n%" rather than quietly rounded away. */
function topTags(n=6){
  const p=buildProfile();
  return Object.entries(p.tags).filter(([k,w])=>!k.startsWith("cat:")&&w>0&&tellingTag(k)).sort((a,b)=>b[1]-a[1]).slice(0,n);
}
function tasteShares(n=6){
  const p=buildProfile();
  const all=Object.entries(p.tags).filter(([k,w])=>!k.startsWith("cat:")&&w>0&&tellingTag(k)).sort((a,b)=>b[1]-a[1]);
  const total=all.reduce((a,[,w])=>a+w,0);
  if(!total) return {list:[],other:0,topics:0};
  const top=all.slice(0,n);
  const list=top.map(([t,w])=>({t,pct:w/total*100,bar:w/top[0][1]*100}));
  return {list,other:100-list.reduce((a,x)=>a+x.pct,0),topics:all.length};
}
