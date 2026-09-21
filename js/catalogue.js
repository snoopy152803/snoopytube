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
function buildIndex(){
  byId = Object.fromEntries(VIDEOS.map(v => [v.id, v]));
  CATS = ["All", ...new Set(VIDEOS.map(v => v.cat))];
}
