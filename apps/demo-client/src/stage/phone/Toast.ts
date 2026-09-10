/**
 * Phone toast: one visible at a time, queued, auto-dismissed, tap to dismiss.
 * Replaces browser alert() for short results and validation nags.
 *
 * Tones: success = gold, info = cyan, error = quiet slate, warning = amber.
 */

import { el, mountPhoneKit, prefersReducedMotion } from './mount';

export type PhoneToastTone = 'success' | 'info' | 'error' | 'warning';

export interface PhoneToastRequest {
  tone: PhoneToastTone;
  title: string;
  body?: string;
  durationMs?: number;
}

const DEFAULT_DURATION: Record<PhoneToastTone, number> = {
  success: 3200,
  info: 2600,
  error: 3000,
  warning: 3000
};

const ICON: Record<PhoneToastTone, string> = {
  success: '\u2666', // diamond suit
  info: '\u25C9', // fisheye
  error: '\u2715', // multiplication x
  warning: '!'
};

const OUT_MS = 220;
const MAX_QUEUE = 3;

let host: HTMLElement | null = null;
let current: HTMLElement | null = null;
let timer: number | null = null;
const queue: PhoneToastRequest[] = [];

function ensureHost(): HTMLElement {
  if (host?.isConnected) return host;
  host = el('div', 'he-toasts');
  host.setAttribute('aria-live', 'polite');
  mountPhoneKit().appendChild(host);
  return host;
}

export function showToast(req: PhoneToastRequest): void {
  if (queue.length >= MAX_QUEUE) queue.shift();
  queue.push(req);
  if (!current) next();
}

export function clearToasts(): void {
  queue.length = 0;
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  current?.remove();
  current = null;
}

function dismiss(toast: HTMLElement): void {
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  const ms = prefersReducedMotion() ? 0 : OUT_MS;
  toast.classList.remove('is-in');
  toast.classList.add('is-out');
  window.setTimeout(() => {
    toast.remove();
    if (current === toast) current = null;
    next();
  }, ms);
}

function next(): void {
  const req = queue.shift();
  if (!req) {
    current = null;
    return;
  }

  const toast = el('div', `he-toast he-toast--${req.tone}`);
  toast.setAttribute('role', 'status');
  toast.appendChild(el('span', 'he-toast__icon', ICON[req.tone]));

  const text = el('div', 'he-toast__text');
  text.appendChild(el('div', 'he-toast__title', req.title));
  if (req.body) text.appendChild(el('div', 'he-toast__body', req.body));
  toast.appendChild(text);

  toast.addEventListener('click', () => dismiss(toast), { once: true });

  ensureHost().appendChild(toast);
  current = toast;
  requestAnimationFrame(() => toast.classList.add('is-in'));

  timer = window.setTimeout(() => dismiss(toast), req.durationMs ?? DEFAULT_DURATION[req.tone]);
}
