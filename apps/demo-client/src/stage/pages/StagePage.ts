/**
 * Stage Page - Big-screen Stage chrome for the Museum Heist demo
 *
 * Two views share one page:
 * - Lobby (pre-session, and as an overlay while live): title, session chip,
 *   three seat cards (Examiner / Operator / Watch) with QR codes, Start Demo.
 * - Live stage: full-bleed three.js scene with an edge-docked frosted dark-glass
 *   HUD (top bar, left action ticker, right role status, bottom inventory strip)
 *   styled after the VIS-C concept still: night glass, gold headers, ice borders.
 *
 * Module A owns layout, structure and CSS. Scene materials are Module B
 * (scene-manager). Toasts, examine card, ticker emphasis and the climax ribbon
 * are Module C (../juice), mounted into the scene container and fed from the
 * polling loop below; StagePage only maps juice events onto GameFeel.
 */

import * as THREE from 'three';
import { SceneManager } from '../../scene-manager';
import { GameFeel } from '../../game-feel';
import { StageJuice, type JuiceEvent, type ActionLogEntry, type InventoryItem } from '../juice';

interface SessionPlayer {
  player_id: string;
  name: string;
  role: string | null;
}

type Role = 'examiner' | 'operator' | 'watch';

const ROLES: Record<Role, { title: string; tagline: string; subtitle: string; icon: string }> = {
  examiner: { title: 'Examiner', tagline: 'Analyze. Inspect. Find clues.', subtitle: 'Forensic / Authenticity', icon: 'search' },
  operator: { title: 'Operator', tagline: 'Monitor. Coordinate. Guide the team.', subtitle: 'Systems / Control', icon: 'headset' },
  watch: { title: 'Watch', tagline: 'Observe. Alert. Spot every risk.', subtitle: 'Spectator / Alerts', icon: 'eye' }
};

const STYLE_ID = 'he-stage-styles';

/** Minimal HTML escaping for server-provided strings rendered into innerHTML. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline stroke icons so the HUD never depends on emoji rendering. */
function icon(name: string): string {
  const paths: Record<string, string> = {
    column: '<path d="M4 21h16M6 21V9m4 12V9m4 12V9m4 12V9M3 9h18l-9-5z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.3-4.3"/>',
    headset: '<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19a3 3 0 0 1-3 3h-3"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M2 9a14 14 0 0 1 20 0"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zm4 4h3v3h-3zm0-4h3m-4 7h1"/>',
    play: '<path d="M7 5v14l11-7z"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.2-8.2m-3 3 3 3m-6-1 2 2"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/>'
  };
  return `<svg class="he-ico he-ico-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
}

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
  private resizeHandler = () => this.handleResize();

  // Polling
  private pollingInterval: number | null = null;
  // Serialized last payloads so unchanged polls do not re-render (and replay
  // entry animations on) the ticker / inventory strip.
  private lastActionsKey = '';
  private lastInventoryKey = '';

  constructor(apiBase: string, mcpUrl: string) {
    this.apiBase = apiBase;
    this.mcpUrl = mcpUrl;
  }

  render() {
    const app = document.getElementById('app')!;
    this.ensureStyles();

    app.innerHTML = `
      <div class="he-stage ${this.sessionId ? 'is-live' : 'is-lobby'}">
        ${this.sessionId ? this.renderLiveStage() : this.renderLobby(false)}
      </div>
    `;

    this.attachEventListeners();
  }

  // ---------------------------------------------------------------------------
  // Markup: shared pieces
  // ---------------------------------------------------------------------------

  private joinBaseUrl(): string {
    const basePath: string = import.meta.env.VITE_BASE_PATH || '/';
    return basePath === '/'
      ? window.location.origin
      : window.location.origin + basePath.replace(/\/$/, '');
  }

  private joinUrl(role: Role): string {
    return `${this.joinBaseUrl()}#/join?s=${this.sessionId}&role=${role}`;
  }

  private qrMarkup(role: Role, size: number): string {
    if (!this.sessionId) {
      return `<div class="qr-placeholder" aria-label="QR appears after Start Demo">${icon('qr')}<span>Awaiting session</span></div>`;
    }
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=4&data=${encodeURIComponent(this.joinUrl(role))}`;
    return `<img src="${src}" width="${size}" height="${size}" alt="${ROLES[role].title} join QR" loading="eager" />`;
  }

  private brandMark(subtitle: string): string {
    return `
      <div class="brand">
        <span class="brand-seal">${icon('column')}</span>
        <span class="brand-text">
          <span class="brand-title he-gold-text">Heist Escape</span>
          <span class="brand-sub he-eyebrow">${subtitle}</span>
        </span>
      </div>
    `;
  }

  private sessionChip(): string {
    if (!this.sessionId) {
      return `<div class="session-chip session-chip--standby he-glass"><span class="chip-dot"></span><span class="he-eyebrow">Standby</span><code>No session</code></div>`;
    }
    return `
      <div class="session-chip he-glass he-hairline-gold">
        <span class="chip-dot chip-dot--live"></span>
        <span class="he-eyebrow">Session</span>
        <code>${esc(this.sessionId)}</code>
        <button class="chip-copy copy-btn" data-url="${esc(this.joinUrl('operator'))}" title="Copy Operator join link" aria-label="Copy Operator join link">${icon('copy')}</button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Markup: lobby (pre-session and live overlay)
  // ---------------------------------------------------------------------------

  private renderLobby(asOverlay: boolean): string {
    const live = Boolean(this.sessionId);
    return `
      <section class="lobby ${asOverlay ? 'lobby--overlay' : ''}" aria-label="Heist Escape lobby">
        <header class="lobby-top">
          ${this.brandMark('Stage Mode')}
          ${this.sessionChip()}
          <div class="lobby-mode he-eyebrow">Stage Mode ${icon('sparkle')}</div>
          ${asOverlay ? `<button id="close-lobby-btn" class="ghost-btn" aria-label="Return to stage">${icon('close')}<span>Return to stage</span></button>` : ''}
        </header>

        <div class="lobby-hero">
          <h1 class="lobby-title he-gold-text he-shimmer">Heist Escape</h1>
          <div class="lobby-rule"><span class="he-eyebrow">Stage Mode</span></div>
          <div class="lobby-frame he-glass he-hairline-gold">${this.museumFacadeSvg()}</div>
        </div>

        <div class="seat-grid">
          ${(Object.keys(ROLES) as Role[]).map((role) => this.seatCard(role)).join('')}
        </div>

        <footer class="lobby-footer he-glass">
          <div class="lobby-start">
            <button id="start-demo-btn" class="cta-start" ${live ? 'disabled' : ''}>
              <span class="cta-play">${icon('play')}</span>
              <span class="cta-text">
                <strong>Start Demo</strong>
                <small>${live ? 'Already running' : 'Mint a session and open the stage'}</small>
              </span>
            </button>
            ${live && asOverlay ? `<button id="enter-stage-btn" class="cta-secondary">Enter stage</button>` : ''}
          </div>
          <div class="lobby-tags">
            <span>Projection ready</span>
            <span class="tag-sep" aria-hidden="true"></span>
            <span>Designed for live play</span>
            <span class="tag-sep" aria-hidden="true"></span>
            <em class="tag-gold">Inspire. Plan. Escape.</em>
          </div>
          <div class="lobby-brandmark">
            <span class="brandmark-title">Heist Escape</span>
            <span class="he-eyebrow">The Experience</span>
            <span class="brandmark-sparkle">${icon('sparkle')}</span>
          </div>
        </footer>
      </section>
    `;
  }

  private seatCard(role: Role): string {
    const meta = ROLES[role];
    return `
      <article class="seat-card seat-card--${role} he-glass">
        <div class="seat-icon">${icon(meta.icon)}</div>
        <div class="seat-body">
          <h3 class="seat-title">${meta.title}</h3>
          <p class="seat-tagline">${meta.tagline}</p>
          ${this.sessionId ? `<button class="seat-copy copy-btn" data-url="${esc(this.joinUrl(role))}">${icon('copy')}<span>Copy link</span></button>` : `<span class="seat-hint he-eyebrow">${role === 'examiner' ? 'Agent seat' : 'Phone seat'}</span>`}
        </div>
        <div class="seat-qr">${this.qrMarkup(role, 220)}</div>
      </article>
    `;
  }

  /** Decorative museum facade in gold hairlines for the lobby preview frame. */
  private museumFacadeSvg(): string {
    const columns = [110, 190, 270, 350, 430, 510]
      .map((x) => `<rect x="${x}" y="118" width="20" height="112" rx="2"/><rect x="${x - 6}" y="110" width="32" height="10" rx="2"/><rect x="${x - 4}" y="228" width="28" height="8" rx="2"/>`)
      .join('');
    return `
      <svg class="facade" viewBox="0 0 640 300" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
        <defs>
          <linearGradient id="he-facade-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="#f9efd6" stop-opacity="0.9"/>
            <stop offset="1" stop-color="#f9efd6" stop-opacity="0.1"/>
          </linearGradient>
        </defs>
        <ellipse cx="320" cy="268" rx="300" ry="20" stroke-opacity="0.35"/>
        <path d="M200 100a120 120 0 0 1 240 0" fill="url(#he-facade-fill)"/>
        <path d="M320 20v-8m-6 8h12"/>
        <path d="M60 110 320 40l260 70z" fill="url(#he-facade-fill)"/>
        <path d="M70 110h500"/>
        ${columns}
        <rect x="60" y="236" width="520" height="10" rx="2"/>
        <rect x="40" y="246" width="560" height="10" rx="2"/>
        <rect x="20" y="256" width="600" height="10" rx="2"/>
        <path d="M300 150h40v80h-40z" fill="url(#he-facade-fill)"/>
        <path d="M320 150v80"/>
        <g class="facade-sparkle" transform="translate(320 178)"><path d="M0-14 2.4-2.4 14 0 2.4 2.4 0 14-2.4 2.4-14 0-2.4-2.4z" fill="#f0dfae" stroke="#c9a24a"/></g>
      </svg>
    `;
  }

  // ---------------------------------------------------------------------------
  // Markup: live stage with edge-docked HUD
  // ---------------------------------------------------------------------------

  private renderLiveStage(): string {
    return `
      <div class="live">
        <div class="scene-container" id="scene-container">
          <canvas id="stage-canvas"></canvas>
        </div>

        <div class="hud" aria-live="polite">
          <header class="hud-top">
            <div class="hud-brand he-glass">
              ${this.brandMark('Spectator Stage')}
              <span class="live-pill"><span class="he-live-dot"></span>Live</span>
            </div>
            <div class="hud-session he-glass">
              ${icon('calendar')}
              <span class="he-eyebrow">Session</span>
              <span class="hud-session-sep" aria-hidden="true"></span>
              <code>${esc(this.sessionId)}</code>
              <button class="chip-copy copy-btn" data-url="${esc(this.joinUrl('operator'))}" title="Copy Operator join link" aria-label="Copy Operator join link">${icon('copy')}</button>
            </div>
            <div class="hud-tools he-glass">
              <span class="hud-stat" title="Last poll round-trip">${icon('wifi')}<span id="hud-latency">-- ms</span></span>
              <span class="hud-stat">${icon('eye')}<span>Spectate</span></span>
              <button id="lobby-btn" class="tool-btn" title="Show QR lobby" aria-label="Show QR lobby">${icon('qr')}</button>
              <button id="fullscreen-btn" class="tool-btn" title="Toggle fullscreen" aria-label="Toggle fullscreen">${icon('expand')}</button>
              <button id="end-session-btn" class="tool-btn tool-btn--danger" title="End session" aria-label="End session">${icon('close')}</button>
            </div>
          </header>

          <aside class="hud-ticker he-glass" aria-label="Action ticker">
            <div class="ticker-head">
              <span class="ticker-title">${icon('activity')}<span class="he-eyebrow">Action Ticker</span></span>
            </div>
            <div id="action-list" class="ticker-list">
              <div class="empty-state">Waiting for actions...</div>
            </div>
            <div class="ticker-foot"><span class="he-live-dot"></span><span class="he-eyebrow">Live feed</span></div>
          </aside>

          <aside class="hud-roles" aria-label="Role status">
            ${(Object.keys(ROLES) as Role[]).map((role) => this.roleChip(role)).join('')}
          </aside>

          <div class="hud-room he-glass" id="room-title">Museum Lobby</div>

          <footer class="hud-bottom">
            <div class="inv-summary he-glass">
              ${icon('grid')}
              <span class="he-eyebrow">Inventory</span>
              <strong><span id="inventory-count">0</span> <small>items</small></strong>
            </div>
            <div id="inventory-list" class="inv-strip he-glass">
              <div class="empty-state">No artifacts secured yet</div>
            </div>
            <div class="hud-qr he-glass he-hairline-gold">
              <div class="hud-qr-text">
                <span class="hud-qr-title">Session QR</span>
                <span class="he-eyebrow">Scan to join</span>
              </div>
              <div class="hud-qr-img">${this.qrMarkup('operator', 160)}</div>
            </div>
          </footer>
        </div>

        <div id="lobby-overlay" class="lobby-overlay" hidden>
          ${this.renderLobby(true)}
        </div>
      </div>
    `;
  }

  private roleChip(role: Role): string {
    const meta = ROLES[role];
    return `
      <div class="role-chip role-chip--${role} he-glass" id="role-chip-${role}" data-state="standby">
        <span class="role-icon">${icon(meta.icon)}</span>
        <span class="role-text">
          <span class="role-title">${meta.title}</span>
          <span class="role-sub" id="role-sub-${role}">${meta.subtitle}</span>
        </span>
        <span class="role-state" aria-hidden="true"></span>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private attachEventListeners() {
    document.getElementById('start-demo-btn')?.addEventListener('click', () => this.startDemo());
    document.getElementById('end-session-btn')?.addEventListener('click', () => this.endSession());
    document.getElementById('lobby-btn')?.addEventListener('click', () => this.toggleLobbyOverlay(true));
    document.getElementById('close-lobby-btn')?.addEventListener('click', () => this.toggleLobbyOverlay(false));
    document.getElementById('enter-stage-btn')?.addEventListener('click', () => this.toggleLobbyOverlay(false));
    document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());

    document.querySelectorAll<HTMLButtonElement>('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (!url) return;
        navigator.clipboard.writeText(url);
        btn.classList.add('is-copied');
        const label = btn.querySelector('span');
        const original = label?.textContent;
        if (label) label.textContent = 'Copied';
        setTimeout(() => {
          btn.classList.remove('is-copied');
          if (label) label.textContent = original || 'Copy link';
        }, 1800);
      });
    });

    if (this.sessionId) {
      this.initStageScene();
      this.startPolling();
    }
  }

  private toggleLobbyOverlay(show: boolean) {
    const overlay = document.getElementById('lobby-overlay');
    if (!overlay) return;
    overlay.hidden = !show;
  }

  private toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  }

  // ---------------------------------------------------------------------------
  // Scene lifecycle (unchanged apart from listener cleanup)
  // ---------------------------------------------------------------------------

  private initStageScene() {
    const container = document.getElementById('scene-container');
    const canvas = document.getElementById('stage-canvas') as HTMLCanvasElement;
    if (!container || !canvas) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);
    this.scene.fog = new THREE.Fog(0xf5f5f5, 15, 25);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.sceneManager = new SceneManager(this.scene);
    this.gameFeel = new GameFeel(this.camera, this.scene);

    // Module C overlays live inside the scene container so they never fight the
    // HUD grid; placement tokens keep them out of the edge-docked panels.
    this.juice = StageJuice.mount(container, { onEvent: (e) => this.onJuiceEvent(e) });
    this.juice.attachTicker(document.getElementById('action-list'));

    this.buildDemoRoom();

    window.addEventListener('resize', this.resizeHandler);
    this.lastFrameTime = performance.now();
    this.animate();
  }

  private buildDemoRoom() {
    if (!this.sceneManager) return;

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

    this.gameFeel?.setCameraBaseline();
  }

  private animate = () => {
    if (!this.scene || !this.camera || !this.renderer) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    const inHitstop = this.gameFeel?.update(deltaTime) || false;
    if (!inHitstop) {
      this.sceneManager?.update();
    }

    this.renderer.render(this.scene, this.camera);
  };

  private teardownScene() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this.resizeHandler);
    this.gameFeel?.dispose();
    this.juice?.destroy();
    this.juice = null;
    this.renderer?.dispose();
    this.gameFeel = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.sceneManager = null;
  }

  private stopPolling() {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Session control
  // ---------------------------------------------------------------------------

  private async startDemo() {
    this.sessionId = 'demo-' + Math.random().toString(36).substring(2, 6).toUpperCase();

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

      setTimeout(() => {
        this.gameFeel?.juice('SMALL', undefined, 'click');
      }, 100);

      this.render();
    } catch (error) {
      console.error('Failed to start session:', error);
      this.sessionId = null;
      alert('Failed to start demo. Make sure the server is running.');
    }
  }

  private endSession() {
    this.teardownScene();
    this.stopPolling();
    this.lastActionsKey = '';
    this.lastInventoryKey = '';
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
      case 'replica-warning':
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

  // ---------------------------------------------------------------------------
  // Polling (API behavior unchanged; render targets are the new HUD nodes)
  // ---------------------------------------------------------------------------

  private async startPolling() {
    this.stopPolling();
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
    const started = performance.now();
    const res = await fetch(`${this.apiBase}/api/get_recent_actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId, limit: 8 })
    });
    const data = await res.json();

    const latency = document.getElementById('hud-latency');
    if (latency) latency.textContent = `${Math.round(performance.now() - started)} ms`;

    const actionList = document.getElementById('action-list');
    if (!actionList || !data.actions) return;

    // Juice diffs rows against what it has already seen (and seeds on the first
    // call), so feeding it every poll is safe and never replays history.
    this.juice?.onActions(data.actions);

    const key = JSON.stringify(data.actions);
    if (key === this.lastActionsKey) return;
    this.lastActionsKey = key;

    if (data.actions.length === 0) {
      actionList.innerHTML = '<div class="empty-state">Waiting for actions...</div>';
      return;
    }

    actionList.innerHTML = data.actions.slice(-8).reverse().map((action: ActionLogEntry) => {
      const result = action.result.toLowerCase();

      return `
        <div class="tick-item tick-item--${this.actionKind(result)}">
          <span class="tick-icon">${icon(this.actionIcon(result))}</span>
          <span class="tick-body">
            <span class="tick-meta"><time>${this.formatTime(action.timestamp)}</time><b>${esc(action.player)}</b></span>
            <span class="tick-text">${esc(action.result)}</span>
          </span>
        </div>
      `;
    }).join('');
  }

  private actionKind(result: string): 'gold' | 'cyan' | 'neutral' {
    if (/unlock|correct|vault|success|solved|open/.test(result)) return 'gold';
    if (/examin|inspect|read|look|search|found|clue/.test(result)) return 'cyan';
    return 'neutral';
  }

  private actionIcon(result: string): string {
    if (/unlock|door|key/.test(result)) return 'key';
    if (/correct|vault|success|solved/.test(result)) return 'shield';
    if (/examin|inspect|read|look|search|clue/.test(result)) return 'search';
    return 'activity';
  }

  private formatTime(timestamp: string | number): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return esc(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
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

    const count = document.getElementById('inventory-count');
    if (count) count.textContent = String(data.items.length);

    const key = JSON.stringify(data.items);
    if (key === this.lastInventoryKey) return;
    this.lastInventoryKey = key;

    if (data.items.length === 0) {
      inventoryList.innerHTML = '<div class="empty-state">No artifacts secured yet</div>';
      return;
    }

    inventoryList.innerHTML = data.items.map((item: InventoryItem, index: number) =>
      `<div class="inv-tile ${index === data.items.length - 1 ? 'is-latest' : ''}" title="${esc(item.item)} - by ${esc(item.takenBy)}">
        <span class="inv-glyph">${esc(this.monogram(item.item))}</span>
        <span class="inv-name">${esc(item.item)}</span>
        <span class="inv-by">${esc(item.takenBy)}</span>
      </div>`
    ).join('');
  }

  /** Two-letter monogram for artifact tiles, e.g. "Gold Key" -> "GK". */
  private monogram(name: string): string {
    const words = name.replace(/[-_]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  /** Lights up role chips from the session's player list; feeds the climax ribbon. */
  private async pollState() {
    const res = await fetch(`${this.apiBase}/api/get_state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId })
    });
    const data = await res.json();
    if (!data || data.error) return;

    // heistComplete ('replica' | 'authentic' | false) + unlockedDoors drive the
    // ribbon from state, so a mid-heist reload still shows it.
    this.juice?.onState(data);

    if (!data.players) return;

    const players = data.players as SessionPlayer[];
    (Object.keys(ROLES) as Role[]).forEach((role) => {
      const chip = document.getElementById(`role-chip-${role}`);
      const sub = document.getElementById(`role-sub-${role}`);
      if (!chip || !sub) return;
      const seated = players.filter((p) => (p.role || '').toLowerCase() === role);
      if (seated.length > 0) {
        chip.dataset.state = 'seated';
        sub.textContent = seated.map((p) => p.name).join(', ');
      } else {
        chip.dataset.state = 'standby';
        sub.textContent = ROLES[role].subtitle;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Styles (injected once; tokens come from theme/tokens.css)
  // ---------------------------------------------------------------------------

  private ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STAGE_CSS;
    document.head.appendChild(style);
  }

  destroy() {
    this.teardownScene();
    this.stopPolling();
  }
}

const STAGE_CSS = `
  .he-stage {
    font-family: var(--he-font-ui);
    color: var(--he-ink-900);
    -webkit-font-smoothing: antialiased;
  }

  .he-ico {
    width: 1.1em;
    height: 1.1em;
    flex: none;
  }

  code {
    font-family: var(--he-font-mono);
  }

  button {
    font: inherit;
    color: inherit;
    cursor: pointer;
  }

  button:focus-visible,
  .copy-btn:focus-visible {
    outline: 2px solid var(--he-cyan-500);
    outline-offset: 2px;
  }

  /* ---------- Brand ---------- */

  .brand {
    display: flex;
    align-items: center;
    gap: var(--he-s-3);
    min-width: 0;
  }

  .brand-seal {
    display: grid;
    place-items: center;
    width: 2.4em;
    height: 2.4em;
    border-radius: 50%;
    color: var(--he-gold-700);
    background: radial-gradient(circle at 50% 35%, #fff 0%, var(--he-gold-100) 70%);
    box-shadow: inset 0 0 0 1px var(--he-hairline-gold), 0 2px 8px rgba(156, 122, 43, 0.18);
  }

  .brand-seal .he-ico {
    width: 1.3em;
    height: 1.3em;
  }

  .brand-text {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
    min-width: 0;
  }

  .brand-title {
    font-size: 1.15rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .brand-sub {
    font-size: 0.6rem;
    margin-top: 2px;
  }

  /* ---------- Session chip ---------- */

  .session-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--he-s-2);
    padding: 6px 12px;
    border-radius: var(--he-r-pill);
    box-shadow: var(--he-glass-shadow-soft);
    white-space: nowrap;
  }

  .session-chip code {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--he-ink-900);
  }

  .chip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--he-ink-300);
  }

  .chip-dot--live {
    background: var(--he-gold-500);
    box-shadow: 0 0 0 3px rgba(201, 162, 74, 0.22);
  }

  .chip-copy {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid var(--he-hairline-soft);
    background: rgba(255, 255, 255, 0.6);
    color: var(--he-ink-500);
    transition: background var(--he-dur-fast) var(--he-ease), color var(--he-dur-fast) var(--he-ease);
  }

  .chip-copy:hover { color: var(--he-gold-700); background: var(--he-gold-100); }
  .chip-copy.is-copied { color: var(--he-gold-700); border-color: var(--he-hairline-gold); }

  /* ---------- Lobby ---------- */

  .lobby {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    gap: clamp(12px, 1.6vh, 22px);
    padding: clamp(12px, 1.6vw, 26px) clamp(16px, 3vw, 56px);
    background:
      radial-gradient(60% 40% at 50% 0%, rgba(255, 255, 255, 0.9), transparent 70%),
      repeating-linear-gradient(90deg, transparent 0 46px, rgba(201, 162, 74, 0.05) 46px 47px),
      repeating-linear-gradient(0deg, transparent 0 46px, rgba(201, 162, 74, 0.05) 46px 47px),
      linear-gradient(180deg, var(--he-pearl-0), var(--he-pearl-2));
  }

  .lobby::before,
  .lobby::after {
    content: '';
    position: absolute;
    inset: clamp(8px, 1vw, 14px);
    border: 1px solid var(--he-hairline-gold);
    border-radius: var(--he-r-lg);
    pointer-events: none;
  }

  .lobby::after {
    inset: clamp(12px, 1.4vw, 20px);
    border-color: rgba(201, 162, 74, 0.25);
  }

  .lobby-top {
    display: flex;
    align-items: center;
    gap: var(--he-s-4);
    position: relative;
    z-index: 1;
  }

  .lobby-top .brand-title { font-size: 0.95rem; }
  .lobby-top .brand-sub { display: none; }
  .lobby-top .brand-seal { width: 2em; height: 2em; }

  .lobby-mode {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--he-gold-700);
  }

  .lobby-hero {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    justify-items: center;
    min-height: 0;
    position: relative;
    z-index: 1;
  }

  .lobby-title {
    font-size: clamp(2.6rem, 7.5vw, 6.5rem);
    line-height: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: center;
    filter: drop-shadow(0 4px 12px rgba(156, 122, 43, 0.22));
  }

  .lobby-rule {
    display: flex;
    align-items: center;
    gap: var(--he-s-3);
    margin: clamp(6px, 1vh, 12px) 0 clamp(10px, 1.8vh, 20px);
    color: var(--he-gold-700);
  }

  .lobby-rule .he-eyebrow { color: var(--he-gold-700); letter-spacing: 0.32em; }

  .lobby-rule::before,
  .lobby-rule::after {
    content: '';
    width: clamp(60px, 9vw, 160px);
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--he-gold-500));
  }

  .lobby-rule::after { background: linear-gradient(90deg, var(--he-gold-500), transparent); }

  .lobby-frame {
    width: min(100%, 68vw, 1100px);
    max-height: 100%;
    aspect-ratio: 32 / 13;
    padding: clamp(8px, 1vw, 16px);
    border-radius: var(--he-r-lg);
    color: var(--he-gold-700);
    background:
      radial-gradient(80% 90% at 50% 20%, rgba(255, 255, 255, 0.95), rgba(249, 239, 214, 0.35) 70%),
      var(--he-glass-bg);
    box-shadow: var(--he-glass-shadow), inset 0 0 0 1px rgba(255, 255, 255, 0.7);
    position: relative;
    overflow: hidden;
  }

  .lobby-frame::before {
    content: '';
    position: absolute;
    inset: 10px;
    border: 1px solid var(--he-hairline-cyan);
    border-radius: calc(var(--he-r-lg) - 8px);
    opacity: 0.5;
    pointer-events: none;
  }

  .facade {
    width: 100%;
    height: 100%;
    display: block;
  }

  .facade-sparkle { animation: he-twinkle 3.2s ease-in-out infinite; transform-origin: 320px 178px; }

  @keyframes he-twinkle {
    0%, 100% { opacity: 0.55; }
    50% { opacity: 1; }
  }

  /* Seat cards */

  .seat-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(10px, 1.4vw, 22px);
    position: relative;
    z-index: 1;
  }

  .seat-card {
    --seat-accent: var(--he-gold-500);
    --seat-hairline: var(--he-hairline-gold);
    --seat-glow: var(--he-glow-gold);
    --seat-tint: var(--he-gold-100);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: clamp(8px, 1vw, 16px);
    padding: clamp(10px, 1.1vw, 16px);
    border-radius: var(--he-r-lg);
    border-color: var(--seat-hairline);
    box-shadow: var(--seat-glow), var(--he-glass-shadow-soft);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.75), transparent 60%),
      var(--he-glass-bg-strong);
    transition: transform var(--he-dur) var(--he-ease), box-shadow var(--he-dur) var(--he-ease);
  }

  .seat-card:hover { transform: translateY(-2px); }

  .seat-card--examiner {
    --seat-accent: var(--he-cyan-700);
    --seat-hairline: var(--he-hairline-cyan);
    --seat-glow: var(--he-glow-cyan);
    --seat-tint: var(--he-cyan-100);
  }

  .seat-card--watch {
    --seat-accent: var(--he-magenta-700);
    --seat-hairline: var(--he-hairline-magenta);
    --seat-glow: var(--he-glow-magenta);
    --seat-tint: var(--he-magenta-100);
  }

  .seat-icon {
    display: grid;
    place-items: center;
    width: clamp(44px, 3.8vw, 64px);
    height: clamp(44px, 3.8vw, 64px);
    border-radius: 50%;
    color: var(--seat-accent);
    background: radial-gradient(circle at 50% 35%, #fff, var(--seat-tint));
    box-shadow: inset 0 0 0 1px var(--seat-hairline);
  }

  .seat-icon .he-ico { width: 48%; height: 48%; }

  .seat-body { min-width: 0; }

  .seat-title {
    font-family: var(--he-font-display);
    font-size: clamp(1rem, 1.35vw, 1.5rem);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--seat-accent);
    line-height: 1.1;
  }

  .seat-tagline {
    margin-top: 4px;
    font-size: clamp(0.72rem, 0.85vw, 0.9rem);
    color: var(--he-ink-500);
    line-height: 1.35;
  }

  .seat-hint { display: inline-block; margin-top: 8px; color: var(--he-ink-300); }

  .seat-copy,
  .cta-secondary,
  .ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 5px 10px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    border-radius: var(--he-r-pill);
    border: 1px solid var(--he-hairline-soft);
    background: rgba(255, 255, 255, 0.7);
    color: var(--he-ink-700);
    transition: border-color var(--he-dur-fast) var(--he-ease), background var(--he-dur-fast) var(--he-ease);
  }

  .seat-copy:hover { border-color: var(--seat-hairline); background: var(--seat-tint); }
  .seat-copy.is-copied { border-color: var(--seat-hairline); color: var(--seat-accent); }

  .seat-qr {
    width: clamp(72px, 7.2vw, 128px);
    aspect-ratio: 1;
    border-radius: var(--he-r-sm);
    overflow: hidden;
    background: #fff;
    box-shadow: inset 0 0 0 1px var(--seat-hairline);
    display: grid;
    place-items: center;
  }

  .seat-qr img,
  .hud-qr-img img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  .qr-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 4px;
    color: var(--he-ink-300);
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: center;
    background:
      repeating-linear-gradient(45deg, transparent 0 6px, rgba(31, 27, 21, 0.03) 6px 12px);
  }

  .qr-placeholder .he-ico { width: 34%; height: 34%; opacity: 0.6; }

  /* Lobby footer */

  .lobby-footer {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--he-s-5);
    padding: clamp(8px, 1vw, 14px) clamp(12px, 1.6vw, 24px);
    border-radius: var(--he-r-pill);
    position: relative;
    z-index: 1;
  }

  .lobby-start {
    display: flex;
    align-items: center;
    gap: var(--he-s-3);
  }

  .cta-start {
    display: inline-flex;
    align-items: center;
    gap: var(--he-s-3);
    padding: 6px 18px 6px 6px;
    border-radius: var(--he-r-pill);
    border: 1px solid var(--he-hairline-gold);
    background: linear-gradient(135deg, #fff, var(--he-gold-100));
    color: var(--he-ink-900);
    box-shadow: var(--he-glow-gold);
    text-align: left;
    transition: transform var(--he-dur-fast) var(--he-ease), box-shadow var(--he-dur-fast) var(--he-ease);
  }

  .cta-start:hover:not([disabled]) { transform: translateY(-1px); box-shadow: var(--he-glow-gold), var(--he-glass-shadow); }
  .cta-start:active:not([disabled]) { transform: translateY(0); }
  .cta-start[disabled] { cursor: default; opacity: 0.75; box-shadow: none; }

  .cta-play {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    color: var(--he-gold-700);
    background: radial-gradient(circle at 50% 40%, #fff, var(--he-gold-200));
    box-shadow: inset 0 0 0 1px var(--he-hairline-gold);
  }

  .cta-play .he-ico { width: 1.2em; height: 1.2em; fill: currentColor; }

  .cta-text { display: flex; flex-direction: column; line-height: 1.15; }
  .cta-text strong { font-family: var(--he-font-display); font-size: 1.05rem; letter-spacing: 0.1em; text-transform: uppercase; }
  .cta-text small { font-size: 0.7rem; color: var(--he-ink-500); }

  .cta-secondary { margin-top: 0; padding: 10px 16px; font-size: 0.78rem; border-color: var(--he-hairline-gold); }
  .cta-secondary:hover { background: var(--he-gold-100); }

  .lobby-tags {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--he-s-3);
    font-size: clamp(0.72rem, 0.9vw, 0.95rem);
    color: var(--he-ink-700);
    white-space: nowrap;
    overflow: hidden;
  }

  .tag-sep { width: 4px; height: 4px; border-radius: 50%; background: var(--he-gold-500); flex: none; }
  .tag-gold { color: var(--he-gold-700); font-style: italic; }

  .lobby-brandmark {
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 10px;
    text-align: right;
  }

  .brandmark-title {
    font-family: var(--he-font-display);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 0.95rem;
  }

  .lobby-brandmark .he-eyebrow { grid-column: 1; font-size: 0.55rem; }
  .brandmark-sparkle { grid-column: 2; grid-row: 1 / span 2; color: var(--he-gold-500); font-size: 1.3rem; }

  .ghost-btn { margin-top: 0; padding: 8px 12px; }
  .ghost-btn:hover { border-color: var(--he-hairline-gold); background: var(--he-gold-100); }

  /* Lobby as an overlay on top of the live stage */

  .lobby-overlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    overflow: auto;
    background: rgba(253, 252, 249, 0.9);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    animation: he-fade var(--he-dur) var(--he-ease);
  }

  .lobby-overlay[hidden] { display: none; }
  .lobby--overlay { min-height: 100%; background: transparent; }

  @keyframes he-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* ---------- Live stage ---------- */

  .he-stage.is-live,
  .live {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--he-night-900);
  }

  .scene-container {
    position: absolute;
    inset: 0;
  }

  #stage-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  /* Cinematic vignette: darkens only the edge bands the HUD sits in, so dark
     glass panels feel embedded in the room while the 3D centre stays bright. */
  .scene-container::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(180deg, rgba(7, 10, 16, 0.42), transparent 16%, transparent 80%, rgba(7, 10, 16, 0.5)),
      linear-gradient(90deg, rgba(7, 10, 16, 0.32), transparent 20%, transparent 80%, rgba(7, 10, 16, 0.32));
  }

  .hud {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: var(--he-hud-side-w) minmax(0, 1fr) var(--he-hud-side-w);
    grid-template-rows: var(--he-hud-top-h) minmax(0, 1fr) auto var(--he-hud-bottom-h);
    grid-template-areas:
      'top top top'
      'ticker . roles'
      'room . .'
      'bottom bottom bottom';
    gap: var(--he-hud-gap);
    padding: var(--he-hud-gap);
    pointer-events: none;
  }

  /*
   * Dark-glass remap (VIS-C). Custom properties inherit, so redefining the
   * generic surface / ink / hairline tokens here flips every .he-glass,
   * .he-eyebrow and .he-gold-text inside the HUD (and the juice overlays) to the
   * night palette from the concept still, with zero markup changes. Inside this
   * subtree "ink" means ivory and the *-700 accents mean "text-safe on dark".
   */
  .hud,
  .scene-container.hj-root {
    color: var(--he-on-dark-900);
    --he-ink-900: var(--he-on-dark-900);
    --he-ink-700: var(--he-on-dark-700);
    --he-ink-500: var(--he-on-dark-500);
    --he-ink-300: var(--he-on-dark-300);
    --he-glass-bg: var(--he-glass-dark-bg);
    --he-glass-bg-strong: var(--he-glass-dark-bg-strong);
    --he-glass-shadow: var(--he-glass-dark-shadow);
    --he-glass-shadow-soft: var(--he-glass-dark-shadow-soft);
    --he-hairline-soft: var(--he-hairline-dark);
    --he-hairline-gold: var(--he-hairline-gold-dark);
    --he-hairline-cyan: var(--he-hairline-ice);
    --he-hairline-magenta: var(--he-hairline-magenta-dark);
    --he-glow-gold: var(--he-glow-gold-dark);
    --he-glow-cyan: var(--he-glow-ice);
    --he-glow-magenta: var(--he-glow-magenta-dark);
    --he-gold-700: var(--he-gold-on-dark);
    --he-gold-900: var(--he-gold-on-dark);
    --he-cyan-700: var(--he-ice-300);
    --he-cyan-500: var(--he-ice-500);
    --he-magenta-700: var(--he-magenta-300);
    /* Pastel fills become translucent washes over the glass. (The --he-*-100
       tokens are left alone: .he-gold-text uses them as gradient stops.) */
    --hud-tint-neutral: rgba(255, 255, 255, 0.07);
    --hud-tint-gold: rgba(232, 200, 120, 0.16);
    --hud-tint-gold-strong: rgba(232, 200, 120, 0.3);
    --hud-tint-cyan: rgba(140, 222, 240, 0.16);
    --hud-tint-magenta: rgba(240, 182, 214, 0.16);
    --hud-scrollbar: rgba(255, 255, 255, 0.18);
  }

  .hud > * { pointer-events: auto; }

  .hud .he-glass {
    background-image: var(--he-glass-dark-sheen);
    box-shadow: var(--he-glass-shadow-soft);
  }

  /* Shared chrome primitives on dark glass */
  .hud .brand-seal {
    color: var(--he-gold-on-dark);
    background: radial-gradient(circle at 50% 35%, rgba(232, 200, 120, 0.3), rgba(232, 200, 120, 0.05) 72%);
    box-shadow: inset 0 0 0 1px var(--he-hairline-gold-dark), 0 0 14px rgba(232, 200, 120, 0.22);
  }

  .hud .brand-title {
    font-size: 1.25rem;
    letter-spacing: 0.1em;
    filter: drop-shadow(0 0 10px rgba(240, 214, 140, 0.35));
  }

  .hud .brand-sub { color: var(--he-gold-on-dark-deep); letter-spacing: 0.2em; }

  .hud .chip-copy {
    background: rgba(255, 255, 255, 0.06);
    color: var(--he-on-dark-500);
  }

  .hud .chip-copy:hover,
  .hud .chip-copy.is-copied { color: var(--he-gold-on-dark); background: var(--hud-tint-gold); }

  .hud .empty-state { color: var(--he-on-dark-500); }

  /* Top bar */

  .hud-top {
    grid-area: top;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--he-hud-gap);
    min-height: 0;
  }

  .hud-brand {
    display: flex;
    align-items: center;
    gap: var(--he-s-4);
    height: 100%;
    padding: 0 var(--he-s-4) 0 var(--he-s-3);
    border-radius: var(--he-r-pill);
    border-color: var(--he-hairline-gold);
  }

  .live-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px 5px 10px;
    border-radius: var(--he-r-pill);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--he-gold-on-dark);
    background: linear-gradient(135deg, var(--hud-tint-gold), var(--hud-tint-gold-strong));
    box-shadow: inset 0 0 0 1px var(--he-hairline-gold-dark), 0 0 14px rgba(232, 200, 120, 0.2);
  }

  .hud-session {
    justify-self: center;
    display: inline-flex;
    align-items: center;
    gap: var(--he-s-2);
    height: 100%;
    padding: 0 var(--he-s-3) 0 var(--he-s-4);
    border-radius: var(--he-r-pill);
    color: var(--he-ink-700);
  }

  .hud-session code { font-size: 0.9rem; font-weight: 600; color: var(--he-ink-900); letter-spacing: 0.04em; }
  .hud-session-sep { width: 4px; height: 4px; border-radius: 50%; background: var(--he-gold-500); box-shadow: 0 0 6px rgba(232, 200, 120, 0.6); }

  /* Status pill on the right, ice-bordered like the still's STAGE / EXAMINE readout. */
  .hud-tools {
    display: flex;
    align-items: center;
    gap: var(--he-s-2);
    height: 100%;
    padding: 0 var(--he-s-2) 0 var(--he-s-4);
    border-radius: var(--he-r-pill);
    border-color: var(--he-hairline-ice);
  }

  .hud-stat {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding-right: var(--he-s-3);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--he-ink-500);
    border-right: 1px solid var(--he-hairline-soft);
  }

  .hud-stat .he-ico { color: var(--he-ice-300); }
  .hud-stat:last-of-type { padding-right: var(--he-s-2); }

  /* Round ice-ringed controls, the INSPECT / INSIGHTS / LOG buttons of the still
     mapped onto the Stage's real controls (QR lobby, fullscreen, end). */
  .tool-btn {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid var(--he-hairline-ice);
    background: var(--hud-tint-neutral);
    color: var(--he-ice-300);
    box-shadow: 0 0 10px rgba(140, 222, 240, 0.12);
    transition: background var(--he-dur-fast) var(--he-ease), color var(--he-dur-fast) var(--he-ease), border-color var(--he-dur-fast) var(--he-ease), box-shadow var(--he-dur-fast) var(--he-ease);
  }

  .tool-btn:hover { background: var(--hud-tint-cyan); box-shadow: var(--he-glow-ice); color: var(--he-ice-100); }
  .tool-btn--danger { border-color: var(--he-hairline-dark); color: var(--he-on-dark-500); box-shadow: none; }
  .tool-btn--danger:hover { background: var(--hud-tint-magenta); border-color: var(--he-hairline-magenta-dark); box-shadow: var(--he-glow-magenta-dark); color: var(--he-magenta-300); }

  /* Left action ticker */

  .hud-ticker {
    grid-area: ticker;
    align-self: start;
    display: flex;
    flex-direction: column;
    min-height: min(40%, 320px);
    max-height: min(100%, 68vh);
    overflow: hidden;
    border-color: var(--he-hairline-ice);
  }

  .hud .hud-ticker { box-shadow: var(--he-glass-shadow-soft), 0 0 22px rgba(140, 222, 240, 0.14); }

  .ticker-head,
  .ticker-foot {
    display: flex;
    align-items: center;
    gap: var(--he-s-2);
    padding: var(--he-s-3) var(--he-s-4);
    flex: none;
  }

  .ticker-head { border-bottom: 1px solid var(--he-hairline-soft); }
  .ticker-foot { border-top: 1px solid var(--he-hairline-soft); padding-block: var(--he-s-2); }
  .ticker-foot .he-eyebrow { font-size: 0.6rem; }

  .ticker-title { display: inline-flex; align-items: center; gap: var(--he-s-2); color: var(--he-ice-300); }
  .ticker-title .he-eyebrow { font-family: var(--he-font-display); font-size: 0.78rem; font-weight: 700; color: var(--he-gold-on-dark); }

  .ticker-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--he-s-2) var(--he-s-3);
    display: flex;
    flex-direction: column;
    gap: var(--he-s-2);
    scrollbar-width: thin;
    scrollbar-color: var(--hud-scrollbar) transparent;
  }

  .tick-item {
    --tick-accent: var(--he-on-dark-500);
    --tick-tint: var(--hud-tint-neutral);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--he-s-3);
    align-items: start;
    padding: var(--he-s-2) var(--he-s-3);
    border-radius: var(--he-r-sm);
    background: rgba(255, 255, 255, 0.04);
    box-shadow: inset 0 0 0 1px var(--he-hairline-dark);
    animation: he-slide-in var(--he-dur) var(--he-ease);
  }

  .tick-item--gold { --tick-accent: var(--he-gold-on-dark); --tick-tint: var(--hud-tint-gold); }
  .tick-item--cyan { --tick-accent: var(--he-ice-300); --tick-tint: var(--hud-tint-cyan); }

  .tick-icon {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    color: var(--tick-accent);
    background: var(--tick-tint);
    box-shadow: inset 0 0 0 1px var(--he-hairline-dark);
    margin-top: 1px;
  }

  .tick-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }

  .tick-meta {
    display: flex;
    align-items: baseline;
    gap: var(--he-s-2);
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--he-ink-500);
  }

  .tick-meta time { font-family: var(--he-font-mono); font-size: 0.66rem; }
  .tick-meta b { color: var(--he-ink-900); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .tick-text {
    font-size: 0.8rem;
    color: var(--he-ink-700);
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @keyframes he-slide-in {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* Right role status */

  .hud-roles {
    grid-area: roles;
    justify-self: end;
    display: flex;
    flex-direction: column;
    gap: var(--he-hud-gap);
    width: 100%;
    max-width: 260px;
  }

  .role-chip {
    --role-accent: var(--he-gold-on-dark);
    --role-hairline: var(--he-hairline-gold-dark);
    --role-tint: var(--hud-tint-gold);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--he-s-3);
    padding: var(--he-s-3) var(--he-s-4);
    border-color: var(--role-hairline);
  }

  .role-chip--examiner { --role-accent: var(--he-ice-300); --role-hairline: var(--he-hairline-ice); --role-tint: var(--hud-tint-cyan); }
  .role-chip--watch { --role-accent: var(--he-magenta-300); --role-hairline: var(--he-hairline-magenta-dark); --role-tint: var(--hud-tint-magenta); }

  .role-icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: var(--role-accent);
    background: radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.12), var(--role-tint));
    box-shadow: inset 0 0 0 1px var(--role-hairline);
  }

  .role-text { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
  .role-title { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--he-ink-900); }
  .role-sub { font-size: 0.66rem; color: var(--he-ink-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .role-state {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--he-on-dark-300);
    opacity: 0.8;
  }

  .role-chip[data-state='seated'] .role-state { background: var(--role-accent); opacity: 1; box-shadow: 0 0 0 3px var(--role-tint), 0 0 10px var(--role-accent); }
  .role-chip[data-state='seated'] .role-sub { color: var(--role-accent); font-weight: 600; }

  /* Room label above the strip: gold-bordered readout, like the still's status pill */

  .hud-room {
    grid-area: room;
    justify-self: start;
    align-self: end;
    padding: 7px 16px;
    border-radius: var(--he-r-pill);
    font-family: var(--he-font-display);
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--he-gold-on-dark);
    border-color: var(--he-hairline-gold-dark);
  }

  .hud .hud-room { box-shadow: var(--he-glass-shadow-soft), 0 0 18px rgba(232, 200, 120, 0.16); }

  /* Bottom inventory strip */

  .hud-bottom {
    grid-area: bottom;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--he-hud-gap);
    min-height: 0;
  }

  .inv-summary {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
    padding: 0 var(--he-s-5);
    color: var(--he-ink-700);
    border-color: var(--he-hairline-gold);
  }

  .inv-summary .he-ico { width: 1.5em; height: 1.5em; color: var(--he-gold-on-dark); filter: drop-shadow(0 0 6px rgba(232, 200, 120, 0.4)); }
  .inv-summary strong { font-size: 1.15rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--he-on-dark-900); }
  .inv-summary strong small { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--he-ink-500); }

  .inv-strip {
    display: flex;
    align-items: stretch;
    gap: var(--he-s-3);
    padding: var(--he-s-3);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: var(--hud-scrollbar) transparent;
  }

  .inv-strip .empty-state { align-self: center; margin: 0 auto; }

  .inv-tile {
    flex: none;
    width: clamp(88px, 7.5vw, 124px);
    display: grid;
    grid-template-rows: 1fr auto auto;
    justify-items: center;
    align-items: center;
    gap: 3px;
    padding: var(--he-s-2);
    border-radius: var(--he-r-sm);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
    box-shadow: inset 0 0 0 1px var(--he-hairline-dark);
    animation: he-rise var(--he-dur) var(--he-ease);
  }

  .inv-tile.is-latest { box-shadow: var(--he-glow-gold-dark); background: linear-gradient(180deg, var(--hud-tint-gold), rgba(255, 255, 255, 0.03)); }

  .inv-glyph {
    font-family: var(--he-font-display);
    font-weight: 700;
    font-size: clamp(1rem, 1.5vw, 1.5rem);
    letter-spacing: 0.04em;
    color: var(--he-gold-on-dark);
    background: radial-gradient(circle at 50% 35%, var(--hud-tint-gold-strong), rgba(232, 200, 120, 0.04));
    width: 2.2em;
    height: 2.2em;
    display: grid;
    place-items: center;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px var(--he-hairline-gold-dark);
  }

  .inv-name {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-align: center;
    color: var(--he-ink-900);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .inv-by { font-size: 0.6rem; color: var(--he-ink-500); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  @keyframes he-rise {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .hud-qr {
    display: grid;
    grid-template-columns: auto auto;
    align-items: center;
    gap: var(--he-s-4);
    padding: var(--he-s-2) var(--he-s-2) var(--he-s-2) var(--he-s-5);
  }

  .hud-qr-text { display: flex; flex-direction: column; gap: 2px; text-align: right; }
  .hud-qr-title { font-family: var(--he-font-display); font-weight: 700; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--he-gold-on-dark); }

  /* QR stays on solid white: phone cameras need the contrast, glass does not. */
  .hud-qr-img {
    height: 100%;
    aspect-ratio: 1;
    max-height: calc(var(--he-hud-bottom-h) - var(--he-s-4));
    border-radius: var(--he-r-xs);
    background: #fff;
    overflow: hidden;
    box-shadow: 0 0 0 1px var(--he-hairline-gold-dark), 0 0 14px rgba(232, 200, 120, 0.2);
  }

  .empty-state {
    color: var(--he-ink-300);
    font-size: 0.78rem;
    font-style: italic;
    text-align: center;
    padding: var(--he-s-4);
  }

  /* Module C overlays (juice.css) mount inside .scene-container. Map their
     placement tokens onto the HUD grid so toasts sit below the top bar, the
     examine card clears the ticker column and the ribbon rides above the
     inventory strip. Palette tokens are pointed at the shared theme. */

  .scene-container.hj-root {
    --hj-ink: var(--he-on-dark-900);
    --hj-muted: var(--he-on-dark-500);
    --hj-glass: var(--he-glass-dark-bg-strong);
    --hj-glass-edge: var(--he-hairline-dark);
    --hj-glass-sheen: var(--he-glass-dark-sheen);
    --hj-gold-text: var(--he-gold-on-dark);
    --hj-gold-edge: var(--he-hairline-gold-dark);
    --hj-cyan: var(--he-ice-500);
    --hj-cyan-deep: var(--he-ice-700);
    --hj-cyan-text: var(--he-ice-300);
    --hj-cyan-edge: var(--he-hairline-ice);
    --hj-font-display: var(--he-font-display);
    --hj-shadow: var(--he-glass-dark-shadow);
    --hj-toast-top: calc(var(--he-hud-top-h) + var(--he-hud-gap) * 2);
    --hj-examine-left: calc(var(--he-hud-side-w) + var(--he-hud-gap) * 2);
    --hj-examine-top: calc(var(--he-hud-top-h) + var(--he-hud-gap) * 2);
    --hj-ribbon-bottom: calc(var(--he-hud-bottom-h) + var(--he-hud-gap) * 2);
  }

  /* ---------- Reduced motion ---------- */

  @media (prefers-reduced-motion: reduce) {
    .tick-item,
    .inv-tile,
    .lobby-overlay,
    .facade-sparkle {
      animation: none;
    }
    .seat-card:hover,
    .cta-start:hover:not([disabled]) {
      transform: none;
    }
  }

  /* ---------- Responsive ---------- */

  @media (max-width: 1100px) {
    .seat-grid { grid-template-columns: 1fr; }
    .seat-card { grid-template-columns: auto minmax(0, 1fr) auto; }
    .lobby-frame { width: min(100%, 92vw); }
    .lobby-footer { grid-template-columns: 1fr; justify-items: center; border-radius: var(--he-r-lg); }
    .lobby-tags { white-space: normal; text-align: center; }
    .lobby-brandmark { display: none; }
  }

  @media (max-width: 900px) {
    :root {
      --he-hud-side-w: min(240px, 62vw);
      --he-hud-bottom-h: 96px;
    }

    .hud {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr) auto var(--he-hud-bottom-h);
      grid-template-areas:
        'top'
        'ticker'
        'room'
        'bottom';
    }

    .hud-top { grid-template-columns: minmax(0, 1fr) auto; }
    .hud-brand { min-width: 0; gap: var(--he-s-2); }
    .hud-brand .brand-text { overflow: hidden; }
    .hud-brand .brand-title { overflow: hidden; text-overflow: ellipsis; }
    .hud-session { display: none; }
    .hud-stat { display: none; }
    .hud-tools { padding-left: var(--he-s-2); }
    .brand-sub { display: none; }
    .brand-title { font-size: 0.95rem; }

    .hud-ticker { width: var(--he-hud-side-w); max-height: 42vh; align-self: start; }
    .hud-roles { display: none; }
    .hud-bottom { grid-template-columns: auto minmax(0, 1fr); }
    .hud-qr { display: none; }
    .inv-summary { padding: 0 var(--he-s-3); }

    /* Ticker spans the full width on narrow screens; drop the examine card below it. */
    .scene-container.hj-root {
      --hj-examine-left: var(--he-hud-gap);
      --hj-examine-top: calc(var(--he-hud-top-h) + 42vh + var(--he-hud-gap) * 3);
    }

    .lobby-mode { display: none; }
    .lobby-top .session-chip { margin-left: auto; }
  }

  @media (max-width: 560px) {
    .seat-card { grid-template-columns: auto minmax(0, 1fr); }
    .seat-qr { grid-column: 1 / -1; width: min(100%, 160px); justify-self: center; }
    .live-pill { font-size: 0; gap: 0; padding: 8px; }
    .hud-tools { gap: var(--he-s-1); }
    .lobby-frame { aspect-ratio: 16 / 9; }
    .session-chip .he-eyebrow { display: none; }
  }
`;
