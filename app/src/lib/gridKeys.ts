import type { KeyboardEvent } from 'react';

// Enter moves to the next cell — the habit every encoder brings from Excel,
// where Tab and Enter both advance and only the direction differs. Attach it to
// the <table> (or any wrapper around the fields); it works by delegation, so no
// individual cell needs a listener of its own:
//
//   <table onKeyDown={enterMovesToNextCell}>
//
//   Enter        → next field on the same row, wrapping to the row below
//   Shift+Enter  → back one field
//
// Tab is untouched — this only borrows its order, so both keys now do the same
// thing and a typist can use whichever one their fingers already know.

const SKIP_TYPES = new Set(['button', 'submit', 'reset', 'file', 'hidden', 'image']);
const FIELDS = 'input, select, textarea';

// Matches what Tab would land on: enabled, laid out, and not opted out of the
// tab order. ':disabled' rather than .disabled so a wrapping <fieldset disabled>
// counts too — the IDL property only reflects the field's own attribute.
function isTabStop(el: HTMLElement): boolean {
  if (el.matches(':disabled')) return false;
  if (el.tabIndex < 0) return false;
  if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) return false;
  return el.offsetParent !== null;
}

export function enterMovesToNextCell(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== 'Enter' || e.altKey || e.ctrlKey || e.metaKey) return;

  // A <textarea> keeps Enter for its newline and a <select> keeps it for
  // confirming an open dropdown, so only plain fields are re-routed.
  const from = e.target as HTMLElement;
  if (!(from instanceof HTMLInputElement) || SKIP_TYPES.has(from.type)) return;

  const fields = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FIELDS)).filter(isTabStop);
  const i = fields.indexOf(from);
  if (i === -1) return;

  const next = fields[i + (e.shiftKey ? -1 : 1)];
  if (!next) return; // last cell of the sheet: stay put rather than jump away

  e.preventDefault(); // ...which also stops Enter from submitting a surrounding form
  next.focus();
  // Arriving with the value selected means typing replaces it, like a spreadsheet.
  try {
    (next as HTMLInputElement).select?.();
  } catch {
    /* number inputs refuse select() in some browsers — landing there is enough */
  }
}
