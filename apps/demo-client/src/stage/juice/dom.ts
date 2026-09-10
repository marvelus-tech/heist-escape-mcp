/** Tiny DOM helpers so we never touch innerHTML with server strings. */

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

/** Add a class, force a reflow so the transition runs, then remove after `ms`. */
export function fadeOut(node: HTMLElement, ms: number): Promise<void> {
  return new Promise((resolve) => {
    node.classList.remove('is-in');
    node.classList.add('is-out');
    window.setTimeout(() => {
      node.remove();
      resolve();
    }, ms);
  });
}
