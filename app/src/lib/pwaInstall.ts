// Captures the browser's PWA install prompt as early as possible — the
// `beforeinstallprompt` event can fire before React mounts, so we listen at
// module load and stash the event for a UI button to trigger on demand.
// iOS Safari never fires it; callers fall back to manual instructions.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** True when the browser has offered an install prompt we can replay. */
export function canInstall(): boolean {
  return deferred !== null;
}

/** Subscribe to install-availability changes. Returns an unsubscribe fn. */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Show the native install prompt. Returns the outcome (or 'unavailable'). */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  notify();
  return choice.outcome;
}

/** iOS / iPadOS Safari — no install event, must use Share → Add to Home Screen. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as Mac; detect by touch support.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Already running as an installed app. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
