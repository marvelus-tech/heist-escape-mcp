/**
 * Phone UI layer: one fixed, full-viewport host that ClueSheet and Toast
 * render into.
 *
 * Role pages re-render by assigning `#app.innerHTML`, which would wipe any
 * overlay mounted inside it. The layer therefore defaults to `document.body`
 * and is created lazily on first use, so callers can simply `showToast(...)`
 * without an explicit mount step.
 */

import { el, prefersReducedMotion } from '../juice/dom';

export { el, prefersReducedMotion };

export interface PhoneUiLayer {
  /** Fixed host that scopes the `--hp-*` tokens and holds both regions. */
  root: HTMLElement;
  /** Bottom-anchored region for sheets. */
  sheets: HTMLElement;
  /** Top-anchored `aria-live` region for toasts. */
  toasts: HTMLElement;
  reducedMotion: boolean;
}

let layer: PhoneUiLayer | null = null;

/**
 * Create (or return the existing) phone UI layer. Idempotent: calling it twice
 * with different roots keeps the first mount and returns it, so pages can call
 * it defensively on every render.
 */
export function mountPhoneUi(root: HTMLElement = document.body): PhoneUiLayer {
  if (layer && layer.root.isConnected) return layer;

  const host = el('div', 'hp-layer');
  host.setAttribute('data-phone-ui', '');

  const toasts = el('div', 'hp-toasts');
  toasts.setAttribute('aria-live', 'polite');
  toasts.setAttribute('aria-relevant', 'additions');

  const sheets = el('div', 'hp-sheets');

  host.append(toasts, sheets);
  root.appendChild(host);

  layer = { root: host, sheets, toasts, reducedMotion: prefersReducedMotion() };
  return layer;
}

/** Remove the layer and everything inside it. Mainly for tests / stories. */
export function unmountPhoneUi(): void {
  layer?.root.remove();
  layer = null;
}

export function getLayer(): PhoneUiLayer {
  return layer && layer.root.isConnected ? layer : mountPhoneUi();
}

/** Wait one frame so an `is-in` class change actually transitions. */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
