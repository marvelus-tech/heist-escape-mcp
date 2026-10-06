import * as THREE from 'three';
import {
  PALETTE,
  getStudioEnvironment,
  lockEmissive,
  makeGlow,
  materials,
  prefersReducedMotion,
} from './scene/materials';
import {
  bookshelf,
  brassWindow,
  column,
  displayCase,
  floorInlay,
  galaBanner,
  goldTrim,
  lightStrip,
  pedestal,
  revealEdge,
  sconce,
  securityCamera,
  sunburstDiamond,
  vaultDoor,
  wainscot,
} from './scene/props';

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

/** Everything a highlighted interactable needs to breathe and flash. */
interface Interactable {
  root: THREE.Object3D;
  tinted: THREE.MeshStandardMaterial[];
  outline: THREE.MeshBasicMaterial;
  halo: THREE.Sprite;
  phase: number;
}

const OUTLINE_OPACITY = 0.38;
const OUTLINE_SCALE = 1.03;

const ROOM_SIZE = 20;
const WALL_HEIGHT = 8;
const IDLE_EMISSIVE = 0.09;
const IDLE_PULSE_AMPLITUDE = 0.045;
const IDLE_PULSE_PERIOD_MS = 2600;
const EXAMINE_BOOST = 0.6;
const EXAMINE_DURATION_MS = 1400;

/**
 * Scene Manager for Heist Escape (Module B: scene art direction)
 *
 * Warm-lux museum (VIS-A concept still): warm marble, cream walls, dark
 * lacquered wood, champagne gold, glass cases, ice-cyan emissive on
 * interactables, gold shimmer on the hero diamond.
 * Lighting = low warm/dark-bounce hemisphere fill + warm key (only shadow caster)
 * + cool rim + an overhead "chandelier" spot that pools light on the floor.
 * Fill is kept low on purpose: contrast comes from the key/fill ratio, not
 * from darker paint. "Bloom" is faked with additive glow sprites so only
 * emissives and gold glow.
 */
export class SceneManager {
  private scene: THREE.Scene;
  private roomRoot = new THREE.Group();
  private lightRig = new THREE.Group();
  private interactableObjects: Map<string, THREE.Object3D> = new Map();
  private interactables: Map<THREE.Object3D, Interactable> = new Map();
  private pulsingObjects: Map<THREE.Object3D, { startTime: number; duration: number }> = new Map();
  private heroMaterials: THREE.MeshStandardMaterial[] = [];
  private heroGlows: THREE.Sprite[] = [];
  private spinners: THREE.Object3D[] = [];
  private reducedMotion = prefersReducedMotion();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.roomRoot.name = 'room';
    this.lightRig.name = 'lights';
    this.scene.add(this.roomRoot, this.lightRig);

    // Warm amber haze: starts past the mid-room so the foreground stays crisp and
    // only the far wall softens. Same colour as the background so nothing seams.
    this.scene.background = new THREE.Color(PALETTE.background);
    this.scene.fog = new THREE.Fog(PALETTE.background, 20, 62);
    this.scene.environment = getStudioEnvironment();
  }

  buildRoom(room: Room, objects: GameObject[]): void {
    this.clearScene();
    this.setupLighting(room.id);
    this.buildFloor(room.id);
    this.buildWalls(room.id);
    this.addRoomAccents(room.id);
    objects.forEach(obj => this.addRoomObject(obj));
  }

  private setupLighting(roomId: number): void {
    this.disposeGroup(this.lightRig);

    // Low fill: cream ceiling above, espresso/marble bounce below. The old 0.42
    // white fill is what flattened the room; shadows now have somewhere to go.
    const hemisphere = new THREE.HemisphereLight(0xfff2e2, 0x2e1f16, 0.3);
    this.lightRig.add(hemisphere);

    // Warm key: the single shadow caster (keeps the shadow pass cheap on a laptop).
    // High and from the upper right (the still's window side) so forms are
    // side-lit, camera-facing surfaces still catch some (positive z), and its
    // glossy-floor reflection lands behind the Stage camera at (0, 3, 8).
    const key = new THREE.DirectionalLight(PALETTE.warmLight, 1.1);
    key.position.set(6, 12, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 50;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    this.lightRig.add(key, key.target);

    // Cool rim: backlight from behind the far wall. Only surfaces facing away
    // from the camera catch it (pure edge separation), side walls and back wall
    // stay warm, and its glossy-floor reflection is a soft pool at room centre
    // that reads as the chandelier's. Kept dim and fairly steep: at grazing
    // angles a directional light smears into a hard white streak on the floor.
    const rim = new THREE.DirectionalLight(PALETTE.coolLight, 0.4);
    rim.position.set(0, 5, -10);
    this.lightRig.add(rim, rim.target);

    // Chandelier: one overhead spot pooling warm light on the polished floor,
    // plus a soft glare sprite at the ceiling so the source itself reads.
    // Spot intensities are candela (three r155+ physical lights).
    this.addChandelier(0, WALL_HEIGHT - 0.2, -1.5, roomId === 5 ? 110 : 90);

    // Room accents.
    switch (roomId) {
      case 1:
        // Aimed at the columns so the back wall gets a lit centre and shadowed corners.
        this.addSpot(-4, 7.4, -4, 80, PALETTE.warmLight, -3.6, 2.5, -9.5);
        this.addSpot(4, 7.4, -4, 80, PALETTE.warmLight, 3.6, 2.5, -9.5);
        break;
      case 2:
        this.addSpot(-4, 7.4, -6, 90, PALETTE.warmLight, -4, 2.5, -9.5);
        this.addSpot(4, 7.4, -6, 90, PALETTE.warmLight, 4, 2.5, -9.5);
        this.addSpot(-4, 7.4, 2, 55, PALETTE.warmLight);
        break;
      case 3:
        this.addSpot(0, 7.4, -2, 75, 0xffdca6);
        this.addSpot(-6, 7.4, 0, 50, 0xffdca6, -9, 2, 0);
        break;
      case 4:
        this.addSpot(0, 7.4, -6, 65, PALETTE.warmLight, 0, 1.5, -9.5);
        break;
      case 5:
        this.addSpot(0, 7.6, 3, 50, PALETTE.warmLight, 0, 1.5, 0);
        break;
    }
  }

  private addSpot(
    x: number, y: number, z: number,
    intensity: number, color: THREE.ColorRepresentation,
    tx = x, ty = 0, tz = z
  ): void {
    const spot = new THREE.SpotLight(color, intensity, 16, Math.PI / 7, 0.55, 2);
    spot.position.set(x, y, z);
    spot.target.position.set(tx, ty, tz);
    this.lightRig.add(spot, spot.target);
  }

  /**
   * Overhead chandelier light. Wide, soft-edged cone straight down; the glare
   * sprite is additive so it blooms on its own without a post pass.
   */
  private addChandelier(x: number, y: number, z: number, intensity: number): void {
    const spot = new THREE.SpotLight(0xffd39a, intensity, 22, Math.PI / 5, 0.7, 1.6);
    spot.position.set(x, y, z);
    spot.target.position.set(x, 0, z);
    this.lightRig.add(spot, spot.target);

    const glare = makeGlow(0xffe2b4, 5.5, 0.28);
    glare.position.set(x, y - 0.6, z);
    this.lightRig.add(glare);
  }

  private clearScene(): void {
    this.disposeGroup(this.roomRoot);
    this.interactableObjects.clear();
    this.interactables.clear();
    this.pulsingObjects.clear();
    this.heroMaterials = [];
    this.heroGlows = [];
    this.spinners = [];
  }

  /** Removes children and frees their GPU resources (shared textures are cached, not disposed). */
  private disposeGroup(group: THREE.Group): void {
    group.traverse(child => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        child.geometry?.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: THREE.Material) => m.dispose());
      } else if (child instanceof THREE.Light) {
        child.dispose();
      }
    });
    group.clear();
  }

  private buildFloor(roomId: number): void {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), materials.marbleFloor());
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.roomRoot.add(floor);

    // Gold inlay rings: the museum rotunda motif; the vault gets concentric rings.
    if (roomId === 1) {
      this.roomRoot.add(floorInlay(4.2), floorInlay(3.4, 0.04));
    } else if (roomId === 5) {
      this.roomRoot.add(floorInlay(2.2), floorInlay(3.2, 0.05), floorInlay(4.4, 0.05));
    }
  }

  private buildWalls(roomId: number): void {
    // Vault + corridor are full marble; galleries are cream plaster over a marble wainscot.
    const wallMaterial = roomId >= 4 ? materials.marbleWall() : materials.creamWall();
    const half = ROOM_SIZE / 2;

    const back = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, WALL_HEIGHT, 0.5), wallMaterial);
    back.position.set(0, WALL_HEIGHT / 2, -half);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_HEIGHT, ROOM_SIZE), wallMaterial);
    left.position.set(-half, WALL_HEIGHT / 2, 0);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_HEIGHT, ROOM_SIZE), wallMaterial);
    right.position.set(half, WALL_HEIGHT / 2, 0);
    for (const wall of [back, left, right]) {
      wall.receiveShadow = true;
      this.roomRoot.add(wall);
    }

    // Ceiling: closes the box so the top of frame is shadowed plaster instead of
    // a sky-coloured strip, and gives the chandelier glare something to sit against.
    // castShadow stays false: the key light sits above it and would shadow the whole room.
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), materials.plasterCeiling());
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    this.roomRoot.add(ceiling);

    // Gold crown moulding on all three walls.
    const crownY = WALL_HEIGHT - 0.4;
    const crownBack = goldTrim(ROOM_SIZE);
    crownBack.position.set(0, crownY, -half + 0.3);
    const crownLeft = goldTrim(ROOM_SIZE, 0.12, 0.14);
    crownLeft.rotation.y = Math.PI / 2;
    crownLeft.position.set(-half + 0.3, crownY, 0);
    const crownRight = crownLeft.clone();
    crownRight.position.x = half - 0.3;
    this.roomRoot.add(crownBack, crownLeft, crownRight);

    if (roomId <= 3) {
      const backWainscot = wainscot(ROOM_SIZE);
      backWainscot.position.set(0, 0, -half + 0.31);
      const leftWainscot = wainscot(ROOM_SIZE);
      leftWainscot.rotation.y = Math.PI / 2;
      leftWainscot.position.set(-half + 0.31, 0, 0);
      const rightWainscot = wainscot(ROOM_SIZE);
      rightWainscot.rotation.y = -Math.PI / 2;
      rightWainscot.position.set(half - 0.31, 0, 0);
      this.roomRoot.add(backWainscot, leftWainscot, rightWainscot);
    }
  }

  /** Inactive security cameras tucked into the upper back corners (story: they are off tonight). */
  private addCameras(): void {
    const half = ROOM_SIZE / 2;
    for (const x of [-half + 0.6, half - 0.6]) {
      const cam = securityCamera();
      cam.position.set(x, WALL_HEIGHT - 1.0, -half + 0.3);
      cam.lookAt(0, 4.5, 0);
      this.roomRoot.add(cam);
    }
  }

  private addRoomAccents(roomId: number): void {
    const half = ROOM_SIZE / 2;
    if (roomId !== 3) this.addCameras();
    switch (roomId) {
      case 1: // Museum Lobby: gala-prep rotunda, banner, brass windows, columns, glass vitrines
        {
          const banner = galaBanner();
          banner.position.set(0, 6.9, -half + 2.6);
          this.roomRoot.add(banner);
        }
        for (const x of [-5, 5]) {
          const rope = this.createVelvetRope();
          rope.position.set(x, 0, 3);
          this.roomRoot.add(rope);
        }
        for (const x of [-7, 0, 7]) {
          const window = brassWindow(2.2, 3.4);
          window.position.set(x, 4.6, -half + 0.3);
          this.roomRoot.add(window);
        }
        for (const x of [-3.6, 3.6]) {
          const col = column();
          col.position.set(x, 0, -half + 1.2);
          this.roomRoot.add(col);
        }
        for (const [x, z, kind] of [[-6.5, 1, 'sphere'], [6.5, 1, 'torus'], [-7.5, -5, 'torus'], [7.5, -5, 'sphere']] as Array<[number, number, 'sphere' | 'torus']>) {
          const vitrine = displayCase(1.2, 1.0, 0.9, kind);
          vitrine.position.set(x, 0, z);
          this.roomRoot.add(vitrine);
        }
        break;

      case 2: // Gallery A: warm spotlit gallery, columns, artefact cases
        for (const x of [-6.5, 6.5]) {
          const col = column();
          col.position.set(x, 0, -half + 1.2);
          this.roomRoot.add(col);
        }
        for (const x of [-7, 7]) {
          const s = sconce();
          s.position.set(x, 4.2, -half + 0.3);
          this.roomRoot.add(s);
        }
        for (const [x, z] of [[-7, -3], [7, -3]]) {
          const vitrine = displayCase(1.4, 1.1, 1.0, 'torus');
          vitrine.position.set(x, 0, z);
          this.roomRoot.add(vitrine);
        }
        break;

      case 3: // Archives: oak shelving, brass rails, paper-warm light
        for (const z of [-6, -1.5, 3]) {
          const shelf = bookshelf(3, 4);
          shelf.rotation.y = Math.PI / 2;
          shelf.position.set(-half + 0.55, 0, z);
          this.roomRoot.add(shelf);
        }
        {
          const shelf = bookshelf(5, 4);
          shelf.position.set(4, 0, -half + 0.55);
          this.roomRoot.add(shelf);
        }
        for (const x of [-3, 3]) {
          const s = sconce();
          s.position.set(x, 4.2, -half + 0.3);
          this.roomRoot.add(s);
        }
        break;

      case 4: // Vault Access: marble corridor, pilasters, brass sconces, cyan guidance strips
        for (const x of [-6, -2, 2, 6]) {
          const s = sconce();
          s.position.set(x, 3.6, -half + 0.3);
          this.roomRoot.add(s);
        }
        for (const x of [-8, -4, 4, 8]) {
          const pilaster = column(WALL_HEIGHT - 0.5, 0.28);
          pilaster.position.set(x, 0, -half + 0.45);
          this.roomRoot.add(pilaster);
        }
        for (const x of [-half + 0.6, half - 0.6]) {
          const strip = lightStrip(ROOM_SIZE - 1.2);
          strip.rotation.y = Math.PI / 2;
          strip.position.set(x, 0, 0);
          this.roomRoot.add(strip);
        }
        {
          const frame = goldTrim(3.2, 0.14, 0.2);
          frame.position.set(0, 3.0, -half + 0.35);
          const jambL = goldTrim(0.14, 3.0, 0.2);
          jambL.position.set(-1.53, 1.5, -half + 0.35);
          const jambR = jambL.clone();
          jambR.position.x = 1.53;
          this.roomRoot.add(frame, jambL, jambR);
        }
        break;

      case 5: // Vault: chrome door, gold rings, marble pedestal, dust of gold light
        {
          const door = vaultDoor(2.6);
          door.position.set(0, 3.2, -half + 0.55);
          this.roomRoot.add(door);
        }
        for (const x of [-4.5, 4.5]) {
          const col = column(WALL_HEIGHT - 0.5, 0.4);
          col.position.set(x, 0, -half + 1.4);
          this.roomRoot.add(col);
        }
        for (const x of [-half + 0.6, half - 0.6]) {
          const strip = lightStrip(ROOM_SIZE - 1.2, 0xffd889);
          strip.rotation.y = Math.PI / 2;
          strip.position.set(x, 0, 0);
          this.roomRoot.add(strip);
        }
        break;
    }
  }

  private addRoomObject(obj: GameObject): void {
    const position = this.getObjectPosition(obj.name);
    const mesh = this.createObjectMesh(obj.name);
    mesh.name = obj.name;
    mesh.position.copy(position);
    mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.roomRoot.add(mesh);
    this.interactableObjects.set(obj.name, mesh);
    this.addEmissivePulse(mesh);
  }

  private getObjectPosition(name: string): THREE.Vector3 {
    const positions: Record<string, THREE.Vector3> = {
      'reception-desk': new THREE.Vector3(0, 0, -2),
      'visitor-log': new THREE.Vector3(0.6, 0.85, -2.1),
      'poster-board': new THREE.Vector3(-6, 2, -9.5),
      'flower-arrangement': new THREE.Vector3(-0.7, 0.82, -1.9),

      'display-case-west': new THREE.Vector3(-4, 0, 2),
      'archives-door': new THREE.Vector3(0, 1.3, -9.5),
      'painting-landscape': new THREE.Vector3(4, 2.5, -9.5),

      'velvet-rope': new THREE.Vector3(1.5, 0, 2.5),

      'filing-cabinet-north': new THREE.Vector3(-5, 0.9, -8),
      'card-catalog': new THREE.Vector3(2, 0.3, -4),
      'desk-lamp': new THREE.Vector3(-1.5, 0, 0),
      'hidden-painting': new THREE.Vector3(-1, 2.6, -9.5),

      'vault-keypad': new THREE.Vector3(2.1, 1.5, -9.4),
      'blueprint-frame': new THREE.Vector3(-4, 2, -9.5),
      'maintenance-locker': new THREE.Vector3(6, 0.9, -5),

      'sunburst-diamond': new THREE.Vector3(0, 0, 0),
      'steel-shelves': new THREE.Vector3(7.5, 0, -6),
      'environmental-controls': new THREE.Vector3(-5, 2, -9.5),
    };

    return positions[name] || new THREE.Vector3(Math.random() * 4 - 2, 0.5, Math.random() * 4 - 2);
  }

  private createObjectMesh(name: string): THREE.Object3D {
    if (name.includes('lamp')) return this.createLamp();
    if (name.includes('rope')) return this.createVelvetRope();
    if (name.includes('shelves')) return this.createSteelShelves();
    if (name.includes('desk')) return this.createDesk();
    if (name.includes('door')) return this.createDoor();
    if (name.includes('display-case')) return displayCase(1.5, 1.2, 1.0, 'sphere');
    if (name.includes('cabinet') || name.includes('locker')) return this.createCabinet();
    if (name.includes('diamond')) return this.createDiamond();
    if (name.includes('keypad')) return this.createKeypad();
    if (name.includes('painting') || name.includes('blueprint')) return this.createPainting(name);
    if (name.includes('catalog')) return this.createCatalog();
    if (name.includes('flower')) return this.createFlowerVase();
    if (name.includes('poster') || name.includes('controls')) return this.createPosterBoard();
    if (name.includes('log')) return this.createBook();
    return this.createGenericObject();
  }

  private createDesk(): THREE.Object3D {
    const group = new THREE.Group();
    const wood = materials.mahogany();
    const brass = materials.brass();

    const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.1), wood);
    top.position.y = 0.78;
    group.add(top);
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.02, 1.16), brass);
    inlay.position.y = 0.73;
    group.add(inlay);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.66, 0.95), wood);
    body.position.y = 0.4;
    group.add(body);
    const kick = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.08, 1.0), brass);
    kick.position.y = 0.04;
    group.add(kick);
    return group;
  }

  private createDoor(): THREE.Object3D {
    const group = new THREE.Group();
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.12), materials.mahogany());
    group.add(door);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.08), materials.gold());
    trim.position.z = -0.04;
    group.add(trim);
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), materials.gold());
    handle.position.set(0.5, -0.1, 0.1);
    group.add(handle);
    return group;
  }

  private createCabinet(): THREE.Object3D {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.55), materials.chrome());
    group.add(body);
    const brass = materials.brass();
    for (const y of [0.55, 0.1, -0.35]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.03), brass);
      handle.position.set(0, y, 0.29);
      group.add(handle);
    }
    return group;
  }

  /** Hero object: stays gold (no cyan treatment), shimmer + spin handled in update(). */
  private createDiamond(): THREE.Object3D {
    const group = new THREE.Group();
    group.userData.hero = true;
    const base = pedestal();
    group.add(base);

    // Display stone: the "too perfect" one, cooler sparkle (see GEM_LOOKS.pedestal).
    const gem = sunburstDiamond('pedestal');
    gem.position.y = (base.userData.topY as number) + 0.85;
    gem.name = 'sunburst-gem';
    group.add(gem);
    this.registerShimmer(gem);
    this.spinners.push(gem);
    return group;
  }

  /** Collects locked-emissive materials + 'hero-glow' sprites so update() can shimmer them. */
  private registerShimmer(root: THREE.Object3D): void {
    root.traverse(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const material = child.material;
        if (material.userData.heroBaseEmissive === undefined) {
          material.userData.heroBaseEmissive = material.emissiveIntensity;
        }
        if (!this.heroMaterials.includes(material)) this.heroMaterials.push(material);
      } else if (child instanceof THREE.Sprite && child.name === 'hero-glow') {
        this.heroGlows.push(child);
      }
    });
  }

  private createKeypad(): THREE.Object3D {
    const group = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.05), materials.brass());
    group.add(plate);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.08),
      lockEmissive(materials.emissive(PALETTE.cyan, 1.2))
    );
    screen.position.set(0, 0.14, 0.03);
    group.add(screen);
    const keyMat = materials.chrome();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const key = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), keyMat);
        key.position.set((c - 1) * 0.08, 0.02 - r * 0.08, 0.03);
        group.add(key);
      }
    }
    return group;
  }

  /**
   * Gold-framed picture. The archives' hidden painting hangs on a hinge, slightly
   * ajar, with a gold emissive edge leaking from the vault-access recess behind it.
   */
  private createPainting(name: string): THREE.Object3D {
    const group = new THREE.Group();
    const blueprint = name.includes('blueprint');
    const hinged = name.includes('hidden');
    const width = 1.7;
    const height = 1.2;

    const picture = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.08), materials.gold());
    picture.add(frame);
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.95),
      new THREE.MeshStandardMaterial({ color: blueprint ? 0xcfe3f5 : 0xe7d9bf, roughness: 0.9 })
    );
    canvas.position.z = 0.05;
    picture.add(canvas);

    if (hinged) {
      // Pivot on the left edge so the frame swings like a door, left slightly ajar.
      picture.children.forEach(child => { child.position.x = width / 2; });
      const hinge = new THREE.Group();
      hinge.position.x = -width / 2;
      hinge.rotation.y = 0.28;
      hinge.add(picture);
      group.add(hinge);

      const edge = revealEdge(width - 0.1, height - 0.1);
      edge.position.z = -0.06;
      group.add(edge);
      this.registerShimmer(edge);
    } else {
      group.add(picture);
    }
    return group;
  }

  private createCatalog(): THREE.Object3D {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.8), materials.oak());
    group.add(body);
    const brass = materials.brass();
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const pull = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.02), brass);
        pull.position.set(-0.39 + c * 0.26, 0.14 - r * 0.28, 0.41);
        group.add(pull);
      }
    }
    return group;
  }

  private createFlowerVase(): THREE.Object3D {
    const group = new THREE.Group();
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.34, 20), materials.glass());
    vase.position.y = 0.17;
    group.add(vase);
    const petal = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, envMapIntensity: 0.8 });
    const gold = materials.gold();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), petal);
      bloom.position.set(Math.cos(angle) * 0.12, 0.44 + (i % 2) * 0.05, Math.sin(angle) * 0.12);
      group.add(bloom);
    }
    const centre = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), gold);
    centre.position.y = 0.52;
    group.add(centre);
    return group;
  }

  private createPosterBoard(): THREE.Object3D {
    const group = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.05), materials.paper());
    group.add(board);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 0.04), materials.brass());
    frame.position.z = -0.03;
    group.add(frame);
    return group;
  }

  private createBook(): THREE.Object3D {
    const group = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.46), materials.mahogany());
    group.add(cover);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.42), materials.paper());
    pages.position.y = 0.04;
    group.add(pages);
    return group;
  }

  /** Brass banker's lamp on a small marble side table, with a warm glow. */
  private createLamp(): THREE.Object3D {
    const group = new THREE.Group();
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.75, 24), materials.marbleWall());
    table.position.y = 0.375;
    group.add(table);
    const brass = materials.brass();
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.04, 16), brass);
    foot.position.y = 0.77;
    group.add(foot);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), brass);
    stem.position.y = 1.0;
    group.add(stem);
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.3, 0.22, 20, 1, true),
      lockEmissive(materials.emissive(0xffe7bf, 0.9))
    );
    shade.material.side = THREE.DoubleSide;
    shade.position.y = 1.28;
    group.add(shade);
    const glow = makeGlow(0xffe6b8, 1.4, 0.2);
    glow.position.y = 1.2;
    group.add(glow);
    return group;
  }

  /** Two brass stanchions joined by a draped burgundy rope. */
  private createVelvetRope(): THREE.Object3D {
    const group = new THREE.Group();
    const brass = materials.brass();
    for (const x of [-0.9, 0.9]) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 16), brass);
      base.position.set(x, 0.02, 0);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 10), brass);
      post.position.set(x, 0.5, 0);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), brass);
      knob.position.set(x, 1.0, 0);
      group.add(base, post, knob);
    }
    const ropeCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.9, 0.95, 0), new THREE.Vector3(0, 0.55, 0), new THREE.Vector3(0.9, 0.95, 0)
    );
    const rope = new THREE.Mesh(
      new THREE.TubeGeometry(ropeCurve, 16, 0.03, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x8e2a3a, roughness: 0.9 })
    );
    group.add(rope);
    return group;
  }

  /**
   * Chrome vault shelving with gold ingots. The top shelf carries the authentic
   * stone: smaller, warmer gold, no cyan in its glow (contrast with the pedestal).
   */
  private createSteelShelves(): THREE.Object3D {
    const group = new THREE.Group();
    const chrome = materials.chrome();
    const gold = materials.gold();
    for (const [x, z] of [[-0.6, -0.25], [0.6, -0.25], [-0.6, 0.25], [0.6, 0.25]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.0, 0.04), chrome);
      post.position.set(x, 1.0, z);
      group.add(post);
    }
    const shelves = 4;
    for (let i = 0; i < shelves; i++) {
      const y = 0.3 + i * 0.55;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.03, 0.55), chrome);
      shelf.position.y = y;
      group.add(shelf);
      if (i === shelves - 1) continue;
      for (let b = 0; b < 3; b++) {
        const ingot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.12), gold);
        ingot.position.set(-0.4 + b * 0.4, y + 0.06, 0.05);
        group.add(ingot);
      }
    }
    const cushion = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.06, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x8e2a3a, roughness: 0.95 })
    );
    const topY = 0.3 + (shelves - 1) * 0.55;
    cushion.position.set(0, topY + 0.045, 0);
    group.add(cushion);
    const stone = sunburstDiamond('authentic');
    stone.name = 'authentic-gem';
    stone.position.set(0, topY + 0.32, 0);
    group.add(stone);
    this.registerShimmer(stone);
    this.spinners.push(stone);
    return group;
  }

  private createGenericObject(): THREE.Object3D {
    return new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), materials.marbleWall());
  }

  /**
   * Cyan interactable treatment, three cheap layers:
   *  1. tint every unlocked material's emissive cyan,
   *  2. an inverted-hull outline (back-face copy of each mesh, slightly scaled),
   *  3. one additive halo sprite sized to the object.
   * The idle breathe and the examine flash both run through update();
   * reduced motion freezes the breathe.
   */
  private addEmissivePulse(root: THREE.Object3D): void {
    if (root.userData.hero) return;

    const tinted: THREE.MeshStandardMaterial[] = [];
    const bounds = new THREE.Box3();
    const outline = new THREE.MeshBasicMaterial({
      color: PALETTE.cyan,
      side: THREE.BackSide,
      transparent: true,
      opacity: OUTLINE_OPACITY,
      depthWrite: false,
    });
    const meshes: THREE.Mesh[] = [];
    root.updateWorldMatrix(true, true);
    root.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      meshes.push(child);
      bounds.expandByObject(child);
      const material = child.material;
      if (material instanceof THREE.MeshStandardMaterial && !material.userData.emissiveLocked) {
        material.emissive.setHex(PALETTE.cyan);
        material.emissiveIntensity = IDLE_EMISSIVE;
        if (!tinted.includes(material)) tinted.push(material);
      }
    });
    meshes.forEach(mesh => {
      if ((mesh.material as THREE.Material).userData.emissiveLocked) return;
      const hull = new THREE.Mesh(mesh.geometry, outline);
      hull.position.copy(mesh.position);
      hull.quaternion.copy(mesh.quaternion);
      hull.scale.copy(mesh.scale).multiplyScalar(OUTLINE_SCALE);
      hull.name = 'interactable-outline';
      mesh.parent?.add(hull);
    });

    const size = bounds.getSize(new THREE.Vector3());
    const centre = bounds.getCenter(new THREE.Vector3());
    const halo = makeGlow(PALETTE.cyan, Math.min(Math.max(size.x, size.y, size.z) * 1.9 + 0.6, 3.5), 0.16);
    halo.name = 'interactable-halo';
    halo.position.copy(centre);
    this.roomRoot.add(halo);

    this.interactables.set(root, { root, tinted, outline, halo, phase: Math.random() * Math.PI * 2 });
  }

  /** Hero-moment hook: brief stronger emissive on an examined object. Accepts the object or its name. */
  pulseObject(object: THREE.Object3D | string): void {
    const root = typeof object === 'string' ? this.interactableObjects.get(object) : object;
    if (!root) return;
    this.pulsingObjects.set(root, { startTime: performance.now(), duration: EXAMINE_DURATION_MS });
  }

  update(): void {
    const now = performance.now();
    const breathe = this.reducedMotion
      ? 0
      : Math.sin((now / IDLE_PULSE_PERIOD_MS) * Math.PI * 2);

    this.interactables.forEach(({ root, tinted, outline, halo, phase }) => {
      let boost = 0;
      const pulse = this.pulsingObjects.get(root);
      if (pulse) {
        const progress = Math.min((now - pulse.startTime) / pulse.duration, 1);
        boost = Math.sin(progress * Math.PI) * EXAMINE_BOOST;
        if (progress >= 1) this.pulsingObjects.delete(root);
      }
      const idle = IDLE_EMISSIVE + (this.reducedMotion ? 0 : Math.sin(phase + (now / IDLE_PULSE_PERIOD_MS) * Math.PI * 2) * IDLE_PULSE_AMPLITUDE);
      const intensity = idle + boost;
      const ratio = intensity / IDLE_EMISSIVE;
      tinted.forEach(material => { material.emissiveIntensity = intensity; });
      outline.opacity = Math.min(OUTLINE_OPACITY * ratio, 1);
      (halo.material as THREE.SpriteMaterial).opacity = (halo.userData.baseOpacity as number) * ratio;
    });

    // Sunburst Diamond: slow spin + gold shimmer on the gem and its glow layers.
    const shimmer = 1 + breathe * 0.18;
    this.heroMaterials.forEach(material => {
      const base = (material.userData.heroBaseEmissive as number | undefined) ?? 0.5;
      material.emissiveIntensity = base * shimmer;
    });
    this.heroGlows.forEach(glow => {
      const base = (glow.userData.baseOpacity as number | undefined) ?? 0.2;
      (glow.material as THREE.SpriteMaterial).opacity = base * (1 + breathe * 0.25);
    });
    if (!this.reducedMotion) {
      this.spinners.forEach(obj => { obj.rotation.y += 0.006; });
    }
  }

  getInteractableObjects(): Map<string, THREE.Object3D> {
    return this.interactableObjects;
  }
}
