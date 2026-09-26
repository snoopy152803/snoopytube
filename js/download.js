// download.js — The Download items in the ⋮ menu.
//
// Why there's no browser-only version of this
// -------------------------------------------
// A browser can only save a file it is allowed to fetch. YouTube serves its video
// streams from googlevideo.com with no CORS header for other sites, so JavaScript on
// snoopytube.vercel.app simply cannot read the bytes — the request is refused before
// it starts. The player you see is an <iframe> owned by YouTube; the page around it
// has no access to what's inside. So the file has to be fetched by a program that
// isn't a browser tab, which is what yt-dlp is for. (ffmpeg is separate: yt-dlp needs
// it to join YouTube's separate video and audio streams, and to make an MP3.)
//
// That means downloads work when the computer *serving* this page has those two
// installed — i.e. when you run SnoopyTube yourself with `node dev.js`. The copy on
// Vercel can't: serverless functions have neither tool and time out long before a
// video finishes. That's not something the site can fix, so instead of pretending,
// it asks the server once and then says plainly what your options are.

// null = haven't asked yet. Cached because the answer can't change mid-session.
let dlReady = null, dlMissing = null;       // dlMissing: which tools the server lacks

async function downloadsAvailable(){
  if(dlReady !== null) return dlReady;
  try{
    const r = await fetch("/api/download?check=1&id=dQw4w9WgXcQ");
    const j = await r.json().catch(() => ({}));
    dlReady = r.ok && !!j.ok;
    dlMissing = j.missing || null;
  }catch(e){ dlReady = false; }
  return dlReady;
}

async function downloadVideo(id, fmt){
  const v = byId[id]; if(!v) return;
  if(!(await downloadsAvailable())) return openDownloadHelp(v);
  const name = (v.title || id).replace(/[\/:*?"<>|]+/g, "").slice(0, 80);
  toast(`Snoopy is fetching the ${fmt.toUpperCase()} — this can take a minute…`);
  window.location.href = `/api/download?id=${id}&fmt=${fmt}&name=${encodeURIComponent(name)}`;
}

/* ---------- the explanation ----------
   A toast was the wrong shape for this: it says "can't" and vanishes before it can say
   why or what to do instead. This is the same information with somewhere to go. */
function openDownloadHelp(v){
  const url = "https://www.youtube.com/watch?v=" + v.id;
  const cmd = `yt-dlp "${url}"`;
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const d = document.getElementById("dialog");
  d.innerHTML = `<div class="dialog">
    <h2>${ICONS.download} Downloading “${esc(v.title.slice(0, 40))}${v.title.length > 40 ? "…" : ""}”</h2>
    ${local
      ? `<p>SnoopyTube is running on your own computer, but the server couldn't find <b>${esc(dlMissing || "yt-dlp")}</b> on its PATH. Install it and restart <code>node dev.js</code> — then this button downloads the file for you, no terminal needed.</p>
         <p>In the meantime:</p>`
      : `<p>The site can't download it for you. A web page may only save files it is allowed to fetch, and YouTube doesn't let other sites read its video streams — the player above is YouTube's own frame, sealed off from the page around it. Getting the file needs a program outside the browser, and the server this site runs on can't run one.</p>
         <p>If you have <a href="https://github.com/yt-dlp/yt-dlp#installation" target="_blank" rel="noopener">yt-dlp</a> on your computer, your terminal is the quickest route:</p>`}
    <div class="cmdbox"><code id="dlCmd">${esc(cmd)}</code>
      <button class="pill" data-copy="${esc(cmd)}">Copy</button></div>
    <p class="note">Add <code>-x --audio-format mp3</code> for audio only.${local ? "" : ` Or run SnoopyTube on your own machine with <code>node dev.js</code> — there the Download buttons do work, because the server is your computer.`}</p>
    <div class="dlgbtns">
      <a class="pill yt" href="${url}" target="_blank" rel="noopener">${ICONS.yt}Open on YouTube</a>
      <button class="pill primary" data-closedialog>Close</button></div>
  </div>`;
  d.classList.add("open");
}

// Copy-to-clipboard for the command above.
function copyText(text){
  navigator.clipboard?.writeText(text).then(() => toast("Copied — paste it into a terminal"))
    .catch(() => toast(text));
}

// Ask the server once, quietly, so the menu can label the items honestly rather than
// offering a button that turns out not to work.
setTimeout(downloadsAvailable, 1200);
