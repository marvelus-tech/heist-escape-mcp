/**
 * Examiner Page - Agent briefing and MCP configuration
 *
 * For the Agent role:
 * - Mission briefing with assembly rule
 * - Session details
 * - Copy MCP config button (pre-filled with session ID)
 * - Tool suggestions
 *
 * Messaging rules: long text -> showClueSheet, short status -> showToast.
 * No system alert() anywhere on this page.
 */

import { showClueSheet, closeClueSheet, showToast, copyToClipboard, escapeHtml as esc } from '../phone';

const STYLE_ID = 'examiner-page-styles';

export class ExaminerPage {
  private apiBase: string;
  private mcpUrl: string;
  private sessionId: string;

  constructor(apiBase: string, mcpUrl: string, sessionId: string) {
    this.apiBase = apiBase;
    this.mcpUrl = mcpUrl;
    this.sessionId = sessionId;
  }

  render() {
    const app = document.getElementById('app')!;
    const sid = esc(this.sessionId);

    app.innerHTML = `
      <div class="examiner-container hp-page">
        <header class="examiner-header hp-glass hp-glass--cyan">
          <span class="hp-eyebrow hp-eyebrow--cyan">Heist Escape</span>
          <h1 class="hp-title">Examiner Briefing</h1>
          <button id="examiner-session" class="hp-chip" type="button" aria-label="Copy session ID">
            Session <code>${sid}</code>
          </button>
        </header>

        <div class="briefing-content">
          <section class="mission-brief hp-glass hp-glass--gold">
            <h2>Mission Objective</h2>
            <p class="mission-highlight">
              Infiltrate the museum vault and retrieve the <strong>Sunburst Diamond</strong>
            </p>

            <div class="route-map">
              <div class="room-step">1. Museum Lobby</div>
              <div class="arrow">→</div>
              <div class="room-step">2. Gallery A</div>
              <div class="arrow">→</div>
              <div class="room-step">3. Archives</div>
              <div class="arrow">→</div>
              <div class="room-step">4. Vault Access</div>
              <div class="arrow">→</div>
              <div class="room-step">5. The Vault</div>
            </div>
          </section>

          <section class="role-duties hp-glass">
            <h2>Your Role: Examiner (Agent)</h2>
            <div class="duties-grid">
              <div class="duty-card">
                <div class="duty-icon">📖</div>
                <h3>Read & Analyze</h3>
                <p>Documents, signs, and clues</p>
              </div>
              <div class="duty-card">
                <div class="duty-icon">🔍</div>
                <h3>Examine Objects</h3>
                <p>Search for hidden information</p>
              </div>
              <div class="duty-card">
                <div class="duty-icon">🗺️</div>
                <h3>Navigate</h3>
                <p>Guide team through rooms</p>
              </div>
              <div class="duty-card">
                <div class="duty-icon">💬</div>
                <h3>Communicate</h3>
                <p>Share findings with Operator</p>
              </div>
            </div>
          </section>

          <section class="assembly-rule hp-glass hp-glass--gold">
            <h2>Critical Information</h2>
            <div class="rule-box">
              <h3>Assembly Rule</h3>
              <p>The 4-digit vault code is scattered across 4 rooms.</p>
              <p class="rule-emphasis">Combine digits in ORDER BY ROOM NUMBER</p>
              <p class="rule-detail">(Room 1 → Room 2 → Room 3 → Room 4)</p>
            </div>
          </section>

          <section class="mcp-config hp-glass hp-glass--cyan">
            <h2>Connect Your Agent</h2>
            <p class="hp-muted">Copy this configuration to your MCP client (Claude Desktop, Cursor, etc.):</p>

            <div class="config-box">
              <pre id="mcp-config-text" class="hp-code">{
  "mcpServers": {
    "heist-escape": {
      "command": "npx",
      "args": ["mcp-remote", "${esc(this.mcpUrl)}"]
    }
  }
}</pre>
              <button id="copy-config-btn" class="hp-btn hp-btn--primary copy-config-btn" type="button">
                Copy MCP Config
              </button>
            </div>

            <div class="quick-start">
              <h3>Quick Start Commands</h3>
              <ol>
                <li>
                  <code>join_session</code>
                  <span class="param">sessionId: "${sid}"</span>
                  <span class="param">playerName: "Agent [Your Name]"</span>
                  <span class="param">role: "examiner"</span>
                </li>
                <li>
                  <code>look_around</code>
                  <span class="param">sessionId: "${sid}"</span>
                  <span class="param">playerId: "[Your Name]"</span>
                </li>
                <li>
                  <code>examine_object</code>
                  <span class="param">objectName: "poster-board"</span>
                  <span class="hint">Check the assembly rule reminder</span>
                </li>
                <li>
                  <code>examine_object</code>
                  <span class="param">objectName: "flower-arrangement"</span>
                  <span class="hint">Key location for Gallery A</span>
                </li>
              </ol>
            </div>
          </section>

          <section class="tools-available hp-glass">
            <h2>Available MCP Tools</h2>
            <div class="tools-grid">
              <div class="tool-card">
                <code>look_around</code>
                <p>Survey current room</p>
              </div>
              <div class="tool-card">
                <code>examine_object</code>
                <p>Inspect objects for clues</p>
              </div>
              <div class="tool-card">
                <code>use_item</code>
                <p>Take or use items</p>
              </div>
              <div class="tool-card">
                <code>get_inventory</code>
                <p>Check shared inventory</p>
              </div>
              <div class="tool-card">
                <code>get_hints</code>
                <p>Request progressive hints</p>
              </div>
              <div class="tool-card">
                <code>get_recent_actions</code>
                <p>See Operator actions</p>
              </div>
            </div>
          </section>

          <section class="theme-note hp-glass hp-glass--gold">
            <h2>Scene Note</h2>
            <p class="hp-muted">
              This heist takes place in a <strong>bright, welcoming museum</strong> with natural daylight,
              polished marble floors, white walls, and a professional atmosphere. This is an elegant
              operation, not a dark infiltration.
            </p>
          </section>

          <div class="action-buttons">
            <button onclick="window.location.hash=''" class="hp-btn hp-btn--ghost back-btn" type="button">Back to Stage</button>
            <button id="get-briefing-btn" class="hp-btn hp-btn--cyan primary-btn" type="button">Get Full Briefing (MCP Tool)</button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.applyStyles();
  }

  private attachEventListeners() {
    document.getElementById('examiner-session')?.addEventListener('click', async () => {
      const ok = await copyToClipboard(this.sessionId);
      showToast(
        ok
          ? { tone: 'success', message: `Session ${this.sessionId} copied` }
          : { tone: 'error', message: 'Copy blocked by the browser. Read the code off the badge instead.' }
      );
    });

    const copyBtn = document.getElementById('copy-config-btn');
    copyBtn?.addEventListener('click', async () => {
      const configText = document.getElementById('mcp-config-text')?.textContent;
      if (!configText) return;
      const ok = await copyToClipboard(configText);
      if (ok) {
        copyBtn.textContent = 'Copied!';
        window.setTimeout(() => {
          copyBtn.textContent = 'Copy MCP Config';
        }, 2000);
        showToast({ tone: 'success', message: 'MCP config copied to clipboard' });
      } else {
        showToast({ tone: 'error', message: 'Copy blocked by the browser. Long-press the config to copy it manually.' });
      }
    });

    document.getElementById('get-briefing-btn')?.addEventListener('click', () => {
      const toolCall = `get_briefing({ "sessionId": "${this.sessionId}" })`;
      showClueSheet({
        tone: 'cyan',
        eyebrow: 'MCP tool',
        title: 'Get the full briefing',
        body: [
          'The complete mission briefing lives in your agent, not on this page. Ask your MCP client to call get_briefing for this session and it will return the dossier, the room route, and the assembly rule.',
          'Paste the call below into your agent, or just tell it: "Get the heist briefing."'
        ],
        code: toolCall,
        actions: [
          {
            label: 'Copy tool call',
            primary: true,
            onClick: async () => {
              const ok = await copyToClipboard(toolCall);
              showToast(
                ok
                  ? { tone: 'success', message: 'Tool call copied' }
                  : { tone: 'error', message: 'Copy blocked by the browser. Long-press the snippet to copy it.' }
              );
            }
          }
        ]
      });
    });
  }

  private applyStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .examiner-container {
        max-width: 900px;
        margin: 0 auto;
        padding: var(--he-s-5) var(--he-s-4);
        padding-bottom: calc(var(--he-s-7) + env(safe-area-inset-bottom, 0px));
      }

      .examiner-header {
        text-align: center;
        margin-bottom: var(--he-s-5);
        padding: var(--he-s-5);
      }

      .examiner-header h1 {
        font-size: 2.25rem;
        color: var(--he-cyan-100);
        margin: var(--he-s-2) 0 var(--he-s-4);
      }

      .briefing-content section {
        margin-bottom: var(--he-s-5);
        padding: var(--he-s-5);
      }

      .briefing-content h2 {
        font-family: var(--he-font-display);
        font-size: 1.35rem;
        color: var(--he-gold-200);
        margin-bottom: var(--he-s-4);
        letter-spacing: 0.02em;
      }

      .mission-highlight {
        font-size: 1.1rem;
        line-height: 1.5;
        padding: var(--he-s-4);
        background: rgba(201, 162, 74, 0.08);
        border-left: 3px solid var(--he-gold-500);
        border-radius: var(--he-r-xs);
        margin-bottom: var(--he-s-5);
      }

      .mission-highlight strong { color: var(--he-gold-200); }

      .route-map {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--he-s-2);
      }

      .room-step {
        flex: 1;
        min-width: 120px;
        padding: var(--he-s-3) var(--he-s-4);
        text-align: center;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--hp-text);
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--he-hairline-cyan);
        border-radius: var(--he-r-sm);
      }

      .arrow {
        color: var(--he-cyan-500);
        font-size: 1.25rem;
      }

      .duties-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--he-s-3);
      }

      .duty-card {
        padding: var(--he-s-4);
        text-align: center;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--hp-hairline);
        border-radius: var(--he-r-sm);
      }

      .duty-icon {
        font-size: 2rem;
        margin-bottom: var(--he-s-2);
      }

      .duty-card h3 {
        font-size: 0.95rem;
        margin-bottom: var(--he-s-1);
      }

      .duty-card p {
        font-size: 0.85rem;
        color: var(--hp-text-dim);
      }

      .rule-box {
        padding: var(--he-s-4);
        background: rgba(201, 162, 74, 0.08);
        border-left: 3px solid var(--he-gold-500);
        border-radius: var(--he-r-xs);
      }

      .rule-box h3 {
        color: var(--he-gold-300);
        margin-bottom: var(--he-s-3);
      }

      .rule-emphasis {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--he-gold-100);
        margin: var(--he-s-3) 0;
      }

      .rule-detail {
        color: var(--hp-text-dim);
        font-style: italic;
      }

      .config-box {
        display: flex;
        flex-direction: column;
        gap: var(--he-s-3);
        margin: var(--he-s-4) 0 var(--he-s-5);
      }

      .copy-config-btn { align-self: flex-start; }

      .quick-start h3 {
        font-size: 1rem;
        margin-bottom: var(--he-s-3);
        color: var(--he-cyan-300);
      }

      .quick-start ol {
        list-style: none;
        counter-reset: step;
        padding: 0;
      }

      .quick-start li {
        counter-increment: step;
        margin: var(--he-s-3) 0;
        padding: var(--he-s-3) var(--he-s-4);
        background: rgba(255, 255, 255, 0.04);
        border-left: 3px solid var(--he-cyan-500);
        border-radius: var(--he-r-xs);
      }

      .quick-start li::before {
        content: counter(step);
        display: inline-block;
        width: 22px;
        height: 22px;
        margin-right: var(--he-s-3);
        border-radius: 50%;
        background: var(--he-cyan-700);
        color: var(--he-cyan-100);
        text-align: center;
        line-height: 22px;
        font-weight: 700;
        font-size: 0.8rem;
      }

      .quick-start code {
        padding: 2px 8px;
        border-radius: var(--he-r-xs);
        background: rgba(79, 184, 208, 0.16);
        color: var(--he-cyan-100);
        font-family: var(--he-font-mono);
        font-weight: 600;
        font-size: 0.85rem;
      }

      .quick-start .param,
      .quick-start .hint {
        display: block;
        margin-left: calc(22px + var(--he-s-3));
        margin-top: var(--he-s-1);
        font-size: 0.85rem;
        color: var(--hp-text-dim);
      }

      .quick-start .hint {
        color: var(--hp-text-mute);
        font-style: italic;
      }

      .tools-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: var(--he-s-3);
      }

      .tool-card {
        padding: var(--he-s-4);
        text-align: center;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--hp-hairline);
        border-radius: var(--he-r-sm);
      }

      .tool-card code {
        display: block;
        margin-bottom: var(--he-s-2);
        color: var(--he-cyan-300);
        font-family: var(--he-font-mono);
        font-weight: 600;
        font-size: 0.85rem;
      }

      .tool-card p {
        font-size: 0.85rem;
        color: var(--hp-text-dim);
      }

      .theme-note strong { color: var(--he-gold-200); }

      .action-buttons {
        display: flex;
        gap: var(--he-s-3);
        margin-top: var(--he-s-5);
      }

      .action-buttons .hp-btn { flex: 1; }

      @media (max-width: 768px) {
        .examiner-header h1 { font-size: 1.75rem; }
        .briefing-content section { padding: var(--he-s-4); }
        .route-map { flex-direction: column; align-items: stretch; }
        .arrow { transform: rotate(90deg); text-align: center; }
        .duties-grid { grid-template-columns: 1fr 1fr; }
        .action-buttons { flex-direction: column; }
      }
    `;
    document.head.appendChild(style);
  }

  destroy() {
    closeClueSheet();
  }
}
