/**
 * StageJuice: the single entry point for Module C.
 *
 *   const juice = StageJuice.mount(sceneContainer, { onEvent });
 *   juice.attachTicker(actionListEl);
 *   // in the polling loop:
 *   juice.onActions(data.actions);
 *   juice.onInventory(data.items);
 *   juice.onState(state);
 *
 * It owns its own DOM (appended into `root`) and its own CSS (juice.css), so
 * the host page never needs to know about toast/ribbon markup.
 */

import './juice.css';
import { ClimaxRibbon } from './climax';
import { prefersReducedMotion } from './dom';
import { installJuiceDebug } from './debug';
import { actionKey, classifyAction, detectClimax, diffActions, humanize } from './events';
import { ExamineCard } from './examine-card';
import { TickerEmphasis } from './ticker';
import { ToastLayer } from './toasts';
import type {
  ActionLogEntry,
  InventoryItem,
  JuiceEvent,
  StageJuiceOptions,
  StageStateLike
} from './types';

export class StageJuice {
  readonly root: HTMLElement;
  private opts: StageJuiceOptions;
  private toasts: ToastLayer;
  private examine: ExamineCard;
  private climax: ClimaxRibbon;
  private ticker: TickerEmphasis | null = null;

  private seenActions = new Set<string>();
  private seededActions = false;
  private seenItems = new Set<string>();
  private seededItems = false;
  private lastItemToast: { item: string; at: number } | null = null;
  private uninstallDebug: (() => void) | null = null;

  static mount(root: HTMLElement, opts: StageJuiceOptions = {}): StageJuice {
    return new StageJuice(root, opts);
  }

  private constructor(root: HTMLElement, opts: StageJuiceOptions) {
    this.root = root;
    this.opts = opts;
    const reduced = opts.reducedMotion ?? prefersReducedMotion();

    root.classList.add('hj-root');
    if (reduced) root.classList.add('hj-reduced-motion');

    this.toasts = new ToastLayer(root, reduced);
    this.examine = new ExamineCard(root, reduced);
    this.climax = new ClimaxRibbon(root, reduced);

    if (opts.debug !== false) this.uninstallDebug = installJuiceDebug(this);
  }

  // ----- Feed live data --------------------------------------------------

  /**
   * Feed the latest action-log page (any order). The first call only seeds the
   * seen-set so a reload mid-heist does not replay history as toasts.
   */
  onActions(actions: ActionLogEntry[] | undefined | null): void {
    if (!actions) return;
    const ordered = [...actions].sort(byTimestamp);
    const fresh = diffActions(this.seenActions, ordered);
    if (!this.seededActions) {
      this.seededActions = true;
      // Still let persistent climax state through on a reload.
      fresh.forEach((a) => this.applyClimaxFromAction(a));
      return;
    }
    fresh.forEach((a) => this.handleAction(a));
  }

  /** Feed the shared inventory; new items become gold toasts. */
  onInventory(items: InventoryItem[] | undefined | null): void {
    if (!items) return;
    const fresh = items.filter((i) => !this.seenItems.has(i.item));
    fresh.forEach((i) => this.seenItems.add(i.item));

    if (!this.seededItems) {
      this.seededItems = true;
      this.applyClimax(detectClimax({ inventory: items }));
      return;
    }
    // Take-actions already toast via onActions; only toast items that arrived
    // without a matching log line (e.g. host polls inventory faster than actions).
    fresh.forEach((i) => {
      if (this.seenActions.size && this.recentlyToastedItem(i.item)) return;
      this.emit({
        kind: /diamond/i.test(i.item) ? 'heist-complete' : 'item-acquired',
        tone: 'success',
        title: `${humanize(i.item)} ${/diamond/i.test(i.item) ? 'secured' : 'acquired'}`,
        player: i.takenBy,
        subject: i.item
      });
    });
  }

  /** Feed `/api/get_state`. Drives the climax ribbon; also forwards nested lists. */
  onState(state: StageStateLike | undefined | null): void {
    if (!state) return;
    if (state.recentActions) this.onActions(state.recentActions);
    if (state.inventory) this.onInventory(state.inventory);
    this.applyClimax(detectClimax(state));
  }

  /** Highlight the newest row of an existing action list. Safe to call once. */
  attachTicker(list: HTMLElement | null): void {
    if (!list) return;
    this.ticker?.destroy();
    this.ticker = new TickerEmphasis(list);
  }

  // ----- Direct API (also used by the debug helpers) ---------------------

  toast(tone: JuiceEvent['tone'], title: string, body?: string, meta?: string): void {
    this.toasts.show({ tone, title, body, meta });
  }

  showExamineCard(subject: string, text: string, player?: string): void {
    this.examine.show({ subject: humanize(subject), text, player });
  }

  celebrate(stage: 'vault-open' | 'heist-complete', subject?: string, body?: string): void {
    this.climax.show({ stage, subject, body });
  }

  /** Push a synthetic action row through the full pipeline (bypasses seeding). */
  ingestAction(action: ActionLogEntry): void {
    this.seenActions.add(actionKey(action));
    this.seededActions = true;
    this.handleAction(action);
  }

  /** Forget everything (new session). Keeps DOM mounted. */
  reset(): void {
    this.seenActions.clear();
    this.seenItems.clear();
    this.seededActions = false;
    this.seededItems = false;
    this.toasts.clear();
    this.examine.hide(true);
    this.climax.reset();
  }

  destroy(): void {
    this.uninstallDebug?.();
    this.ticker?.destroy();
    this.toasts.destroy();
    this.examine.destroy();
    this.climax.destroy();
    this.root.classList.remove('hj-root', 'hj-reduced-motion');
  }

  // ----- Internals --------------------------------------------------------

  private handleAction(action: ActionLogEntry): void {
    const event = classifyAction(action);
    if (!event) return;
    if (event.kind === 'item-acquired' || event.kind === 'heist-complete') {
      this.lastItemToast = { item: event.subject ?? '', at: Date.now() };
      if (event.subject) this.seenItems.add(event.subject);
    }
    this.emit(event);
  }

  private recentlyToastedItem(item: string): boolean {
    const t = this.lastItemToast;
    return !!t && t.item === item && Date.now() - t.at < 10_000;
  }

  private emit(event: JuiceEvent): void {
    switch (event.kind) {
      case 'examine':
        this.examine.show({ subject: humanize(event.subject), text: event.body ?? '', player: event.player });
        this.toasts.show({ tone: 'info', title: event.title, body: humanize(event.subject), meta: byLine(event) });
        break;

      case 'heist-complete':
        this.toasts.clear();
        this.toasts.show({ tone: 'success', title: event.title, body: event.body, meta: byLine(event), durationMs: 3600 });
        this.climax.show({ stage: 'heist-complete', subject: event.subject, body: event.body });
        break;

      case 'vault-open':
        this.toasts.show({ tone: 'success', title: event.title, body: event.body, meta: byLine(event), durationMs: 3200 });
        this.climax.show({ stage: 'vault-open', subject: event.subject, body: event.body });
        break;

      default:
        this.toasts.show({ tone: event.tone, title: event.title, body: event.body, meta: byLine(event) });
    }
    this.opts.onEvent?.(event);
  }

  private applyClimaxFromAction(action: ActionLogEntry): void {
    const event = classifyAction(action);
    if (event?.kind === 'heist-complete' || event?.kind === 'vault-open') {
      this.climax.show({ stage: event.kind, subject: event.subject });
    }
  }

  private applyClimax(found: ReturnType<typeof detectClimax>): void {
    if (found.stage === 'none') return;
    const shown = this.climax.show({ stage: found.stage, subject: found.subject });
    if (shown && found.stage === 'heist-complete') {
      this.opts.onEvent?.({
        kind: 'heist-complete',
        tone: 'success',
        title: `${humanize(found.subject)} secured`,
        subject: found.subject
      });
    }
  }
}

function byLine(e: JuiceEvent): string | undefined {
  return e.player ? `by ${e.player}` : undefined;
}

function byTimestamp(a: ActionLogEntry, b: ActionLogEntry): number {
  return Number(a.timestamp) - Number(b.timestamp);
}
