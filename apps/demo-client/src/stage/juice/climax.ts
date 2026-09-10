/**
 * ClimaxRibbon: compact celebration strip along the bottom edge of the 3D view.
 *
 * Two stages, monotonic (never downgrades):
 *   vault-open      -> "VAULT OPEN" ribbon, auto-hides
 *   heist-complete  -> "HEIST COMPLETE / <PRIZE> SECURED", persistent, one gold flash
 *
 * Never covers the centre of the scene; the diamond stays the hero.
 */

import { el, fadeOut } from './dom';
import { buildSparkles } from './toasts';
import { humanize, type ClimaxStage, isHigherClimax } from './events';

export interface ClimaxRequest {
  stage: Exclude<ClimaxStage, 'none'>;
  /** Item/door name from live data, e.g. "sunburst-diamond". */
  subject?: string;
  /** Optional one-liner (usually the action result). */
  body?: string;
}

const VAULT_VISIBLE_MS = 6000;
const OUT_MS = 320;

export class ClimaxRibbon {
  private root: HTMLElement;
  private ribbon: HTMLElement | null = null;
  private timer: number | null = null;
  private reducedMotion: boolean;
  stage: ClimaxStage = 'none';

  constructor(root: HTMLElement, reducedMotion: boolean) {
    this.root = root;
    this.reducedMotion = reducedMotion;
  }

  /** Show `req` if it outranks the current stage. Returns true when shown. */
  show(req: ClimaxRequest): boolean {
    if (!isHigherClimax(req.stage, this.stage)) return false;
    this.stage = req.stage;
    this.clearRibbon(true);

    const isFinal = req.stage === 'heist-complete';
    const ribbon = el('div', `hj-ribbon hj-ribbon--${req.stage}`);
    ribbon.setAttribute('role', 'status');

    const eyebrow = isFinal ? 'Heist complete' : 'Security bypassed';
    const title = isFinal ? `${prizeName(req.subject)} secured` : 'Vault open';

    ribbon.appendChild(el('span', 'hj-ribbon__rule'));
    const text = el('div', 'hj-ribbon__text');
    text.appendChild(el('div', 'hj-ribbon__eyebrow', eyebrow));
    text.appendChild(el('div', 'hj-ribbon__title', title));
    if (req.body && !isFinal) text.appendChild(el('div', 'hj-ribbon__body', req.body));
    ribbon.appendChild(text);
    ribbon.appendChild(el('span', 'hj-ribbon__rule'));

    if (isFinal && !this.reducedMotion) {
      ribbon.appendChild(buildSparkles(14));
      this.flash();
    }

    this.root.appendChild(ribbon);
    this.ribbon = ribbon;
    requestAnimationFrame(() => ribbon.classList.add('is-in'));

    if (!isFinal) {
      this.timer = window.setTimeout(() => this.clearRibbon(), VAULT_VISIBLE_MS);
    }
    return true;
  }

  /** Brief champagne wash over the view. Skipped under reduced motion. */
  private flash(): void {
    const wash = el('div', 'hj-flash');
    wash.setAttribute('aria-hidden', 'true');
    this.root.appendChild(wash);
    requestAnimationFrame(() => wash.classList.add('is-in'));
    window.setTimeout(() => wash.remove(), 900);
  }

  private clearRibbon(immediate = false): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    const r = this.ribbon;
    this.ribbon = null;
    if (!r) return;
    if (immediate || this.reducedMotion) r.remove();
    else void fadeOut(r, OUT_MS);
  }

  /** Reset for a new session. */
  reset(): void {
    this.stage = 'none';
    this.clearRibbon(true);
  }

  destroy(): void {
    this.reset();
  }
}

/** "sunburst-diamond" -> "Sunburst"; anything else -> humanized name or "Diamond". */
function prizeName(subject?: string): string {
  if (!subject) return 'Diamond';
  const words = humanize(subject).split(' ').filter(Boolean);
  const nonGeneric = words.filter((w) => !/^diamond$/i.test(w));
  return (nonGeneric.length ? nonGeneric : words).join(' ') || 'Diamond';
}
