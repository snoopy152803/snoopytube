// components.js — Small HTML builders: cards, thumbnails, chips, icons.

/* ---------- RENDER HELPERS ---------- */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const meta=v=>v.views?`${fmtViews(v.views)} views • ${esc(v.age)}`:esc(v.age||"Added by you");
const fmtViews=n=>n>=1e9?(n/1e9).toFixed(1).replace(/\.0$/,"")+"B":n>=1e6?(n/1e6).toFixed(n<1e7?1:0).replace(/\.0$/,"")+"M":n>=1e3?Math.round(n/1e3)+"K":n;
const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h};
// Channel picture if we have one (js/data/channels.js or a search result), else a coloured initial.
const avatar=(ch,cls="")=>{
  const url=CHANNEL_AVATARS[ch];
  return `<div class="avatar ${cls}" style="background:hsl(${hue(ch)},55%,42%)" title="${esc(ch)}">${esc(ch.replace(/^the /i,"")[0])}${url?`<img src="${esc(url)}" alt="" loading="lazy" onerror="this.remove()">`:""}</div>`;
};
const thumb=v=>`<div class="thumb"><div class="ph" style="background:linear-gradient(135deg,hsl(${hue(v.id)},40%,25%),hsl(${(hue(v.id)+60)%360},40%,15%))">${esc(v.title[0])}</div><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" loading="lazy" alt="" onerror="this.style.display='none'">${v.dur?`<span class="dur ${v.dur==="LIVE"?"live":""}">${v.dur}</span>`:""}</div>`;
const whyChip=w=>w?`<div class="why"><svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2zm-3 17h6v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1z"/></svg>${esc(w.t)}</div>`:"";
// The ⋮ menu. Same items on cards and on the watch page.
const menuItems=v=>`
  <div data-act="like" data-id="${v.id}">${ICONS.liked}${state.liked.includes(v.id)?"Remove from liked":"Add to liked videos"}</div>
  <div data-act="share" data-id="${v.id}">${ICONS.share}Share (copy link)</div>
  <div data-act="dl" data-fmt="mp4" data-id="${v.id}">${ICONS.download}Download video (MP4)</div>
  <div data-act="dl" data-fmt="mp3" data-id="${v.id}">${ICONS.music}Download audio (MP3)</div>
  <div data-act="yt" data-id="${v.id}">${ICONS.yt}Open on YouTube</div>
  <div data-act="ni" data-id="${v.id}">${ICONS.block}Not interested</div>`;
const menuHtml=v=>`<button class="iconbtn more" data-menu="${v.id}" title="More">${ICONS.more}</button><div class="menu" id="menu-${v.id}">${menuItems(v)}</div>`;

function card(r){
  const v=r.v||r;
  return `<div class="cardwrap"><div class="card" data-id="${v.id}">
    ${thumb(v)}
    <div class="cbody">${avatar(v.ch)}<div class="cinfo">
      <div class="ctitle">${esc(v.title)}</div>
      <div class="cmeta"><a class="ch" href="#/channel/${encodeURIComponent(v.ch)}" data-stop>${esc(v.ch)}</a></div>
      <div class="cmeta">${meta(v)}</div>
      ${whyChip(r.why)}
    </div></div>
  </div>${menuHtml(v)}</div>`;
}
function listCard(r,extra=""){
  const v=r.v||r;
  return `<div class="lcard card" data-id="${v.id}">
    ${thumb(v)}
    <div class="cinfo">
      <div class="ctitle">${esc(v.title)}</div>
      <div class="cmeta">${meta(v)}${extra}</div>
      <div class="chrow">${avatar(v.ch)}<a class="cmeta ch" href="#/channel/${encodeURIComponent(v.ch)}" data-stop>${esc(v.ch)}</a></div>
      <div class="desc">${v.cat} • ${v.tags.map(t=>"#"+t).join(" ")}</div>
      ${whyChip(r.why)}
    </div>${menuHtml(v)}</div>`;
}
function sideCard(r){
  const v=r.v||r;
  return `<div class="scard card" data-id="${v.id}">${thumb(v)}<div class="cinfo">
    <div class="ctitle">${esc(v.title)}</div>
    <div class="cmeta">${esc(v.ch)}</div>
    <div class="cmeta">${meta(v)}</div>
    ${whyChip(r.why)}
  </div>${menuHtml(v)}</div>`;
}
function chips(active,base){
  return `<div class="chips">${CATS.map(c=>`<a class="chip ${c===active?"active":""}" href="${base}${c==="All"?"":"?cat="+encodeURIComponent(c)}">${c}</a>`).join("")}</div>`;
}
const ICONS={
  more:'<svg viewBox="0 0 24 24"><path d="M12 16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM10.5 12c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zm0-6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5z"/></svg>',
  share:'<svg viewBox="0 0 24 24"><path d="M15 5.63 20.66 12 15 18.37V14h-1c-3.96 0-7.14 1-9.75 3.09 1.84-4.07 5.11-6.4 9.89-7.1l.86-.13V5.63M14 3v6C6.22 10.13 3.11 15.33 2 21c2.78-3.88 6.44-5.66 12-5.66V21l8-9-8-9z"/></svg>',
  download:'<svg viewBox="0 0 24 24"><path d="M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z"/></svg>',
  music:'<svg viewBox="0 0 24 24"><path d="M12 4v9.38c-.73-.84-1.8-1.38-3-1.38-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V8h6V4h-7zm-3 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>',
  yt:'<svg viewBox="0 0 24 24"><path d="M10 9.35 15 12l-5 2.65zM21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8z"/></svg>',
  block:'<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 19c-4.96 0-9-4.04-9-9 0-2.08.72-3.99 1.9-5.52L17.52 19.1C15.99 20.28 14.08 21 12 21zm7.1-3.48L6.48 4.9C8.01 3.72 9.92 3 12 3c4.96 0 9 4.04 9 9 0 2.08-.72 3.99-1.9 5.52z"/></svg>',
  home:'<svg viewBox="0 0 24 24"><path d="M4 21V10.08l8-6.96 8 6.96V21h-6v-6h-4v6H4z"/></svg>',
  trending:'<svg viewBox="0 0 24 24"><path d="m14 2-1 .5C11 4 9 6 9 9c0 1 .2 2 .6 3-1-.4-2-.5-2.6.1C6 13 5.5 15 6 17c1 3 3.5 5 6 5 4.4 0 8-3.6 8-8 0-4-2-7-4.5-9.3L14 2zm-2 18c-2.2 0-4-1.8-4-4 0-1 .4-1.8 1-2.5.3 1.2 1.2 2.2 2.4 2.6.2-1.5.9-3 2.6-4.1.8 1.5 1.9 2.7 2 4 0 2.2-1.8 4-4 4z"/></svg>',
  subs:'<svg viewBox="0 0 24 24"><path d="M10 18v-6l5 3-5 3zm7-15H7v1h10V3zm3 3H4v1h16V6zm2 3H2v12h20V9zM3 10h18v10H3V10z"/></svg>',
  history:'<svg viewBox="0 0 24 24"><path d="M14.97 16.95 10 13.87V7h2v5.76l4.03 2.49-1.06 1.7zM12 3c-4.65 0-8.58 3.03-9.96 7.22L4.06 11c1.03-3.42 4.23-6 7.94-6 4.6 0 8.35 3.75 8.35 8.35S16.6 21.7 12 21.7c-3.28 0-6.13-1.9-7.5-4.68l-1.79.9C4.41 21.2 7.94 23.7 12 23.7c5.7 0 10.35-4.65 10.35-10.35S17.7 3 12 3zm-8.5 8.5L0 8h7l-3.5 3.5z"/></svg>',
  liked:'<svg viewBox="0 0 24 24"><path d="M18.77 11h-4.23l1.52-4.94C16.38 5.03 15.54 4 14.38 4c-.58 0-1.14.24-1.52.65L7 11H3v10h4h1h9.43c1.06 0 1.98-.67 2.19-1.61l1.34-6C21.23 12.15 20.18 11 18.77 11zM7 20H4v-8h3V20zM19.98 13.17l-1.34 6C18.54 19.65 18.03 20 17.43 20H8v-8.61l5.6-6.06C13.79 5.12 14.08 5 14.38 5c.26 0 .5.11.63.3.07.1.15.26.09.47l-1.52 4.94L13.18 12h1.35h4.23c.41 0 .8.17 1.03.46.12.15.25.4.19.71z"/></svg>',
  reset:'<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M20 12h-8v8h-1v-8H3v-1h8V3h1v8h8v1z"/></svg>',
  spark:'<svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>',
};
