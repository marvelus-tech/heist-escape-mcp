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

/**
 * The Sunburst Diamond: brilliant-cut silhouette from a crown (truncated cone)
 * and pavilion (inverted cone), champagne glass body with a gold shimmer
 * emissive, wrapped in layered additive glows for the "bloom" without a post pass.
 */
export function sunburstDiamond(): THREE.Group {
  const group = new THREE.Group();
  const gem = lockEmissive(new THREE.MeshPhysicalMaterial({
    color: 0xffc65a,
    metalness: 0.0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.97,
    ior: 2.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.2,
    emissive: 0xffa928,
    emissiveIntensity: 0.7,
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

  const core = makeGlow(0xffd27a, 1.5, 0.32);
  const halo = makeGlow(0xffb636, 3.4, 0.16);
  const rays = makeGlow(0xffe2a6, 6.0, 0.07);
  core.name = halo.name = rays.name = 'hero-glow';
  group.add(core, halo, rays);

  const light = new THREE.PointLight(0xffc85c, 14, 9, 2);
  light.position.y = 0.4;
  group.add(light);
  group.scale.setScalar(1.7);
  return group;
}
