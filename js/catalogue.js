// catalogue.js — The list of videos SnoopyTube knows about. Loaded FIRST.
//
// Every entry is a real YouTube video. We only store the id — the thumbnail
// comes from https://i.ytimg.com/vi/<id>/hqdefault.jpg and the player is
// YouTube's own <iframe> embed, so nothing is copied or re-hosted.
//
// The actual videos live in js/data/*.js, one file per group. Each of those
// files calls addVideos(category, [...]) to append to this list.

const VIDEOS = [];

function addVideos(cat, list){
  list.forEach(v => VIDEOS.push({ ...v, cat, tags: v.tags.split(" ") }));
}

// Anyone can add a video from a YouTube link (see state.js addCustomVideo).
// Those are stored in the browser and merged in at startup.
function mergeCustomVideos(custom){
  custom.forEach(v => {
    if(!VIDEOS.some(x => x.id === v.id)) VIDEOS.push(v);
    if(v.avatar && !CHANNEL_AVATARS[v.ch]) CHANNEL_AVATARS[v.ch] = v.avatar;
  });
}

// Fast lookup by id + list of categories for the chips row.
// Filled in by buildIndex() once all data files have loaded (see app.js).
let byId = {}, CATS = [];

// How often each tag appears across the hand-written catalogue, and the tags that
// say nothing useful about you. Used by recommend.js to decide whether a tag is
// worth showing in a "Because you watch …" label: tags auto-guessed from a search
// result's title are words like "almost" or "youtube", which explain nothing.
let TAG_COUNTS = {}, TAG_CHANNELS = {}, VAGUE_TAGS = new Set();
function buildIndex(){
  byId = Object.fromEntries(VIDEOS.map(v => [v.id, v]));
  CATS = ["All", ...new Set(VIDEOS.map(v => v.cat))];
  TAG_COUNTS = {}; TAG_CHANNELS = {};
  VIDEOS.filter(v => !v.fromSearch && !v.custom)          // curated entries only
        .forEach(v => v.tags.forEach(t => {
          TAG_COUNTS[t] = (TAG_COUNTS[t] || 0) + 1;
          (TAG_CHANNELS[t] = TAG_CHANNELS[t] || new Set()).add(v.ch);
        }));
  // Category names double as tags, so "Because you watch youtube" would tell you
  // nothing you didn't already know.
  VAGUE_TAGS = new Set([...CATS.map(c => c.toLowerCase()), "youtube", "video", "videos", "shorts", "live", "new", "best", "top", "watch"]);
}
// A tag only earns a label if it's one we wrote by hand and it groups more than one
// video — otherwise it's a stray word from some title.
const tellingTag = t => !VAGUE_TAGS.has(t) && (TAG_COUNTS[t] || 0) >= 2;
// A tag that only ever appears on one channel ("levy", "gothamchess") is really that
// channel's name in disguise — fine as a label, useless as a topic to mute.
const topicTag = t => tellingTag(t) && (TAG_CHANNELS[t] ? TAG_CHANNELS[t].size : 0) >= 2;
const tagLabel = t => String(t).replace(/[-_]+/g, " ").replace(/(^|\s)[a-z]/g, m => m.toUpperCase());
