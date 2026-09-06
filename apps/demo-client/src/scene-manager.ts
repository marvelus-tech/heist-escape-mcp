import * as THREE from 'three';

interface Room {
  id: number;
  name: string;
  description: string;
  atmosphere: string;
}

interface GameObject {
  id: number;
  name: string;
  short_description: string;
  room_id: number;
}

/**
 * Scene Manager for Heist Escape
 * 
 * Builds premium museum-themed 3D dioramas for each room
 * Light theme: white/marble, warm brass, soft wood, paper documents
 * Hemisphere + warm key + cool rim lighting
 */
export class SceneManager {
  private scene: THREE.Scene;
  private interactableObjects: Map<string, THREE.Object3D> = new Map();
  private pulsingObjects: Map<THREE.Object3D, { startTime: number; duration: number }> = new Map();
  private lights: THREE.Light[] = [];
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  buildRoom(room: Room, objects: GameObject[]): void {
    // Clear previous room
    this.clearScene();
    
    // Setup premium museum lighting
    this.setupLighting(room.id);
    
    // Build floor
    this.buildFloor();
    
    // Build walls based on room
    this.buildWalls(room.id);
    
    // Add objects
    objects.forEach(obj => {
      this.addRoomObject(obj);
    });
  }
  
  private setupLighting(roomId: number): void {
    // Clear existing lights
    this.lights.forEach(light => this.scene.remove(light));
    this.lights = [];
    
    // Hemisphere light (soft ambient)
    const hemisphere = new THREE.HemisphereLight(
      0xffffff, // sky: pure white
      0xf5f0e8, // ground: warm paper
      0.6
    );
    this.scene.add(hemisphere);
    this.lights.push(hemisphere);
    
    // Warm key light (main directional)
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 0.8);
    keyLight.position.set(5, 8, 4);
    keyLight.castShadow = true;
    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);
    this.lights.push(keyLight);
    
    // Cool rim light (subtle depth)
    const rimLight = new THREE.DirectionalLight(0xe6f2ff, 0.3);
    rimLight.position.set(-4, 6, -6);
    this.scene.add(rimLight);
    this.lights.push(rimLight);
    
    // Room-specific accent lighting
    if (roomId === 1) {
      // Museum lobby: warm spotlights
      const spot1 = new THREE.SpotLight(0xfff4e6, 0.4, 12, Math.PI / 6, 0.3);
      spot1.position.set(-3, 7, 0);
      spot1.target.position.set(-3, 0, 0);
      spot1.castShadow = true;
      this.scene.add(spot1);
      this.scene.add(spot1.target);
      this.lights.push(spot1);
      
      const spot2 = new THREE.SpotLight(0xfff4e6, 0.4, 12, Math.PI / 6, 0.3);
      spot2.position.set(3, 7, 0);
      spot2.target.position.set(3, 0, 0);
      spot2.castShadow = true;
      this.scene.add(spot2);
      this.scene.add(spot2.target);
      this.lights.push(spot2);
    }
  }
  
  private clearScene(): void {
    // Remove all objects except lights
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
        objectsToRemove.push(child);
      }
    });
    
    objectsToRemove.forEach(obj => {
      this.scene.remove(obj);
    });
    
    this.interactableObjects.clear();
  }
  
  private buildFloor(): void {
    // Premium marble-like floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xfafafa, // Pure white marble
      roughness: 0.3,
      metalness: 0.05,
      envMapIntensity: 0.5
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Subtle floor grid (barely visible)
    const gridHelper = new THREE.GridHelper(20, 20, 0xf0f0f0, 0xf8f8f8);
    gridHelper.position.y = 0.01;
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }
  
  private buildWalls(roomId: number): void {
    // Museum walls: clean white with subtle texture
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.02
    });
    
    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(20, 8, 0.5),
      wallMaterial
    );
    backWall.position.set(0, 4, -10);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    this.scene.add(backWall);
    
    // Side walls
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 8, 20),
      wallMaterial
    );
    leftWall.position.set(-10, 4, 0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    this.scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 8, 20),
      wallMaterial
    );
    rightWall.position.set(10, 4, 0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    this.scene.add(rightWall);
    
    // Add brass/wood accents
    this.addRoomAccents(roomId);
  }
  
  private addRoomAccents(roomId: number): void {
    // Add brass/wood accents based on room
    switch (roomId) {
      case 1: // Museum Lobby
        this.addBrassWindow(-8, 5, -9.8);
        this.addBrassWindow(0, 5, -9.8);
        this.addBrassWindow(8, 5, -9.8);
        this.addWoodTrim(-9.5, 2, 0); // Crown molding left
        this.addWoodTrim(9.5, 2, 0); // Crown molding right
        break;
      case 2: // Gallery A
        this.addSpotlight(-5, 7, 2, 0xfff4e6);
        this.addSpotlight(5, 7, 2, 0xfff4e6);
        break;
      case 3: // Archives
        this.addBookshelf(-9, 2, -5);
        this.addBookshelf(-9, 2, 5);
        break;
      case 4: // Vault Access
        // Minimalist corridor feel
        break;
      case 5: // Vault
        this.addVaultRack(-8, 1, -5);
        this.addVaultRack(8, 1, -5);
        break;
    }
  }
  
  private addBrassWindow(x: number, y: number, z: number): void {
    const group = new THREE.Group();
    
    // Glass pane
    const glassGeometry = new THREE.PlaneGeometry(1.8, 2.8);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe6f3ff,
      transparent: true,
      opacity: 0.4,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.7
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.z = 0.05;
    group.add(glass);
    
    // Brass frame
    const brassMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8860b, // Dark goldenrod brass
      roughness: 0.3,
      metalness: 0.9
    });
    
    const frameThickness = 0.08;
    const frameDepth = 0.1;
    
    // Top frame
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2, frameThickness, frameDepth),
      brassMaterial
    );
    topFrame.position.y = 1.4;
    group.add(topFrame);
    
    // Bottom frame
    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2, frameThickness, frameDepth),
      brassMaterial
    );
    bottomFrame.position.y = -1.4;
    group.add(bottomFrame);
    
    // Left frame
    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, 2.8, frameDepth),
      brassMaterial
    );
    leftFrame.position.x = -0.9;
    group.add(leftFrame);
    
    // Right frame
    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, 2.8, frameDepth),
      brassMaterial
    );
    rightFrame.position.x = 0.9;
    group.add(rightFrame);
    
    group.position.set(x, y, z);
    this.scene.add(group);
  }
  
  private addWoodTrim(x: number, y: number, z: number): void {
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8956a, // Warm oak
      roughness: 0.7,
      metalness: 0.05
    });
    
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.3, 20),
      woodMaterial
    );
    trim.position.set(x, y, z);
    this.scene.add(trim);
  }
  
  private addSpotlight(x: number, y: number, z: number, color: number = 0xffffff): void {
    const spot = new THREE.SpotLight(color, 0.5, 15, Math.PI / 6, 0.5);
    spot.position.set(x, y, z);
    spot.target.position.set(x, 0, z);
    spot.castShadow = true;
    this.scene.add(spot);
    this.scene.add(spot.target);
    this.lights.push(spot);
  }
  
  private addBookshelf(x: number, y: number, z: number): void {
    const shelfGroup = new THREE.Group();
    
    const shelfMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.7
    });
    
    // Shelf frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 4, 3),
      shelfMaterial
    );
    shelfGroup.add(frame);
    
    shelfGroup.position.set(x, y, z);
    this.scene.add(shelfGroup);
  }
  
  private addVaultRack(x: number, y: number, z: number): void {
    const rackMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.8,
      roughness: 0.3
    });
    
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 2, 2),
      rackMaterial
    );
    rack.position.set(x, y, z);
    this.scene.add(rack);
  }
  
  private addRoomObject(obj: GameObject): void {
    const position = this.getObjectPosition(obj.name);
    const mesh = this.createObjectMesh(obj.name);
    
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    this.scene.add(mesh);
    this.interactableObjects.set(obj.name, mesh);
    
    // Add emissive pulse for interactable objects
    this.addEmissivePulse(mesh);
  }
  
  private getObjectPosition(name: string): THREE.Vector3 {
    // Position mapping for key objects
    const positions: Record<string, THREE.Vector3> = {
      'reception-desk': new THREE.Vector3(0, 0.6, -2),
      'visitor-log': new THREE.Vector3(1, 1.2, -1.5),
      'poster-board': new THREE.Vector3(-6, 2, -9.5),
      'flower-arrangement': new THREE.Vector3(3, 1, -2),
      
      'display-case-west': new THREE.Vector3(-4, 1, 2),
      'archives-door': new THREE.Vector3(0, 1, -9.5),
      'painting-landscape': new THREE.Vector3(4, 2.5, -9.5),
      
      'filing-cabinet-north': new THREE.Vector3(-5, 1, -8),
      'card-catalog': new THREE.Vector3(2, 1, -4),
      'desk-lamp': new THREE.Vector3(0, 1.2, 0),
      
      'vault-keypad': new THREE.Vector3(0, 1.5, -9),
      'blueprint-frame': new THREE.Vector3(-4, 2, -9.5),
      'maintenance-locker': new THREE.Vector3(6, 1, -5),
      
      'sunburst-diamond': new THREE.Vector3(0, 1.5, 0),
      'environmental-controls': new THREE.Vector3(-5, 2, -9.5)
    };
    
    return positions[name] || new THREE.Vector3(Math.random() * 4 - 2, 0.5, Math.random() * 4 - 2);
  }
  
  private createObjectMesh(name: string): THREE.Object3D {
    // Create appropriate geometry based on object type
    if (name.includes('desk')) {
      return this.createDesk();
    } else if (name.includes('door')) {
      return this.createDoor();
    } else if (name.includes('display-case')) {
      return this.createDisplayCase();
    } else if (name.includes('cabinet') || name.includes('locker')) {
      return this.createCabinet();
    } else if (name.includes('diamond')) {
      return this.createDiamond();
    } else if (name.includes('keypad')) {
      return this.createKeypad();
    } else if (name.includes('painting') || name.includes('blueprint')) {
      return this.createPainting();
    } else if (name.includes('catalog')) {
      return this.createCatalog();
    } else if (name.includes('flower')) {
      return this.createFlowerVase();
    } else if (name.includes('poster')) {
      return this.createPosterBoard();
    }
    
    // Default: simple box
    return this.createGenericObject();
  }
  
  private createDesk(): THREE.Object3D {
    const group = new THREE.Group();
    
    // Premium warm wood material
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0xa0826d, // Rich mahogany
      roughness: 0.5,
      metalness: 0.05
    });
    
    // Desktop
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.1, 1),
      woodMaterial
    );
    top.position.y = 0.6;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);
    
    // Legs
    for (let x of [-0.8, 0.8]) {
      for (let z of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.6, 0.1),
          woodMaterial
        );
        leg.position.set(x, 0.3, z);
        leg.castShadow = true;
        group.add(leg);
      }
    }
    
    return group;
  }
  
  private createDoor(): THREE.Object3D {
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      roughness: 0.5,
      metalness: 0.6
    });
    
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.4, 0.1),
      doorMaterial
    );
    
    return door;
  }
  
  private createDisplayCase(): THREE.Object3D {
    const group = new THREE.Group();
    
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.5
    });
    
    const case1 = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1),
      glassMaterial
    );
    case1.position.y = 0.75;
    group.add(case1);
    
    return group;
  }
  
  private createCabinet(): THREE.Object3D {
    const cabinetMaterial = new THREE.MeshStandardMaterial({
      color: 0x696969,
      roughness: 0.7,
      metalness: 0.3
    });
    
    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.8, 0.5),
      cabinetMaterial
    );
    
    return cabinet;
  }
  
  private createDiamond(): THREE.Object3D {
    const diamondGeometry = new THREE.OctahedronGeometry(0.3, 0);
    const diamondMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.5,
      emissive: 0xffff00,
      emissiveIntensity: 0.5
    });
    
    const diamond = new THREE.Mesh(diamondGeometry, diamondMaterial);
    
    // Add rotation animation
    const group = new THREE.Group();
    group.add(diamond);
    
    return group;
  }
  
  private createKeypad(): THREE.Object3D {
    const group = new THREE.Group();
    
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.6,
      metalness: 0.4
    });
    
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.4, 0.05),
      baseMaterial
    );
    group.add(base);
    
    // LED indicator
    const led = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, emissive: 0x00ff00 })
    );
    led.position.set(0, 0.15, 0.03);
    group.add(led);
    
    return group;
  }
  
  private createPainting(): THREE.Object3D {
    const group = new THREE.Group();
    
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.2
    });
    
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1, 0.1),
      frameMaterial
    );
    group.add(frame);
    
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xf5deb3 })
    );
    canvas.position.z = 0.06;
    group.add(canvas);
    
    return group;
  }
  
  private createCatalog(): THREE.Object3D {
    const catalogMaterial = new THREE.MeshStandardMaterial({
      color: 0xd2691e,
      roughness: 0.7
    });
    
    const catalog = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.6, 0.8),
      catalogMaterial
    );
    
    return catalog;
  }
  
  private createFlowerVase(): THREE.Object3D {
    const group = new THREE.Group();
    
    // Vase
    const vaseGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.3, 16);
    const vaseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.1
    });
    const vase = new THREE.Mesh(vaseGeometry, vaseMaterial);
    group.add(vase);
    
    // Simple flower petals
    for (let i = 0; i < 5; i++) {
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      const angle = (i / 5) * Math.PI * 2;
      petal.position.set(Math.cos(angle) * 0.1, 0.2, Math.sin(angle) * 0.1);
      group.add(petal);
    }
    
    return group;
  }
  
  private createPosterBoard(): THREE.Object3D {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.5, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xd3d3d3 })
    );
    
    return board;
  }
  
  private createGenericObject(): THREE.Object3D {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.7
    });
    
    return new THREE.Mesh(geometry, material);
  }
  
  private addEmissivePulse(mesh: THREE.Object3D): void {
    // Add stronger emissive glow to examinable objects
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        // Store original emissive or create new
        if (!child.material.emissive) {
          child.material.emissive = new THREE.Color(0x4299e1); // Bright blue
        } else {
          child.material.emissive.setHex(0x4299e1);
        }
        child.material.emissiveIntensity = 0.2; // Subtle idle glow
      }
    });
  }
  
  pulseObject(object: THREE.Object3D): void {
    this.pulsingObjects.set(object, {
      startTime: Date.now(),
      duration: 1200 // Slightly longer pulse
    });
  }
  
  update(): void {
    // Update pulsing objects
    const now = Date.now();
    const toRemove: THREE.Object3D[] = [];
    
    this.pulsingObjects.forEach((data, object) => {
      const elapsed = now - data.startTime;
      const progress = Math.min(elapsed / data.duration, 1);
      
      object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          // Pulse from 0.2 (idle) to 0.8 (peak) and back
          const pulseIntensity = 0.2 + Math.sin(progress * Math.PI) * 0.6;
          child.material.emissiveIntensity = pulseIntensity;
        }
      });
      
      if (progress >= 1) {
        toRemove.push(object);
      }
    });
    
    toRemove.forEach(obj => {
      this.pulsingObjects.delete(obj);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissiveIntensity = 0.2; // Return to idle glow
        }
      });
    });
    
    // Rotate diamonds
    this.interactableObjects.forEach((obj, name) => {
      if (name.includes('diamond')) {
        obj.rotation.y += 0.01;
      }
    });
  }
  
  getInteractableObjects(): Map<string, THREE.Object3D> {
    return this.interactableObjects;
  }
}
