/**
 * Operator Page - Phone-friendly controls for human player
 * 
 * Features:
 * - Join session automatically
 * - Big action buttons (drawers, codes, inventory)
 * - Action log
 * - No heavy 3D required
 */

export class OperatorPage {
  private apiBase: string;
  private sessionId: string;
  private playerId: string = '';
  private joined: boolean = false;
  
  constructor(apiBase: string, sessionId: string) {
    this.apiBase = apiBase;
    this.sessionId = sessionId;
  }
  
  render() {
    const app = document.getElementById('app')!;
    
    if (!this.joined) {
      app.innerHTML = this.renderJoinScreen();
    } else {
      app.innerHTML = this.renderControls();
      this.startPolling();
    }
    
    this.attachEventListeners();
    this.applyStyles();
  }
  
  private renderJoinScreen(): string {
    return `
      <div class="operator-container">
        <header class="operator-header">
          <h1>📱 Operator Controls</h1>
          <p class="session-badge">Session: <code>${this.sessionId}</code></p>
          <p class="companion-note">
            <strong>📱 Phone companion</strong> • Point your phone at the main screen to see the 3D museum
          </p>
        </header>
        
        <div class="join-form">
          <div class="join-icon">👋</div>
          <h2>Join as Operator</h2>
          <p>You'll handle drawers, codes, and physical interactions</p>
          
          <div class="input-group">
            <label>Your Name</label>
            <input type="text" id="operator-name" placeholder="Enter your name" autocomplete="name" />
          </div>
          
          <button id="join-operator-btn" class="primary-btn">Join Heist</button>
        </div>
      </div>
    `;
  }
  
  private renderControls(): string {
    return `
      <div class="operator-container">
        <header class="operator-header">
          <h1>📱 Operator: ${this.playerId}</h1>
          <p class="session-badge">Session: <code>${this.sessionId}</code></p>
        </header>
        
        <div class="operator-controls">
          <section class="quick-actions">
            <h2>Quick Actions</h2>
            
            <div class="action-group">
              <h3>Drawers</h3>
              <button class="action-btn" data-drawer="reception-desk-top">Reception Desk (Top)</button>
              <button class="action-btn" data-drawer="reception-desk-middle">Reception Desk (Middle)</button>
              <button class="action-btn" data-drawer="reception-desk-bottom">Reception Desk (Bottom)</button>
              <button class="action-btn" data-drawer="filing-j-l">Filing Cabinet (J-L)</button>
            </div>
            
            <div class="action-group">
              <h3>Enter Code</h3>
              <div class="code-input-group">
                <input type="text" id="code-input" placeholder="Enter code" maxlength="8" />
                <select id="code-target">
                  <option value="">Select target</option>
                  <option value="card-catalog">Card Catalog</option>
                  <option value="vault-keypad">Vault Keypad</option>
                </select>
                <button id="submit-code-btn" class="submit-btn">Submit Code</button>
              </div>
            </div>
          </section>
          
          <section class="inventory-section">
            <h2>Shared Inventory</h2>
            <div id="operator-inventory" class="inventory-list">
              <div class="empty-state">No items yet</div>
            </div>
          </section>
          
          <section class="action-log-section">
            <h2>Recent Actions</h2>
            <div id="operator-action-log" class="action-log-list">
              <div class="empty-state">No actions yet</div>
            </div>
          </section>
          
          <section class="help-section">
            <h2>💡 Tips</h2>
            <ul>
              <li>Wait for your Examiner agent to find clues</li>
              <li>Open drawers when requested</li>
              <li>Write down vault digits as you find them</li>
              <li>Assemble code in room order (1-2-3-4)</li>
            </ul>
          </section>
        </div>
      </div>
    `;
  }
  
  private attachEventListeners() {
    const joinBtn = document.getElementById('join-operator-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', () => this.joinSession());
    }
    
    // Drawer buttons
    document.querySelectorAll('.action-btn[data-drawer]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const drawerId = (e.target as HTMLElement).getAttribute('data-drawer');
        if (drawerId) {
          await this.openDrawer(drawerId);
        }
      });
    });
    
    // Code submission
    const submitCodeBtn = document.getElementById('submit-code-btn');
    if (submitCodeBtn) {
      submitCodeBtn.addEventListener('click', () => this.submitCode());
    }
  }
  
  private async joinSession() {
    const nameInput = document.getElementById('operator-name') as HTMLInputElement;
    const name = nameInput?.value.trim();
    
    if (!name) {
      alert('Please enter your name');
      return;
    }
    
    this.playerId = name;
    
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
      
      if (!response.ok) throw new Error('Join failed');
      
      this.joined = true;
      this.render();
    } catch (error) {
      console.error('Failed to join:', error);
      alert('Failed to join session. Make sure the server is running.');
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
        alert(`Drawer Contents:\n\n${data.contents}`);
      } else {
        alert(data.message || 'Failed to open drawer');
      }
    } catch (error) {
      console.error('Failed to open drawer:', error);
      alert('Error opening drawer');
    }
  }
  
  private async submitCode() {
    const codeInput = document.getElementById('code-input') as HTMLInputElement;
    const targetSelect = document.getElementById('code-target') as HTMLSelectElement;
    
    const code = codeInput?.value.trim();
    const target = targetSelect?.value;
    
    if (!code) {
      alert('Please enter a code');
      return;
    }
    
    if (!target) {
      alert('Please select a target');
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
      
      alert(data.message || 'Code submitted');
      
      // Clear input
      if (codeInput) codeInput.value = '';
    } catch (error) {
      console.error('Failed to submit code:', error);
      alert('Error submitting code');
    }
  }
  
  private async startPolling() {
    setInterval(async () => {
      try {
        // Poll inventory
        const invRes = await fetch(`${this.apiBase}/api/get_inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId })
        });
        const invData = await invRes.json();
        
        const invList = document.getElementById('operator-inventory');
        if (invList && invData.items) {
          if (invData.items.length === 0) {
            invList.innerHTML = '<div class="empty-state">No items yet</div>';
          } else {
            invList.innerHTML = invData.items.map((item: any) =>
              `<div class="inventory-item">
                <span class="item-name">${item.item}</span>
                <span class="item-owner">by ${item.takenBy}</span>
              </div>`
            ).join('');
          }
        }
        
        // Poll actions
        const actionsRes = await fetch(`${this.apiBase}/api/get_recent_actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId, limit: 5 })
        });
        const actionsData = await actionsRes.json();
        
        const actionLog = document.getElementById('operator-action-log');
        if (actionLog && actionsData.actions) {
          if (actionsData.actions.length === 0) {
            actionLog.innerHTML = '<div class="empty-state">No actions yet</div>';
          } else {
            actionLog.innerHTML = actionsData.actions.slice(-5).reverse().map((action: any) =>
              `<div class="action-entry">
                <span class="action-player">${action.player}</span>
                <span class="action-text">${action.result}</span>
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
      .operator-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 1rem;
        background: white;
        min-height: 100vh;
      }
      
      .operator-header {
        text-align: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 3px solid #48bb78;
      }
      
      .operator-header h1 {
        font-size: 1.75rem;
        color: #1a202c;
        margin-bottom: 0.5rem;
      }
      
      .session-badge {
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
      }
      
      .companion-note {
        font-size: 0.875rem;
        color: #718096;
        font-style: italic;
      }
      
      .session-badge code {
        background: #48bb78;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-weight: 600;
      }
      
      .join-form {
        padding: 2rem;
        background: #f7fafc;
        border-radius: 12px;
        text-align: center;
      }
      
      .join-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      
      .join-form h2 {
        font-size: 1.5rem;
        color: #2d3748;
        margin-bottom: 0.5rem;
      }
      
      .join-form p {
        color: #718096;
        margin-bottom: 1.5rem;
      }
      
      .input-group {
        margin-bottom: 1rem;
      }
      
      .input-group label {
        display: block;
        font-weight: 600;
        color: #4a5568;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
      }
      
      .input-group input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 1rem;
      }
      
      .input-group input:focus {
        outline: none;
        border-color: #48bb78;
      }
      
      .operator-controls section {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: #f7fafc;
        border-radius: 8px;
      }
      
      .operator-controls h2 {
        font-size: 1.25rem;
        color: #2d3748;
        margin-bottom: 1rem;
      }
      
      .action-group {
        margin-bottom: 1.5rem;
      }
      
      .action-group h3 {
        font-size: 1rem;
        color: #4a5568;
        margin-bottom: 0.75rem;
      }
      
      .action-btn {
        display: block;
        width: 100%;
        padding: 1rem;
        margin-bottom: 0.5rem;
        background: white;
        border: 2px solid #48bb78;
        border-radius: 8px;
        color: #2d3748;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .action-btn:hover {
        background: #48bb78;
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
      }
      
      .action-btn:active {
        transform: translateY(0);
      }
      
      .code-input-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .code-input-group input,
      .code-input-group select {
        padding: 0.75rem;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 1rem;
      }
      
      .code-input-group input:focus,
      .code-input-group select:focus {
        outline: none;
        border-color: #4299e1;
      }
      
      .submit-btn {
        padding: 1rem;
        background: #4299e1;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .submit-btn:hover {
        background: #3182ce;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
      }
      
      .inventory-list, .action-log-list {
        max-height: 200px;
        overflow-y: auto;
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
      
      .item-name {
        font-weight: 600;
        color: #2d3748;
      }
      
      .item-owner {
        font-size: 0.875rem;
        color: #718096;
      }
      
      .action-entry {
        padding: 0.75rem;
        margin: 0.5rem 0;
        background: white;
        border-radius: 6px;
        border-left: 3px solid #4299e1;
      }
      
      .action-player {
        font-weight: 600;
        color: #4299e1;
        display: block;
        margin-bottom: 0.25rem;
      }
      
      .action-text {
        font-size: 0.875rem;
        color: #4a5568;
      }
      
      .empty-state {
        text-align: center;
        color: #a0aec0;
        padding: 1.5rem;
        font-style: italic;
      }
      
      .help-section ul {
        list-style: none;
        padding: 0;
      }
      
      .help-section li {
        padding: 0.5rem 0;
        color: #4a5568;
      }
      
      .help-section li:before {
        content: "💡 ";
        margin-right: 0.5rem;
      }
      
      .primary-btn {
        width: 100%;
        padding: 1rem 2rem;
        font-size: 1.125rem;
        font-weight: 700;
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
      }
      
      .primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
      }
      
      .primary-btn:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }
  
  destroy() {
    // Cleanup if needed
  }
}
