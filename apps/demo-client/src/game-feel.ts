/**
 * Game Feel Layer for Heist Escape
 * 
 * Provides juice/polish effects:
 * - Camera shake (trauma²)
 * - Hitstop helper
 * - Particle burst pool
 * - Web Audio stingers
 * 
 * Respects prefer-reduced-motion
 */

import * as THREE from 'three';

// Juice tier constants
export const JuiceTier = {
  SMALL: { trauma: 0.1, hitstop: 0, particles: 5 },
  MEDIUM: { trauma: 0.35, hitstop: 50, particles: 15 },
  LARGE: { trauma: 0.7, hitstop: 100, particles: 30 }
} as const;

export class GameFeel {
  private camera: THREE.Camera;
  private audioContext: AudioContext | null = null;
  private audioUnlocked = false;
  private prefersReducedMotion: boolean;
  
  // Camera shake state
  private trauma = 0;
  private traumaDecay = 1.0; // per second
  private maxShakeAngle = 0.15; // radians
  private maxShakeOffset = 0.3; // world units
  private originalCameraPosition = new THREE.Vector3();
  private originalCameraRotation = new THREE.Euler();
  
  // Hitstop state
  private hitstopTimeRemaining = 0;
  
  // Particle pool
  private particlePool: THREE.Mesh[] = [];
  private activeParticles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; maxLife: number }[] = [];
  private scene: THREE.Scene;
  
  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
    
    // Check for reduced motion preference
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Store original camera transform
    this.originalCameraPosition.copy(camera.position);
    this.originalCameraRotation.copy(camera.rotation);
    
    // Initialize particle pool
    this.initParticlePool();
    
    // Initialize audio on user gesture
    this.initAudio();
  }
  
  private initParticlePool(): void {
    const particleGeometry = new THREE.SphereGeometry(0.05, 6, 6);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700, // Gold
      transparent: true,
      opacity: 1
    });
    
    // Create pool of 50 particles
    for (let i = 0; i < 50; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      particle.visible = false;
      this.scene.add(particle);
      this.particlePool.push(particle);
    }
  }
  
  private initAudio(): void {
    // Unlock audio on first user interaction
    const unlockAudio = () => {
      if (!this.audioUnlocked) {
        try {
          this.audioContext = new AudioContext();
          this.audioUnlocked = true;
          document.removeEventListener('click', unlockAudio);
          document.removeEventListener('touchstart', unlockAudio);
          document.removeEventListener('keydown', unlockAudio);
        } catch (e) {
          console.warn('Web Audio not supported:', e);
        }
      }
    };
    
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
  }
  
  /**
   * Add camera shake trauma (0-1 range)
   */
  addTrauma(amount: number): void {
    if (this.prefersReducedMotion) return;
    this.trauma = Math.min(this.trauma + amount, 1.0);
  }
  
  /**
   * Trigger hitstop (frame freeze in milliseconds)
   */
  addHitstop(durationMs: number): void {
    if (this.prefersReducedMotion) return;
    this.hitstopTimeRemaining = Math.max(this.hitstopTimeRemaining, durationMs);
  }
  
  /**
   * Emit particle burst at world position
   */
  emitParticles(position: THREE.Vector3, count: number, color?: number): void {
    if (this.prefersReducedMotion) return;
    
    const actualCount = Math.min(count, this.particlePool.length - this.activeParticles.length);
    
    for (let i = 0; i < actualCount; i++) {
      const particle = this.particlePool.find(p => !p.visible);
      if (!particle) break;
      
      // Randomize spawn
      particle.position.copy(position);
      particle.position.x += (Math.random() - 0.5) * 0.3;
      particle.position.y += (Math.random() - 0.5) * 0.3;
      particle.position.z += (Math.random() - 0.5) * 0.3;
      
      // Random velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 3
      );
      
      // Set color
      if (color !== undefined) {
        (particle.material as THREE.MeshBasicMaterial).color.setHex(color);
      } else {
        (particle.material as THREE.MeshBasicMaterial).color.setHex(0xffd700); // Gold default
      }
      
      (particle.material as THREE.MeshBasicMaterial).opacity = 1;
      particle.visible = true;
      
      const maxLife = 0.8 + Math.random() * 0.4; // 0.8-1.2 seconds
      this.activeParticles.push({ mesh: particle, velocity, life: maxLife, maxLife });
    }
  }
  
  /**
   * Play short audio stinger with pitch variation
   */
  playStinger(type: 'click' | 'success' | 'pickup' | 'unlock'): void {
    if (!this.audioContext || !this.audioUnlocked) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Create oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Configure based on type
    let frequency = 440;
    let duration = 0.1;
    let volume = 0.15;
    
    switch (type) {
      case 'click':
        frequency = 800 + Math.random() * 200; // 800-1000 Hz
        duration = 0.05;
        volume = 0.08;
        break;
      case 'success':
        frequency = 660 + Math.random() * 100; // C5 + variation
        duration = 0.2;
        volume = 0.12;
        break;
      case 'pickup':
        frequency = 880 + Math.random() * 100; // A5 + variation
        duration = 0.15;
        volume = 0.1;
        break;
      case 'unlock':
        frequency = 523 + Math.random() * 100; // C5 + variation
        duration = 0.25;
        volume = 0.15;
        break;
    }
    
    // Apply pitch variation (±10%)
    frequency *= 0.9 + Math.random() * 0.2;
    
    osc.frequency.setValueAtTime(frequency, now);
    osc.type = type === 'success' || type === 'unlock' ? 'sine' : 'square';
    
    // Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.start(now);
    osc.stop(now + duration);
  }
  
  /**
   * Trigger juice effect by tier
   */
  juice(tier: keyof typeof JuiceTier, position?: THREE.Vector3, soundType?: 'click' | 'success' | 'pickup' | 'unlock'): void {
    const config = JuiceTier[tier];
    
    this.addTrauma(config.trauma);
    this.addHitstop(config.hitstop);
    
    if (position && config.particles > 0) {
      this.emitParticles(position, config.particles);
    }
    
    if (soundType) {
      this.playStinger(soundType);
    }
  }
  
  /**
   * Update loop (call every frame)
   * Returns true if hitstop is active (should skip game logic)
   */
  update(deltaTime: number): boolean {
    // Handle hitstop
    if (this.hitstopTimeRemaining > 0) {
      this.hitstopTimeRemaining -= deltaTime * 1000;
      return true; // Skip game logic during hitstop
    }
    
    // Update camera shake
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.traumaDecay * deltaTime);
      
      // trauma² falloff
      const shake = this.trauma * this.trauma;
      
      // Random shake offsets
      const shakeAngle = this.maxShakeAngle * shake * (Math.random() - 0.5) * 2;
      const shakeOffsetX = this.maxShakeOffset * shake * (Math.random() - 0.5) * 2;
      const shakeOffsetY = this.maxShakeOffset * shake * (Math.random() - 0.5) * 2;
      
      // Apply to camera
      this.camera.position.copy(this.originalCameraPosition);
      this.camera.position.x += shakeOffsetX;
      this.camera.position.y += shakeOffsetY;
      
      this.camera.rotation.copy(this.originalCameraRotation);
      this.camera.rotation.z += shakeAngle;
    } else {
      // Reset to original position
      this.camera.position.copy(this.originalCameraPosition);
      this.camera.rotation.copy(this.originalCameraRotation);
    }
    
    // Update particles
    const gravity = -9.8;
    const toRemove: number[] = [];
    
    this.activeParticles.forEach((particle, index) => {
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        particle.mesh.visible = false;
        toRemove.push(index);
        return;
      }
      
      // Physics
      particle.velocity.y += gravity * deltaTime;
      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      
      // Fade out
      const alpha = particle.life / particle.maxLife;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
    });
    
    // Remove dead particles
    toRemove.reverse().forEach(i => this.activeParticles.splice(i, 1));
    
    return false; // Not in hitstop
  }
  
  /**
   * Store current camera transform as baseline
   */
  setCameraBaseline(): void {
    this.originalCameraPosition.copy(this.camera.position);
    this.originalCameraRotation.copy(this.camera.rotation);
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.particlePool.forEach(p => {
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
      this.scene.remove(p);
    });
    this.particlePool = [];
    this.activeParticles = [];
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
