import * as THREE from 'three';

/**
 * Module B: shared art-direction primitives for the three.js diorama.
 *
 * Everything here is procedural (canvas textures, no asset downloads) so the
 * demo stays light enough for a laptop projecting to a TV. Textures are cached
 * module-wide; materials are created fresh per call so per-object emissive
 * tweaks never leak into neighbouring props.
 */

/**
 * Warm-lux museum palette (locked to the concept still): warm marble, cream
 * architecture, dark lacquered wood, champagne gold, ice-cyan emissives. Values
 * sit further apart in luminance than the old pearl-on-pearl set so forms separate.
 */
export const PALETTE = {
  /** Floor tint sits a step below the walls; it takes the most light so it must start darker. */
  floor: 0xd2c3a8,
  cream: 0xe2d3b8,
  ivory: 0xe6d9c2,
  gold: 0xe2b654,
  brass: 0xb0812f,
  chrome: 0xd6d9df,
  /**
   * Wood tints multiply the mid-brown grain map: walnut shelving (oak) and the
   * lacquered desk/doors (mahogany). Mahogany is near-white so the map's own
   * brown carries: a darker tint lets the cyan interactable emissive
   * (scene-manager addEmissivePulse) turn the desk grey-blue.
   */
  oak: 0xd9a97c,
  mahogany: 0xf2d6b8,
  cyan: 0x5fe0ff,
  warmLight: 0xffe8cc,
  coolLight: 0xc4dfff,
  paper: 0xf4ecd9,
  /** Warm amber haze; also the colour of anything the fog swallows. */
  background: 0xb89b74,
  /** Down-facing plaster reads dark in a top-lit room; this lifts it just enough. */
  ceiling: 0xcbb99d,
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

/**
 * Warm marble (Crema Marfil): cream base, taupe clouding, grey-brown bedding
 * veins with a few honey-gold ones. Mottling alpha is roughly double the old
 * pearl version so the stone has visible tone even under flat fill.
 */
function getMarbleTexture(): THREE.CanvasTexture {
  if (marbleTexture) return marbleTexture;

  const size = 512;
  const [canvas, ctx] = makeCanvas(size, size);
  const rand = mulberry32(1337);

  ctx.fillStyle = '#eee2cf';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 80; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 40 + rand() * 130;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    // Alternate warm taupe and pale cream clouds so the surface has both darker and lighter pools.
    const warm = i % 3 !== 0;
    const tone = warm ? '176, 152, 122' : '250, 244, 232';
    g.addColorStop(0, `rgba(${tone}, ${0.1 + rand() * 0.12})`);
    g.addColorStop(1, `rgba(${tone}, 0)`);
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
  vein('rgba(120, 100, 78, 0.34)', 14, 1.8);
  vein('rgba(92, 74, 56, 0.28)', 4, 0.8);
  vein('rgba(196, 146, 70, 0.26)', 6, 1.1);

  marbleTexture = new THREE.CanvasTexture(canvas);
  marbleTexture.wrapS = marbleTexture.wrapT = THREE.RepeatWrapping;
  marbleTexture.colorSpace = THREE.SRGBColorSpace;
  marbleTexture.anisotropy = 4;
  return marbleTexture;
}

let woodTexture: THREE.CanvasTexture | null = null;

/**
 * Espresso wood grain: dark base with long horizontal grain streaks in darker
 * and lighter warm browns, plus a few crisp highlight lines so lacquered wood
 * reads as wood (not brown plastic) even when tinted darker by the material.
 */
function getWoodTexture(): THREE.CanvasTexture {
  if (woodTexture) return woodTexture;

  const size = 512;
  const [canvas, ctx] = makeCanvas(size, size);
  const rand = mulberry32(4242);

  // Mid-brown base: material `color` tints it toward walnut (oak) or lacquered mahogany.
  // Kept fairly light on purpose; see PALETTE wood tints for why very dark wood fails here.
  ctx.fillStyle = '#a46c42';
  ctx.fillRect(0, 0, size, size);

  // Broad soft bands first (growth rings seen face-on), then fine grain over them.
  for (let i = 0; i < 26; i++) {
    const y = rand() * size;
    const h = 14 + rand() * 40;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    const dark = rand() > 0.45;
    const tone = dark ? '58, 32, 16' : '190, 138, 88';
    g.addColorStop(0, `rgba(${tone}, 0)`);
    g.addColorStop(0.5, `rgba(${tone}, ${0.35 + rand() * 0.3})`);
    g.addColorStop(1, `rgba(${tone}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, y, size, h);
  }

  ctx.lineCap = 'round';
  for (let i = 0; i < 140; i++) {
    const y = rand() * size;
    const light = rand() > 0.6;
    ctx.strokeStyle = light
      ? `rgba(214, 160, 104, ${0.12 + rand() * 0.2})`
      : `rgba(40, 20, 10, ${0.18 + rand() * 0.3})`;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    // Gentle wander so grain lines are not ruler-straight.
    ctx.bezierCurveTo(size * 0.33, y + (rand() - 0.5) * 10, size * 0.66, y + (rand() - 0.5) * 10, size + 10, y + (rand() - 0.5) * 6);
    ctx.stroke();
  }

  woodTexture = new THREE.CanvasTexture(canvas);
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.anisotropy = 4;
  return woodTexture;
}

function woodMap(repeatX: number, repeatY: number): THREE.Texture {
  const tex = getWoodTexture().clone();
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
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
 * Procedural "gala hall" equirect environment. Metals (gold, brass, chrome)
 * are black without something to reflect, and a low-contrast environment is
 * why they looked like beige plastic. This one has a real luminance range:
 * cream ceiling + chandelier hotspot above, warm window panels at the
 * horizon, espresso wood and shadowed marble below. The renderer
 * PMREM-filters equirect environments internally, so no renderer access needed.
 */
export function getStudioEnvironment(): THREE.Texture {
  if (envTexture) return envTexture;

  const w = 1024;
  const h = 512;
  const [canvas, ctx] = makeCanvas(w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0.0, '#fff3dc');
  sky.addColorStop(0.3, '#e6d6bb');
  sky.addColorStop(0.5, '#9f8664');
  sky.addColorStop(0.62, '#5c4330');
  sky.addColorStop(0.8, '#33200f');
  sky.addColorStop(1.0, '#1f130a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Tall warm windows around the horizon band; blurred edges read as soft boxes.
  ctx.shadowBlur = 28;
  ctx.shadowColor = 'rgba(255, 226, 180, 0.95)';
  ctx.fillStyle = '#fff4dc';
  for (let i = 0; i < 6; i++) {
    const x = (i / 6) * w + 50;
    ctx.fillRect(x, h * 0.28, 56, h * 0.26);
  }

  // Chandelier: a hot warm disc at the zenith. Polished floors and gold pick
  // this up as the bright "catch" highlight that sells the concept still.
  ctx.shadowBlur = 60;
  ctx.shadowColor = 'rgba(255, 220, 160, 1)';
  ctx.fillStyle = '#fff8e8';
  ctx.fillRect(w * 0.3, 0, w * 0.4, h * 0.07);

  // Thin cool skylight strip just below it: the ice-cyan rim on glass and chrome.
  ctx.shadowBlur = 20;
  ctx.shadowColor = 'rgba(190, 226, 255, 0.9)';
  ctx.fillStyle = '#d8ecff';
  ctx.fillRect(0, h * 0.1, w, h * 0.03);

  // Faint warm floor bounce under the windows so downward-facing gold is not dead black.
  ctx.shadowBlur = 40;
  ctx.shadowColor = 'rgba(200, 150, 90, 0.8)';
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(0, h * 0.7, w, h * 0.04);
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
  /** Polished floor: low roughness so it mirrors the chandelier hotspot and window panels. */
  marbleFloor: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.floor,
      map: marbleMap(3, 3),
      roughness: 0.24,
      metalness: 0.0,
      envMapIntensity: 0.7,
    }),

  /** Honed (satin) marble for walls, columns, plinths: some sheen, no mirror. */
  marbleWall: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.ivory,
      map: marbleMap(3, 1.2),
      roughness: 0.38,
      metalness: 0.0,
      envMapIntensity: 0.7,
    }),

  creamWall: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.cream,
      roughness: 0.88,
      metalness: 0.0,
      envMapIntensity: 0.35,
    }),

  /** Ceiling plaster: faint warm emissive stands in for the light bounce a real room would have. */
  plasterCeiling: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.ceiling,
      emissive: 0x9c8262,
      emissiveIntensity: 0.5,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.2,
    }),

  gold: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.gold,
      metalness: 1.0,
      roughness: 0.18,
      envMapIntensity: 1.6,
    }),

  brass: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.brass,
      metalness: 0.95,
      roughness: 0.3,
      envMapIntensity: 1.3,
    }),

  chrome: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.chrome,
      metalness: 1.0,
      roughness: 0.08,
      envMapIntensity: 1.5,
    }),

  /** Cheap glass: env reflections + alpha, no transmission pass (saves a full scene re-render). */
  glass: () =>
    new THREE.MeshStandardMaterial({
      color: 0xf4fbff,
      transparent: true,
      opacity: 0.24,
      roughness: 0.04,
      metalness: 0.0,
      envMapIntensity: 1.8,
      depthWrite: false,
    }),

  /** Walnut-toned shelving; darker than the old oak so cream/gold book spines pop. */
  oak: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.oak,
      map: woodMap(2, 2),
      roughness: 0.55,
      metalness: 0.0,
      envMapIntensity: 0.5,
    }),

  /** Lacquered dark wood: the foreground anchor from the still. Satin, not mirror, so reflections stay warm rather than grey. */
  mahogany: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.mahogany,
      map: woodMap(1.5, 1.5),
      roughness: 0.4,
      metalness: 0.0,
      envMapIntensity: 0.4,
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
