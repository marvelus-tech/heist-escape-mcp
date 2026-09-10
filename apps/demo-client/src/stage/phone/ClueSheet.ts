/**
 * ClueSheet: a bottom sheet for long clue text (drawer contents, notes).
 *
 * Dark frosted glass with a gold title and cyan hairline, matching the
 * "EXAMINE CLUE" panel from the concept art. Body scrolls; Done dismisses;
 * optional Pin hands the clue back to the caller (e.g. an on-page Find Log).
 * Only one sheet is open at a time; opening a new one replaces the old.
 */

import { el, mountPhoneKit, prefersReducedMotion } from './mount';

export interface ClueSheetRequest {
  /** e.g. "Drawer · reception-desk-top" */
  title: string;
  /** Small caps label above the title, e.g. "Clue found". */
  eyebrow?: string;
  /** Full clue text. Newlines are preserved. */
  contents: string;
  /** When provided, a Pin button appears. Called once; button flips to "Pinned". */
  onPin?: () => void;
  pinLabel?: string;
  doneLabel?: string;
  onClose?: () => void;
}

export interface ClueSheetHandle {
  close(): void;
}

const OUT_MS = 240;

let open: { root: HTMLElement; close: () => void } | null = null;

export function showClueSheet(req: ClueSheetRequest): ClueSheetHandle {
  open?.close();

  const layer = mountPhoneKit();
  const root = el('div', 'he-sheet-root');
  const scrim = el('div', 'he-sheet__scrim');
  const sheet = el('section', 'he-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');

  const titleId = `he-sheet-title-${Date.now()}`;
  sheet.setAttribute('aria-labelledby', titleId);

  sheet.appendChild(el('div', 'he-sheet__grip'));

  const head = el('header', 'he-sheet__head');
  head.appendChild(el('span', 'he-sheet__glyph', '\u273F')); // black florette
  const headText = el('div', 'he-sheet__head-text');
  headText.appendChild(el('span', 'he-sheet__eyebrow', req.eyebrow ?? 'Clue found'));
  const title = el('h2', 'he-sheet__title', req.title);
  title.id = titleId;
  headText.appendChild(title);
  head.appendChild(headText);
  sheet.appendChild(head);

  const body = el('div', 'he-sheet__body');
  body.appendChild(el('p', 'he-sheet__text', req.contents));
  sheet.appendChild(body);

  const actions = el('footer', 'he-sheet__actions');
  if (req.onPin) {
    const pin = el('button', 'he-sheet__btn he-sheet__btn--pin', req.pinLabel ?? 'Pin to Find Log');
    pin.type = 'button';
    pin.addEventListener('click', () => {
      req.onPin?.();
      pin.textContent = 'Pinned';
      pin.disabled = true;
      pin.classList.add('is-pinned');
    });
    actions.appendChild(pin);
  }
  const done = el('button', 'he-sheet__btn he-sheet__btn--done', req.doneLabel ?? 'Done');
  done.type = 'button';
  actions.appendChild(done);
  sheet.appendChild(actions);

  root.appendChild(scrim);
  root.appendChild(sheet);
  layer.appendChild(root);

  let closed = false;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    if (open?.root === root) open = null;
    const ms = prefersReducedMotion() ? 0 : OUT_MS;
    root.classList.remove('is-in');
    root.classList.add('is-out');
    window.setTimeout(() => {
      root.remove();
      req.onClose?.();
    }, ms);
  };

  done.addEventListener('click', close);
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  open = { root, close };
  requestAnimationFrame(() => {
    root.classList.add('is-in');
    done.focus({ preventScroll: true });
  });

  return { close };
}

export function closeClueSheet(): void {
  open?.close();
}
