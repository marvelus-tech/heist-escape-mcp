import * as THREE from 'three';
import { PALETTE, lockEmissive, makeGlow, materials } from './materials';
import { skipOutline } from './focus-fx';

/**
 * Module B: procedural museum props (architecture + accents).
 * Every builder returns a Group positioned at its own origin; the caller places it.
 * Geometry is deliberately low-poly: this is projected onto a TV from a laptop.
 */

function box(w: number, h: number, d: number, material: THREE.Material, shadows = true): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  return mesh;
}

/** Fluted-look marble column with gold base and capital rings. */
export function column(height = 7.5, radius = 0.35): THREE.Group {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.06, height, 24), materials.marbleWall());
  shaft.position.y = height / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  const gold = materials.gold();
  for (const [y, r, h] of [[0.12, radius * 1.3, 0.24], [height - 0.12, radius * 1.25, 0.24]]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), gold);
    ring.position.y = y;
    ring.castShadow = true;
    group.add(ring);
  }
  return group;
}

/** Horizontal gold trim bar (crown moulding / dado rail). */
export function goldTrim(length: number, thickness = 0.12, depth = 0.14): THREE.Mesh {
  // Trims never cast: a 20 m rail throws a hard diagonal line across the back wall.
  return box(length, thickness, depth, materials.gold(), false);
}

/** Vertical marble-and-gold wainscot band along a wall face. */
export function wainscot(length: number, height = 1.1): THREE.Group {
  const group = new THREE.Group();
  const panel = box(length, height, 0.12, materials.marbleWall(), false);
  panel.position.y = height / 2;
  group.add(panel);
  const rail = goldTrim(length, 0.08, 0.16);
  rail.position.y = height + 0.04;
  group.add(rail);
  return group;
}

/**
 * Sunlit window: emissive daylight pane inside a brass frame with mullions.
 * The pane is emissive (not a light) so it costs nothing at runtime.
 */
export function brassWindow(width = 2.0, height = 3.0): THREE.Group {
  const group = new THREE.Group();
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.16, height - 0.16),
    lockEmissive(materials.emissive(0xfff6e6, 1.6))
  );
  pane.position.z = -0.02;
  group.add(pane);

  const brass = materials.brass();
  const t = 0.09;
  const edges: Array<[number, number, number, number]> = [
    [width, t, 0, height / 2],
    [width, t, 0, -height / 2],
    [t, height, -width / 2, 0],
    [t, height, width / 2, 0],
    [t * 0.7, height, 0, 0],
    [width, t * 0.7, 0, height * 0.2],
  ];
  for (const [w, h, x, y] of edges) {
    const bar = box(w, h, 0.12, brass);
    bar.position.set(x, y, 0.03);
    group.add(bar);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(width / 2, t / 2, 8, 24, Math.PI), brass);
  arch.position.y = height / 2;
  group.add(arch);
  const glow = makeGlow(0xfff3dc, Math.max(width, height) * 1.6, 0.18);
  glow.position.z = 0.15;
  group.add(glow);
  return group;
}

/** Marble plinth + brass-railed glass vitrine with a small gold artefact inside. */
export function displayCase(w = 1.2, h = 1.0, d = 0.9, artefact: 'sphere' | 'torus' | 'none' = 'sphere'): THREE.Group {
  const group = new THREE.Group();
  const plinthHeight = 0.95;
  const plinth = box(w, plinthHeight, d, materials.marbleWall());
  plinth.position.y = plinthHeight / 2;
  group.add(plinth);

  const cap = goldTrim(w + 0.04, 0.05, d + 0.04);
  cap.position.y = plinthHeight + 0.025;
  group.add(cap);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, h, d - 0.08), materials.glass());
  glass.position.y = plinthHeight + h / 2 + 0.05;
  group.add(glass);

  const brass = materials.brass();
  const y = plinthHeight + h + 0.05;
  for (const [sx, sz, len, axis] of [
    [0, d / 2, w, 'x'], [0, -d / 2, w, 'x'], [w / 2, 0, d, 'z'], [-w / 2, 0, d, 'z'],
  ] as Array<[number, number, number, 'x' | 'z']>) {
    const rail = axis === 'x' ? box(len, 0.04, 0.04, brass, false) : box(0.04, 0.04, len, brass, false);
    rail.position.set(sx, y, sz);
    group.add(rail);
  }

  if (artefact !== 'none') {
    const gold = lockEmissive(materials.gold());
    gold.emissive.setHex(PALETTE.gold);
    gold.emissiveIntensity = 0.12;
    const geometry = artefact === 'sphere'
      ? new THREE.SphereGeometry(0.16, 20, 16)
      : new THREE.TorusGeometry(0.16, 0.05, 10, 24);
    const item = new THREE.Mesh(geometry, gold);
    item.position.y = plinthHeight + 0.3;
    item.castShadow = true;
    group.add(item);
    const glow = makeGlow(PALETTE.gold, 0.9, 0.1);
    glow.position.copy(item.position);
    group.add(glow);
  }
  return group;
}

/** Brass wall sconce with warm bulb + glow sprite. */
export function sconce(): THREE.Group {
  const group = new THREE.Group();
  const brass = materials.brass();
  const back = box(0.18, 0.5, 0.06, brass, false);
  group.add(back);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8), brass);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, 0.1, 0.16);
  group.add(arm);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 12),
    lockEmissive(materials.emissive(0xfff0d0, 2.2))
  );
  bulb.position.set(0, 0.16, 0.32);
  group.add(bulb);
  const glow = makeGlow(0xffe6b8, 1.3, 0.22);
  glow.position.copy(bulb.position);
  group.add(glow);
  return group;
}

/** Gold inlay ring set flush in the marble floor (with a faint emissive shimmer). */
export function floorInlay(radius: number, width = 0.08): THREE.Mesh {
  const gold = lockEmissive(materials.gold());
  gold.emissive.setHex(PALETTE.gold);
  gold.emissiveIntensity = 0.08;
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius - width, radius, 96), gold);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  ring.receiveShadow = true;
  return ring;
}

/** Flush cyan LED floor strip (vault corridor guidance lighting). */
export function lightStrip(length: number, color: THREE.ColorRepresentation = PALETTE.cyan): THREE.Group {
  const group = new THREE.Group();
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.02, 0.06),
    lockEmissive(materials.emissive(color, 1.4))
  );
  strip.position.y = 0.01;
  group.add(strip);
  const glow = makeGlow(color, 1.2, 0.12);
  glow.scale.set(length, 0.9, 1);
  glow.position.y = 0.2;
  group.add(glow);
  return group;
}

/** Oak archive shelving with brass rails and cream/gold/rust book blocks. */
export function bookshelf(width = 3, height = 4): THREE.Group {
  const group = new THREE.Group();
  const oak = materials.oak();
  const depth = 0.45;
  const back = box(width, height, 0.05, oak);
  back.position.set(0, height / 2, -depth / 2);
  group.add(back);
  for (const x of [-width / 2, width / 2]) {
    const side = box(0.06, height, depth, oak);
    side.position.set(x, height / 2, 0);
    group.add(side);
  }
  const brass = materials.brass();
  const shelves = 4;
  const bookMaterials = [0xf1e8d6, 0xd9c39a, 0xb3624a, 0x8d9b7a, 0xc9a24a].map(
    color => new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
  );
  for (let i = 0; i <= shelves; i++) {
    const y = (i / shelves) * (height - 0.1) + 0.05;
    const shelf = box(width, 0.05, depth, oak);
    shelf.position.set(0, y, 0);
    group.add(shelf);
    if (i < shelves) {
      const rail = box(width - 0.12, 0.02, 0.02, brass, false);
      rail.position.set(0, y + 0.12, depth / 2 - 0.02);
      group.add(rail);
      let x = -width / 2 + 0.15;
      let c = i;
      while (x < width / 2 - 0.3) {
        const bw = 0.12 + ((c * 37) % 11) * 0.015;
        const bh = 0.5 + ((c * 53) % 7) * 0.04;
        const book = box(bw, bh, depth * 0.7, bookMaterials[c % bookMaterials.length], false);
        book.position.set(x + bw / 2, y + bh / 2 + 0.03, 0);
        group.add(book);
        x += bw + 0.02;
        c++;
      }
    }
  }
  return group;
}

/** Chrome vault door: outer chrome ring, gold inner ring, chrome face, gold spokes. */
export function vaultDoor(radius = 2.6): THREE.Group {
  const group = new THREE.Group();
  const chrome = materials.chrome();
  const gold = materials.gold();

  const outer = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.22, 16, 64), chrome);
  outer.castShadow = true;
  group.add(outer);

  const inner = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.1, 12, 64), gold);
  inner.position.z = 0.12;
  group.add(inner);

  const face = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.3, 64), chrome);
  face.rotation.x = Math.PI / 2;
  face.position.z = -0.05;
  face.receiveShadow = true;
  group.add(face);

  for (let i = 0; i < 6; i++) {
    const spoke = box(0.1, radius * 1.3, 0.08, gold, false);
    spoke.rotation.z = (i / 6) * Math.PI;
    spoke.position.z = 0.18;
    group.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 32), gold);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.22;
  group.add(hub);

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12), gold);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(a) * radius * 0.86, Math.sin(a) * radius * 0.86, 0.14);
    group.add(bolt);
  }
  return group;
}

/** Tiered marble pedestal with gold banding for the hero artefact. */
export function pedestal(): THREE.Group {
  const group = new THREE.Group();
  const marble = materials.marbleWall();
  const gold = materials.gold();
  const tiers: Array<[number, number]> = [[1.6, 0.12], [1.25, 0.28], [0.75, 0.6]];
  let y = 0;
  for (const [r, h] of tiers) {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), marble);
    tier.position.y = y + h / 2;
    tier.castShadow = true;
    tier.receiveShadow = true;
    group.add(tier);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.02, r + 0.02, 0.04, 48), gold);
    band.position.y = y + h;
    group.add(band);
    y += h;
  }
  group.userData.topY = y;
  return group;
}

export type GemVariant = 'pedestal' | 'authentic';

/**
 * Story bible: the pedestal stone is the display piece, slightly "too perfect",
 * so it sparkles cooler (ice-white body, pale gold light, faint cyan rays).
 * The authentic stone reads warmer, honest gold, with no cyan in its glow.
 */
const GEM_LOOKS: Record<GemVariant, {
  color: number; emissive: number; emissiveIntensity: number; envMapIntensity: number;
  core: number; halo: number; rays: number; light: number; scale: number;
}> = {
  pedestal: {
    color: 0xfff1d6, emissive: 0xffc966, emissiveIntensity: 0.6, envMapIntensity: 1.6,
    core: 0xfff0c8, halo: 0xffd27a, rays: 0xd8f3ff, light: 0xffd98a, scale: 1.7,
  },
  authentic: {
    color: 0xffc65a, emissive: 0xffa928, emissiveIntensity: 0.7, envMapIntensity: 1.2,
    core: 0xffd27a, halo: 0xffb636, rays: 0xffe2a6, light: 0xffc85c, scale: 0.55,
  },
};

/**
 * Brilliant-cut silhouette from a crown (truncated cone), table and pavilion
 * (inverted cone), glass body with a gold shimmer emissive, wrapped in layered
 * additive glows for the "bloom" without a post pass.
 */
export function sunburstDiamond(variant: GemVariant = 'pedestal'): THREE.Group {
  const look = GEM_LOOKS[variant];
  const group = new THREE.Group();
  const gem = lockEmissive(new THREE.MeshPhysicalMaterial({
    color: look.color,
    metalness: 0.0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.97,
    ior: 2.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: look.envMapIntensity,
    emissive: look.emissive,
    emissiveIntensity: look.emissiveIntensity,
    flatShading: true,
    side: THREE.DoubleSide,
  }));
  gem.userData.heroBaseEmissive = gem.emissiveIntensity;

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 0.16, 8, 1), gem);
  crown.position.y = 0.08;
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 8, 1), gem);
  table.position.y = 0.17;
  const pavilion = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.5, 8, 1), gem);
  pavilion.rotation.x = Math.PI;
  pavilion.position.y = -0.25;
  for (const part of [crown, table, pavilion]) {
    part.castShadow = true;
    group.add(part);
  }

  const core = makeGlow(look.core, 1.5, 0.32);
  const halo = makeGlow(look.halo, 3.4, 0.16);
  const rays = makeGlow(look.rays, 6.0, 0.07);
  core.name = halo.name = rays.name = 'hero-glow';
  group.add(core, halo, rays);

  if (variant === 'pedestal') {
    const light = new THREE.PointLight(look.light, 14, 9, 2);
    light.position.y = 0.4;
    group.add(light);
  }
  group.scale.setScalar(look.scale);
  return group;
}

/**
 * Hinged-reveal edge: a gold emissive rim sitting just proud of a wall frame,
 * plus a warm glow, so light appears to leak from behind the painting.
 */
export function revealEdge(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const rim = lockEmissive(materials.emissive(0xffd27a, 1.8));
  const t = 0.05;
  for (const [w, h, x, y] of [
    [width, t, 0, height / 2], [width, t, 0, -height / 2],
    [t, height, -width / 2, 0], [t, height, width / 2, 0],
  ]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), rim);
    bar.position.set(x, y, 0);
    group.add(bar);
  }
  const glow = makeGlow(0xffd27a, Math.max(width, height) * 1.5, 0.22);
  glow.name = 'reveal-glow';
  group.add(glow);
  return group;
}

/** Inactive security camera: brass wall mount, chrome body, dark unlit lens. No LED. */
export function securityCamera(): THREE.Group {
  const group = new THREE.Group();
  const brass = materials.brass();
  const chrome = materials.chrome();
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), brass);
  group.add(mount);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), brass);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, -0.04, 0.13);
  group.add(arm);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.3), chrome);
  body.position.set(0, -0.12, 0.3);
  body.rotation.x = 0.35;
  group.add(body);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.2, metalness: 0.4 })
  );
  lens.rotation.x = Math.PI / 2 + 0.35;
  lens.position.set(0, -0.17, 0.45);
  group.add(lens);
  return group;
}

let bannerTexture: THREE.CanvasTexture | null = null;

/** Gala banner: cream silk with gold serif lettering, hung from a brass rod. */
export function galaBanner(text = 'DIAMONDS THROUGH THE AGES', subtitle = 'GALA PREVIEW'): THREE.Group {
  const group = new THREE.Group();
  if (!bannerTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = '#f7f1e6';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#cfa64a';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, 988, 220);
    ctx.fillStyle = '#b8892f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Shrink the headline until it fits inside the gold border with a margin.
    let fontSize = 84;
    do {
      ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", serif`;
      fontSize -= 4;
    } while (ctx.measureText(text).width > 900 && fontSize > 24);
    ctx.fillText(text, 512, 112);
    ctx.font = '38px Georgia, "Times New Roman", serif';
    ctx.fillText(subtitle, 512, 196);
    bannerTexture = new THREE.CanvasTexture(canvas);
    bannerTexture.colorSpace = THREE.SRGBColorSpace;
    bannerTexture.anisotropy = 4;
  }
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 1.5),
    new THREE.MeshStandardMaterial({ map: bannerTexture, roughness: 0.9, side: THREE.DoubleSide })
  );
  cloth.position.y = -0.8;
  group.add(cloth);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6.4, 10), materials.brass());
  rod.rotation.z = Math.PI / 2;
  group.add(rod);
  for (const x of [-3.2, 3.2]) {
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), materials.gold());
    finial.position.x = x;
    group.add(finial);
  }
  return group;
}

/* ----------------------------------------------------------------------------
 * VIS-B hero props. Locked art brief: ornate dark-wood desk with gold carving,
 * crystal vase of lilies on gold stems, floating brass skeleton key.
 * Silhouettes first: every detail is sized to read from the Stage TV.
 * -------------------------------------------------------------------------- */

/** Height of the reception desk's writing surface; anything "on the desk" sits here. */
export const DESK_TOP_Y = 0.82;

/** Tiny deterministic PRNG for the wood grain (same streaks on every rebuild). */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

let woodTexture: THREE.CanvasTexture | null = null;

/** Dark walnut grain: near-black base with warm streaks drifting along X. */
function getWoodTexture(): THREE.CanvasTexture {
  if (woodTexture) return woodTexture;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const rand = seeded(4242);
  ctx.fillStyle = '#4a2c1c';
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const light = rand() > 0.45;
    ctx.strokeStyle = light
      ? `rgba(150, 96, 60, ${0.08 + rand() * 0.18})`
      : `rgba(28, 14, 8, ${0.12 + rand() * 0.25})`;
    ctx.lineWidth = 1 + rand() * 4;
    const y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(size * 0.3, y + (rand() - 0.5) * 24, size * 0.7, y + (rand() - 0.5) * 24, size + 20, y + (rand() - 0.5) * 10);
    ctx.stroke();
  }
  woodTexture = new THREE.CanvasTexture(canvas);
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.anisotropy = 4;
  return woodTexture;
}

/**
 * Polished dark walnut: the shared mahogany factory, deepened and grained
 * (palette untouched). Emissive is locked: the generic cyan interactable tint
 * turns dark wood teal, and the brief wants wood; focus outlines carry the cue.
 */
function darkWood(repeatX = 2, repeatY = 1): THREE.MeshStandardMaterial {
  const wood = lockEmissive(materials.mahogany());
  wood.color.multiplyScalar(0.7);
  const map = getWoodTexture().clone();
  map.repeat.set(repeatX, repeatY);
  map.needsUpdate = true;
  wood.map = map;
  wood.roughness = 0.3;
  wood.envMapIntensity = 0.9;
  return wood;
}

/**
 * Gold for carvings: keeps its own warm emissive (no cyan tint) and opts out of
 * focus hulls, because outlining fifty rosettes reads as noise, not a silhouette.
 */
function carvedGold(emissive = 0.1): THREE.MeshStandardMaterial {
  const gold = lockEmissive(skipOutline(materials.gold()));
  gold.emissive.setHex(PALETTE.gold);
  gold.emissiveIntensity = emissive;
  return gold;
}

/** Cylinder between two points (stems, struts). */
function strut(from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(to, from);
  const length = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6), material);
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

/** Four thin bars framing a rectangle in the XZ plane (leather border, drawer beading). */
function goldBeading(w: number, d: number, t: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  for (const [bw, bd, x, z] of [
    [w, t, 0, d / 2], [w, t, 0, -d / 2], [t, d, -w / 2, 0], [t, d, w / 2, 0],
  ]) {
    const bar = box(bw, t, bd, material, false);
    bar.position.set(x, 0, z);
    group.add(bar);
  }
  return group;
}

const plaqueTextures = new Map<string, THREE.CanvasTexture>();

/** Engraved brass desk plaque on a tilted stand ("GALLERY A / AUTHORIZED ACCESS ONLY" in the still). */
export function brassPlaque(title = 'GALLERY A', subtitle = 'AUTHORIZED ACCESS ONLY'): THREE.Group {
  const key = `${title}|${subtitle}`;
  let texture = plaqueTextures.get(key);
  if (!texture) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const brassGradient = ctx.createLinearGradient(0, 0, 512, 128);
    brassGradient.addColorStop(0, '#e6c77a');
    brassGradient.addColorStop(0.5, '#b8892f');
    brassGradient.addColorStop(1, '#d9b25c');
    ctx.fillStyle = brassGradient;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = 'rgba(60, 38, 12, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 492, 108);
    ctx.fillStyle = '#3a2610';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 56px Georgia, "Times New Roman", serif';
    ctx.fillText(title, 256, 50);
    ctx.font = '22px Georgia, "Times New Roman", serif';
    ctx.fillText(subtitle.split('').join(' '), 256, 98);
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    plaqueTextures.set(key, texture);
  }

  const group = new THREE.Group();
  const brass = lockEmissive(skipOutline(materials.brass()));
  const base = box(0.64, 0.02, 0.14, brass, false);
  base.position.set(0, 0.01, -0.04);
  group.add(base);

  // Tilt pivot at the bottom edge so the face leans back toward the TV camera.
  const tilt = new THREE.Group();
  tilt.rotation.x = -0.32;
  const body = box(0.62, 0.16, 0.02, brass, false);
  body.position.y = 0.09;
  tilt.add(body);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.15),
    lockEmissive(skipOutline(new THREE.MeshStandardMaterial({
      map: texture, metalness: 0.75, roughness: 0.35, envMapIntensity: 1.1,
    })))
  );
  face.position.set(0, 0.09, 0.011);
  tilt.add(face);
  group.add(tilt);
  return group;
}

/**
 * Ornate reception desk: polished dark walnut, gold beading, carved gold frieze,
 * three raised drawer fronts with ring pulls, torus-knot "acanthus" corners,
 * dark leather writing inset. Front face is +Z (toward the Stage camera).
 */
export function receptionDesk(width = 3.2, depth = 1.2): THREE.Group {
  const group = new THREE.Group();
  const wood = darkWood(2, 1);
  const gold = carvedGold();
  const topT = 0.07;
  const plinthH = 0.1;
  const bodyH = DESK_TOP_Y - topT - plinthH;
  const bodyY = plinthH + bodyH / 2;
  const frontZ = depth / 2 - 0.1;

  const plinth = box(width - 0.1, plinthH, depth - 0.1, gold);
  plinth.position.y = plinthH / 2;
  const body = box(width - 0.2, bodyH, depth - 0.2, wood);
  body.position.y = bodyY;
  const top = box(width, topT, depth, darkWood(3, 1));
  top.position.y = DESK_TOP_Y - topT / 2;
  const lip = box(width + 0.04, 0.025, depth + 0.04, gold, false);
  lip.position.y = DESK_TOP_Y - topT - 0.0125;
  group.add(plinth, body, top, lip);

  // Leather inset with gold border.
  const leather = lockEmissive(skipOutline(new THREE.MeshStandardMaterial({ color: 0x18231f, roughness: 0.55, metalness: 0 })));
  const insetW = width - 1.0;
  const insetD = depth - 0.5;
  const inset = box(insetW, 0.012, insetD, leather, false);
  inset.position.set(0, DESK_TOP_Y + 0.006, 0.02);
  const insetBorder = goldBeading(insetW + 0.03, insetD + 0.03, 0.025, gold);
  insetBorder.position.set(0, DESK_TOP_Y + 0.012, 0.02);
  group.add(inset, insetBorder);

  // Three raised drawer fronts with beading and ring pulls.
  const drawerW = (width - 0.5) / 3 - 0.1;
  const drawerH = bodyH - 0.34;
  for (const i of [-1, 0, 1]) {
    const x = i * (drawerW + 0.14);
    const panel = box(drawerW, drawerH, 0.03, wood, false);
    panel.position.set(x, bodyY - 0.06, frontZ + 0.015);
    group.add(panel);
    const beading = goldBeading(drawerW - 0.06, drawerH - 0.06, 0.02, gold);
    beading.rotation.x = Math.PI / 2;
    beading.position.set(x, bodyY - 0.06, frontZ + 0.035);
    group.add(beading);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 20), gold);
    ring.position.set(x, bodyY - 0.09, frontZ + 0.05);
    group.add(ring);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), gold);
    boss.position.set(x, bodyY - 0.03, frontZ + 0.045);
    group.add(boss);
  }

  // Carved frieze: rosettes marching along the top of the apron.
  const friezeY = plinthH + bodyH - 0.1;
  const rosetteRing = new THREE.TorusGeometry(0.028, 0.009, 6, 12);
  const rosetteCore = new THREE.SphereGeometry(0.016, 8, 6);
  for (let x = -width / 2 + 0.32; x <= width / 2 - 0.3; x += 0.2) {
    const ring = new THREE.Mesh(rosetteRing, gold);
    ring.position.set(x, friezeY, frontZ + 0.02);
    const core = new THREE.Mesh(rosetteCore, gold);
    core.position.set(x, friezeY, frontZ + 0.03);
    group.add(ring, core);
  }

  // Acanthus-style corner carvings + fluted gold pilasters on the front corners.
  const knot = new THREE.TorusKnotGeometry(0.055, 0.016, 48, 8);
  for (const x of [-width / 2 + 0.16, width / 2 - 0.16]) {
    const carving = new THREE.Mesh(knot, gold);
    carving.position.set(x, plinthH + bodyH - 0.08, frontZ + 0.04);
    carving.rotation.z = Math.PI / 2;
    group.add(carving);
    const pilaster = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, bodyH - 0.2, 10), gold);
    pilaster.position.set(x, plinthH + (bodyH - 0.2) / 2, frontZ + 0.03);
    group.add(pilaster);
  }

  const plaque = brassPlaque();
  plaque.position.set(width / 2 - 0.62, DESK_TOP_Y, depth / 2 - 0.2);
  plaque.rotation.y = -0.18;
  group.add(plaque);
  return group;
}

let petalGeometry: THREE.BufferGeometry | null = null;

/** Elongated pointed petal, base at the origin, tip along +Y. Shared across all lilies. */
function getPetalGeometry(): THREE.BufferGeometry {
  if (petalGeometry) return petalGeometry;
  const geometry = new THREE.SphereGeometry(1, 10, 8);
  geometry.scale(0.055, 0.17, 0.014);
  geometry.translate(0, 0.16, 0);
  geometry.computeVertexNormals();
  petalGeometry = geometry;
  return geometry;
}

/** One open lily: six petals in two tiers, three gold stamens with bright tips. */
function lily(petal: THREE.Material, gold: THREE.Material, tip: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geometry = getPetalGeometry();
  for (let i = 0; i < 6; i++) {
    const outer = i % 2 === 0;
    const mesh = new THREE.Mesh(geometry, petal);
    // 'YXZ': tilt outward about X first, then fan around the stem axis.
    mesh.rotation.set(outer ? 0.95 : 0.65, (i / 6) * Math.PI * 2, 0, 'YXZ');
    mesh.castShadow = false;
    group.add(mesh);
  }
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const to = new THREE.Vector3(Math.cos(angle) * 0.03, 0.13, Math.sin(angle) * 0.03);
    group.add(strut(new THREE.Vector3(0, 0.01, 0), to, 0.005, gold));
    const anther = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), tip);
    anther.position.copy(to);
    group.add(anther);
  }
  return group;
}

/**
 * Faceted crystal vase (lathe, flat-shaded) holding seven lilies on gold stems,
 * two buds and four gold leaves. Roughly 1.05 m tall so it reads beside the key.
 */
export function crystalVase(): THREE.Group {
  const group = new THREE.Group();

  // Faint fixed ice emissive instead of the generic cyan tint, so the body stays crystal.
  const crystal = lockEmissive(materials.glass());
  crystal.color.setHex(0xe6f7ff);
  crystal.emissive.setHex(0x9fe9ff);
  crystal.emissiveIntensity = 0.05;
  crystal.opacity = 0.5;
  crystal.roughness = 0.02;
  crystal.envMapIntensity = 2.4;
  crystal.flatShading = true;
  crystal.side = THREE.DoubleSide;
  const profile = [
    [0.0, 0], [0.11, 0], [0.15, 0.03], [0.18, 0.11], [0.17, 0.2],
    [0.12, 0.29], [0.095, 0.35], [0.115, 0.41], [0.145, 0.44],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const vaseGeometry = new THREE.LatheGeometry(profile, 12);
  const vase = new THREE.Mesh(vaseGeometry, crystal);
  vase.castShadow = false;
  vase.receiveShadow = false;
  group.add(vase);
  // Facet edges: thin white lines sell "cut crystal" for one draw call.
  const facets = new THREE.LineSegments(
    new THREE.EdgesGeometry(vaseGeometry, 12),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })
  );
  group.add(facets);

  // Stems/leaves stay pure gold: no tint, no hull (hulled stems read as cyan tubes).
  const gold = lockEmissive(skipOutline(materials.gold()));
  gold.emissive.setHex(PALETTE.gold);
  gold.emissiveIntensity = 0.1;
  const tip = lockEmissive(skipOutline(materials.gold()));
  tip.emissive.setHex(0xffd27a);
  tip.emissiveIntensity = 0.5;
  // Petals: opaque ice-white with a whisper of fixed cyan; the focus hull draws the neon edge.
  const petal = lockEmissive(new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.18, metalness: 0, envMapIntensity: 1.5,
    emissive: 0x9fe9ff, emissiveIntensity: 0.06, side: THREE.DoubleSide,
  }));

  const stemBase = new THREE.Vector3(0, 0.05, 0);
  const blooms: Array<[number, number, number, number, number, number]> = [
    // x, y, z, tiltX, tiltZ, scale
    [0.0, 1.02, 0.0, 0.0, 0.0, 1.0],
    [0.24, 0.9, 0.06, 0.55, 0.15, 0.95],
    [-0.22, 0.86, 0.12, 0.5, -0.35, 0.9],
    [0.06, 0.8, 0.25, 0.65, 0.05, 0.85],
    [-0.1, 0.84, -0.22, -0.5, -0.15, 0.85],
    [0.2, 0.72, -0.16, -0.35, 0.45, 0.8],
    [-0.26, 0.7, -0.04, 0.05, -0.55, 0.8],
  ];
  for (const [x, y, z, tiltX, tiltZ, scale] of blooms) {
    const head = new THREE.Vector3(x, y, z);
    const stemTop = head.clone().addScaledVector(new THREE.Vector3(0, 1, 0), -0.02);
    group.add(strut(new THREE.Vector3(x * 0.25, stemBase.y, z * 0.25), stemTop, 0.008, gold));
    const bloom = lily(petal, gold, tip);
    bloom.position.copy(head);
    bloom.rotation.set(tiltX, 0, tiltZ);
    bloom.scale.setScalar(scale);
    group.add(bloom);
  }

  // Closed buds and gold leaves for a fuller silhouette.
  for (const [x, y, z] of [[0.3, 0.62, -0.02], [-0.16, 0.6, 0.24]]) {
    const head = new THREE.Vector3(x, y, z);
    group.add(strut(new THREE.Vector3(x * 0.25, stemBase.y, z * 0.25), head, 0.007, gold));
    const bud = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), petal);
    bud.position.copy(head).add(new THREE.Vector3(0, 0.05, 0));
    bud.rotation.set(x * 0.6, 0, -z * 0.6);
    group.add(bud);
  }
  const leafGeometry = new THREE.ConeGeometry(0.035, 0.32, 5);
  leafGeometry.scale(1, 1, 0.25);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.4;
    const leaf = new THREE.Mesh(leafGeometry, gold);
    leaf.position.set(Math.cos(angle) * 0.12, 0.58, Math.sin(angle) * 0.12);
    leaf.rotation.set(Math.sin(angle) * 0.55, -angle, Math.cos(angle) * 0.55, 'YXZ');
    group.add(leaf);
  }
  return group;
}

/**
 * Brass skeleton key, bow (trefoil) at +Y, bit at -Y, centred on its middle so
 * the caller can tilt and spin it. Emissive gold so it stays warm under focus.
 */
export function skeletonKey(length = 0.75): THREE.Group {
  const group = new THREE.Group();
  const gold = lockEmissive(materials.gold());
  gold.color.setHex(0xe0b04a);
  gold.emissive.setHex(0xffc65a);
  gold.emissiveIntensity = 0.28;
  gold.roughness = 0.18;

  const shaftR = length * 0.03;
  const bowR = length * 0.13;
  const shaftLen = length - bowR * 2.2;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftR, shaftR * 0.9, shaftLen, 12), gold);
  shaft.position.y = shaftLen / 2;
  group.add(shaft);
  for (const y of [shaftLen * 0.3, shaftLen * 0.92]) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(shaftR * 1.35, shaftR * 0.5, 8, 16), gold);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = y;
    group.add(collar);
  }

  // Bow: ring plus three lobes (top, upper-left, upper-right) for the clover head.
  const bowY = shaftLen + bowR;
  const bow = new THREE.Mesh(new THREE.TorusGeometry(bowR, shaftR * 0.9, 10, 32), gold);
  bow.position.y = bowY;
  group.add(bow);
  for (const angle of [Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) {
    const lobe = new THREE.Mesh(new THREE.TorusGeometry(bowR * 0.42, shaftR * 0.75, 8, 20), gold);
    lobe.position.set(Math.cos(angle) * bowR * 1.15, bowY + Math.sin(angle) * bowR * 1.15, 0);
    group.add(lobe);
  }

  // Bit: stepped teeth on +X.
  const bit = box(shaftR * 5, shaftR * 4.6, shaftR * 1.2, gold);
  bit.position.set(shaftR * 2.6, shaftR * 3.2, 0);
  const tooth = box(shaftR * 2.4, shaftR * 2.2, shaftR * 1.3, gold);
  tooth.position.set(shaftR * 4.6, shaftR * 1.1, 0);
  group.add(bit, tooth);

  group.children.forEach(child => { child.position.y -= length / 2; });
  group.userData.gold = gold;
  return group;
}
