/**
 * Examiner Page - Agent briefing and MCP configuration
 * 
 * For the Agent role:
 * - Mission briefing with assembly rule
 * - Session details
 * - Copy MCP config button (pre-filled with session ID)
 * - Tool suggestions
 */

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
    
    app.innerHTML = `
      <div class="examiner-container">
        <header class="examiner-header">
          <h1>🕵️ Examiner Briefing</h1>
          <p class="session-badge">Session: <code>${this.sessionId}</code></p>
        </header>
        
        <div class="briefing-content">
          <section class="mission-brief">
            <h2>Mission Objective</h2>
            <p class="mission-highlight">
              Infiltrate the museum vault and retrieve the <strong>Sunburst Diamond</strong> 💎
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
          
          <section class="role-duties">
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
          
          <section class="assembly-rule">
            <h2>🔑 Critical Information</h2>
            <div class="rule-box">
              <h3>Assembly Rule</h3>
              <p>The 4-digit vault code is scattered across 4 rooms.</p>
              <p class="rule-emphasis">Combine digits in ORDER BY ROOM NUMBER</p>
              <p class="rule-detail">(Room 1 → Room 2 → Room 3 → Room 4)</p>
            </div>
          </section>
          
          <section class="mcp-config">
            <h2>Connect Your Agent</h2>
            <p>Copy this configuration to your MCP client (Claude Desktop, Cursor, etc.):</p>
            
            <div class="config-box">
              <pre id="mcp-config-text">{
  "mcpServers": {
    "heist-escape": {
      "command": "npx",
      "args": ["mcp-remote", "${this.mcpUrl}"]
    }
  }
}</pre>
              <button id="copy-config-btn" class="copy-config-btn">
                Copy MCP Config
              </button>
            </div>
            
            <div class="quick-start">
              <h3>Quick Start Commands</h3>
              <ol>
                <li>
                  <code>join_session</code>
                  <span class="param">sessionId: "${this.sessionId}"</span>
                  <span class="param">playerName: "Agent [Your Name]"</span>
                  <span class="param">role: "examiner"</span>
                </li>
                <li>
                  <code>look_around</code>
                  <span class="param">sessionId: "${this.sessionId}"</span>
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
          
          <section class="tools-available">
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
          
          <section class="theme-note">
            <h2>🎨 Light Theme Note</h2>
            <p>
              This heist takes place in a <strong>bright, welcoming museum</strong> with natural daylight,
              polished marble floors, white walls, and a professional atmosphere. This is an elegant
              operation, not a dark infiltration.
            </p>
          </section>
          
          <div class="action-buttons">
            <button onclick="window.location.hash=''" class="back-btn">Back to Stage</button>
            <button id="get-briefing-btn" class="primary-btn">Get Full Briefing (MCP Tool)</button>
          </div>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
    this.applyStyles();
  }
  
  private attachEventListeners() {
    const copyBtn = document.getElementById('copy-config-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const configText = document.getElementById('mcp-config-text')?.textContent;
        if (configText) {
          navigator.clipboard.writeText(configText);
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy MCP Config';
          }, 2000);
        }
      });
    }
    
    const getBriefingBtn = document.getElementById('get-briefing-btn');
    if (getBriefingBtn) {
      getBriefingBtn.addEventListener('click', () => {
        alert(`Use the MCP tool 'get_briefing' with sessionId: "${this.sessionId}" to get the full mission briefing in your agent.`);
      });
    }
  }
  
  private applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .examiner-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
        background: white;
        min-height: 100vh;
      }
      
      .examiner-header {
        text-align: center;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 3px solid #667eea;
      }
      
      .examiner-header h1 {
        font-size: 2.5rem;
        color: #1a202c;
        margin-bottom: 1rem;
      }
      
      .session-badge {
        font-size: 1.125rem;
      }
      
      .session-badge code {
        background: #667eea;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-weight: 600;
      }
      
      .briefing-content section {
        margin-bottom: 3rem;
        padding: 2rem;
        background: #f7fafc;
        border-radius: 12px;
      }
      
      .briefing-content h2 {
        font-size: 1.75rem;
        color: #2d3748;
        margin-bottom: 1rem;
      }
      
      .mission-highlight {
        font-size: 1.25rem;
        color: #2c3e50;
        padding: 1rem;
        background: white;
        border-left: 4px solid #f39c12;
        border-radius: 6px;
        margin-bottom: 1.5rem;
      }
      
      .route-map {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .room-step {
        padding: 0.75rem 1rem;
        background: white;
        border-radius: 8px;
        border: 2px solid #4299e1;
        font-weight: 600;
        color: #2d3748;
        flex: 1;
        min-width: 120px;
        text-align: center;
      }
      
      .arrow {
        color: #4299e1;
        font-size: 1.5rem;
        font-weight: bold;
      }
      
      .duties-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
      }
      
      .duty-card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        text-align: center;
        border: 2px solid #e2e8f0;
      }
      
      .duty-icon {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
      }
      
      .duty-card h3 {
        font-size: 1rem;
        color: #2d3748;
        margin-bottom: 0.5rem;
      }
      
      .duty-card p {
        font-size: 0.875rem;
        color: #718096;
      }
      
      .rule-box {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        border-left: 4px solid #f39c12;
      }
      
      .rule-box h3 {
        color: #d97706;
        margin-bottom: 0.75rem;
      }
      
      .rule-emphasis {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1a202c;
        margin: 1rem 0;
      }
      
      .rule-detail {
        color: #4a5568;
        font-style: italic;
      }
      
      .config-box {
        position: relative;
        background: #2d3748;
        padding: 1.5rem;
        border-radius: 8px;
        margin: 1rem 0;
      }
      
      #mcp-config-text {
        color: #e2e8f0;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        margin: 0;
        overflow-x: auto;
      }
      
      .copy-config-btn {
        margin-top: 1rem;
        padding: 0.75rem 1.5rem;
        background: #48bb78;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .copy-config-btn:hover {
        background: #38a169;
      }
      
      .quick-start ol {
        list-style: none;
        counter-reset: step;
        padding: 0;
      }
      
      .quick-start li {
        counter-increment: step;
        margin: 1rem 0;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        border-left: 4px solid #4299e1;
      }
      
      .quick-start li::before {
        content: counter(step);
        display: inline-block;
        width: 24px;
        height: 24px;
        background: #4299e1;
        color: white;
        border-radius: 50%;
        text-align: center;
        line-height: 24px;
        margin-right: 0.75rem;
        font-weight: 700;
        font-size: 0.875rem;
      }
      
      .quick-start code {
        background: #667eea;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-weight: 600;
        margin-right: 0.5rem;
      }
      
      .quick-start .param {
        display: block;
        margin-left: 2.5rem;
        color: #4a5568;
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }
      
      .quick-start .hint {
        display: block;
        margin-left: 2.5rem;
        color: #718096;
        font-size: 0.8125rem;
        font-style: italic;
        margin-top: 0.25rem;
      }
      
      .tools-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
      }
      
      .tool-card {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        border: 2px solid #e2e8f0;
        text-align: center;
      }
      
      .tool-card code {
        display: block;
        color: #667eea;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }
      
      .tool-card p {
        font-size: 0.875rem;
        color: #718096;
      }
      
      .theme-note {
        background: #fef5e7 !important;
        border-left: 4px solid #f39c12;
      }
      
      .action-buttons {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
      }
      
      .back-btn, .primary-btn {
        flex: 1;
        padding: 1rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .back-btn {
        background: #e2e8f0;
        color: #2d3748;
      }
      
      .back-btn:hover {
        background: #cbd5e0;
      }
      
      .primary-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      @media (max-width: 768px) {
        .route-map {
          flex-direction: column;
        }
        
        .arrow {
          transform: rotate(90deg);
        }
        
        .duties-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  destroy() {
    // Cleanup if needed
  }
}
