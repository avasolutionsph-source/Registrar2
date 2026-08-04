import { useCallback, useEffect, useState } from 'react';

// Leaving a page with typed-but-unsaved work used to lose it without a word —
// the encoder simply went back and the entries were gone. This guards BOTH ways
// out: closing/reloading the tab (the browser's own prompt) and any in-page
// navigation the caller routes through `guard`.
//
// Why the caller wires it per button instead of it being automatic: the app
// runs on <BrowserRouter>, and React Router's useBlocker needs a data router —
// converting the whole app to one just for this would be a far bigger change
// than passing Back through a function.
//
//   const { guard, dialogProps } = useUnsavedGuard(hasChanges);
//   <Button onClick={() => guard(() => navigate('/somewhere'))}>Back</Button>
//   <UnsavedChangesDialog {...dialogProps} />
export function useUnsavedGuard(dirty: boolean) {
  const [pending, setPending] = useState<{ run: () => void } | null>(null);

  useEffect(() => {
    if (!dirty) return undefined;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const guard = useCallback(
    (proceed: () => void) => {
      if (!dirty) {
        proceed();
        return;
      }
      setPending({ run: proceed });
    },
    [dirty],
  );

  return {
    guard,
    dialogProps: {
      open: pending !== null,
      onStay: () => setPending(null),
      onLeave: () => {
        const go = pending?.run;
        setPending(null);
        go?.();
      },
    },
  };
}
