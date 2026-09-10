/**
 * TickerEmphasis: watches the existing action list and highlights the newest
 * line. StagePage keeps owning the markup; we only add classes, so this
 * survives a Module A restyle of the sidebar as long as `.action-item` exists.
 */

const ITEM_SELECTOR = '.action-item';

export class TickerEmphasis {
  private list: HTMLElement;
  private observer: MutationObserver;
  private lastNewestKey = '';

  constructor(list: HTMLElement) {
    this.list = list;
    this.list.classList.add('hj-ticker');
    this.observer = new MutationObserver(() => this.refresh());
    this.observer.observe(list, { childList: true });
    this.refresh();
  }

  /** Re-mark the newest row. Idempotent; safe to call after every re-render. */
  refresh(): void {
    const items = Array.from(this.list.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
    if (items.length === 0) {
      this.lastNewestKey = '';
      return;
    }

    // StagePage renders newest-first, so index 0 is the freshest line.
    const [newest, ...rest] = items;
    rest.forEach((n) => n.classList.remove('hj-ticker__newest', 'hj-ticker__newest--enter'));

    const key = newest.textContent ?? '';
    const changed = key !== this.lastNewestKey;
    this.lastNewestKey = key;

    newest.classList.add('hj-ticker__newest');
    if (changed) {
      // Retrigger the one-shot pulse animation.
      newest.classList.remove('hj-ticker__newest--enter');
      void newest.offsetWidth;
      newest.classList.add('hj-ticker__newest--enter');
    }
  }

  destroy(): void {
    this.observer.disconnect();
    this.list.classList.remove('hj-ticker');
  }
}
