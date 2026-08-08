import { useCallback, useState } from 'react';

// One-time keyboard guide for the encoding grids (see gridKeys): Enter walks
// down a column. Obvious once you know it, invisible until then — so it is
// shown once, on the first encoding sheet the user opens, and never again.
//
// Remembered per browser rather than per account: the point is to teach the
// keystroke, and someone who has learned it on this machine has learned it.
const SEEN_KEY = 'nps.guide.enter-moves-down.v1';

function alreadySeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true; // storage blocked (private window): never nag
  }
}

export function useEnterGuide(): { open: boolean; close: () => void; show: () => void } {
  // Read in the lazy initialiser, not in an effect: the guide is either needed
  // on the first paint or not at all, and there is no external state to sync.
  const [open, setOpen] = useState(() => !alreadySeen());

  const close = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* storage blocked — it simply appears again next time */
    }
  }, []);

  // Lets the inline tip re-open it, so dismissing is not a one-way door.
  const show = useCallback(() => setOpen(true), []);

  return { open, close, show };
}
