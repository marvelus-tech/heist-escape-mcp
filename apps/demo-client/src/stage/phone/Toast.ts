/**
 * Toast: short, self-dismissing status for phone roles.
 *
 * Replaces `alert('Code submitted')`-style one-liners. Toasts stack under the
 * notch, newest at the bottom, and never block input: tap one to dismiss it
 * early. Palette matches Stage: success = gold, info = cyan, error = soft
 * danger that stays visible a little longer but never shouts.
 */

import { el, getLayer, nextFrame, wait } from './layer';

export type ToastKind = 'success' | 'info' | 'error' | 'warning';
/** Aliases kept for pages written against the OP-B / OP-C kits. */
export type ToastTone = ToastKind;
export type PhoneToastTone = ToastKind;

export interface ToastOptions {
  /** Default 'info'. */
  kind?: ToastKind;
  /** Alias for `kind`. */
  tone?: ToastKind;
  message?: string;
  /** Alias for `message` (OP-B style: bold title + body). */
  body?: string;
  /** Optional bold lead-in, e.g. "Code accepted". */
  title?: string;
  /** Visible time in ms. Defaults per kind; pass 0 to keep it until tapped. */
  durationMs?: number;
}

export interface ToastHandle {
  el: HTMLElement;
  dismiss(): Promise<void>;
}

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 2600,
  info: 2400,
  error: 4200,
  warning: 3400
};

const ICON: Record<ToastKind, string> = {
  success: '\u2666', // diamond suit, same glyph Stage uses for rewards
  info: '\u25C9', // fisheye
  error: '\u2715', // multiplication x
  warning: '!'
};

const OUT_MS = 220;
const MAX_VISIBLE = 3;

const visible: ToastHandle[] = [];

export type PhoneToastRequest = ToastOptions;

export function showToast(input: ToastOptions | string): ToastHandle {
  const opts: ToastOptions = typeof input === 'string' ? { message: input } : input;
  const kind: ToastKind = opts.kind ?? opts.tone ?? 'info';
  const message = opts.message ?? opts.body;
  const layer = getLayer();

  // Keep the stack short so a burst of poll results cannot cover the screen.
  while (visible.length >= MAX_VISIBLE) {
    void visible[0].dismiss();
    visible.shift();
  }

  const toast = el('div', `hp-toast hp-toast--${kind}`);
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  toast.appendChild(el('span', 'hp-toast__icon', ICON[kind]));

  const text = el('div', 'hp-toast__text');
  if (opts.title) text.appendChild(el('div', 'hp-toast__title', opts.title));
  if (message) text.appendChild(el('div', 'hp-toast__message', message));
  toast.appendChild(text);

  layer.toasts.appendChild(toast);

  let timer: number | null = null;
  let dismissing: Promise<void> | null = null;

  const dismiss = (): Promise<void> => {
    if (dismissing) return dismissing;
    if (timer !== null) window.clearTimeout(timer);
    dismissing = (async () => {
      toast.classList.remove('is-in');
      toast.classList.add('is-out');
      await wait(layer.reducedMotion ? 0 : OUT_MS);
      toast.remove();
      const idx = visible.indexOf(handle);
      if (idx >= 0) visible.splice(idx, 1);
    })();
    return dismissing;
  };

  const handle: ToastHandle = { el: toast, dismiss };
  visible.push(handle);

  toast.addEventListener('click', () => void dismiss());
  void nextFrame().then(() => toast.classList.add('is-in'));

  const duration = opts.durationMs ?? DEFAULT_DURATION[kind];
  if (duration > 0) {
    timer = window.setTimeout(() => void dismiss(), duration);
  }

  return handle;
}

/** Dismiss every visible toast immediately. */
export function clearToasts(): void {
  for (const t of [...visible]) void t.dismiss();
}
