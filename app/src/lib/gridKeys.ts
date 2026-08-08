import type { KeyboardEvent } from 'react';

// Enter moves DOWN a column — the habit every encoder brings from Excel, where
// you work one column at a time and Enter walks you down the list. Tab still
// moves across, so the two keys cover both directions. Attach it to the <table>
// (or any wrapper around the rows); it works by delegation, so no individual
// cell needs a listener of its own:
//
//   <table onKeyDown={enterMovesDown}>
//
//   Enter        → same column, next row
//   Shift+Enter  → same column, previous row
//
// Rows with nothing to type in — group headers, totals, read-only rows — are
// stepped over, so the caret lands on the next real input every time.

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

function fieldsIn(row: HTMLElement): HTMLElement[] {
  return Array.from(row.querySelectorAll<HTMLElement>(FIELDS)).filter(isTabStop);
}

function centerX(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return r.left + r.width / 2;
}

export function enterMovesDown(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== 'Enter' || e.altKey || e.ctrlKey || e.metaKey) return;

  // A <textarea> keeps Enter for its newline and a <select> keeps it for
  // confirming an open dropdown, so only plain fields are re-routed.
  const from = e.target as HTMLElement;
  if (!(from instanceof HTMLInputElement) || SKIP_TYPES.has(from.type)) return;

  const scope = e.currentTarget;
  const row = from.closest('tr');
  if (!row || !scope.contains(row)) return;

  e.preventDefault(); // ...which also stops Enter from submitting a surrounding form

  // "Same column" is decided by where the field actually sits, not by counting
  // fields: a row can be missing an input where another row has one (Encode
  // Grades shows a computed value instead once raw scores exist), and counting
  // would then slide the caret one column sideways. Screen position cannot.
  const x = centerX(from);
  const rows = Array.from(scope.querySelectorAll('tr'));
  const step = e.shiftKey ? -1 : 1;

  for (let i = rows.indexOf(row) + step; i >= 0 && i < rows.length; i += step) {
    const fields = fieldsIn(rows[i]);
    if (!fields.length) continue; // header, MALE/FEMALE divider, totals row…

    let next = fields[0];
    let best = Math.abs(centerX(next) - x);
    for (const f of fields.slice(1)) {
      const d = Math.abs(centerX(f) - x);
      if (d < best) {
        best = d;
        next = f;
      }
    }

    next.focus();
    // Arriving with the value selected means typing replaces it, like a spreadsheet.
    try {
      (next as HTMLInputElement).select?.();
    } catch {
      /* number inputs refuse select() in some browsers — landing there is enough */
    }
    return;
  }
  // Bottom of the column: stay put rather than jump somewhere unexpected.
}
