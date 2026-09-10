/**
 * ClueSheet: a bottom sheet for long clue / result text on a phone.
 *
 * Replaces `alert(\`Drawer Contents:\n\n${text}\`)`. The body scrolls, the
 * title stays put, and the only ways out are Done, the scrim, or Escape, so
 * an Operator can read a full Elena note without the OS truncating it.
 *
 * Accessibility basics: `role="dialog"` + `aria-modal`, labelled by the title,
 * Tab / Shift+Tab stay inside the sheet, focus returns to the opener on close,
 * and page scroll is locked while open. Motion collapses to 0ms under
 * prefers-reduced-motion via the `--hp-dur` token.
 */

import { el, getLayer, nextFrame, wait } from './layer';

export type ClueAccent = 'gold' | 'cyan';

export interface ClueSheetOptions {
  title: string;
  /** Plain text. Blank lines split paragraphs; single newlines are kept. */
  body: string | string[];
  /** Small spaced-caps label above the title, e.g. "Drawer contents". */
  eyebrow?: string;
  /** Border / title accent. Gold reads as reward, cyan as examine. Default gold. */
  accent?: ClueAccent;
  /** Primary dismiss label. Default "Done". */
  doneLabel?: string;
  /** When provided, renders a secondary "Pin to Log" action. */
  onPin?: () => void;
  pinLabel?: string;
  /** Label shown on the pin button after it has been pressed. */
  pinnedLabel?: string;
  /** Called once the sheet has fully closed, however it was dismissed. */
  onClose?: () => void;
}

export interface ClueSheetHandle {
  el: HTMLElement;
  close(): Promise<void>;
  readonly isOpen: boolean;
}

const OUT_MS = 300;
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

let current: ClueSheetHandle | null = null;
let idSeq = 0;

export function showClueSheet(opts: ClueSheetOptions): ClueSheetHandle {
  // One sheet at a time: a new clue supersedes whatever is still on screen.
  if (current?.isOpen) void current.close();

  const layer = getLayer();
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const titleId = `hp-sheet-title-${++idSeq}`;

  const wrap = el('div', `hp-sheet-wrap hp-sheet-wrap--${opts.accent ?? 'gold'}`);
  const scrim = el('div', 'hp-scrim');
  scrim.setAttribute('aria-hidden', 'true');

  const sheet = el('section', 'hp-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', titleId);
  sheet.tabIndex = -1;

  sheet.appendChild(el('div', 'hp-sheet__grip'));

  const head = el('header', 'hp-sheet__head');
  if (opts.eyebrow) head.appendChild(el('span', 'hp-eyebrow', opts.eyebrow));
  const title = el('h2', 'hp-sheet__title', opts.title);
  title.id = titleId;
  head.appendChild(title);
  sheet.appendChild(head);

  const body = el('div', 'hp-sheet__body');
  // Focusable so keyboard users can scroll long notes with arrow keys.
  body.tabIndex = 0;
  for (const paragraph of toParagraphs(opts.body)) {
    body.appendChild(el('p', 'hp-sheet__p', paragraph));
  }
  sheet.appendChild(body);

  const actions = el('footer', 'hp-sheet__actions');
  if (opts.onPin) {
    const pin = el('button', 'hp-btn hp-btn--ghost', opts.pinLabel ?? 'Pin to Log');
    pin.type = 'button';
    pin.addEventListener('click', () => {
      opts.onPin?.();
      pin.textContent = opts.pinnedLabel ?? 'Pinned';
      pin.disabled = true;
      pin.classList.add('is-done');
      done.focus();
    });
    actions.appendChild(pin);
  }
  const done = el('button', 'hp-btn hp-btn--primary', opts.doneLabel ?? 'Done');
  done.type = 'button';
  actions.appendChild(done);
  sheet.appendChild(actions);

  wrap.append(scrim, sheet);
  layer.sheets.appendChild(wrap);
  document.documentElement.classList.add('hp-lock');

  let open = true;
  let closing: Promise<void> | null = null;

  const close = (): Promise<void> => {
    if (closing) return closing;
    open = false;
    closing = (async () => {
      sheet.removeEventListener('keydown', onKeydown);
      wrap.classList.remove('is-in');
      wrap.classList.add('is-out');
      await wait(layer.reducedMotion ? 0 : OUT_MS);
      wrap.remove();
      if (current === handle) {
        current = null;
        document.documentElement.classList.remove('hp-lock');
      }
      // Only hand focus back if the user has not moved on to something else.
      if (opener?.isConnected && (document.activeElement === document.body || document.activeElement === null)) {
        opener.focus({ preventScroll: true });
      }
      opts.onClose?.();
    })();
    return closing;
  };

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      void close();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === sheet)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  sheet.addEventListener('keydown', onKeydown);
  done.addEventListener('click', () => void close());
  scrim.addEventListener('click', () => void close());

  const handle: ClueSheetHandle = {
    el: sheet,
    close,
    get isOpen() {
      return open;
    }
  };
  current = handle;

  void nextFrame().then(() => {
    if (!open) return;
    wrap.classList.add('is-in');
    sheet.focus({ preventScroll: true });
  });

  return handle;
}

/** Close whatever sheet is showing, if any. */
export function closeClueSheet(): Promise<void> {
  return current?.isOpen ? current.close() : Promise.resolve();
}

function toParagraphs(body: string | string[]): string[] {
  const parts = Array.isArray(body) ? body : body.split(/\n\s*\n/);
  const trimmed = parts.map((p) => p.trim()).filter(Boolean);
  return trimmed.length > 0 ? trimmed : [''];
}
