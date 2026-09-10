import * as THREE from 'three';

/**
 * Module B: shared art-direction primitives for the three.js diorama.
 *
 * Everything here is procedural (canvas textures, no asset downloads) so the
 * demo stays light enough for a laptop projecting to a TV. Textures are cached
 * module-wide; materials are created fresh per call so per-object emissive
 * tweaks never leak into neighbouring props.
 */

/** Light-first luxury palette: pearl marble, champagne brass, glass, cyan interactables. */
export const PALETTE = {
  pearl: 0xefe9de,
  cream: 0xe9dfcd,
  ivory: 0xf1ebe1,
  gold: 0xcfa64a,
  brass: 0xb48a3c,
  chrome: 0xdfe2e7,
  oak: 0xb98f63,
  mahogany: 0x8a5a3c,
  cyan: 0x5fe0ff,
  warmLight: 0xfff1dc,
  coolLight: 0xdcecff,
  paper: 0xf7f1e3,
  background: 0xf3eee6,
} as const;

/** Deterministic PRNG so the marble veins look identical on every rebuild. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d') as CanvasRenderingContext2D];
}

let marbleTexture: THREE.CanvasTexture | null = null;

/** Pearl marble: warm white base, soft grey mottling, thin grey + faint gold veins. */
function getMarbleTexture(): THREE.CanvasTexture {
  if (marbleTexture) return marbleTexture;

  const size = 512;
  const [canvas, ctx] = makeCanvas(size, size);
  const rand = mulberry32(1337);

  ctx.fillStyle = '#f7f3ec';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 70; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 40 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(215, 208, 198, ${0.05 + rand() * 0.07})`);
    g.addColorStop(1, 'rgba(215, 208, 198, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Veins drift along one diagonal (like real bedding planes) instead of scribbling.
  const vein = (color: string, count: number, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      ctx.lineWidth = width * (0.5 + rand() * 0.9);
      ctx.beginPath();
      let x = rand() * size;
      let y = rand() * size;
      ctx.moveTo(x, y);
      const segments = 4 + Math.floor(rand() * 3);
      for (let s = 0; s < segments; s++) {
        const nx = x + 60 + rand() * 90;
        const ny = y + 30 + rand() * 60;
        ctx.bezierCurveTo(
          x + 30 + rand() * 40, y + (rand() - 0.5) * 50,
          nx - 30 - rand() * 40, ny + (rand() - 0.5) * 50,
          nx, ny
        );
        x = nx;
        y = ny;
      }
      ctx.stroke();
    }
  };
  vein('rgba(150, 140, 128, 0.22)', 12, 1.6);
  vein('rgba(190, 150, 85, 0.16)', 5, 1.0);

  marbleTexture = new THREE.CanvasTexture(canvas);
  marbleTexture.wrapS = marbleTexture.wrapT = THREE.RepeatWrapping;
  marbleTexture.colorSpace = THREE.SRGBColorSpace;
  marbleTexture.anisotropy = 4;
  return marbleTexture;
}

/** Clone of the shared marble bitmap with its own tiling. Clones share GPU pixels. */
function marbleMap(repeatX: number, repeatY: number): THREE.Texture {
  const tex = getMarbleTexture().clone();
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

let envTexture: THREE.CanvasTexture | null = null;

/**
 * Procedural "sunlit atrium" equirect environment. Metals (gold, brass, chrome)
 * are black without something to reflect; this gives them skylight, warm floor
 * bounce and a few bright window panels for crisp highlights. The renderer
 * PMREM-filters equirect environments internally, so no renderer access needed.
 */
export function getStudioEnvironment(): THREE.Texture {
  if (envTexture) return envTexture;

  const w = 1024;
  const h = 512;
  const [canvas, ctx] = makeCanvas(w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0.0, '#ffffff');
  sky.addColorStop(0.38, '#ece5da');
  sky.addColorStop(0.52, '#b9ad9a');
  sky.addColorStop(0.7, '#8b7d68');
  sky.addColorStop(1.0, '#5e5346');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Tall warm windows around the horizon band; blurred edges read as soft boxes.
  ctx.shadowBlur = 24;
  ctx.shadowColor = 'rgba(255, 246, 228, 0.9)';
  ctx.fillStyle = '#fffaf0';
  for (let i = 0; i < 6; i++) {
    const x = (i / 6) * w + 50;
    ctx.fillRect(x, h * 0.3, 60, h * 0.24);
  }
  // One cool skylight strip overhead for the cyan-tinted rim on glass and chrome.
  ctx.shadowColor = 'rgba(214, 236, 255, 0.9)';
  ctx.fillStyle = '#eaf5ff';
  ctx.fillRect(0, h * 0.04, w, h * 0.06);
  ctx.shadowBlur = 0;

  envTexture = new THREE.CanvasTexture(canvas);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.colorSpace = THREE.SRGBColorSpace;
  return envTexture;
}

let glowTexture: THREE.CanvasTexture | null = null;

function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const size = 128;
  const [canvas, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

/**
 * Fake selective bloom: an additive radial sprite. Real UnrealBloomPass would
 * bloom the whole white room; sprites let us glow only gold and cyan emissives.
 */
export function makeGlow(color: THREE.ColorRepresentation, size: number, opacity: number): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  sprite.userData.baseOpacity = opacity;
  return sprite;
}

export const materials = {
  marbleFloor: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.pearl,
      map: marbleMap(3, 3),
      roughness: 0.3,
      metalness: 0.0,
      envMapIntensity: 0.6,
    }),

  marbleWall: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.ivory,
      map: marbleMap(3, 1.2),
      roughness: 0.45,
      metalness: 0.0,
      envMapIntensity: 0.5,
    }),

  creamWall: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.cream,
      roughness: 0.92,
      metalness: 0.0,
    }),

  gold: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.gold,
      metalness: 1.0,
      roughness: 0.22,
      envMapIntensity: 1.3,
    }),

  brass: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.brass,
      metalness: 0.95,
      roughness: 0.32,
      envMapIntensity: 1.1,
    }),

  chrome: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.chrome,
      metalness: 1.0,
      roughness: 0.08,
      envMapIntensity: 1.4,
    }),

  /** Cheap glass: env reflections + alpha, no transmission pass (saves a full scene re-render). */
  glass: () =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      roughness: 0.05,
      metalness: 0.0,
      envMapIntensity: 1.6,
      depthWrite: false,
    }),

  oak: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.oak,
      roughness: 0.6,
      metalness: 0.0,
    }),

  mahogany: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.mahogany,
      roughness: 0.42,
      metalness: 0.0,
      envMapIntensity: 0.6,
    }),

  paper: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.paper,
      roughness: 0.95,
      metalness: 0.0,
    }),

  /** Self-lit surface (window daylight, bulbs, LED strips). */
  emissive: (color: THREE.ColorRepresentation, intensity: number) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 1.0,
      metalness: 0.0,
    }),
};

/** Marks a material as "keep its own emissive" so the cyan interactable tint skips it. */
export function lockEmissive<T extends THREE.Material>(material: T): T {
  material.userData.emissiveLocked = true;
  return material;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
