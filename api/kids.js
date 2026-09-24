// api/kids.js — the Kids-mode lock, enforced on the server.
//
// Why the server: anything kept in the browser can be switched off from devtools in
// a few seconds. Here the on/off state lives server-side, keyed to a household id in
// an HttpOnly cookie (page JavaScript can't read or change it), and turning it off
// needs the PIN, checked here. The PIN is stored only as a scrypt hash.
//
//   GET  /api/kids                      -> { on, hasPin }
//   POST /api/kids {action:"on", pin}   -> turn on (pin optional)
//   POST /api/kids {action:"off", pin}  -> turn off, wrong pin is refused
//
// api/search.js reads the same cookie, so Restricted Mode is applied by the server
// whatever the page asks for.

const crypto = require("crypto");
const store = require("./_store.js");

const COOKIE = "st_hh";
const keyFor = hh => `kids/${hh}`;

function parseCookies(req){
  return Object.fromEntries((req.headers.cookie || "").split(";").map(c => {
    const i = c.indexOf("="); return i < 0 ? [c.trim(), ""] : [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
  }).filter(p => p[0]));
}
// Household id from the cookie, creating one if this browser has never had it.
function household(req, res){
  let hh = parseCookies(req)[COOKIE];
  if(!/^[a-f0-9]{32}$/.test(hh || "")){
    hh = crypto.randomBytes(16).toString("hex");
    const secure = (req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
    res.setHeader("Set-Cookie", `${COOKIE}=${hh}; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax${secure}`);
  }
  return hh;
}

// Salted scrypt. The store is private, so the record never leaves the server.
const hash = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString("hex");
function verify(rec, pin){
  if(!rec || !rec.pinHash) return true;                 // no PIN set — anyone may turn it off
  if(!pin) return false;
  const a = Buffer.from(hash(pin, rec.salt), "hex"), b = Buffer.from(rec.pinHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Used by api/search.js so the filter can't be skipped by the page.
async function kidsOnFor(req){
  const hh = parseCookies(req)[COOKIE];
  if(!hh) return false;
  const rec = await store.get(keyFor(hh));
  return !!(rec && rec.on);
}

function body(req){
  return new Promise(resolve => {
    let s = ""; req.on("data", d => s += d);
    req.on("end", () => { try{ resolve(JSON.parse(s || "{}")); }catch(e){ resolve({}); } });
  });
}

module.exports = async function handler(req, res){
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  const hh = household(req, res);
  const rec = (await store.get(keyFor(hh))) || { on: false, pinHash: null, salt: null };

  // "durable" says whether this state actually survives across serverless instances.
  // On Vercel without a Blob store it does not, and the UI needs to say so rather
  // than imply a lock that isn't there.
  const durable = store.usingBlob() || !process.env.VERCEL;

  // ?diag=1 — which storage the function actually has. Reports only whether each
  // variable is present, never its value, so it's safe to call from anywhere.
  if(new URL(req.url, "http://x").searchParams.get("diag")){
    return res.end(JSON.stringify({
      durable,
      store: store.usingBlob() ? "blob" : "temp file (not shared between instances)",
      env: {
        VERCEL: !!process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV || null,
        BLOB_STORE_ID: !!process.env.BLOB_STORE_ID,
        BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
        VERCEL_OIDC_TOKEN: !!process.env.VERCEL_OIDC_TOKEN,
        BLOB_WEBHOOK_PUBLIC_KEY: !!process.env.BLOB_WEBHOOK_PUBLIC_KEY,
        blobPrefixed: Object.keys(process.env).filter(k => k.includes("BLOB")).sort(),
      },
    }));
  }
  if(req.method !== "POST") return res.end(JSON.stringify({ on: !!rec.on, hasPin: !!rec.pinHash, durable }));

  const { action, pin } = await body(req);
  if(action === "on"){
    const salt = crypto.randomBytes(16).toString("hex");
    const next = pin ? { on: true, salt, pinHash: hash(pin, salt) } : { on: true, salt: null, pinHash: null };
    await store.set(keyFor(hh), next);
    return res.end(JSON.stringify({ on: true, hasPin: !!next.pinHash, durable }));
  }
  if(action === "off"){
    if(!verify(rec, pin)){ res.statusCode = 403; return res.end(JSON.stringify({ error: "Wrong PIN", on: true, hasPin: true })); }
    await store.set(keyFor(hh), { on: false, pinHash: null, salt: null });
    return res.end(JSON.stringify({ on: false, hasPin: false, durable }));
  }
  res.statusCode = 400; res.end(JSON.stringify({ error: "bad action" }));
};
module.exports.kidsOnFor = kidsOnFor;
