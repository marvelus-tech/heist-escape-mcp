/**
 * showClueSheet: long-form text for phone seats (drawer contents, briefing
 * hints, instructions). Bottom sheet on phones, centered card on wider
 * screens. One sheet at a time; opening another closes the current one.
 *
 * All text is set via textContent, so server strings can never inject markup.
 */

export type SheetTone = 'gold' | 'cyan' | 'magenta';

export interface ClueSheetAction {
  label: string;
  /** Receives `close` so the action can decide whether to dismiss. */
  onClick?: (close: () => void) => void | Promise<void>;
  primary?: boolean;
  /** Dismiss after onClick. Defaults to true when no onClick is given. */
  closeOnClick?: boolean;
}

export interface ClueSheetOptions {
  title: string;
  /** Small caps label above the title, e.g. "Drawer contents". */
  eyebrow?: string;
  /** Paragraph(s). Newlines inside a string are preserved. */
  body: string | string[];
  /** Optional monospace block (tool call, config). */
  code?: string;
  tone?: SheetTone;
  actions?: ClueSheetAction[];
  /** Label for the built-in dismiss button; pass null to omit it. */
  dismissLabel?: string | null;
  onClose?: () => void;
}

export interface ClueSheetHandle {
  close(): void;
  el: HTMLElement;
}

const OUT_MS = 280;

let current: ClueSheetHandle | null = null;

export function showClueSheet(opts: ClueSheetOptions): ClueSheetHandle {
  current?.close();

  const tone = opts.tone ?? 'gold';
  const previousFocus = document.activeElement as HTMLElement | null;
  const previousOverflow = document.body.style.overflow;

  const scrim = document.createElement('div');
  scrim.className = 'hp-scrim';

  const sheet = document.createElement('section');
  sheet.className = `hp-sheet hp-sheet--${tone}`;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.tabIndex = -1;

  const grip = document.createElement('div');
  grip.className = 'hp-sheet__grip';
  sheet.appendChild(grip);

  if (opts.eyebrow) {
    const eyebrow = document.createElement('div');
    eyebrow.className = `hp-eyebrow hp-sheet__eyebrow${tone !== 'gold' ? ` hp-eyebrow--${tone}` : ''}`;
    eyebrow.textContent = opts.eyebrow;
    sheet.appendChild(eyebrow);
  }

  const title = document.createElement('h2');
  title.className = 'hp-title hp-sheet__title';
  title.id = `hp-sheet-title-${Date.now()}`;
  title.textContent = opts.title;
  sheet.appendChild(title);
  sheet.setAttribute('aria-labelledby', title.id);

  const rule = document.createElement('div');
  rule.className = 'hp-sheet__rule';
  sheet.appendChild(rule);

  const body = document.createElement('div');
  body.className = 'hp-sheet__body';
  const paragraphs = Array.isArray(opts.body) ? opts.body : [opts.body];
  for (const text of paragraphs) {
    const p = document.createElement('p');
    p.textContent = text;
    body.appendChild(p);
  }
  if (opts.code) {
    const pre = document.createElement('pre');
    pre.className = 'hp-code';
    pre.textContent = opts.code;
    body.appendChild(pre);
  }
  sheet.appendChild(body);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    if (current?.el === sheet) current = null;
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = previousOverflow;
    scrim.classList.remove('is-in');
    sheet.classList.remove('is-in');
    window.setTimeout(() => {
      scrim.remove();
      sheet.remove();
    }, OUT_MS);
    previousFocus?.focus?.();
    opts.onClose?.();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  const actions = document.createElement('div');
  actions.className = 'hp-sheet__actions';
  for (const action of opts.actions ?? []) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `hp-btn${action.primary ? ' hp-btn--primary' : ''}`;
    btn.textContent = action.label;
    btn.addEventListener('click', async () => {
      await action.onClick?.(close);
      if (action.closeOnClick ?? !action.onClick) close();
    });
    actions.appendChild(btn);
  }
  if (opts.dismissLabel !== null) {
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'hp-btn hp-btn--ghost';
    dismiss.textContent = opts.dismissLabel ?? 'Close';
    dismiss.addEventListener('click', close);
    actions.appendChild(dismiss);
  }
  if (actions.childElementCount > 0) sheet.appendChild(actions);

  scrim.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
  document.body.appendChild(scrim);
  document.body.appendChild(sheet);

  requestAnimationFrame(() => {
    scrim.classList.add('is-in');
    sheet.classList.add('is-in');
    sheet.focus({ preventScroll: true });
  });

  current = { close, el: sheet };
  return current;
}

/** Close whatever sheet is open (pages call this from destroy()). */
export function closeClueSheet(): void {
  current?.close();
}
