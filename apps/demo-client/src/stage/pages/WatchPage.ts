/**
 * Watch Page - Read-only companion view
 *
 * For guests who just want to follow along:
 * - Action log mirror (tap an entry to read the full result in a clue sheet)
 * - Inventory mirror
 * - No controls
 * - Phone-optimized, dark glass, magenta = Watch role accent
 *
 * Messaging rules: long text -> showClueSheet, short status -> showToast.
 * No system alert() anywhere on this page.
 */

import { showClueSheet, closeClueSheet, showToast, copyToClipboard, escapeHtml as esc } from '../phone';

interface WatchAction {
  player: string;
  result: string;
  timestamp: number | string;
}

const POLL_MS = 2000;
const STYLE_ID = 'watch-page-styles';

export class WatchPage {
  private apiBase: string;
  private sessionId: string;
  private pollTimer: number | null = null;
  private offline = false;
  private actions: WatchAction[] = [];

  constructor(apiBase: string, sessionId: string) {
    this.apiBase = apiBase;
    this.sessionId = sessionId;
  }

  render() {
    const app = document.getElementById('app')!;
    const sid = esc(this.sessionId);

    app.innerHTML = `
      <div class="watch-container hp-page">
        <header class="watch-header hp-glass hp-glass--magenta">
          <div class="watch-header__row">
            <span class="hp-eyebrow hp-eyebrow--magenta">Heist Escape</span>
            <span id="watch-live" class="hp-live"><span class="he-live-dot"></span>Live</span>
          </div>
          <h1 class="hp-title">Watch</h1>
          <button id="watch-session" class="hp-chip" type="button" aria-label="Copy session ID">
            Session <code>${sid}</code>
          </button>
          <p class="watch-note hp-muted">
            Read-only companion. Keep an eye on the main screen for the 3D museum.
          </p>
          <button id="watch-help" class="hp-btn hp-btn--ghost watch-help" type="button">How this works</button>
        </header>

        <div class="watch-content">
          <section class="watch-section hp-glass">
            <h2><span class="hp-eyebrow hp-eyebrow--cyan">Live actions</span></h2>
            <div id="watch-action-log" class="watch-list">
              <div class="hp-empty">Waiting for actions...</div>
            </div>
          </section>

          <section class="watch-section hp-glass">
            <h2><span class="hp-eyebrow">Shared inventory</span></h2>
            <div id="watch-inventory" class="watch-list">
              <div class="hp-empty">No items yet</div>
            </div>
          </section>

          <section class="watch-section hp-glass">
            <h2><span class="hp-eyebrow hp-eyebrow--magenta">Current players</span></h2>
            <div id="watch-players" class="watch-list">
              <div class="hp-empty">Loading...</div>
            </div>
          </section>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.applyStyles();
    this.startPolling();
  }

  private attachEventListeners() {
    document.getElementById('watch-session')?.addEventListener('click', async () => {
      const ok = await copyToClipboard(this.sessionId);
      showToast(
        ok
          ? { tone: 'success', message: `Session ${this.sessionId} copied` }
          : { tone: 'error', message: 'Copy blocked by the browser. Read the code off the badge instead.' }
      );
    });

    document.getElementById('watch-help')?.addEventListener('click', () => {
      showClueSheet({
        tone: 'magenta',
        eyebrow: 'Watch seat',
        title: 'Following along',
        body: [
          'This phone mirrors the heist. It refreshes every couple of seconds and never sends commands, so you cannot break anything by tapping around.',
          'Live actions show what the Operator and Examiner just did. Tap any entry to read the full result.',
          'Shared inventory is everything the team is carrying. Current players lists who is in the session and their role.',
          'Want a seat at the table? Scan the Operator or Examiner QR code on the main screen.'
        ]
      });
    });

    // Delegate taps on action rows to a clue sheet with the full result text.
    document.getElementById('watch-action-log')?.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('[data-action-idx]');
      if (!row) return;
      const action = this.actions[Number(row.dataset.actionIdx)];
      if (!action) return;
      showClueSheet({
        tone: 'cyan',
        eyebrow: `${action.player} at ${formatTime(action.timestamp)}`,
        title: 'Action result',
        body: action.result
      });
    });
  }

  private async post<T = any>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId, ...body })
    });
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    return res.json();
  }

  private startPolling() {
    const tick = async () => {
      try {
        const [stateData, invData, actionsData] = await Promise.all([
          this.post('/api/get_state', {}),
          this.post('/api/get_inventory', {}),
          this.post('/api/get_recent_actions', { limit: 10 })
        ]);
        this.renderPlayers(stateData.players);
        this.renderInventory(invData.items);
        this.renderActions(actionsData.actions);
        this.setOffline(false);
      } catch (error) {
        console.error('Polling error:', error);
        this.setOffline(true);
      }
    };
    tick();
    this.pollTimer = window.setInterval(tick, POLL_MS);
  }

  /** Flip the header pill and toast only on transitions, not every failed poll. */
  private setOffline(offline: boolean) {
    if (offline === this.offline) return;
    this.offline = offline;
    const pill = document.getElementById('watch-live');
    if (pill) {
      pill.classList.toggle('is-offline', offline);
      pill.lastChild!.textContent = offline ? 'Reconnecting' : 'Live';
    }
    showToast(
      offline
        ? { tone: 'error', message: 'Lost contact with the server. Retrying...' }
        : { tone: 'success', message: 'Back in sync' }
    );
  }

  private renderPlayers(players?: Array<{ name: string; role?: string }>) {
    const list = document.getElementById('watch-players');
    if (!list || !players) return;
    if (players.length === 0) {
      list.innerHTML = '<div class="hp-empty">No players yet</div>';
      return;
    }
    list.innerHTML = players
      .map(
        (player) => `
          <div class="watch-item">
            <span class="watch-item__icon">${player.role === 'examiner' ? '🕵️' : '📱'}</span>
            <span class="watch-item__label">${esc(player.name)}</span>
            <span class="watch-item__meta watch-role watch-role--${esc(player.role || 'guest')}">${esc(player.role || 'guest')}</span>
          </div>`
      )
      .join('');
  }

  private renderInventory(items?: Array<{ item: string; takenBy: string }>) {
    const list = document.getElementById('watch-inventory');
    if (!list || !items) return;
    if (items.length === 0) {
      list.innerHTML = '<div class="hp-empty">No items yet</div>';
      return;
    }
    list.innerHTML = items
      .map(
        (item) => `
          <div class="watch-item">
            <span class="watch-item__icon">📦</span>
            <span class="watch-item__label">${esc(item.item)}</span>
            <span class="watch-item__meta">by ${esc(item.takenBy)}</span>
          </div>`
      )
      .join('');
  }

  private renderActions(actions?: WatchAction[]) {
    const log = document.getElementById('watch-action-log');
    if (!log || !actions) return;
    this.actions = actions.slice(-10).reverse();
    if (this.actions.length === 0) {
      log.innerHTML = '<div class="hp-empty">Waiting for actions...</div>';
      return;
    }
    log.innerHTML = this.actions
      .map(
        (action, idx) => `
          <button class="watch-item action-item" type="button" data-action-idx="${idx}">
            <div class="action-header">
              <span class="action-player">${esc(action.player)}</span>
              <span class="action-time">${formatTime(action.timestamp)}</span>
            </div>
            <div class="action-result">${esc(action.result)}</div>
          </button>`
      )
      .join('');
  }

  private applyStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .watch-container {
        max-width: 600px;
        margin: 0 auto;
        padding: var(--he-s-4);
        padding-bottom: calc(var(--he-s-6) + env(safe-area-inset-bottom, 0px));
      }

      .watch-header {
        padding: var(--he-s-4) var(--he-s-5) var(--he-s-5);
        margin-bottom: var(--he-s-4);
        text-align: center;
      }

      .watch-header__row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--he-s-3);
      }

      .watch-header h1 {
        font-size: 2rem;
        color: var(--he-magenta-100);
        margin-bottom: var(--he-s-3);
      }

      .watch-note {
        font-size: 0.875rem;
        margin: var(--he-s-3) 0 var(--he-s-4);
        line-height: 1.5;
      }

      .watch-help {
        width: 100%;
        border-color: var(--he-hairline-magenta);
      }

      .watch-content {
        display: flex;
        flex-direction: column;
        gap: var(--he-s-4);
      }

      .watch-section {
        padding: var(--he-s-4);
      }

      .watch-section h2 {
        margin-bottom: var(--he-s-3);
      }

      .watch-list {
        max-height: 320px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .watch-item {
        display: flex;
        align-items: center;
        gap: var(--he-s-3);
        width: 100%;
        padding: var(--he-s-3);
        margin: var(--he-s-2) 0;
        border-radius: var(--he-r-sm);
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--hp-hairline);
        color: var(--hp-text);
        font: inherit;
        text-align: left;
      }

      .watch-item__icon {
        font-size: 1.15rem;
      }

      .watch-item__label {
        font-weight: 600;
      }

      .watch-item__meta {
        margin-left: auto;
        font-size: 0.8rem;
        color: var(--hp-text-dim);
      }

      .watch-role {
        padding: 2px 8px;
        border-radius: var(--he-r-pill);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.65rem;
        font-weight: 600;
        border: 1px solid var(--hp-hairline);
      }

      .watch-role--examiner { color: var(--he-cyan-300); border-color: var(--he-hairline-cyan); }
      .watch-role--operator { color: var(--he-gold-200); border-color: var(--he-hairline-gold); }
      .watch-role--watch { color: var(--he-magenta-300); border-color: var(--he-hairline-magenta); }

      .action-item {
        flex-direction: column;
        align-items: stretch;
        border-left: 2px solid var(--he-cyan-500);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: background var(--he-dur-fast) var(--he-ease);
      }

      .action-item:active {
        background: rgba(79, 184, 208, 0.12);
      }

      .action-header {
        display: flex;
        justify-content: space-between;
        gap: var(--he-s-3);
        margin-bottom: var(--he-s-1);
      }

      .action-player {
        font-weight: 600;
        color: var(--he-cyan-300);
      }

      .action-time {
        font-size: 0.75rem;
        color: var(--hp-text-mute);
        font-variant-numeric: tabular-nums;
      }

      .action-result {
        font-size: 0.875rem;
        line-height: 1.45;
        color: var(--hp-text-dim);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  destroy() {
    if (this.pollTimer !== null) window.clearInterval(this.pollTimer);
    this.pollTimer = null;
    closeClueSheet();
  }
}

function formatTime(ts: number | string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
