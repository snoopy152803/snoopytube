// state.js — User state (history, likes, subs) saved in localStorage, plus the actions that change it.

/* ---------- STATE ---------- */
const KEY="mytube.state.v1";
let state = {history:[],liked:[],disliked:[],subs:[],notInterested:[],mini:false};
try{ const s=JSON.parse(localStorage.getItem(KEY)); if(s) state={...state,...s}; }catch(e){}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));

/* ---------- ACTIONS ---------- */
function recordWatch(id){
  const i=state.history.findIndex(h=>h.id===id);
  let n=1; if(i>-1){ n=(state.history[i].n||1)+1; state.history.splice(i,1); }
  state.history.unshift({id,t:Date.now(),n}); state.history=state.history.slice(0,200); save();
}
function toggleLike(id){
  const on=state.liked.includes(id);
  state.liked=state.liked.filter(x=>x!==id); state.disliked=state.disliked.filter(x=>x!==id);
  if(!on) state.liked.unshift(id); save(); toast(on?"Removed from liked videos":"Added to liked videos — MyTube will show you more like this");
}
function toggleDislike(id){
  const on=state.disliked.includes(id);
  state.liked=state.liked.filter(x=>x!==id); state.disliked=state.disliked.filter(x=>x!==id);
  if(!on) state.disliked.unshift(id); save(); toast(on?"Dislike removed":"Got it — you'll see less like this");
}
function toggleSub(ch){
  const on=state.subs.includes(ch);
  state.subs=on?state.subs.filter(c=>c!==ch):[...state.subs,ch]; save();
  toast(on?"Unsubscribed from "+ch:"Subscribed to "+ch); renderNav();
}
function notInterested(id){
  if(!state.notInterested.includes(id)) state.notInterested.push(id); save();
  toast("Okay, you'll see fewer videos like this"); render();
}
function clearHistory(){ state.history=[]; save(); toast("Watch history cleared"); render(); }
function resetAll(){ if(!confirm("Reset all watch history, likes, subscriptions and preferences?")) return; state={history:[],liked:[],disliked:[],subs:[],notInterested:[],mini:state.mini}; save(); toast("MyTube has been reset"); render(); }
