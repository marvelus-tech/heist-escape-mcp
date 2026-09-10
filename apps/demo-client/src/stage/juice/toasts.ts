/**
 * ToastLayer: one toast visible at a time, queued, auto-dismissed.
 *
 * Tones map to the Module A/B palette: success = champagne gold,
 * info = cyan interact, error = quiet slate (failures should never out-shout
 * successes on a stage screen).
 */

import { el, fadeOut } from './dom';
import type { JuiceTone } from './types';

export interface ToastRequest {
  tone: JuiceTone;
  title: string;
  body?: string;
  /** Small caption under the body, e.g. "by Raven". */
  meta?: string;
  /** Visible time in ms (defaults per tone). */
  durationMs?: number;
  /** Extra modifier class, e.g. 'reveal' -> .hj-toast--reveal. */
  variant?: 'reveal' | 'pending';
  /** Gold particle burst; defaults to true for success toasts. */
  sparkle?: boolean;
}

const DEFAULT_DURATION: Record<JuiceTone, number> = {
  success: 2800,
  info: 2200,
  error: 2000,
  warning: 2600
};

const ICON: Record<JuiceTone, string> = {
  success: '\u2666', // diamond suit
  info: '\u25C9', // fisheye
  error: '\u2715', // multiplication x
  warning: '!'
};

const VARIANT_ICON: Record<NonNullable<ToastRequest['variant']>, string> = {
  reveal: '\u2726', // black four-pointed star
  pending: '?'
};

const OUT_MS = 260;
const MAX_QUEUE = 4;

export class ToastLayer {
  private host: HTMLElement;
  private queue: ToastRequest[] = [];
  private current: HTMLElement | null = null;
  private timer: number | null = null;
  private reducedMotion: boolean;

  constructor(root: HTMLElement, reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
    this.host = el('div', 'hj-toasts');
    this.host.setAttribute('aria-live', 'polite');
    root.appendChild(this.host);
  }

  show(req: ToastRequest): void {
    // Keep the queue short: on a busy poll, drop the oldest info toast first.
    if (this.queue.length >= MAX_QUEUE) {
      const idx = this.queue.findIndex((q) => q.tone === 'info');
      this.queue.splice(idx >= 0 ? idx : 0, 1);
    }
    this.queue.push(req);
    if (!this.current) this.next();
  }

  /** Drop everything queued and hide the visible toast immediately. */
  clear(): void {
    this.queue = [];
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.current?.remove();
    this.current = null;
  }

  destroy(): void {
    this.clear();
    this.host.remove();
  }

  private next(): void {
    const req = this.queue.shift();
    if (!req) {
      this.current = null;
      return;
    }

    const toast = el('div', `hj-toast hj-toast--${req.tone}${req.variant ? ` hj-toast--${req.variant}` : ''}`);
    toast.setAttribute('role', 'status');
    toast.appendChild(el('span', 'hj-toast__icon', req.variant ? VARIANT_ICON[req.variant] : ICON[req.tone]));

    const text = el('div', 'hj-toast__text');
    text.appendChild(el('div', 'hj-toast__title', req.title));
    if (req.body) text.appendChild(el('div', 'hj-toast__body', req.body));
    if (req.meta) text.appendChild(el('div', 'hj-toast__meta', req.meta));
    toast.appendChild(text);

    const sparkle = req.sparkle ?? req.tone === 'success';
    if (sparkle && !this.reducedMotion) {
      toast.appendChild(buildSparkles(8));
    }

    this.host.appendChild(toast);
    this.current = toast;
    // Next frame so the enter transition actually plays.
    requestAnimationFrame(() => toast.classList.add('is-in'));

    const visible = req.durationMs ?? DEFAULT_DURATION[req.tone];
    this.timer = window.setTimeout(async () => {
      this.timer = null;
      await fadeOut(toast, this.reducedMotion ? 0 : OUT_MS);
      if (this.current === toast) this.current = null;
      this.next();
    }, visible);
  }
}

/** Gold particle sparkle. Each dot gets a random angle/delay via CSS vars. */
export function buildSparkles(count: number): HTMLElement {
  const wrap = el('div', 'hj-sparkles');
  wrap.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const dot = el('i', 'hj-sparkle');
    dot.style.setProperty('--angle', `${Math.round((360 / count) * i + Math.random() * 24)}deg`);
    dot.style.setProperty('--dist', `${28 + Math.round(Math.random() * 26)}px`);
    dot.style.setProperty('--delay', `${Math.round(Math.random() * 180)}ms`);
    wrap.appendChild(dot);
  }
  return wrap;
}
