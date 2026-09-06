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
    // Use production URL for links (not localhost) - must work from phones
    const baseUrl = import.meta.env.VITE_BASE_PATH === '/' 
      ? window.location.origin 
      : window.location.origin + import.meta.env.VITE_BASE_PATH.replace(/\/$/, '');
    
    const operatorUrl = `${baseUrl}#/join?s=${this.sessionId}&role=operator`;
    const examinerUrl = `${baseUrl}#/join?s=${this.sessionId}&role=examiner`;
    const watchUrl = `${baseUrl}#/join?s=${this.sessionId}&role=watch`;
    
    return `
      <div class="active-session">
        <div class="session-info">
          <h2>Session Active: <code>${this.sessionId}</code></h2>
          <p class="room-note">🖥️ This screen is the main stage. Guests scan QR to join as companions.</p>
        </div>
        
        <div class="qr-lobby">
          <div class="qr-section primary">
            <h3>📱 Operator (Recommended)</h3>
            <div id="operator-qr" class="qr-code"></div>
            <p class="qr-description">Phone controls: open drawers, enter codes</p>
            <button class="copy-btn" data-url="${operatorUrl}">Copy Link</button>
          </div>
          
          <div class="qr-section secondary">
            <h3>👁️ Watch Mode</h3>
            <div id="watch-qr" class="qr-code"></div>
            <p class="qr-description">Read-only: see actions and inventory</p>
            <button class="copy-btn" data-url="${watchUrl}">Copy Link</button>
          </div>
        </div>
        
        <div class="stage-view">
          <div class="scene-container" id="scene-container">
            <canvas id="stage-canvas"></canvas>
            <div class="room-title" id="room-title">Museum Lobby</div>
          </div>
          
          <div class="stage-sidebar">
            <div class="action-ticker" id="action-ticker">
              <h3>Live Actions</h3>
              <div id="action-list"></div>
            </div>
            
            <div class="inventory-display" id="inventory-display">
              <h3>Shared Inventory</h3>
              <div id="inventory-list">Empty</div>
            </div>
          </div>
        </div>
        
        <div class="host-note">
          <strong>💡 Host Tip:</strong> Run Examiner agent (Claude/Cursor) on this computer. 
          Agent discoveries will appear in the action ticker above.
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
      this.initStageScene();
      this.startPolling();
    }
  }
  
  private initStageScene() {
    // Initialize simple 3D scene for the stage
    // This is a placeholder - keeps it on the host screen only
    const canvas = document.getElementById('stage-canvas') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Simple placeholder scene
        ctx.fillStyle = '#f5f7fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#667eea';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Museum Lobby', canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = '#718096';
        ctx.font = '16px sans-serif';
        ctx.fillText('3D scene will display here', canvas.width / 2, canvas.height / 2 + 40);
      }
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
    // Use production URL for QR codes (not localhost)
    // QR codes must work when scanned from phones across the room
    const baseUrl = import.meta.env.VITE_BASE_PATH === '/' 
      ? window.location.origin 
      : window.location.origin + import.meta.env.VITE_BASE_PATH.replace(/\/$/, '');
    
    const operatorUrl = `${baseUrl}#/join?s=${this.sessionId}&role=operator`;
    const watchUrl = `${baseUrl}#/join?s=${this.sessionId}&role=watch`;
    
    // Generate QR codes using external service (works across devices)
    const operatorQR = document.getElementById('operator-qr');
    const watchQR = document.getElementById('watch-qr');
    
    if (operatorQR) {
      operatorQR.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(operatorUrl)}" alt="Operator QR" style="width: 250px; height: 250px;" />`;
    }
    
    if (watchQR) {
      watchQR.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(watchUrl)}" alt="Watch QR" style="width: 200px; height: 200px;" />`;
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
        grid-template-columns: 1.5fr 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
        padding: 2rem;
        background: #f7fafc;
        border-radius: 12px;
      }
      
      .qr-section {
        text-align: center;
        padding: 1.5rem;
        background: white;
        border-radius: 12px;
      }
      
      .qr-section.primary {
        border: 3px solid #48bb78;
      }
      
      .qr-section.secondary {
        border: 2px solid #cbd5e0;
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
      
      .qr-description {
        font-size: 0.875rem;
        color: #4a5568;
        margin: 0.75rem 0;
        min-height: 2.5em;
      }
      
      .room-note {
        font-size: 1rem;
        color: #4a5568;
        margin-top: 0.5rem;
        font-style: italic;
      }
      
      .stage-view {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
      }
      
      .scene-container {
        position: relative;
        background: #2d3748;
        border-radius: 12px;
        overflow: hidden;
        min-height: 400px;
      }
      
      #stage-canvas {
        width: 100%;
        height: 400px;
        display: block;
      }
      
      .room-title {
        position: absolute;
        bottom: 1rem;
        left: 1rem;
        background: rgba(255, 255, 255, 0.95);
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 700;
        color: #2d3748;
        font-size: 1.125rem;
      }
      
      .stage-sidebar {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .host-note {
        padding: 1rem 1.5rem;
        background: #fef5e7;
        border-left: 4px solid #f39c12;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        color: #856404;
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
