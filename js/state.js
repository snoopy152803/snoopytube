// state.js — User state (history, likes, subs, added videos) saved in localStorage,
// plus the actions that change it.

/* ---------- STATE ---------- */
const KEY="snoopytube.state.v1";
const EMPTY={history:[],liked:[],disliked:[],subs:[],notInterested:[],custom:[],mini:false};
let state={...EMPTY};
try{
  // "mytube.state.v1" is the old name from before the Snoopy makeover — keep that data.
  const s=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem("mytube.state.v1"));
  if(s) state={...EMPTY,...s};
}catch(e){}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));

/* ---------- WATCHING / LIKING / SUBSCRIBING ---------- */
function recordWatch(id){
  const i=state.history.findIndex(h=>h.id===id);
  let n=1; if(i>-1){ n=(state.history[i].n||1)+1; state.history.splice(i,1); }
  state.history.unshift({id,t:Date.now(),n}); state.history=state.history.slice(0,200); save();
}
function toggleLike(id){
  const on=state.liked.includes(id);
  state.liked=state.liked.filter(x=>x!==id); state.disliked=state.disliked.filter(x=>x!==id);
  if(!on) state.liked.unshift(id); save();
  toast(on?"Removed from liked videos":"Liked! Snoopy will fetch more like this 🦴");
}
function toggleDislike(id){
  const on=state.disliked.includes(id);
  state.liked=state.liked.filter(x=>x!==id); state.disliked=state.disliked.filter(x=>x!==id);
  if(!on) state.disliked.unshift(id); save();
  toast(on?"Dislike removed":"Got it — Snoopy will show you less of this");
}
function toggleSub(ch){
  const on=state.subs.includes(ch);
  state.subs=on?state.subs.filter(c=>c!==ch):[...state.subs,ch]; save();
  toast(on?"Unsubscribed from "+ch:"Subscribed to "+ch+" — Woodstock will keep an eye out"); renderNav();
}
function notInterested(id){
  if(!state.notInterested.includes(id)) state.notInterested.push(id); save();
  toast("Okay, Snoopy will show you fewer videos like this"); render();
}
function clearHistory(){ state.history=[]; save(); toast("Watch history cleared"); render(); }
function resetAll(){
  if(!confirm("Reset all watch history, likes, subscriptions and added videos?")) return;
  state={...EMPTY,mini:state.mini}; save(); toast("SnoopyTube has been reset"); render();
}

/* ---------- ADDING ANY YOUTUBE VIDEO ----------
   Paste a YouTube link → we ask YouTube's public oEmbed endpoint for the title
   and channel (no API key needed), guess some tags from the title, and save it.
   Added videos join the catalogue and get recommended like any other. */
function parseYouTubeId(text){
  const m=String(text).trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})|^([\w-]{11})$/);
  return m?(m[1]||m[2]):null;
}
async function fetchVideoInfo(id){
  const url="https://www.youtube.com/watch?v="+id;
  const r=await fetch("https://www.youtube.com/oembed?url="+encodeURIComponent(url)+"&format=json");
  if(!r.ok) throw new Error("YouTube doesn't know that video (it may be private or deleted)");
  return r.json();   // {title, author_name, thumbnail_url, ...}
}
const STOPWORDS=new Set("the a an and or of to in on for with by from at is it its this that official video music hd 4k ft feat vs new full lyrics lyric".split(" "));
function guessTags(title,cat){
  const words=title.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOPWORDS.has(w)&&!/^\d+$/.test(w));
  return [...new Set([cat.toLowerCase(),...words.slice(0,5)])];
}
async function addCustomVideo(link,cat){
  const id=parseYouTubeId(link);
  if(!id) throw new Error("That doesn't look like a YouTube link");
  if(byId[id]) return byId[id];                     // already in the catalogue
  const info=await fetchVideoInfo(id);
  const v={id,title:info.title,ch:info.author_name,cat,tags:guessTags(info.title,cat),views:0,age:"Added by you",dur:"",custom:true};
  state.custom.push(v); save();
  VIDEOS.push(v); buildIndex();
  return v;
}
