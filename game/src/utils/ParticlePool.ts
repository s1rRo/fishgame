// ============================================================
// PARTICLE POOL — переиспользование Points для эффектов
// River Lord: Pixel Fishery
// Лимит: 500 desktop / 200 mobile
// ============================================================

import * as THREE from 'three';

interface PoolParticle {
  active: boolean;
  life: number;    // оставшееся время жизни (сек)
  maxLife: number;
  velocity: THREE.Vector3;
  color: THREE.Color;
}

const IS_MOBILE = /Android|iPhone|iPad/i.test(navigator.userAgent);
const MAX_PARTICLES = IS_MOBILE ? 200 : 500;

export class ParticlePool {
  private static instance: ParticlePool;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private particles: PoolParticle[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  private constructor() {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;

    // Инициализация пула
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 0,
        velocity: new THREE.Vector3(),
        color: new THREE.Color(1, 1, 1),
      });
      // Спрятать за пределы видимости
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = -1000;
      this.positions[i * 3 + 2] = 0;
    }
  }

  static getInstance(): ParticlePool {
    if (!ParticlePool.instance) {
      ParticlePool.instance = new ParticlePool();
    }
    return ParticlePool.instance;
  }

  /** Получить Points mesh для добавления в сцену */
  getPoints(): THREE.Points {
    return this.points;
  }

  /** Спавн частиц */
  emit(options: {
    position: THREE.Vector3;
    count: number;
    color?: THREE.Color;
    speed?: number;
    life?: number;
    spread?: number;
  }): void {
    const { position, count, color, speed = 2, life = 1, spread = 1 } = options;
    const c = color ?? new THREE.Color(1, 1, 1);
    let spawned = 0;

    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      if (this.particles[i].active) continue;

      const p = this.particles[i];
      p.active = true;
      p.life = life;
      p.maxLife = life;
      p.color.copy(c);

      // Позиция
      this.positions[i * 3] = position.x + (Math.random() - 0.5) * spread * 0.5;
      this.positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * spread * 0.5;
      this.positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * spread * 0.5;

      // Скорость — случайное направление
      p.velocity.set(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.5 + speed * 0.3,
        (Math.random() - 0.5) * speed,
      );

      // Цвет
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;

      this.sizes[i] = 0.15;
      spawned++;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  /** Обновление каждый кадр */
  update(delta: number): void {
    let dirty = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        this.positions[i * 3 + 1] = -1000;
        dirty = true;
        continue;
      }

      // Движение
      this.positions[i * 3] += p.velocity.x * delta;
      this.positions[i * 3 + 1] += p.velocity.y * delta;
      this.positions[i * 3 + 2] += p.velocity.z * delta;

      // Гравитация
      p.velocity.y -= 3 * delta;

      // Fade
      const t = p.life / p.maxLife;
      this.colors[i * 3] = p.color.r * t;
      this.colors[i * 3 + 1] = p.color.g * t;
      this.colors[i * 3 + 2] = p.color.b * t;
      this.sizes[i] = 0.15 * t;

      dirty = true;
    }

    if (dirty) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  /** Количество активных частиц */
  getActiveCount(): number {
    return this.particles.filter(p => p.active).length;
  }

  /** Убить все частицы */
  clear(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].active = false;
      this.positions[i * 3 + 1] = -1000;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  /** Dispose */
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  // ── Preset Effects ──────────────────────────────────────────

  /** Gold coins burst */
  emitCoins(position: THREE.Vector3, count = 12): void {
    this.emit({ position, count, color: new THREE.Color(0xf1c40f), speed: 2.5, life: 1.2, spread: 0.5 });
  }

  /** Gem sparkle */
  emitGems(position: THREE.Vector3, count = 8): void {
    this.emit({ position, count, color: new THREE.Color(0x8e44ad), speed: 2, life: 1.0, spread: 0.4 });
  }

  /** Smoke puff */
  emitSmoke(position: THREE.Vector3, count = 15): void {
    this.emit({ position, count, color: new THREE.Color(0x95a5a6), speed: 0.8, life: 1.5, spread: 0.8 });
  }

  /** Confetti celebration */
  emitConfetti(position: THREE.Vector3, count = 25): void {
    const colors = [0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71, 0x9b59b6];
    for (const hex of colors) {
      this.emit({ position, count: Math.ceil(count / colors.length), color: new THREE.Color(hex), speed: 3, life: 2.0, spread: 1.2 });
    }
  }

  /** Hearts floating up */
  emitHearts(position: THREE.Vector3, count = 6): void {
    this.emit({ position, count, color: new THREE.Color(0xe74c3c), speed: 1.2, life: 1.8, spread: 0.6 });
  }

  /** Leaves drifting */
  emitLeaves(position: THREE.Vector3, count = 10): void {
    this.emit({ position, count, color: new THREE.Color(0x27ae60), speed: 0.6, life: 2.5, spread: 1.5 });
  }
}
