/**
 * Stage Page - Premium Museum Heist Demo Launcher
 * 
 * Features:
 * - Start Demo button → mints session with juice
 * - Larger, more scannable QR codes for Operator/Watch
 * - Premium three.js 3D museum diorama
 * - GameFeel integration (shake, hitstop, particles, audio)
 * - Action ticker + inventory toasts with animations
 */

import * as THREE from 'three';
import { SceneManager } from '../../scene-manager';
import { GameFeel, JuiceTier } from '../../game-feel';
import { StageJuice, type JuiceEvent, type ActionLogEntry, type InventoryItem } from '../juice';

export class StagePage {
  private apiBase: string;
  private mcpUrl: string;
  private sessionId: string | null = null;
  
  // 3D scene
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private sceneManager: SceneManager | null = null;
  private gameFeel: GameFeel | null = null;
  private juice: StageJuice | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  
  // Polling
  private pollingInterval: number | null = null;
  
  constructor(apiBase: string, mcpUrl: string) {
    this.apiBase = apiBase;
    this.mcpUrl = mcpUrl;
  }
  
  render() {
    const app = document.getElementById('app')!;
    
    app.innerHTML = `
      <div class="stage-container">
        <header class="stage-header">
          <h1>Heist Escape</h1>
          <p class="tagline">Cooperative Museum Heist</p>
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
            <div class="role-icon">🕵️</div>
            <h3>Examiner (Agent)</h3>
            <ul>
              <li>Read documents and clues</li>
              <li>Examine objects for hidden info</li>
              <li>Navigate through rooms</li>
              <li>Communicate findings</li>
            </ul>
          </div>
          
          <div class="role-card">
            <div class="role-icon">📱</div>
            <h3>Operator (Human)</h3>
            <ul>
              <li>Open drawers and containers</li>
              <li>Enter codes at keypads</li>
              <li>Manage shared inventory</li>
              <li>Execute physical actions</li>
            </ul>
          </div>
        </div>
        
        <button id="start-demo-btn" class="cta-button">
          <span class="btn-text">Start Demo</span>
        </button>
        
        <div class="info-note">
          <strong>💡 Assembly Rule:</strong> The 4-digit vault code is scattered across 4 rooms.
          Combine digits in order by room number.
        </div>
      </div>
    `;
  }
  
  private renderActiveSession(): string {
    const baseUrl = import.meta.env.VITE_BASE_PATH === '/' 
      ? window.location.origin 
      : window.location.origin + import.meta.env.VITE_BASE_PATH.replace(/\/$/, '');
    
    const operatorUrl = `${baseUrl}#/join?s=${this.sessionId}&role=operator`;
    const watchUrl = `${baseUrl}#/join?s=${this.sessionId}&role=watch`;
    
    return `
      <div class="active-session">
        <div class="session-banner">
          <div class="session-info">
            <h2>Session Active</h2>
            <code class="session-code">${this.sessionId}</code>
          </div>
          <button id="end-session-btn" class="secondary-button">End Session</button>
        </div>
        
        <div class="main-content">
          <div class="stage-view">
            <div class="scene-container" id="scene-container">
              <canvas id="stage-canvas"></canvas>
              <div class="room-title" id="room-title">Museum Lobby</div>
            </div>
            
            <div class="host-tip">
              <strong>💻 Host Tip:</strong> Run Examiner agent (Claude/Cursor) on this computer. 
              Scan QR codes on your phone to join as Operator or Watch companion.
            </div>
          </div>
          
          <div class="sidebar">
            <div class="qr-panel">
              <h3>📱 Join as Companion</h3>
              <p class="qr-hint">Scan with your phone camera</p>
              
              <div class="qr-grid">
                <div class="qr-card operator-qr">
                  <div class="qr-label">Operator (Recommended)</div>
                  <div id="operator-qr" class="qr-image"></div>
                  <button class="copy-btn" data-url="${operatorUrl}">Copy Link</button>
                </div>
                
                <div class="qr-card watch-qr">
                  <div class="qr-label">Watch Mode</div>
                  <div id="watch-qr" class="qr-image"></div>
                  <button class="copy-btn" data-url="${watchUrl}">Copy Link</button>
                </div>
              </div>
            </div>
            
            <div class="live-panel action-ticker">
              <h3>📋 Live Actions</h3>
              <div id="action-list" class="action-list"></div>
            </div>
            
            <div class="live-panel inventory-panel">
              <h3>🎒 Shared Inventory</h3>
              <div id="inventory-list" class="inventory-list">
                <div class="empty-state">No items collected yet</div>
              </div>
            </div>
          </div>
        </div>
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
          const originalText = (e.target as HTMLElement).textContent;
          (e.target as HTMLElement).textContent = '✓ Copied!';
          setTimeout(() => {
            (e.target as HTMLElement).textContent = originalText || 'Copy Link';
          }, 2000);
        }
      });
    });
    
    // If session active, generate QR codes and start scene
    if (this.sessionId) {
      this.generateQRCodes();
      this.initStageScene();
      this.startPolling();
    }
  }
  
  private initStageScene() {
    const container = document.getElementById('scene-container');
    const canvas = document.getElementById('stage-canvas') as HTMLCanvasElement;
    if (!container || !canvas) return;
    
    // Setup three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5); // Light gray background
    this.scene.fog = new THREE.Fog(0xf5f5f5, 15, 25);
    
    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 1, 0);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    // Scene manager
    this.sceneManager = new SceneManager(this.scene);
    
    // GameFeel system
    this.gameFeel = new GameFeel(this.camera, this.scene);
    
    // Juice layer (toasts, examine card, ticker emphasis, climax ribbon)
    this.juice = StageJuice.mount(container, { onEvent: (e) => this.onJuiceEvent(e) });
    this.juice.attachTicker(document.getElementById('action-list'));
    
    // Build initial room (lobby)
    this.buildDemoRoom();
    
    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Start animation loop
    this.animate();
  }
  
  private buildDemoRoom() {
    if (!this.sceneManager) return;
    
    // Build Museum Lobby (Room 1)
    const demoRoom = {
      id: 1,
      name: 'Museum Lobby',
      description: 'An elegant museum entrance',
      atmosphere: 'Bright and welcoming'
    };
    
    const demoObjects = [
      { id: 1, name: 'reception-desk', short_description: 'Large wooden desk', room_id: 1 },
      { id: 2, name: 'visitor-log', short_description: 'Guest logbook', room_id: 1 },
      { id: 3, name: 'flower-arrangement', short_description: 'Fresh flowers', room_id: 1 }
    ];
    
    this.sceneManager.buildRoom(demoRoom, demoObjects);
  }
  
  private handleResize() {
    if (!this.camera || !this.renderer || !this.scene) return;
    
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    
    if (this.gameFeel) {
      this.gameFeel.setCameraBaseline();
    }
  }
  
  private animate = () => {
    if (!this.scene || !this.camera || !this.renderer) return;
    
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;
    
    // Update GameFeel (returns true if in hitstop)
    const inHitstop = this.gameFeel?.update(deltaTime) || false;
    
    if (!inHitstop) {
      // Update scene
      this.sceneManager?.update();
    }
    
    this.renderer.render(this.scene, this.camera);
  }
  
  private async startDemo() {
    // Mint session ID
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
      
      // Trigger juice on Start Demo
      setTimeout(() => {
        if (this.gameFeel) {
          this.gameFeel.juice('SMALL', undefined, 'click');
        }
      }, 100);
      
      // Re-render with active session
      this.render();
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start demo. Make sure the server is running.');
    }
  }
  
  private endSession() {
    // Cleanup
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
    }
    if (this.gameFeel) {
      this.gameFeel.dispose();
    }
    this.juice?.destroy();
    this.juice = null;
    
    this.sessionId = null;
    this.render();
  }
  
  /** Map juice events to GameFeel (camera shake, particles, stingers). */
  private onJuiceEvent(event: JuiceEvent) {
    if (!this.gameFeel) return;
    switch (event.kind) {
      case 'item-acquired':
      case 'prize-taken':
        this.gameFeel.juice('MEDIUM', new THREE.Vector3(0, 1.5, 2), 'pickup');
        break;
      case 'reveal':
        this.gameFeel.juice('SMALL', new THREE.Vector3(0, 1.5, 0), 'click');
        break;
      case 'door-unlocked':
      case 'code-accepted':
        this.gameFeel.juice('LARGE', new THREE.Vector3(0, 2, 0), 'unlock');
        break;
      case 'vault-open':
      case 'heist-complete':
        this.gameFeel.juice('LARGE', new THREE.Vector3(0, 1.5, -2), 'success');
        break;
      case 'code-rejected':
        this.gameFeel.juice('SMALL', undefined, 'click');
        break;
    }
  }
  
  private generateQRCodes() {
    const baseUrl = import.meta.env.VITE_BASE_PATH === '/' 
      ? window.location.origin 
      : window.location.origin + import.meta.env.VITE_BASE_PATH.replace(/\/$/, '');
    
    const operatorUrl = `${baseUrl}#/join?s=${this.sessionId}&role=operator`;
    const watchUrl = `${baseUrl}#/join?s=${this.sessionId}&role=watch`;
    
    // Generate larger QR codes (400x400 for better scanning)
    const operatorQR = document.getElementById('operator-qr');
    const watchQR = document.getElementById('watch-qr');
    
    if (operatorQR) {
      operatorQR.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(operatorUrl)}" alt="Operator QR" />`;
    }
    
    if (watchQR) {
      watchQR.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(watchUrl)}" alt="Watch QR" />`;
    }
  }
  
  private async startPolling() {
    this.pollingInterval = window.setInterval(async () => {
      try {
        await this.pollActions();
        await this.pollInventory();
        await this.pollState();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  }
  
  private async pollActions() {
    const res = await fetch(`${this.apiBase}/api/get_recent_actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId, limit: 8 })
    });
    const data = await res.json();
    
    const actionList = document.getElementById('action-list');
    if (!actionList || !data.actions) return;
    
    // Juice diffs against what it has already seen, so this is safe every poll
    this.juice?.onActions(data.actions);
    
    if (data.actions.length === 0) {
      actionList.innerHTML = '<div class="empty-state">Waiting for actions...</div>';
    } else {
      actionList.innerHTML = data.actions.slice(-8).reverse().map((action: ActionLogEntry) => `
          <div class="action-item">
            <span class="action-player">${action.player}</span>
            <span class="action-text">${action.result}</span>
          </div>
        `).join('');
    }
  }
  
  private async pollState() {
    const res = await fetch(`${this.apiBase}/api/get_state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId })
    });
    const state = await res.json();
    if (state && !state.error) this.juice?.onState(state);
  }
  
  private async pollInventory() {
    const res = await fetch(`${this.apiBase}/api/get_inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId })
    });
    const data = await res.json();
    
    const inventoryList = document.getElementById('inventory-list');
    if (!inventoryList || !data.items) return;
    
    this.juice?.onInventory(data.items);
    
    if (data.items.length === 0) {
      inventoryList.innerHTML = '<div class="empty-state">No items collected yet</div>';
    } else {
      inventoryList.innerHTML = data.items.map((item: InventoryItem) =>
        `<div class="inventory-item">
          <span class="item-icon">📦</span>
          <span class="item-name">${item.item}</span>
          <span class="item-owner">by ${item.takenBy}</span>
        </div>`
      ).join('');
    }
  }
  
  private applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
        color: #2d3748;
      }
      
      .stage-container {
        max-width: 1600px;
        margin: 0 auto;
        padding: 1.5rem;
        min-height: 100vh;
      }
      
      .stage-header {
        text-align: center;
        margin-bottom: 2rem;
        padding: 1rem;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      }
      
      .stage-header h1 {
        font-size: 2.5rem;
        font-weight: 800;
        color: #1a202c;
        margin-bottom: 0.25rem;
        letter-spacing: -0.5px;
      }
      
      .tagline {
        font-size: 1.125rem;
        color: #718096;
        font-weight: 500;
      }
      
      /* Start Screen */
      .start-screen {
        background: white;
        border-radius: 20px;
        padding: 3rem;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.1);
        max-width: 900px;
        margin: 0 auto;
      }
      
      .hero {
        text-align: center;
        margin-bottom: 3rem;
      }
      
      .hero-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: float 3s ease-in-out infinite;
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      
      .hero h2 {
        font-size: 2rem;
        color: #2c3e50;
        margin-bottom: 0.75rem;
        font-weight: 700;
      }
      
      .subtitle {
        font-size: 1.125rem;
        color: #718096;
      }
      
      .roles-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 2.5rem;
      }
      
      .role-card {
        background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
        border-radius: 12px;
        padding: 2rem;
        border: 2px solid #e2e8f0;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .role-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }
      
      .role-icon {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
      }
      
      .role-card h3 {
        font-size: 1.25rem;
        margin-bottom: 1rem;
        color: #2d3748;
        font-weight: 700;
      }
      
      .role-card ul {
        list-style: none;
        padding: 0;
      }
      
      .role-card li {
        padding: 0.5rem 0;
        color: #4a5568;
        font-size: 0.938rem;
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
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 1px;
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
      }
      
      .cta-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
      }
      
      .cta-button:active {
        transform: translateY(0);
      }
      
      .info-note {
        margin-top: 2rem;
        padding: 1.5rem;
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        border-radius: 8px;
        color: #856404;
        font-size: 0.938rem;
      }
      
      /* Active Session */
      .active-session {
        background: white;
        border-radius: 20px;
        padding: 2rem;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.1);
      }
      
      .session-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 1.5rem;
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 2rem;
      }
      
      .session-info h2 {
        font-size: 1.5rem;
        color: #2d3748;
        margin-bottom: 0.5rem;
        font-weight: 700;
      }
      
      .session-code {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.5rem 1.25rem;
        border-radius: 8px;
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: 1px;
      }
      
      .secondary-button {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        font-weight: 600;
        background: #e2e8f0;
        color: #2d3748;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .secondary-button:hover {
        background: #cbd5e0;
      }
      
      .main-content {
        display: grid;
        grid-template-columns: 1.5fr 1fr;
        gap: 2rem;
      }
      
      .stage-view {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .scene-container {
        position: relative;
        background: #2d3748;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        height: 500px;
      }
      
      #stage-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      
      .room-title {
        position: absolute;
        bottom: 1.5rem;
        left: 1.5rem;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 700;
        color: #2d3748;
        font-size: 1.125rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .host-tip {
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, #fff3cd 0%, #fff8e1 100%);
        border-left: 4px solid #ffc107;
        border-radius: 8px;
        color: #856404;
        font-size: 0.875rem;
        line-height: 1.5;
      }
      
      .sidebar {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      
      .qr-panel {
        background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
        border-radius: 12px;
        padding: 1.5rem;
        border: 2px solid #e2e8f0;
      }
      
      .qr-panel h3 {
        font-size: 1.25rem;
        color: #2d3748;
        margin-bottom: 0.5rem;
        font-weight: 700;
      }
      
      .qr-hint {
        font-size: 0.875rem;
        color: #718096;
        margin-bottom: 1rem;
      }
      
      .qr-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      
      .qr-card {
        background: white;
        border-radius: 8px;
        padding: 1rem;
        text-align: center;
        border: 2px solid #e2e8f0;
      }
      
      .operator-qr {
        border-color: #48bb78;
      }
      
      .qr-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 0.75rem;
      }
      
      .qr-image {
        margin: 0.5rem 0;
      }
      
      .qr-image img {
        width: 100%;
        height: auto;
        border-radius: 6px;
      }
      
      .copy-btn {
        width: 100%;
        padding: 0.5rem;
        font-size: 0.813rem;
        font-weight: 600;
        background: #4299e1;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .copy-btn:hover {
        background: #3182ce;
      }
      
      .live-panel {
        background: #f7fafc;
        border-radius: 12px;
        padding: 1.5rem;
        border: 2px solid #e2e8f0;
      }
      
      .live-panel h3 {
        font-size: 1.125rem;
        color: #2d3748;
        margin-bottom: 1rem;
        font-weight: 700;
      }
      
      .action-list, .inventory-list {
        max-height: 200px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e0 #edf2f7;
      }
      
      .action-item {
        padding: 0.75rem;
        margin: 0.5rem 0;
        background: white;
        border-radius: 6px;
        border-left: 3px solid #4299e1;
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .action-player {
        font-weight: 600;
        color: #667eea;
        margin-right: 0.5rem;
        font-size: 0.875rem;
      }
      
      .action-text {
        color: #4a5568;
        font-size: 0.875rem;
      }
      
      .inventory-item {
        padding: 0.75rem;
        margin: 0.5rem 0;
        background: white;
        border-radius: 6px;
        border-left: 3px solid #48bb78;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        animation: slideIn 0.3s ease-out;
      }
      
      .item-icon {
        font-size: 1.25rem;
      }
      
      .item-name {
        flex: 1;
        font-weight: 600;
        color: #2d3748;
        font-size: 0.875rem;
      }
      
      .item-owner {
        font-size: 0.75rem;
        color: #718096;
      }
      
      .empty-state {
        text-align: center;
        color: #a0aec0;
        padding: 2rem 1rem;
        font-style: italic;
        font-size: 0.875rem;
      }
      
      /* Responsive */
      @media (max-width: 1024px) {
        .main-content {
          grid-template-columns: 1fr;
        }
        
        .roles-info {
          grid-template-columns: 1fr;
        }
        
        .qr-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
    }
    if (this.gameFeel) {
      this.gameFeel.dispose();
    }
    this.juice?.destroy();
    this.juice = null;
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
