// api/_kidwords.js — words that hide a video while Kids mode is on.
// The server filters with this so the page can't skip it; js/kids.js keeps the same
// list for the built-in catalogue. Keep the two in step when editing.
module.exports = (
  "kill kills killed killing death deaths dead die dies dying murder murders blood bloody gore "
  +   "gory horror scary terrifying disturbing nightmare creepy haunted haunting ghost ghosts "
  +   "demon demonic possessed zombie zombies slasher massacre stab stabbed knife machete chainsaw "
  +   "torture tortured brutal savage gun guns shoot shooting shot weapon weapons war warfare "
  +   "nuclear bomb bombing explosion suicide drug drugs weed vape alcohol beer wine vodka whisky "
  +   "cocktail drunk smoking cigarette sex sexy nude nsfw porn curse cursed swear swearing damn "
  +   "hell nihilism corpse violent violence creepypasta jumpscare grusome gruesome mutilated "
  +   "decapitated").split(" ");
