import * as THREE from 'three';
import { PALETTE, lockEmissive, makeGlow, materials } from './materials';

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
