import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Puts a page back where it was scrolled to when you return to it.
//
// The app scrolls inside <main>, not the window (the shell is h-screen), so the
// browser's own scroll restoration never applies here — opening a class from
// halfway down the Classes list and coming back always landed at the top. For
// the same reason a fresh navigation used to KEEP the old scroll offset, since
// <main> outlives the page inside it.
//
// Restored on two kinds of return, and only those:
//   • browser Back / Forward (POP)
//   • walking up from a child page — /classes/<id> back to /classes, which is
//     what the breadcrumb does, and it is a PUSH, not a POP
// Anything else — a sidebar click, a fresh link — starts at the top, which is
// what you want when you did not come from that list in the first place.
//
// Positions are recorded AS THE USER SCROLLS, not on the way out: by the time a
// cleanup could run, the next page is already in the DOM and the browser may
// have clamped scrollTop to the shorter content, so the number would be wrong.

const MAX_WAIT_MS = 2000;

export function useScrollRestore<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const positions = useRef(new Map<string, number>());
  // The path the scroll listener files its readings under. Claimed in the
  // layout effect below, which runs before any scroll event this commit fires.
  const pathRef = useRef('');
  const prevPathRef = useRef('');
  const { pathname } = useLocation();
  const navType = useNavigationType();

  // One listener for the life of the shell — the container never remounts.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onScroll = () => {
      if (pathRef.current) positions.current.set(pathRef.current, el.scrollTop);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const prev = prevPathRef.current;
    // Claim the new path before a clamp from this commit can be filed under the
    // page we just left.
    pathRef.current = pathname;
    prevPathRef.current = pathname;

    const cameFromChild = pathname !== '/' && prev.startsWith(`${pathname}/`);
    const want = navType === 'POP' || cameFromChild ? (positions.current.get(pathname) ?? 0) : 0;

    if (want <= 0) {
      el.scrollTop = 0;
      return undefined;
    }

    // A list arrives after its fetch, so on this first paint the page is
    // usually still too short to hold the old offset. Keep looking while it
    // grows, and give up rather than fight a page that never gets there.
    let raf = 0;
    let stopped = false;
    const started = performance.now();

    const stop = () => {
      stopped = true;
      cancelAnimationFrame(raf);
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchstart', stop);
    };

    const tick = () => {
      if (stopped) return;
      const node = ref.current;
      if (!node) return;
      if (node.scrollHeight - node.clientHeight >= want) {
        node.scrollTop = want;
        stop();
        return;
      }
      if (performance.now() - started > MAX_WAIT_MS) {
        stop();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    // If the user starts scrolling while we are still waiting, they have said
    // where they want to be — stop trying to move them.
    el.addEventListener('wheel', stop, { passive: true });
    el.addEventListener('touchstart', stop, { passive: true });
    tick();

    return stop;
  }, [pathname, navType]);

  return ref;
}
