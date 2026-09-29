// backup.js — Export and import everything SnoopyTube knows about you.
//
// All of it lives in this browser's localStorage, which is private but also fragile:
// clearing site data, a new laptop or a different browser and it's gone, along with
// every recommendation built on it. These two buttons are the whole backup story —
// the file is written and read here, and never goes anywhere near a server.
//
// Kids mode is deliberately not in the file. It's kept server-side precisely so it
// can't be edited, and letting it ride in on an import would be a way around the PIN.

const BACKUP_VERSION = 1;

function exportData(){
  const { kids, kidsStrict, kidsCatalogueOnly, kidsHasPin, kidsDurable, ...rest } = state;
  const blob = new Blob([JSON.stringify({
    app: "SnoopyTube", version: BACKUP_VERSION, exported: new Date().toISOString(), state: rest,
  }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `snoopytube-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Saved — keep that file somewhere safe 🦴");
}

function importData(file){
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try{ data = JSON.parse(reader.result); }
    catch(e){ return toast("That file isn't readable JSON"); }
    if(!data || data.app !== "SnoopyTube" || !data.state) return toast("That doesn't look like a SnoopyTube backup");

    const s = data.state;
    const when = data.exported ? new Date(data.exported).toLocaleDateString() : "an unknown date";
    if(!confirm(`Replace everything in this browser with the backup from ${when}?\n\n`
      + `${(s.history || []).length} watches, ${(s.liked || []).length} likes, ${(s.subs || []).length} subscriptions.\n\n`
      + `What's here now will be gone.`)) return;

    // Merged onto EMPTY so a backup from an older version still gets every key the
    // current code expects, and so nothing unknown in the file becomes state.
    const clean = {}; Object.keys(EMPTY).forEach(k => { if(k in s) clean[k] = s[k]; });
    state = { ...EMPTY, ...clean, kids: state.kids, kidsStrict: state.kidsStrict };
    save();
    mergeCustomVideos(state.custom); buildIndex();      // videos that came with the backup
    applyTheme(); render();
    toast("Restored — welcome back");
  };
  reader.onerror = () => toast("Couldn't read that file");
  reader.readAsText(file);
}
