/**
 * showToast: short, non-blocking status for phone seats.
 *
 * Replaces `alert()` for one-liners ("Copied", "Connection lost"). Toasts
 * stack at the bottom of the viewport, never steal focus, and auto-dismiss.
 */

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  /** Visible time in ms. Defaults per tone. */
  durationMs?: number;
}

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 2200,
  info: 2600,
  error: 3200
};

const ICON: Record<ToastTone, string> = {
  success: '\u2666', // diamond suit, matches the Stage juice layer
  info: '\u25C9',
  error: '\u2715'
};

const OUT_MS = 200;
const MAX_VISIBLE = 3;

let host: HTMLElement | null = null;

function getHost(): HTMLElement {
  if (host && host.isConnected) return host;
  host = document.createElement('div');
  host.className = 'hp-toasts';
  host.setAttribute('aria-live', 'polite');
  document.body.appendChild(host);
  return host;
}

export function showToast(opts: ToastOptions | string): void {
  const req: ToastOptions = typeof opts === 'string' ? { message: opts } : opts;
  const tone = req.tone ?? 'info';
  const root = getHost();

  while (root.children.length >= MAX_VISIBLE) {
    root.firstElementChild?.remove();
  }

  const toast = document.createElement('div');
  toast.className = `hp-toast hp-toast--${tone}`;
  toast.setAttribute('role', 'status');

  const icon = document.createElement('span');
  icon.className = 'hp-toast__icon';
  icon.textContent = ICON[tone];
  toast.appendChild(icon);

  const text = document.createElement('span');
  text.textContent = req.message;
  toast.appendChild(text);

  root.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-in'));

  window.setTimeout(() => {
    toast.classList.remove('is-in');
    toast.classList.add('is-out');
    window.setTimeout(() => toast.remove(), OUT_MS);
  }, req.durationMs ?? DEFAULT_DURATION[tone]);
}
