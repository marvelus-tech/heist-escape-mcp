/**
 * Stage Page - Big screen demo launcher
 * 
 * Features:
 * - Start Demo button → mints session like demo-XXXX
 * - Shows QR codes for Operator (phone) and Examiner (agent) join
 * - Big-screen 3D diorama + action ticker
 * - Shared inventory toasts
 */

export class StagePage {
  private apiBase: string;
  private mcpUrl: string;
  private sessionId: string | null = null;
  
  constructor(apiBase: string, mcpUrl: string) {
    this.apiBase = apiBase;
    this.mcpUrl = mcpUrl;
  }
  
  render() {
    const app = document.getElementById('app')!;
    
    app.innerHTML = `
      <div class="stage-container">
        <header class="stage-header">
          <h1>🎯 Heist Escape</h1>
          <p>Cooperative Museum Heist</p>
        </header>
        
        ${this.sessionId ? this.renderActiveSession() : this.renderStartScreen()}
      </div>
    `;
    
    this.attachEventListeners();
    this.applyStyles();
  }
  
  private renderStartScreen(): string {
    return `
      <div class="start-screen">
        <div class="hero">
          <div class="hero-icon">💎</div>
          <h2>Ready to pull off the heist of the century?</h2>
          <p class="subtitle">A cooperative escape room experience for Agent + Human</p>
        </div>
        
        <div class="roles-info">
          <div class="role-card">
            <h3>🕵️ Examiner (Agent)</h3>
            <ul>
              <li>Read documents and clues</li>
              <li>Examine objects for hidden info</li>
              <li>Navigate through rooms</li>
              <li>Communicate findings</li>
            </ul>
          </div>
          
          <div class="role-card">
            <h3>📱 Operator (Human)</h3>
            <ul>
              <li>Open drawers and containers</li>
              <li>Enter codes at keypads</li>
              <li>Manage shared inventory</li>
              <li>Execute physical actions</li>
            </ul>
          </div>
        </div>
        
        <button id="start-demo-btn" class="cta-button">
          Start Demo
        </button>
        
        <div class="info-note">
          <strong>Assembly Rule:</strong> The 4-digit vault code is scattered across 4 rooms.
          Combine digits in order by room number.
        </div>
      </div>
    `;
  }
  
  private renderActiveSession(): string {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
    const operatorUrl = `${baseUrl}/#/join?s=${this.sessionId}&role=operator`;
    const examinerUrl = `${baseUrl}/#/join?s=${this.sessionId}&role=examiner`;
    
    return `
      <div class="active-session">
        <div class="session-info">
          <h2>Session Active: <code>${this.sessionId}</code></h2>
          <p>Scan QR codes or share links to join</p>
        </div>
        
        <div class="qr-lobby">
          <div class="qr-section">
            <h3>📱 Operator (Human)</h3>
            <div id="operator-qr" class="qr-code"></div>
            <p class="qr-url">${operatorUrl}</p>
            <button class="copy-btn" data-url="${operatorUrl}">Copy Link</button>
          </div>
          
          <div class="qr-section">
            <h3>🕵️ Examiner (Agent)</h3>
            <div id="examiner-qr" class="qr-code"></div>
            <p class="qr-url">${examinerUrl}</p>
            <button class="copy-btn" data-url="${examinerUrl}">Copy Link</button>
          </div>
        </div>
        
        <div class="stage-view">
          <div class="action-ticker" id="action-ticker">
            <h3>Live Actions</h3>
            <div id="action-list"></div>
          </div>
          
          <div class="inventory-display" id="inventory-display">
            <h3>Shared Inventory</h3>
            <div id="inventory-list">Empty</div>
          </div>
        </div>
        
        <button id="end-session-btn" class="secondary-button">End Session</button>
      </div>
    `;
  }
  
  private attachEventListeners() {
    const startBtn = document.getElementById('start-demo-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startDemo());
    }
    
    const endBtn = document.getElementById('end-session-btn');
    if (endBtn) {
      endBtn.addEventListener('click', () => this.endSession());
    }
    
    // Copy link buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = (e.target as HTMLElement).getAttribute('data-url');
        if (url) {
          navigator.clipboard.writeText(url);
          (e.target as HTMLElement).textContent = 'Copied!';
          setTimeout(() => {
            (e.target as HTMLElement).textContent = 'Copy Link';
          }, 2000);
        }
      });
    });
    
    // If session active, generate QR codes and start polling
    if (this.sessionId) {
      this.generateQRCodes();
      this.startPolling();
    }
  }
  
  private async startDemo() {
    // Generate session ID
    this.sessionId = 'demo-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Join as spectator/host
    try {
      await fetch(`${this.apiBase}/api/join_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          playerName: 'Stage',
          role: 'spectator'
        })
      });
      
      // Re-render with QR codes
      this.render();
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start demo. Make sure the server is running.');
    }
  }
  
  private endSession() {
    this.sessionId = null;
    this.render();
  }
  
  private generateQRCodes() {
    // Use qrcode library to generate QR codes
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
    const operatorUrl = `${baseUrl}/#/join?s=${this.sessionId}&role=operator`;
    const examinerUrl = `${baseUrl}/#/join?s=${this.sessionId}&role=examiner`;
    
    // Generate QR codes (simplified - using data URLs)
    const operatorQR = document.getElementById('operator-qr');
    const examinerQR = document.getElementById('examiner-qr');
    
    if (operatorQR) {
      operatorQR.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(operatorUrl)}" alt="Operator QR" />`;
    }
    
    if (examinerQR) {
      examinerQR.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(examinerUrl)}" alt="Examiner QR" />`;
    }
  }
  
  private async startPolling() {
    setInterval(async () => {
      try {
        // Poll for actions
        const actionsRes = await fetch(`${this.apiBase}/api/get_recent_actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId, limit: 5 })
        });
        const actionsData = await actionsRes.json();
        
        // Update action ticker
        const actionList = document.getElementById('action-list');
        if (actionList && actionsData.actions) {
          actionList.innerHTML = actionsData.actions.slice(-5).reverse().map((action: any) => 
            `<div class="action-item">
              <span class="action-player">${action.player}</span>
              <span class="action-text">${action.result}</span>
            </div>`
          ).join('');
        }
        
        // Poll for inventory
        const invRes = await fetch(`${this.apiBase}/api/get_inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId })
        });
        const invData = await invRes.json();
        
        // Update inventory display
        const inventoryList = document.getElementById('inventory-list');
        if (inventoryList && invData.items) {
          if (invData.items.length === 0) {
            inventoryList.innerHTML = '<p class="empty-state">No items yet</p>';
          } else {
            inventoryList.innerHTML = invData.items.map((item: any) =>
              `<div class="inventory-item">
                ${item.item}
                <span class="item-owner">by ${item.takenBy}</span>
              </div>`
            ).join('');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  }
  
  private applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .stage-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
      }
      
      .stage-header {
        text-align: center;
        margin-bottom: 3rem;
      }
      
      .stage-header h1 {
        font-size: 3.5rem;
        color: #1a202c;
        margin-bottom: 0.5rem;
      }
      
      .stage-header p {
        font-size: 1.5rem;
        color: #4a5568;
      }
      
      .start-screen {
        background: white;
        border-radius: 20px;
        padding: 3rem;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.1);
      }
      
      .hero {
        text-align: center;
        margin-bottom: 3rem;
      }
      
      .hero-icon {
        font-size: 5rem;
        margin-bottom: 1rem;
      }
      
      .hero h2 {
        font-size: 2.5rem;
        color: #2c3e50;
        margin-bottom: 1rem;
      }
      
      .subtitle {
        font-size: 1.25rem;
        color: #718096;
      }
      
      .roles-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 3rem;
      }
      
      .role-card {
        background: #f7fafc;
        border-radius: 12px;
        padding: 2rem;
        border-left: 4px solid #667eea;
      }
      
      .role-card h3 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: #2d3748;
      }
      
      .role-card ul {
        list-style: none;
        padding: 0;
      }
      
      .role-card li {
        padding: 0.5rem 0;
        color: #4a5568;
      }
      
      .role-card li:before {
        content: "✓ ";
        color: #48bb78;
        font-weight: bold;
        margin-right: 0.5rem;
      }
      
      .cta-button {
        width: 100%;
        padding: 1.5rem 3rem;
        font-size: 1.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .cta-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
      }
      
      .info-note {
        margin-top: 2rem;
        padding: 1.5rem;
        background: #fef5e7;
        border-left: 4px solid #f39c12;
        border-radius: 8px;
        color: #856404;
      }
      
      .active-session {
        background: white;
        border-radius: 20px;
        padding: 3rem;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.1);
      }
      
      .session-info {
        text-align: center;
        margin-bottom: 2rem;
      }
      
      .session-info code {
        background: #667eea;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 1.5rem;
      }
      
      .qr-lobby {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
        margin-bottom: 3rem;
        padding: 2rem;
        background: #f7fafc;
        border-radius: 12px;
      }
      
      .qr-section {
        text-align: center;
      }
      
      .qr-section h3 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: #2d3748;
      }
      
      .qr-code {
        margin: 1rem auto;
        padding: 1rem;
        background: white;
        border-radius: 12px;
        display: inline-block;
      }
      
      .qr-url {
        font-size: 0.875rem;
        color: #718096;
        margin: 1rem 0;
        word-break: break-all;
      }
      
      .copy-btn {
        padding: 0.75rem 1.5rem;
        background: #48bb78;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s;
      }
      
      .copy-btn:hover {
        background: #38a169;
      }
      
      .stage-view {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
      }
      
      .action-ticker, .inventory-display {
        background: #f7fafc;
        border-radius: 12px;
        padding: 1.5rem;
      }
      
      .action-ticker h3, .inventory-display h3 {
        font-size: 1.25rem;
        margin-bottom: 1rem;
        color: #2d3748;
      }
      
      .action-item {
        padding: 0.75rem;
        margin: 0.5rem 0;
        background: white;
        border-radius: 6px;
        border-left: 3px solid #4299e1;
      }
      
      .action-player {
        font-weight: 600;
        color: #667eea;
        margin-right: 0.5rem;
      }
      
      .action-text {
        color: #4a5568;
      }
      
      .inventory-item {
        padding: 0.75rem;
        margin: 0.5rem 0;
        background: white;
        border-radius: 6px;
        border-left: 3px solid #48bb78;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .item-owner {
        font-size: 0.875rem;
        color: #718096;
      }
      
      .empty-state {
        text-align: center;
        color: #a0aec0;
        padding: 2rem;
      }
      
      .secondary-button {
        width: 100%;
        padding: 1rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        background: #e2e8f0;
        color: #2d3748;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .secondary-button:hover {
        background: #cbd5e0;
      }
    `;
    document.head.appendChild(style);
  }
  
  destroy() {
    // Cleanup if needed
  }
}
