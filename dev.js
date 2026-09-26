// dev.js — Local dev server:  node dev.js   →  http://localhost:8765
// Serves the static site AND runs the api/ functions (/api/search, /api/download),
// the same way Vercel does in production. Downloads only work here, locally.
const http = require("http"), fs = require("fs"), path = require("path");
const search = require("./api/search.js"), download = require("./api/download.js"), kids = require("./api/kids.js");
const PORT = process.env.PORT || 8765;
const TYPES = {".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".json":"application/json", ".png":"image/png", ".svg":"image/svg+xml",
  ".webmanifest":"application/manifest+json", ".ico":"image/x-icon", ".jpg":"image/jpeg", ".webp":"image/webp"};

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if(url.pathname === "/api/search") return search(req, res);
  if(url.pathname === "/api/download") return download(req, res);
  if(url.pathname === "/api/kids") return kids(req, res);
  let file = path.join(__dirname, url.pathname === "/" ? "index.html" : url.pathname);
  fs.readFile(file, (err, data) => {
    // SnoopyTube uses real paths (/watch/abc), and there is no file there — the page
    // routes itself. So anything that isn't a real file falls back to index.html, the
    // same as the rewrite in vercel.json does in production. Requests that look like a
    // file (they have an extension) still 404, so a typo in a script src is visible.
    if(err){
      if(path.extname(url.pathname)) { res.statusCode = 404; return res.end("Not found"); }
      file = path.join(__dirname, "index.html"); data = fs.readFileSync(file);
    }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(data);
  });
}).listen(PORT, () => console.log("SnoopyTube dev server → http://localhost:" + PORT));
