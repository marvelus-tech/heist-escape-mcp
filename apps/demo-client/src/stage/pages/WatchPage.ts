/**
 * Watch Page - Read-only companion view
 * 
 * For guests who just want to follow along:
 * - Action log mirror
 * - Inventory mirror
 * - No controls
 * - Phone-optimized
 */

export class WatchPage {
  private apiBase: string;
  private sessionId: string;
  
  constructor(apiBase: string, sessionId: string) {
    this.apiBase = apiBase;
    this.sessionId = sessionId;
  }
  
  render() {
    const app = document.getElementById('app')!;
    
    app.innerHTML = `
      <div class="watch-container">
        <header class="watch-header">
          <h1>👁️ Watch Mode</h1>
          <p class="session-badge">Session: <code>${this.sessionId}</code></p>
          <p class="watch-note">
            <strong>👀 Read-only view</strong> • Point your phone at the main screen to see the 3D museum action
          </p>
        </header>
        
        <div class="watch-content">
          <section class="watch-section">
            <h2>Live Actions</h2>
            <div id="watch-action-log" class="watch-list">
              <div class="empty-state">Waiting for actions...</div>
            </div>
          </section>
          
          <section class="watch-section">
            <h2>Shared Inventory</h2>
            <div id="watch-inventory" class="watch-list">
              <div class="empty-state">No items yet</div>
            </div>
          </section>
          
          <section class="watch-section">
            <h2>Current Players</h2>
            <div id="watch-players" class="watch-list">
              <div class="empty-state">Loading...</div>
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
    // No interactive controls in watch mode
  }
  
  private async startPolling() {
    setInterval(async () => {
      try {
        // Poll state
        const stateRes = await fetch(`${this.apiBase}/api/get_state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId })
        });
        const stateData = await stateRes.json();
        
        // Update players
        const playersList = document.getElementById('watch-players');
        if (playersList && stateData.players) {
          if (stateData.players.length === 0) {
            playersList.innerHTML = '<div class="empty-state">No players yet</div>';
          } else {
            playersList.innerHTML = stateData.players.map((player: any) =>
              `<div class="watch-item">
                <span class="player-icon">${player.role === 'examiner' ? '🕵️' : '📱'}</span>
                ${player.name}
                <span class="player-role">${player.role || 'guest'}</span>
              </div>`
            ).join('');
          }
        }
        
        // Poll inventory
        const invRes = await fetch(`${this.apiBase}/api/get_inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId })
        });
        const invData = await invRes.json();
        
        const invList = document.getElementById('watch-inventory');
        if (invList && invData.items) {
          if (invData.items.length === 0) {
            invList.innerHTML = '<div class="empty-state">No items yet</div>';
          } else {
            invList.innerHTML = invData.items.map((item: any) =>
              `<div class="watch-item">
                <span class="item-icon">📦</span>
                ${item.item}
                <span class="item-by">by ${item.takenBy}</span>
              </div>`
            ).join('');
          }
        }
        
        // Poll actions
        const actionsRes = await fetch(`${this.apiBase}/api/get_recent_actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId, limit: 10 })
        });
        const actionsData = await actionsRes.json();
        
        const actionLog = document.getElementById('watch-action-log');
        if (actionLog && actionsData.actions) {
          if (actionsData.actions.length === 0) {
            actionLog.innerHTML = '<div class="empty-state">Waiting for actions...</div>';
          } else {
            actionLog.innerHTML = actionsData.actions.slice(-10).reverse().map((action: any) => {
              const time = new Date(action.timestamp).toLocaleTimeString();
              return `<div class="watch-item action-item">
                <div class="action-header">
                  <span class="action-player">${action.player}</span>
                  <span class="action-time">${time}</span>
                </div>
                <div class="action-result">${action.result}</div>
              </div>`;
            }).join('');
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
      .watch-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 1rem;
        background: white;
        min-height: 100vh;
      }
      
      .watch-header {
        text-align: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 3px solid #4299e1;
      }
      
      .watch-header h1 {
        font-size: 1.75rem;
        color: #1a202c;
        margin-bottom: 0.5rem;
      }
      
      .session-badge {
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
      }
      
      .session-badge code {
        background: #4299e1;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-weight: 600;
      }
      
      .watch-note {
        font-size: 0.875rem;
        color: #718096;
        font-style: italic;
      }
      
      .watch-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .watch-section {
        background: #f7fafc;
        border-radius: 8px;
        padding: 1rem;
      }
      
      .watch-section h2 {
        font-size: 1.125rem;
        color: #2d3748;
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .watch-list {
        max-height: 300px;
        overflow-y: auto;
      }
      
      .watch-item {
        padding: 0.75rem;
        margin: 0.5rem 0;
        background: white;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .player-icon, .item-icon {
        font-size: 1.25rem;
      }
      
      .player-role, .item-by {
        margin-left: auto;
        font-size: 0.875rem;
        color: #718096;
      }
      
      .action-item {
        flex-direction: column;
        align-items: flex-start;
        border-left: 3px solid #4299e1;
      }
      
      .action-header {
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin-bottom: 0.25rem;
      }
      
      .action-player {
        font-weight: 600;
        color: #4299e1;
      }
      
      .action-time {
        font-size: 0.75rem;
        color: #a0aec0;
      }
      
      .action-result {
        font-size: 0.875rem;
        color: #4a5568;
      }
      
      .empty-state {
        text-align: center;
        color: #a0aec0;
        padding: 2rem 1rem;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }
  
  destroy() {
    // Cleanup if needed
  }
}
