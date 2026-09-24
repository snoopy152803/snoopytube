// api/_store.js — tiny key/value store for the Kids-mode lock.
//
// Two drivers, same interface:
//   • Vercel Blob  — used in production. Talks to the REST API directly, so there's
//                    no npm dependency. Needs a Blob store connected to the project
//                    (that sets BLOB_READ_WRITE_TOKEN automatically). See SETUP.md.
//   • local file   — used by `node dev.js`, so the logic can be developed and tested
//                    without a Blob store.
//
// Values are small JSON objects. Keys look like "kids/<household id>".
//
// Blobs are served from a public URL, so the stored path is NOT the household id —
// it's an HMAC of it keyed by the Blob token. The token never leaves the server, so
// reading the cookie (which DevTools will happily show you) doesn't tell you where
// the blob lives. api/kids.js keys the PIN hash with the same secret, so even a
// leaked blob can't be brute-forced.

const fs = require("fs"), path = require("path"), crypto = require("crypto");

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_API = "https://blob.vercel-storage.com";
const usingBlob = () => !!TOKEN;

/* ---------- local file driver ---------- */
const FILE = path.join(process.env.TMPDIR || process.env.TEMP || "/tmp", "snoopytube-store.json");
function readFile(){ try{ return JSON.parse(fs.readFileSync(FILE, "utf8")); }catch(e){ return {}; } }
function writeFile(all){ fs.writeFileSync(FILE, JSON.stringify(all)); }

/* ---------- Vercel Blob driver ---------- */
async function blobPut(key, value){
  const r = await fetch(`${BLOB_API}/${encodeURIComponent(key)}.json`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "x-api-version": "7",
      "x-content-type": "application/json",
      "x-add-random-suffix": "0",          // stable URL so we can read it back
      "x-cache-control-max-age": "0",
    },
    body: JSON.stringify(value),
  });
  if(!r.ok) throw new Error("blob put failed: " + r.status + " " + (await r.text()).slice(0, 200));
  return (await r.json()).url;
}
async function blobGet(key){
  // Ask the API where this blob lives, then fetch it. Missing key -> null.
  const head = await fetch(`${BLOB_API}/?url=${encodeURIComponent(publicUrlFor(key))}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, "x-api-version": "7" },
  });
  if(head.status === 404) return null;
  if(!head.ok) throw new Error("blob head failed: " + head.status);
  const { url } = await head.json();
  const r = await fetch(url + "?t=" + Date.now());        // bypass the CDN cache
  return r.ok ? r.json() : null;
}
// Blob public URLs are https://<store-id>.public.blob.vercel-storage.com/<pathname>
let storeHost = null;
function publicUrlFor(key){
  if(!storeHost){
    // BLOB_READ_WRITE_TOKEN looks like vercel_blob_rw_<storeId>_<secret>
    const id = (TOKEN || "").split("_")[3] || "";
    storeHost = `${id.toLowerCase()}.public.blob.vercel-storage.com`;
  }
  return `https://${storeHost}/${key}.json`;
}

/* ---------- public interface ---------- */
// Secret shared by every instance: the Blob token itself. Stable, server-only,
// and already present whenever Blob is configured.
const secret = () => TOKEN || "local-dev";
const hmac = v => crypto.createHmac("sha256", secret()).update(String(v)).digest("hex");
// "kids/abc" -> "kids/<hmac>" so the public path can't be derived from the cookie
const blobPath = key => { const i = key.indexOf("/"); return i < 0 ? hmac(key) : key.slice(0, i + 1) + hmac(key.slice(i + 1)); };

async function get(key){
  if(!usingBlob()) return readFile()[key] || null;
  try{ return await blobGet(blobPath(key)); }catch(e){ return null; }
}
async function set(key, value){
  if(!usingBlob()){ const all = readFile(); all[key] = value; writeFile(all); return; }
  await blobPut(blobPath(key), value);
}

module.exports = { get, set, usingBlob, hmac };
