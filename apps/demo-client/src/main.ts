import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MCPClient } from './mcp-client';
import { SceneManager } from './scene-manager';

interface GameState {
  currentRoom: number;
  players: Array<{ name: string; role: string }>;
  inventory: Array<{ item: string; takenBy: string }>;
  recentActions: Array<{ player: string; action: string; result: string; timestamp: number }>;
}

class HeistEscapeClient {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private mcpClient: MCPClient;
  private sceneManager: SceneManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredObject: THREE.Object3D | null = null;
  
  private sessionId: string = '';
  private playerId: string = '';
  private currentRoom: number = 1;
  
  private interactableObjects: Map<string, THREE.Object3D> = new Map();
  
  constructor() {
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f7fa);
    this.scene.fog = new THREE.Fog(0xf5f7fa, 20, 50);
    
    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);
    
    // Renderer setup
    const canvas = document.getElementById('scene') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    
    // Raycaster for object interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // MCP Client
    this.mcpClient = new MCPClient();
    
    // Scene Manager
    this.sceneManager = new SceneManager(this.scene);
    
    this.setupLighting();
    this.setupEventListeners();
    this.setupUI();
    this.animate();
    
    // Hide loading screen after scene setup
    setTimeout(() => {
      const loading = document.getElementById('loading');
      if (loading) loading.style.display = 'none';
    }, 1000);
  }
  
  private setupLighting(): void {
    // Bright light theme
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Main hemisphere light for outdoor feel
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 0.8);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);
    
    // Directional light with shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);
    
    // Warm fill light
    const fillLight = new THREE.DirectionalLight(0xfff5e6, 0.4);
    fillLight.position.set(-5, 10, -5);
    this.scene.add(fillLight);
  }
  
  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('click', (e) => this.onClick(e));
  }
  
  private setupUI(): void {
    const joinBtn = document.getElementById('join-btn');
    joinBtn?.addEventListener('click', () => this.joinSession());
    
    const closeExamine = document.getElementById('close-examine');
    closeExamine?.addEventListener('click', () => {
      const panel = document.getElementById('examine-panel');
      panel?.classList.remove('visible');
    });
  }
  
  private async joinSession(): Promise<void> {
    const sessionInput = document.getElementById('session-input') as HTMLInputElement;
    const playerInput = document.getElementById('player-input') as HTMLInputElement;
    const roleInput = document.getElementById('role-input') as HTMLSelectElement;
    
    this.sessionId = sessionInput.value;
    this.playerId = playerInput.value;
    const role = roleInput.value;
    
    if (!this.sessionId || !this.playerId) {
      alert('Please enter session ID and player name');
      return;
    }
    
    try {
      const result = await this.mcpClient.joinSession(this.sessionId, this.playerId, role);
      console.log('Joined session:', result);
      
      // Update UI
      const status = document.getElementById('connection-status');
      status?.classList.remove('disconnected');
      
      // Disable inputs
      sessionInput.disabled = true;
      playerInput.disabled = true;
      roleInput.disabled = true;
      
      // Load initial room
      await this.loadRoom();
      
      // Start polling for updates
      this.startPolling();
    } catch (error) {
      console.error('Failed to join session:', error);
      alert('Failed to join session. Make sure the MCP server is running.');
    }
  }
  
  private async loadRoom(): Promise<void> {
    try {
      const roomData = await this.mcpClient.lookAround(this.sessionId, this.playerId);
      console.log('Room data:', roomData);
      
      this.currentRoom = roomData.room.id;
      
      // Update room title
      const roomTitle = document.getElementById('room-title');
      if (roomTitle) roomTitle.textContent = roomData.room.name;
      
      // Build 3D room
      this.sceneManager.buildRoom(roomData.room, roomData.objects);
      
      // Register interactable objects
      this.interactableObjects.clear();
      this.sceneManager.getInteractableObjects().forEach((obj, name) => {
        this.interactableObjects.set(name, obj);
      });
      
      // Update inventory
      await this.updateInventory();
    } catch (error) {
      console.error('Failed to load room:', error);
    }
  }
  
  private async updateInventory(): Promise<void> {
    try {
      const inventory = await this.mcpClient.getInventory(this.sessionId);
      const inventoryList = document.getElementById('inventory-list');
      
      if (!inventoryList) return;
      
      if (inventory.items.length === 0) {
        inventoryList.innerHTML = '<div class="inventory-empty">No items yet...</div>';
      } else {
        inventoryList.innerHTML = inventory.items.map(item =>
          `<div class="inventory-item">${item.item}<br><small>by ${item.takenBy}</small></div>`
        ).join('');
      }
    } catch (error) {
      console.error('Failed to update inventory:', error);
    }
  }
  
  private async updateActionLog(): Promise<void> {
    try {
      const actions = await this.mcpClient.getRecentActions(this.sessionId, 5);
      const actionList = document.getElementById('action-list');
      
      if (!actionList) return;
      
      actionList.innerHTML = actions.actions.slice(-5).map(action => {
        const time = new Date(action.timestamp).toLocaleTimeString();
        return `<div class="action-entry">
          <span class="player">${action.player}</span> ${action.action}
          <span class="timestamp">${time}</span>
          <br><small>${action.result}</small>
        </div>`;
      }).join('');
      
      // Auto-scroll to bottom
      actionList.scrollTop = actionList.scrollHeight;
    } catch (error) {
      console.error('Failed to update action log:', error);
    }
  }
  
  private startPolling(): void {
    // Poll for state updates every 2 seconds
    setInterval(async () => {
      await this.updateInventory();
      await this.updateActionLog();
    }, 2000);
  }
  
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Raycast to check for hoverable objects
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      Array.from(this.interactableObjects.values()),
      true
    );
    
    const hoverHint = document.getElementById('hover-hint');
    
    if (intersects.length > 0) {
      const object = intersects[0].object;
      
      if (this.hoveredObject !== object) {
        this.hoveredObject = object;
        document.body.style.cursor = 'pointer';
        
        // Show hint
        if (hoverHint) {
          hoverHint.style.left = event.clientX + 'px';
          hoverHint.style.top = (event.clientY - 40) + 'px';
          hoverHint.classList.add('visible');
        }
      }
    } else {
      this.hoveredObject = null;
      document.body.style.cursor = 'default';
      
      if (hoverHint) {
        hoverHint.classList.remove('visible');
      }
    }
  }
  
  private async onClick(event: MouseEvent): Promise<void> {
    if (!this.sessionId || !this.playerId) return;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      Array.from(this.interactableObjects.values()),
      true
    );
    
    if (intersects.length > 0) {
      const object = intersects[0].object;
      
      // Find the object name
      let objectName = '';
      for (const [name, obj] of this.interactableObjects) {
        if (obj === object || obj.children.includes(object)) {
          objectName = name;
          break;
        }
      }
      
      if (objectName) {
        await this.examineObject(objectName);
      }
    }
  }
  
  private async examineObject(objectName: string): Promise<void> {
    try {
      const result = await this.mcpClient.examineObject(this.sessionId, this.playerId, objectName);
      
      const examinePanel = document.getElementById('examine-panel');
      const examineContent = document.getElementById('examine-content');
      
      if (examinePanel && examineContent) {
        examineContent.innerHTML = `
          <h3 style="margin-bottom: 12px; color: #1a202c;">${result.object.name}</h3>
          <p style="line-height: 1.6; margin-bottom: 12px;">${result.object.full_description}</p>
          ${result.object.interaction_hints ? 
            `<p style="font-style: italic; color: #4a5568; margin-bottom: 12px;">💡 ${result.object.interaction_hints}</p>` 
            : ''
          }
          ${result.specialInfo ? 
            `<div style="background: #c6f6d5; padding: 12px; border-radius: 6px; border-left: 3px solid #48bb78; margin-bottom: 12px;">
              <strong>🔍 Discovery:</strong> ${result.specialInfo}
            </div>`
            : ''
          }
        `;
        examinePanel.classList.add('visible');
      }
      
      // Pulse the object
      const object = this.interactableObjects.get(objectName);
      if (object) {
        this.sceneManager.pulseObject(object);
      }
      
      await this.updateActionLog();
    } catch (error) {
      console.error('Failed to examine object:', error);
      alert('Could not examine that object');
    }
  }
  
  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    this.controls.update();
    this.sceneManager.update();
    
    this.renderer.render(this.scene, this.camera);
  };
}

// Initialize the game
new HeistEscapeClient();
