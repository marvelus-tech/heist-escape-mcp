/**
 * Operator Page - Phone-friendly controls for the human player
 *
 * Features:
 * - Join session (name + role)
 * - Big action buttons (drawers, codes)
 * - Drawer contents open in a ClueSheet (never a browser alert)
 * - Pinned clues collect in an on-page Find Log
 * - Shared inventory + recent actions polled every 2s
 * - No heavy 3D required
 */

import { mountPhoneKit, showClueSheet, showToast } from '../phone';

interface FindLogEntry {
  title: string;
  contents: string;
  at: number;
}

const STYLE_ID = 'operator-page-styles';
const POLL_MS = 2000;

/** Escape server strings before they go into innerHTML templates. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "reception-desk-top" -> "Reception desk top" */
function humanize(id: string): string {
  const text = id.replace(/[-_]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export class OperatorPage {
  private apiBase: string;
  private sessionId: string;
  private playerId: string = '';
  private joined: boolean = false;
  private pollTimer: number | null = null;
  private findLog: FindLogEntry[] = [];

  constructor(apiBase: string, sessionId: string) {
    this.apiBase = apiBase;
    this.sessionId = sessionId;
    this.findLog = this.loadFindLog();
  }

  render() {
    const app = document.getElementById('app')!;
    mountPhoneKit();
    this.applyStyles();

    if (!this.joined) {
      app.innerHTML = this.renderJoinScreen();
    } else {
      app.innerHTML = this.renderControls();
      this.renderFindLog();
      this.startPolling();
    }

    this.attachEventListeners();
  }

  private renderHeader(subtitle: string): string {
    return `
      <header class="op-header">
        <div class="op-header__row">
          <span class="op-header__eyebrow">Operator</span>
          <span class="op-session">
            <span class="op-session__label">Session</span>
            <code class="op-session__id">${esc(this.sessionId)}</code>
          </span>
        </div>
        <h1 class="op-header__title">${esc(subtitle)}</h1>
      </header>
    `;
  }

  private renderJoinScreen(): string {
    return `
      <div class="op-page">
        ${this.renderHeader('Operator Controls')}

        <section class="op-card op-join">
          <span class="op-card__eyebrow">Phone companion</span>
          <h2 class="op-card__title">Join as Operator</h2>
          <p class="op-card__lede">
            You handle drawers, codes, and physical interactions.
            Keep the main screen in view for the 3D museum.
          </p>

          <label class="op-field">
            <span class="op-field__label">Your name</span>
            <input type="text" id="operator-name" class="op-input" placeholder="Enter your name" autocomplete="name" enterkeyhint="go" />
          </label>

          <button id="join-operator-btn" class="op-btn op-btn--gold">Join Heist</button>
        </section>
      </div>
    `;
  }

  private renderControls(): string {
    return `
      <div class="op-page">
        ${this.renderHeader(this.playerId)}

        <section class="op-card">
          <span class="op-card__eyebrow">Quick actions</span>
          <h2 class="op-card__title">Drawers</h2>
          <div class="op-stack">
            <button class="op-btn op-btn--cyan" data-drawer="reception-desk-top">Reception Desk (Top)</button>
            <button class="op-btn op-btn--cyan" data-drawer="reception-desk-middle">Reception Desk (Middle)</button>
            <button class="op-btn op-btn--cyan" data-drawer="reception-desk-bottom">Reception Desk (Bottom)</button>
            <button class="op-btn op-btn--cyan" data-drawer="filing-j-l">Filing Cabinet (J-L)</button>
          </div>
        </section>

        <section class="op-card">
          <span class="op-card__eyebrow">Keypad</span>
          <h2 class="op-card__title">Enter Code</h2>
          <div class="op-stack">
            <input type="text" id="code-input" class="op-input op-input--code" placeholder="Enter code" maxlength="8" inputmode="text" autocapitalize="characters" autocomplete="off" enterkeyhint="send" />
            <select id="code-target" class="op-input">
              <option value="">Select target</option>
              <option value="card-catalog">Card Catalog</option>
              <option value="vault-keypad">Vault Keypad</option>
            </select>
            <button id="submit-code-btn" class="op-btn op-btn--gold">Submit Code</button>
          </div>
        </section>

        <section class="op-card">
          <div class="op-card__head">
            <div>
              <span class="op-card__eyebrow">Pinned clues</span>
              <h2 class="op-card__title">Find Log</h2>
            </div>
            <button id="clear-find-log-btn" class="op-link-btn" type="button" hidden>Clear</button>
          </div>
          <div id="operator-find-log" class="op-list"></div>
        </section>

        <section class="op-card">
          <span class="op-card__eyebrow">Team</span>
          <h2 class="op-card__title">Shared Inventory</h2>
          <div id="operator-inventory" class="op-list">
            <div class="op-empty">No items yet</div>
          </div>
        </section>

        <section class="op-card">
          <span class="op-card__eyebrow">Live</span>
          <h2 class="op-card__title">Recent Actions</h2>
          <div id="operator-action-log" class="op-list">
            <div class="op-empty">No actions yet</div>
          </div>
        </section>

        <section class="op-card op-card--tips">
          <span class="op-card__eyebrow">Tips</span>
          <ul class="op-tips">
            <li>Wait for your Examiner agent to find clues</li>
            <li>Open drawers when requested</li>
            <li>Pin vault digits to the Find Log as you find them</li>
            <li>Assemble the code in room order (1-2-3-4)</li>
          </ul>
        </section>
      </div>
    `;
  }

  private attachEventListeners() {
    const joinBtn = document.getElementById('join-operator-btn');
    const nameInput = document.getElementById('operator-name') as HTMLInputElement | null;
    if (joinBtn) {
      joinBtn.addEventListener('click', () => this.joinSession());
      nameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.joinSession();
      });
    }

    document.querySelectorAll<HTMLButtonElement>('.op-btn[data-drawer]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const drawerId = btn.dataset.drawer;
        if (!drawerId) return;
        btn.disabled = true;
        try {
          await this.openDrawer(drawerId);
        } finally {
          btn.disabled = false;
        }
      });
    });

    const submitCodeBtn = document.getElementById('submit-code-btn');
    const codeInput = document.getElementById('code-input') as HTMLInputElement | null;
    if (submitCodeBtn) {
      submitCodeBtn.addEventListener('click', () => this.submitCode());
      codeInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.submitCode();
      });
    }

    document.getElementById('clear-find-log-btn')?.addEventListener('click', () => {
      this.findLog = [];
      this.saveFindLog();
      this.renderFindLog();
      showToast({ tone: 'info', title: 'Find Log cleared' });
    });
  }

  private async joinSession() {
    const nameInput = document.getElementById('operator-name') as HTMLInputElement | null;
    const name = nameInput?.value.trim();

    if (!name) {
      showToast({ tone: 'warning', title: 'Enter your name', body: 'The crew needs to know who is on the phone.' });
      nameInput?.focus();
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/api/join_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          playerName: name,
          role: 'operator'
        })
      });

      if (!response.ok) throw new Error(`Join failed (${response.status})`);

      this.playerId = name;
      this.joined = true;
      this.render();
      showToast({ tone: 'success', title: `Welcome, ${name}`, body: 'You are the Operator for this heist.' });
    } catch (error) {
      console.error('Failed to join:', error);
      showToast({
        tone: 'error',
        title: 'Could not join session',
        body: 'Make sure the server is running, then try again.'
      });
    }
  }

  private async openDrawer(drawerId: string) {
    try {
      const response = await fetch(`${this.apiBase}/api/open_drawer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          playerId: this.playerId,
          drawerId: drawerId
        })
      });

      const data = await response.json();

      if (data.success) {
        const title = `Drawer \u00B7 ${drawerId}`;
        const contents = String(data.contents ?? 'The drawer is empty');
        showClueSheet({
          eyebrow: 'Drawer opened',
          title,
          contents,
          onPin: () => this.pinToFindLog(title, contents)
        });
      } else {
        showToast({
          tone: 'error',
          title: humanize(drawerId),
          body: data.message || 'Failed to open drawer'
        });
      }
    } catch (error) {
      console.error('Failed to open drawer:', error);
      showToast({ tone: 'error', title: 'Error opening drawer', body: 'Check your connection and try again.' });
    }
  }

  private async submitCode() {
    const codeInput = document.getElementById('code-input') as HTMLInputElement | null;
    const targetSelect = document.getElementById('code-target') as HTMLSelectElement | null;

    const code = codeInput?.value.trim();
    const target = targetSelect?.value;

    if (!code) {
      showToast({ tone: 'warning', title: 'Enter a code first' });
      codeInput?.focus();
      return;
    }

    if (!target) {
      showToast({ tone: 'warning', title: 'Select a target', body: 'Card Catalog or Vault Keypad.' });
      targetSelect?.focus();
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/api/enter_code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          playerId: this.playerId,
          code: code,
          target: target
        })
      });

      const data = await response.json();
      const targetLabel = targetSelect?.selectedOptions[0]?.textContent ?? humanize(target);

      if (data.success) {
        showToast({
          tone: 'success',
          title: data.unlocked ? `Unlocked: ${humanize(String(data.unlocked))}` : `${targetLabel} accepted`,
          body: data.message || 'Code accepted'
        });
        if (codeInput) codeInput.value = '';
      } else {
        showToast({
          tone: 'error',
          title: `${targetLabel} rejected ${code}`,
          body: data.message || 'Incorrect code'
        });
        codeInput?.select();
      }
    } catch (error) {
      console.error('Failed to submit code:', error);
      showToast({ tone: 'error', title: 'Error submitting code', body: 'Check your connection and try again.' });
    }
  }

  // ---------- Find Log ----------

  private get findLogKey(): string {
    return `he-operator-findlog:${this.sessionId}`;
  }

  private loadFindLog(): FindLogEntry[] {
    try {
      const raw = sessionStorage.getItem(this.findLogKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveFindLog(): void {
    try {
      sessionStorage.setItem(this.findLogKey, JSON.stringify(this.findLog));
    } catch {
      // Storage may be unavailable (private mode); the in-memory log still works.
    }
  }

  private pinToFindLog(title: string, contents: string): void {
    this.findLog.unshift({ title, contents, at: Date.now() });
    this.saveFindLog();
    this.renderFindLog();
    showToast({ tone: 'success', title: 'Pinned to Find Log', body: title });
  }

  /** Built with DOM nodes (not innerHTML) because clue text comes from the server. */
  private renderFindLog(): void {
    const list = document.getElementById('operator-find-log');
    const clearBtn = document.getElementById('clear-find-log-btn');
    if (!list) return;

    list.replaceChildren();
    if (clearBtn) clearBtn.hidden = this.findLog.length === 0;

    if (this.findLog.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'op-empty';
      empty.textContent = 'Nothing pinned yet. Open a drawer and tap Pin.';
      list.appendChild(empty);
      return;
    }

    for (const entry of this.findLog) {
      const item = document.createElement('article');
      item.className = 'op-find';

      const head = document.createElement('div');
      head.className = 'op-find__head';
      const title = document.createElement('span');
      title.className = 'op-find__title';
      title.textContent = entry.title;
      const time = document.createElement('time');
      time.className = 'op-find__time';
      time.dateTime = new Date(entry.at).toISOString();
      time.textContent = new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      head.append(title, time);

      const text = document.createElement('p');
      text.className = 'op-find__text';
      text.textContent = entry.contents;

      item.append(head, text);
      item.addEventListener('click', () => {
        showClueSheet({ eyebrow: 'Find Log', title: entry.title, contents: entry.contents });
      });
      list.appendChild(item);
    }
  }

  // ---------- Polling ----------

  private startPolling() {
    this.stopPolling();
    this.pollTimer = window.setInterval(() => void this.poll(), POLL_MS);
  }

  private stopPolling() {
    if (this.pollTimer !== null) window.clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private async poll() {
    try {
      const invRes = await fetch(`${this.apiBase}/api/get_inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId })
      });
      const invData = await invRes.json();

      const invList = document.getElementById('operator-inventory');
      if (invList && invData.items) {
        if (invData.items.length === 0) {
          invList.innerHTML = '<div class="op-empty">No items yet</div>';
        } else {
          invList.innerHTML = invData.items
            .map(
              (item: any) =>
                `<div class="op-row op-row--gold">
                  <span class="op-row__name">${esc(item.item)}</span>
                  <span class="op-row__meta">by ${esc(item.takenBy)}</span>
                </div>`
            )
            .join('');
        }
      }

      const actionsRes = await fetch(`${this.apiBase}/api/get_recent_actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId, limit: 5 })
      });
      const actionsData = await actionsRes.json();

      const actionLog = document.getElementById('operator-action-log');
      if (actionLog && actionsData.actions) {
        if (actionsData.actions.length === 0) {
          actionLog.innerHTML = '<div class="op-empty">No actions yet</div>';
        } else {
          actionLog.innerHTML = actionsData.actions
            .slice(-5)
            .reverse()
            .map(
              (action: any) =>
                `<div class="op-row op-row--cyan">
                  <span class="op-row__player">${esc(action.player)}</span>
                  <span class="op-row__text">${esc(action.result)}</span>
                </div>`
            )
            .join('');
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  // ---------- Styles (injected once; tokens come from theme/tokens.css) ----------

  private applyStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .op-page {
        max-width: 600px;
        margin: 0 auto;
        padding: var(--he-s-3) var(--he-s-3) calc(var(--he-s-7) + env(safe-area-inset-bottom, 0px));
        min-height: 100vh;
        font-family: var(--he-font-ui);
        color: var(--he-ink-900);
      }

      /* Dark glass header */
      .op-header {
        position: sticky;
        top: var(--he-s-2);
        z-index: 5;
        margin-bottom: var(--he-s-4);
        padding: var(--he-s-3) var(--he-s-4);
        border-radius: var(--he-r-md);
        background: linear-gradient(180deg, rgba(38, 33, 26, 0.9), rgba(24, 21, 16, 0.94));
        -webkit-backdrop-filter: blur(var(--he-glass-blur)) saturate(1.2);
        backdrop-filter: blur(var(--he-glass-blur)) saturate(1.2);
        border: 1px solid rgba(255, 253, 248, 0.1);
        border-bottom-color: var(--he-hairline-gold);
        box-shadow: 0 12px 32px rgba(20, 14, 4, 0.28);
        color: var(--he-pearl-1);
      }

      .op-header__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--he-s-3);
      }

      .op-header__eyebrow {
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: var(--he-track-caps);
        text-transform: uppercase;
        color: var(--he-cyan-300);
      }

      .op-header__title {
        margin-top: var(--he-s-1);
        font-family: var(--he-font-display);
        font-size: 1.35rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: var(--he-gold-200);
        overflow-wrap: anywhere;
      }

      /* Gold session badge */
      .op-session {
        display: inline-flex;
        align-items: center;
        gap: var(--he-s-2);
        padding: 4px 4px 4px var(--he-s-3);
        border-radius: var(--he-r-pill);
        border: 1px solid var(--he-hairline-gold);
        background: rgba(201, 162, 74, 0.1);
      }

      .op-session__label {
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: var(--he-track-caps);
        text-transform: uppercase;
        color: var(--he-gold-300);
      }

      .op-session__id {
        padding: 3px 10px;
        border-radius: var(--he-r-pill);
        font-family: var(--he-font-mono);
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--he-ink-900);
        background: linear-gradient(135deg, var(--he-gold-200), var(--he-gold-500) 60%, var(--he-gold-700));
      }

      /* Frosted cards */
      .op-card {
        margin-bottom: var(--he-s-4);
        padding: var(--he-s-4);
        border-radius: var(--he-r-md);
        background: var(--he-glass-bg);
        -webkit-backdrop-filter: blur(var(--he-glass-blur)) saturate(1.15);
        backdrop-filter: blur(var(--he-glass-blur)) saturate(1.15);
        border: 1px solid var(--he-hairline-soft);
        box-shadow: var(--he-glass-shadow-soft);
      }

      .op-card__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--he-s-3);
      }

      .op-card__eyebrow {
        display: block;
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: var(--he-track-caps);
        text-transform: uppercase;
        color: var(--he-ink-500);
      }

      .op-card__title {
        margin: 2px 0 var(--he-s-3);
        font-family: var(--he-font-display);
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        color: var(--he-gold-700);
      }

      .op-card__lede {
        margin-bottom: var(--he-s-4);
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--he-ink-500);
      }

      .op-join {
        border-color: var(--he-hairline-gold);
      }

      .op-stack {
        display: flex;
        flex-direction: column;
        gap: var(--he-s-2);
      }

      /* Inputs */
      .op-field {
        display: block;
        margin-bottom: var(--he-s-4);
        text-align: left;
      }

      .op-field__label {
        display: block;
        margin-bottom: var(--he-s-2);
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--he-ink-700);
      }

      .op-input {
        width: 100%;
        min-height: 48px;
        padding: var(--he-s-3);
        border: 1px solid var(--he-hairline-soft);
        border-radius: var(--he-r-sm);
        background: var(--he-glass-bg-strong);
        color: var(--he-ink-900);
        font-family: var(--he-font-ui);
        font-size: 1rem;
      }

      .op-input--code {
        font-family: var(--he-font-mono);
        font-size: 1.25rem;
        letter-spacing: 0.18em;
        text-align: center;
      }

      .op-input:focus {
        outline: none;
        border-color: var(--he-cyan-500);
        box-shadow: var(--he-glow-cyan);
      }

      /* Buttons */
      .op-btn {
        display: block;
        width: 100%;
        min-height: 52px;
        padding: var(--he-s-3) var(--he-s-4);
        border-radius: var(--he-r-sm);
        font-family: var(--he-font-ui);
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: transform var(--he-dur-fast) var(--he-ease), box-shadow var(--he-dur-fast) var(--he-ease),
          background var(--he-dur-fast) var(--he-ease);
      }

      .op-btn:active {
        transform: translateY(1px);
      }

      .op-btn:disabled {
        opacity: 0.6;
        cursor: progress;
      }

      .op-btn:focus-visible {
        outline: none;
        box-shadow: var(--he-glow-cyan);
      }

      .op-btn--cyan {
        border: 1px solid var(--he-hairline-cyan);
        color: var(--he-cyan-700);
        background: linear-gradient(180deg, rgba(255, 253, 248, 0.9), var(--he-cyan-100));
      }

      .op-btn--cyan:hover {
        box-shadow: var(--he-glow-cyan);
      }

      .op-btn--gold {
        border: none;
        color: var(--he-ink-900);
        background: linear-gradient(135deg, var(--he-gold-200), var(--he-gold-500) 60%, var(--he-gold-700));
        box-shadow: 0 6px 18px rgba(201, 162, 74, 0.3);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .op-btn--gold:hover {
        box-shadow: var(--he-glow-gold);
      }

      .op-link-btn {
        padding: var(--he-s-1) var(--he-s-2);
        border: none;
        background: none;
        color: var(--he-cyan-700);
        font-family: var(--he-font-ui);
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
      }

      /* Lists */
      .op-list {
        display: flex;
        flex-direction: column;
        gap: var(--he-s-2);
        max-height: 260px;
        overflow-y: auto;
      }

      .op-row {
        padding: var(--he-s-3);
        border-radius: var(--he-r-xs);
        background: var(--he-glass-bg-strong);
        border-left: 3px solid var(--he-gold-500);
      }

      .op-row--gold {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--he-s-2);
      }

      .op-row--cyan {
        border-left-color: var(--he-cyan-500);
      }

      .op-row__name {
        font-weight: 600;
        color: var(--he-ink-900);
      }

      .op-row__meta {
        font-size: 0.8rem;
        color: var(--he-ink-500);
      }

      .op-row__player {
        display: block;
        margin-bottom: 2px;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--he-cyan-700);
      }

      .op-row__text {
        font-size: 0.9rem;
        color: var(--he-ink-700);
      }

      /* Find Log entries */
      .op-find {
        padding: var(--he-s-3);
        border-radius: var(--he-r-sm);
        background: var(--he-glass-bg-strong);
        border: 1px solid var(--he-hairline-gold);
        cursor: pointer;
      }

      .op-find__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--he-s-2);
        margin-bottom: var(--he-s-1);
      }

      .op-find__title {
        font-family: var(--he-font-display);
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--he-gold-700);
        overflow-wrap: anywhere;
      }

      .op-find__time {
        flex: 0 0 auto;
        font-family: var(--he-font-mono);
        font-size: 0.7rem;
        color: var(--he-ink-300);
      }

      .op-find__text {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.45;
        color: var(--he-ink-700);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .op-empty {
        padding: var(--he-s-4);
        text-align: center;
        font-size: 0.9rem;
        font-style: italic;
        color: var(--he-ink-300);
      }

      .op-tips {
        list-style: none;
        padding: 0;
      }

      .op-tips li {
        padding: var(--he-s-2) 0 var(--he-s-2) var(--he-s-5);
        position: relative;
        font-size: 0.9rem;
        color: var(--he-ink-700);
      }

      .op-tips li::before {
        content: "\\2666";
        position: absolute;
        left: var(--he-s-2);
        color: var(--he-gold-500);
      }
    `;
    document.head.appendChild(style);
  }

  destroy() {
    this.stopPolling();
  }
}
