/**
 * Phone kit mount helper.
 *
 * Phone role pages (Operator, Examiner) share one fixed overlay layer that
 * hosts toasts and clue sheets. It is created lazily on first use and survives
 * page re-renders because it lives outside `#app`.
 */

import './phone.css';

const LAYER_ID = 'he-phone-layer';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Idempotent: returns the existing layer if already mounted. */
export function mountPhoneKit(parent: HTMLElement = document.body): HTMLElement {
  let layer = document.getElementById(LAYER_ID);
  if (!layer) {
    layer = el('div', 'he-phone-layer');
    layer.id = LAYER_ID;
    parent.appendChild(layer);
  }
  return layer;
}

export function unmountPhoneKit(): void {
  document.getElementById(LAYER_ID)?.remove();
}
