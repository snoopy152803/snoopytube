// dev.js — Local dev server:  node dev.js   →  http://localhost:8765
// Serves the static site AND runs the api/ functions (/api/search, /api/download),
// the same way Vercel does in production. Downloads only work here, locally.
const http = require("http"), fs = require("fs"), path = require("path");
const search = require("./api/search.js"), download = require("./api/download.js");
const TYPES = {".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".json":"application/json", ".png":"image/png", ".svg":"image/svg+xml"};

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if(url.pathname === "/api/search") return search(req, res);
  if(url.pathname === "/api/download") return download(req, res);
  let file = path.join(__dirname, url.pathname === "/" ? "index.html" : url.pathname);
  fs.readFile(file, (err, data) => {
    if(err){ res.statusCode = 404; return res.end("Not found"); }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(data);
  });
}).listen(8765, () => console.log("SnoopyTube dev server → http://localhost:8765"));
