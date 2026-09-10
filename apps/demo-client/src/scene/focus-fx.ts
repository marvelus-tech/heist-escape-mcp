import * as THREE from 'three';
import { PALETTE } from './materials';

/**
 * Module VIS-B: "focus juice" for objects of interest.
 *
 *  - Ice-cyan neon outline: a back-face hull pushed out along the view-space
 *    normal (constant world width, so a 3 m desk and a 1 cm stem get the same
 *    line) with a rim falloff so the band concentrates at the silhouette and
 *    stays readable through glass.
 *  - Gold particle cloud: GPU-animated points swirling inside an ellipsoid.
 *    All motion runs in the vertex shader; the CPU only bumps one uniform.
 *
 * Everything is additive: FocusFx never mutates the target's own materials,
 * so it stacks safely on top of the SceneManager's interactable tint.
 */

export interface FocusStyle {
  /** Crisp core line colour. */
  color: THREE.ColorRepresentation;
  /** Soft additive halo line colour. */
  softColor: THREE.ColorRepresentation;
  /** Core line width in world units. */
  width: number;
  /** Halo line width in world units. */
  softWidth: number;
  opacity: number;
  softOpacity: number;
  /** Attach a gold particle cloud sized to the object. */
  particles: boolean;
}

export const ICE_CYAN = 0xa9f3ff;

export const FOCUS_STYLE: FocusStyle = {
  color: ICE_CYAN,
  softColor: PALETTE.cyan,
  width: 0.018,
  softWidth: 0.055,
  opacity: 0.95,
  softOpacity: 0.32,
  particles: false,
};

const BREATHE_PERIOD_MS = 2200;
const PULSE_BOOST = 0.9;

const OUTLINE_VERTEX = /* glsl */ `
  uniform float uWidth;
  varying float vRim;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    // normalMatrix already accounts for non-uniform scale, so the band is
    // uniform even on squashed petals.
    mv.xyz += n * uWidth;
    vRim = 1.0 - abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`;

const OUTLINE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRimPower;
  varying float vRim;
  void main() {
    float a = uOpacity * pow(clamp(vRim, 0.0, 1.0), uRimPower);
    gl_FragColor = vec4(uColor, a);
  }
`;

function outlineMaterial(
  color: THREE.ColorRepresentation,
  width: number,
  opacity: number,
  rimPower: number,
  additive: boolean
): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader: OUTLINE_VERTEX,
    fragmentShader: OUTLINE_FRAGMENT,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uWidth: { value: width },
      uOpacity: { value: opacity },
      uRimPower: { value: rimPower },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  material.name = 'focus-outline';
  material.userData.baseOpacity = opacity;
  material.userData.emissiveLocked = true;
  return material;
}

/** Meshes that are themselves effects (hulls, glow sprites) must not get outlined again. */
function isOutlineCandidate(child: THREE.Object3D): child is THREE.Mesh {
  if (!(child instanceof THREE.Mesh)) return false;
  if (child.name === 'interactable-outline' || child.name === 'focus-outline') return false;
  const material = child.material as THREE.Material;
  return material.name !== 'focus-outline' && !material.userData.noOutline;
}

/** Marks a material so focus hulls skip its meshes (tiny ornaments, plaques). */
export function skipOutline<T extends THREE.Material>(material: T): T {
  material.userData.noOutline = true;
  return material;
}

/**
 * Builds two hull copies (core + soft) of every mesh under `root`, parented
 * beside the source so they inherit its animation. Returns the created meshes
 * and the two shared materials for per-frame opacity control.
 */
export function createFocusOutline(root: THREE.Object3D, style: FocusStyle): {
  hulls: THREE.Mesh[];
  core: THREE.ShaderMaterial;
  soft: THREE.ShaderMaterial;
} {
  const core = outlineMaterial(style.color, style.width, style.opacity, 0.6, false);
  const soft = outlineMaterial(style.softColor, style.softWidth, style.softOpacity, 2.0, true);
  const sources: THREE.Mesh[] = [];
  // Collect first: adding hulls while traversing would visit the hulls too.
  root.traverse(child => { if (isOutlineCandidate(child)) sources.push(child); });

  const hulls: THREE.Mesh[] = [];
  for (const mesh of sources) {
    for (const material of [soft, core]) {
      const hull = new THREE.Mesh(mesh.geometry, material);
      hull.name = 'focus-outline';
      hull.position.copy(mesh.position);
      hull.quaternion.copy(mesh.quaternion);
      hull.scale.copy(mesh.scale);
      hull.renderOrder = material === core ? 2 : 1;
      mesh.parent?.add(hull);
      hulls.push(hull);
    }
  }
  return { hulls, core, soft };
}

export interface ParticleCloudOptions {
  count: number;
  /** Horizontal radius of the ellipsoid. */
  radius: number;
  /** Vertical extent of the ellipsoid. */
  height: number;
  color: THREE.ColorRepresentation;
  /** Base point size in world-ish units (scaled by distance in the shader). */
  size: number;
  opacity: number;
}

const PARTICLE_VERTEX = /* glsl */ `
  attribute float aRadius;
  attribute float aAngle;
  attribute float aY;
  attribute float aSpeed;
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uHeight;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    float half = uHeight * 0.5;
    // Slow rise with wrap-around; the ellipsoid envelope pinches the radius
    // toward the top and bottom so the cloud stays egg-shaped, not a tube.
    float y = mod(aY + uTime * aSpeed * 0.12, uHeight) - half;
    float t = y / half;
    float envelope = sqrt(max(1.0 - t * t, 0.0));
    float r = aRadius * envelope;
    float angle = aAngle + uTime * aSpeed * 0.6;
    vec3 p = vec3(cos(angle) * r, y, sin(angle) * r);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float twinkle = 0.5 + 0.5 * sin(uTime * (2.5 + aSpeed * 2.0) + aPhase);
    vAlpha = (0.35 + 0.65 * twinkle) * smoothstep(0.0, 0.25, 1.0 - abs(t));
    gl_PointSize = aSize * uPixelRatio * (0.7 + 0.5 * twinkle) * (420.0 / max(-mv.z, 0.1));
    gl_Position = projectionMatrix * mv;
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = 1.0 - d;
    a *= a;
    // Hot near-white centre so the densest motes read as sparks, not dust.
    vec3 color = mix(uColor, vec3(1.0, 0.97, 0.88), smoothstep(0.55, 0.0, d) * 0.65);
    gl_FragColor = vec4(color, a * vAlpha * uOpacity);
  }
`;

/**
 * Gold mote cloud as a single Points draw call. Positions are procedural in
 * the vertex shader from per-particle (radius, angle, y, speed) seeds, so
 * animation costs one uniform write per frame.
 */
export function goldParticleCloud(options: Partial<ParticleCloudOptions> = {}): THREE.Points {
  const opts: ParticleCloudOptions = {
    count: 700,
    radius: 0.55,
    height: 1.6,
    color: 0xffcf6a,
    size: 0.05,
    opacity: 0.9,
    ...options,
  };
  const n = opts.count;
  const radius = new Float32Array(n);
  const angle = new Float32Array(n);
  const y = new Float32Array(n);
  const speed = new Float32Array(n);
  const size = new Float32Array(n);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // pow < 1 biases motes toward the core where the key sits.
    radius[i] = opts.radius * Math.pow(Math.random(), 0.7);
    angle[i] = Math.random() * Math.PI * 2;
    y[i] = Math.random() * opts.height;
    speed[i] = 0.4 + Math.random() * 1.2;
    // Mostly fine dust with a handful of larger sparks.
    size[i] = opts.size * (Math.random() < 0.08 ? 2.2 + Math.random() * 1.4 : 0.6 + Math.random() * 0.9);
    phase[i] = Math.random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  // Real position is computed in the shader; three still needs the attribute for bounds.
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geometry.setAttribute('aRadius', new THREE.BufferAttribute(radius, 1));
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
  geometry.setAttribute('aY', new THREE.BufferAttribute(y, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.max(opts.radius, opts.height / 2) + 0.2);

  const material = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERTEX,
    fragmentShader: PARTICLE_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uHeight: { value: opts.height },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2) },
      uColor: { value: new THREE.Color(opts.color) },
      uOpacity: { value: opts.opacity },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.name = 'gold-particles';
  const points = new THREE.Points(geometry, material);
  points.name = 'gold-particles';
  points.frustumCulled = false;
  return points;
}

interface FocusEntry {
  root: THREE.Object3D;
  hulls: THREE.Mesh[];
  core: THREE.ShaderMaterial;
  soft: THREE.ShaderMaterial;
  particles: THREE.Points | null;
  phase: number;
  pulseStart: number | null;
  pulseDuration: number;
}

/**
 * Owns the focus treatment for a set of objects. Stage can call
 * `add`/`remove`/`set` as the story moves the spotlight around.
 */
export class FocusFx {
  private entries = new Map<THREE.Object3D, FocusEntry>();

  has(root: THREE.Object3D): boolean {
    return this.entries.has(root);
  }

  add(root: THREE.Object3D, style: Partial<FocusStyle> = {}): void {
    if (this.entries.has(root)) return;
    const resolved: FocusStyle = { ...FOCUS_STYLE, ...style };
    const { hulls, core, soft } = createFocusOutline(root, resolved);

    let particles: THREE.Points | null = null;
    if (resolved.particles) {
      root.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(root);
      const size = bounds.getSize(new THREE.Vector3());
      particles = goldParticleCloud({
        radius: Math.max(size.x, size.z) * 0.9 + 0.2,
        height: size.y * 1.8 + 0.6,
      });
      // Local-space centre so the cloud follows the object's bob/spin.
      particles.position.copy(root.worldToLocal(bounds.getCenter(new THREE.Vector3())));
      particles.position.y -= size.y * 0.25;
      root.add(particles);
    }

    this.entries.set(root, {
      root, hulls, core, soft, particles,
      phase: Math.random() * Math.PI * 2,
      pulseStart: null,
      pulseDuration: 1400,
    });
  }

  remove(root: THREE.Object3D): void {
    const entry = this.entries.get(root);
    if (!entry) return;
    entry.hulls.forEach(hull => hull.removeFromParent());
    entry.core.dispose();
    entry.soft.dispose();
    if (entry.particles) {
      entry.particles.removeFromParent();
      entry.particles.geometry.dispose();
      (entry.particles.material as THREE.Material).dispose();
    }
    this.entries.delete(root);
  }

  /** Replace the focus set wholesale (objects not in `roots` lose their treatment). */
  set(roots: THREE.Object3D[], style: Partial<FocusStyle> = {}): void {
    for (const root of [...this.entries.keys()]) {
      if (!roots.includes(root)) this.remove(root);
    }
    roots.forEach(root => this.add(root, style));
  }

  /** Forget everything without touching the scene graph (the caller is disposing it). */
  clear(): void {
    this.entries.clear();
  }

  /** Examine flash: outline brightens then settles over `durationMs`. */
  pulse(root: THREE.Object3D, durationMs = 1400): void {
    const entry = this.entries.get(root);
    if (!entry) return;
    entry.pulseStart = performance.now();
    entry.pulseDuration = durationMs;
  }

  update(nowMs: number, reducedMotion: boolean): void {
    const seconds = nowMs / 1000;
    this.entries.forEach(entry => {
      let boost = 0;
      if (entry.pulseStart !== null) {
        const progress = Math.min((nowMs - entry.pulseStart) / entry.pulseDuration, 1);
        boost = Math.sin(progress * Math.PI) * PULSE_BOOST;
        if (progress >= 1) entry.pulseStart = null;
      }
      const breathe = reducedMotion
        ? 0
        : Math.sin(entry.phase + (nowMs / BREATHE_PERIOD_MS) * Math.PI * 2);
      const gain = 1 + breathe * 0.12 + boost;
      entry.core.uniforms.uOpacity.value = Math.min((entry.core.userData.baseOpacity as number) * gain, 1);
      entry.soft.uniforms.uOpacity.value = (entry.soft.userData.baseOpacity as number) * gain;
      if (entry.particles && !reducedMotion) {
        (entry.particles.material as THREE.ShaderMaterial).uniforms.uTime.value = seconds;
      }
    });
  }
}
