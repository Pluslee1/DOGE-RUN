import * as THREE from 'three';
import { CONFIG } from './config.js';

export class SmokeEmitter {
  constructor({ count, color, spawnRate, lifeSeconds, riseSpeed, spread, startSize, endSize, pointScale }) {
    this.count = count;
    this.spawnRate = spawnRate;
    this.lifeSeconds = lifeSeconds;
    this.riseSpeed = riseSpeed;
    this.spread = spread;
    this.startSize = startSize;
    this.endSize = endSize;
    this.spawnAccumulator = 0;
    this.nextParticle = 0;
    this.enabled = false;
    this.ages = new Float32Array(count).fill(lifeSeconds + 1);
    this.lifetimes = new Float32Array(count);
    this.velocities = Array.from({ length: count }, () => new THREE.Vector3());
    this.positions = new Float32Array(count * 3);
    this.alphas = new Float32Array(count);
    this.sizes = new Float32Array(count);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('particleAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geometry.setAttribute('particleSize', new THREE.BufferAttribute(this.sizes, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        smokeColor: { value: new THREE.Color(color) },
        pointScale: { value: pointScale },
      },
      vertexShader: `
        attribute float particleAlpha;
        attribute float particleSize;
        uniform float pointScale;
        varying float vAlpha;
        void main() {
          vAlpha = particleAlpha;
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = particleSize * (pointScale / max(${CONFIG.crash.smokeMinimumViewDepth.toFixed(1)}, -viewPosition.z));
        }
      `,
      fragmentShader: `
        uniform vec3 smokeColor;
        varying float vAlpha;
        void main() {
          float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
          float edge = 1.0 - smoothstep(${CONFIG.crash.smokeFeatherInnerRadius.toFixed(2)}, 1.0, radius);
        gl_FragColor = vec4(smokeColor, vAlpha * edge * ${CONFIG.crash.smokeAlpha.toFixed(2)});
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.points.visible = enabled || this.ages.some((age) => age <= this.lifeSeconds);
  }

  reset() {
    this.enabled = false;
    this.spawnAccumulator = 0;
    this.ages.fill(this.lifeSeconds + 1);
    this.alphas.fill(0);
    this.sizes.fill(0);
    this.geometry.attributes.particleAlpha.needsUpdate = true;
    this.geometry.attributes.particleSize.needsUpdate = true;
    this.points.visible = false;
  }

  update(dt) {
    if (!this.enabled && !this.points.visible) return;
    if (this.enabled) {
      this.spawnAccumulator += dt * this.spawnRate;
      while (this.spawnAccumulator >= 1) {
        this.spawnParticle();
        this.spawnAccumulator -= 1;
      }
    }

    let anyVisible = false;
    for (let index = 0; index < this.count; index++) {
      let age = this.ages[index];
      if (age > this.lifeSeconds) {
        this.alphas[index] = 0;
        continue;
      }
      age += dt;
      if (age >= this.lifetimes[index]) {
        this.ages[index] = this.lifeSeconds + 1;
        this.alphas[index] = 0;
        continue;
      }
      this.ages[index] = age;
      const progress = age / this.lifetimes[index];
      const offset = index * 3;
      const velocity = this.velocities[index];
      this.positions[offset] += velocity.x * dt;
      this.positions[offset + 1] += velocity.y * dt;
      this.positions[offset + 2] += velocity.z * dt;
      this.alphas[index] = Math.max(0, 1 - progress);
      this.sizes[index] = this.startSize + (this.endSize - this.startSize) * progress;
      anyVisible ||= this.alphas[index] > 0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.particleAlpha.needsUpdate = true;
    this.geometry.attributes.particleSize.needsUpdate = true;
    this.points.visible = this.enabled || anyVisible;
  }

  spawnParticle() {
    const index = this.nextParticle;
    this.nextParticle = (this.nextParticle + 1) % this.count;
    const offset = index * 3;
    this.ages[index] = 0;
    this.lifetimes[index] = this.lifeSeconds * (
      CONFIG.crash.smokeLifetimeMinRatio + Math.random() * CONFIG.crash.smokeLifetimeRangeRatio
    );
    this.positions[offset] = (Math.random() - 0.5) * this.spread * CONFIG.crash.smokeSpawnSpreadRatio;
    this.positions[offset + 1] = 0;
    this.positions[offset + 2] = (Math.random() - 0.5) * this.spread * CONFIG.crash.smokeSpawnSpreadRatio;
    this.velocities[index].set(
      (Math.random() - 0.5) * this.spread,
      this.riseSpeed * (CONFIG.crash.smokeRiseSpeedMinRatio + Math.random() * CONFIG.crash.smokeRiseSpeedRangeRatio),
      (Math.random() - 0.5) * this.spread,
    );
    this.alphas[index] = 1;
    this.sizes[index] = this.startSize;
  }
}
