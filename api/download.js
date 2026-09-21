// api/download.js — GET /api/download?id=VIDEOID&fmt=mp4|mp3&name=Title
//
// Downloads a YouTube video with yt-dlp (and ffmpeg, which yt-dlp uses to merge
// video+audio or convert to MP3), then sends the file to the browser.
// Only works where yt-dlp and ffmpeg are installed — i.e. when you run SnoopyTube
// locally with `node dev.js`. On Vercel it answers 501 and the site shows a message.
// Add &check=1 to just ask whether downloading is possible.

const { spawn, execFile } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");

const FORMATS = {
  mp4: ["-f", "bv*[ext=mp4][height<=1080]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4"],
  mp3: ["-x", "--audio-format", "mp3", "--audio-quality", "0"],
};

const hasYtDlp = () => new Promise(res => execFile("yt-dlp", ["--version"], err => res(!err)));

function download(id, fmt){
  return new Promise((resolve, reject) => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "snoopytube-"));
    const args = [...FORMATS[fmt], "--no-playlist", "--no-warnings", "-q",
      "-o", path.join(outDir, "%(id)s.%(ext)s"),
      "--print", "after_move:filepath", "--no-simulate",       // prints the final file path
      "https://www.youtube.com/watch?v=" + id];
    let out = "", err = "";
    const p = spawn("yt-dlp", args);
    p.stdout.on("data", d => out += d); p.stderr.on("data", d => err += d);
    p.on("error", reject);
    p.on("close", code => {
      const file = out.trim().split(/\r?\n/).pop();
      if(code !== 0 || !file || !fs.existsSync(file)) return reject(new Error(err.trim().split("\n").pop() || "yt-dlp failed"));
      resolve(file);
    });
  });
}

module.exports = async function handler(req, res){
  const q = new URL(req.url, "http://x").searchParams;
  const id = q.get("id") || "", fmt = q.get("fmt") === "mp3" ? "mp3" : "mp4", name = (q.get("name") || id).replace(/[\\/:*?"<>|]+/g, "").slice(0, 80);
  const json = (code, obj) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };

  if(!/^[\w-]{11}$/.test(id)) return json(400, {error: "bad video id"});
  if(!(await hasYtDlp())) return json(501, {error: "Downloads need yt-dlp + ffmpeg installed — run SnoopyTube locally with `node dev.js`"});
  if(q.get("check")) return json(200, {ok: true});

  try{
    const file = await download(id, fmt);
    res.setHeader("Content-Type", fmt === "mp3" ? "audio/mpeg" : "video/mp4");
    res.setHeader("Content-Length", fs.statSync(file).size);
    res.setHeader("Content-Disposition", `attachment; filename="${name}.${fmt}"; filename*=UTF-8''${encodeURIComponent(name)}.${fmt}`);
    fs.createReadStream(file).on("close", () => fs.rm(path.dirname(file), {recursive: true, force: true}, () => {})).pipe(res);
  }catch(e){ json(500, {error: "Download failed: " + e.message}); }
};
