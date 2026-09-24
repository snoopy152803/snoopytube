// api/_store.js — small key/value store behind the Kids-mode lock.
//
// Two drivers, same interface:
//   • Vercel Blob — used on Vercel. The store is PRIVATE, so blobs are readable only
//                   through this function with the project's credentials, never from
//                   a URL. Auth is OIDC automatically inside Vercel Functions; a
//                   BLOB_READ_WRITE_TOKEN also works if one is set.
//   • local file  — used by `node dev.js`, so the logic can be tested without a store.
//
// Values are small JSON objects; keys look like "kids/<household id>".

const fs = require("fs"), path = require("path");

const hasBlob = () => !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

/* ---------- local file driver ---------- */
const FILE = path.join(process.env.TMPDIR || process.env.TEMP || "/tmp", "snoopytube-store.json");
const readFile = () => { try{ return JSON.parse(fs.readFileSync(FILE, "utf8")); }catch(e){ return {}; } };
const writeFile = all => fs.writeFileSync(FILE, JSON.stringify(all));

/* ---------- Vercel Blob driver ---------- */
let blobSdk = null;
function sdk(){
  if(!blobSdk) blobSdk = require("@vercel/blob");     // required lazily so dev.js runs without it
  return blobSdk;
}
const OPTS = { access: "private" };

async function get(key){
  if(!hasBlob()) return readFile()[key] || null;
  // useCache:false — blobs are cached for up to a month by default, and a stale read
  // here would report Kids mode as off right after it was switched on.
  const res = await sdk().get(`${key}.json`, { ...OPTS, useCache: false });
  if(!res || res.statusCode !== 200 || !res.stream) return null;
  return JSON.parse(await new Response(res.stream).text());
}
async function set(key, value){
  if(!hasBlob()){ const all = readFile(); all[key] = value; writeFile(all); return; }
  // allowOverwrite — writing the same pathname twice throws otherwise, and this
  // record is updated every time Kids mode is switched on or off.
  await sdk().put(`${key}.json`, JSON.stringify(value), {
    ...OPTS, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60,
  });
}

module.exports = { get, set, usingBlob: hasBlob };
