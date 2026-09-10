/**
 * ExamineCard: the frosted "EXAMINE CLUE" panel from the reference art.
 * Sits on the left edge of the 3D view, auto-dismisses, and a newer examine
 * simply replaces the old one so there is never more than one card.
 */

import { el, fadeOut } from './dom';

export interface ExamineCardRequest {
  /** Object name, e.g. "flower-arrangement" (already humanized by caller if desired). */
  subject: string;
  /** Result text from the action log. */
  text: string;
  player?: string;
  durationMs?: number;
}

const DEFAULT_MS = 5200;
const OUT_MS = 240;

export class ExamineCard {
  private root: HTMLElement;
  private card: HTMLElement | null = null;
  private timer: number | null = null;
  private reducedMotion: boolean;

  constructor(root: HTMLElement, reducedMotion: boolean) {
    this.root = root;
    this.reducedMotion = reducedMotion;
  }

  show(req: ExamineCardRequest): void {
    this.hide(true);

    const card = el('aside', 'hj-examine');
    card.setAttribute('role', 'note');

    const head = el('div', 'hj-examine__head');
    head.appendChild(el('span', 'hj-examine__glyph', '\u273F')); // black florette
    head.appendChild(el('span', 'hj-examine__eyebrow', 'Examine clue'));
    card.appendChild(head);

    card.appendChild(el('div', 'hj-examine__subject', req.subject));
    card.appendChild(el('p', 'hj-examine__text', req.text));

    const foot = el('div', 'hj-examine__foot');
    foot.appendChild(el('span', 'hj-examine__label', 'Clue type'));
    foot.appendChild(el('span', 'hj-examine__type', 'Observation'));
    if (req.player) foot.appendChild(el('span', 'hj-examine__by', `by ${req.player}`));
    card.appendChild(foot);

    this.root.appendChild(card);
    this.card = card;
    requestAnimationFrame(() => card.classList.add('is-in'));

    this.timer = window.setTimeout(() => this.hide(), req.durationMs ?? DEFAULT_MS);
  }

  hide(immediate = false): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    const card = this.card;
    this.card = null;
    if (!card) return;
    if (immediate || this.reducedMotion) card.remove();
    else void fadeOut(card, OUT_MS);
  }

  destroy(): void {
    this.hide(true);
  }
}
