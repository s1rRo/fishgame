// ============================================================
// LOW POLY STYLE UTILITY — River Lord: Pixel Fishery
// Централизованное применение low-poly pixel art стиля
// flatShading: true → crisp, кристальный low-poly вид
// ============================================================
import * as THREE from 'three';
import { texMat } from './TextureCache';

// ── Палитра игры ─────────────────────────────────────────────
export const LP = {
  // Земля / природа
  water:      0x2980b9,
  waterDeep:  0x1a5276,
  waterLight: 0x5dade2,
  grass:      0x27ae60,
  grassDark:  0x1e8449,
  sand:       0xd4ac0d,
  rock:       0x7f8c8d,
  snow:       0xecf0f1,
  earth:      0x935116,
  // Постройки
  wood:       0x8B4513,
  woodLight:  0xa0522d,
  roof:       0x922b21,
  stone:      0x626567,
  // Персонажи
  skin:       0xf0c891,
  shirtBlue:  0x2980b9,
  shirtGreen: 0x27ae60,
  hat:        0x2c3e50,
  // Акценты
  gold:       0xf1c40f,
  gem:        0x8e44ad,
  glow:       0x3498db,
};

// ── Создать flat-shading материал ─────────────────────────────
export function matLP(color: number, opts?: { transparent?: boolean; opacity?: number; emissive?: number }): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.85,
    metalness: 0.05,
    transparent: opts?.transparent ?? false,
    opacity: opts?.opacity ?? 1.0,
    emissive: opts?.emissive !== undefined ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts?.emissive !== undefined ? 0.15 : 0,
  });
}

// ── Применить flatShading ко всей сцене ──────────────────────
export function applyLowPolyToScene(scene: THREE.Scene): void {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(m => {
      if (m instanceof THREE.MeshLambertMaterial || m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhongMaterial) {
        (m as THREE.MeshStandardMaterial).flatShading = true;
        m.needsUpdate = true;
      }
    });
  });
}

// ── Создать low-poly воду ─────────────────────────────────────
export function createWaterPlane(w: number, d: number, color = LP.water, opacity = 0.82): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, d, Math.ceil(w / 3), Math.ceil(d / 3));
  // Случайные смещения вершин по Y для low-poly вида воды
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, (Math.random() - 0.5) * 0.08);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color, flatShading: true, transparent: true, opacity,
    roughness: 0.3, metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// ── Создать low-poly дерево ───────────────────────────────────
export function createTree(scale = 1.0, variant = 1): THREE.Group {
  const g = new THREE.Group();
  // Ствол (с текстурой коры)
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2 * scale, 0.28 * scale, 1.4 * scale, 5),
    texMat('tree_bark', { color: LP.wood, repeatX: 1, repeatY: 2 })
  );
  trunk.position.y = 0.7 * scale;
  g.add(trunk);

  // 11 вариантов крон (с текстурой листвы)
  const v = ((variant - 1) % 11) + 1;
  const crownColors = [0x1e8449, 0x27ae60, 0x2ecc71];
  const leafMat = (c: number) => texMat('leaves', { color: c });

  if (v <= 3) {
    // Конические ёлки (1-3 слоя)
    const layers = v;
    for (let i = 0; i < layers; i++) {
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry((1.2 - i * 0.2) * scale, (1.4 - i * 0.2) * scale, 6),
        leafMat(crownColors[i % 3])
      );
      crown.position.y = (1.8 + i * 0.9) * scale;
      g.add(crown);
    }
  } else if (v <= 5) {
    // Сферические кусты
    const count = v === 4 ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.7 * scale, 0),
        leafMat(crownColors[i % 3])
      );
      crown.position.set(i * 0.3 * scale, (2.0 + i * 0.5) * scale, 0);
      g.add(crown);
    }
  } else if (v <= 7) {
    // Цилиндрические (пальма)
    const crownMat = texMat('tinyleaves', { color: v === 6 ? 0x1e8449 : 0x27ae60 });
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.15 * scale, 0.06 * scale, 0.9 * scale),
        crownMat
      );
      const a = (i / 4) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.3 * scale, 2.2 * scale, Math.sin(a) * 0.3 * scale);
      leaf.rotation.set(0.4, a, 0);
      g.add(leaf);
    }
  } else if (v <= 9) {
    // Широкие дубы (box crown)
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(1.6 * scale, 1.0 * scale, 1.4 * scale),
      leafMat(crownColors[v - 8])
    );
    crown.position.y = 2.2 * scale;
    // Deform slightly
    const cp = crown.geometry.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      cp.setX(i, cp.getX(i) * (0.85 + Math.random() * 0.3));
      cp.setZ(i, cp.getZ(i) * (0.85 + Math.random() * 0.3));
    }
    crown.geometry.computeVertexNormals();
    g.add(crown);
  } else {
    // Двойная крона (v=10,11)
    for (let i = 0; i < 2; i++) {
      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.65 * scale, 0),
        leafMat(crownColors[i])
      );
      crown.position.set((i - 0.5) * 0.4 * scale, (2.0 + i * 0.4) * scale, 0);
      g.add(crown);
    }
  }
  return g;
}

/** Брёвна/ветки на земле — мелкий clutter */
export function createBranch(scale = 1.0): THREE.Group {
  const g = new THREE.Group();
  const log = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.8 * scale, 5),
    texMat('tree_bark', { color: LP.wood })
  );
  log.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
  log.position.y = 0.06 * scale;
  g.add(log);
  // Small twig
  const twig = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03 * scale, 0.04 * scale, 0.4 * scale, 4),
    matLP(0x6d4c2a)
  );
  twig.rotation.set(0.3, 0.8, Math.PI / 2);
  twig.position.set(0.15 * scale, 0.05 * scale, 0.1 * scale);
  g.add(twig);
  return g;
}

// ── Создать low-poly камень ───────────────────────────────────
export function createRock(scale = 1.0): THREE.Mesh {
  // Додекаэдр = природный вид камня
  const geo = new THREE.DodecahedronGeometry(scale, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) * (0.8 + Math.random() * 0.4));
    pos.setY(i, pos.getY(i) * (0.7 + Math.random() * 0.3));
    pos.setZ(i, pos.getZ(i) * (0.8 + Math.random() * 0.4));
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, texMat('rock_color', { color: LP.rock }));
}

// ── Создать low-poly рыбу ─────────────────────────────────────
export function createFishMesh(color: number, scale = 1.0): THREE.Group {
  const g = new THREE.Group();
  // Тело (вытянутый октаэдр)
  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(scale, 0),
    matLP(color)
  );
  body.scale.set(1.8, 0.7, 0.6);
  g.add(body);
  // Хвост
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.5 * scale, 0.8 * scale, 4),
    matLP(new THREE.Color(color).multiplyScalar(0.7).getHex())
  );
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -1.3 * scale;
  g.add(tail);
  // Плавник сверху
  const fin = new THREE.Mesh(
    new THREE.ConeGeometry(0.25 * scale, 0.5 * scale, 4),
    matLP(new THREE.Color(color).multiplyScalar(0.85).getHex())
  );
  fin.position.set(0.1 * scale, 0.55 * scale, 0);
  g.add(fin);
  // Глаз
  const eye = new THREE.Mesh(
    new THREE.BoxGeometry(0.12 * scale, 0.12 * scale, 0.12 * scale),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  eye.position.set(0.85 * scale, 0.12 * scale, 0.38 * scale);
  g.add(eye);
  return g;
}

// ── Создать voxel-рыбака ─────────────────────────────────────
// ── Rarity colors and glow mapping ─────────────────────────────
const RARITY_CONFIG: Record<string, { shirtColor: number; emissive: number; sizeMult: number }> = {
  common:    { shirtColor: 0x2980b9, emissive: 0x000000, sizeMult: 1.0 },
  uncommon:  { shirtColor: 0x27ae60, emissive: 0x115522, sizeMult: 1.05 },
  rare:      { shirtColor: 0x8e44ad, emissive: 0x3a1a5e, sizeMult: 1.1 },
  epic:      { shirtColor: 0xf39c12, emissive: 0x7a4e06, sizeMult: 1.15 },
  legendary: { shirtColor: 0xe74c3c, emissive: 0x8b1a1a, sizeMult: 1.2 },
};

/**
 * Create a low-poly NPC humanoid model.
 * Cylinder(body) + Sphere(head) + Cone(hat) + Box(arms/legs)
 * Rarity: shirt color + emissive glow + size scale
 */
export function createNPCModel(
  skinColor: number,
  rarity: string = 'common',
  scale = 0.6
): THREE.Group {
  const g = new THREE.Group();
  const cfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  const s = scale * cfg.sizeMult;
  const emOpts = cfg.emissive !== 0 ? { emissive: cfg.emissive } : undefined;

  // Legs (Box)
  const legMat = matLP(LP.hat);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 0.45 * s, 0.18 * s), legMat);
  leftLeg.position.set(-0.1 * s, 0.22 * s, 0);
  leftLeg.name = 'leftLeg';
  g.add(leftLeg);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 0.45 * s, 0.18 * s), legMat);
  rightLeg.position.set(0.1 * s, 0.22 * s, 0);
  rightLeg.name = 'rightLeg';
  g.add(rightLeg);

  // Body (Cylinder)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * s, 0.25 * s, 0.6 * s, 6),
    matLP(cfg.shirtColor, emOpts)
  );
  body.position.y = 0.72 * s;
  g.add(body);

  // Arms (Box)
  const armMat = matLP(cfg.shirtColor, emOpts);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.4 * s, 0.12 * s), armMat);
  leftArm.position.set(-0.32 * s, 0.68 * s, 0);
  leftArm.name = 'leftArm';
  g.add(leftArm);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.4 * s, 0.12 * s), armMat);
  rightArm.position.set(0.32 * s, 0.68 * s, 0);
  rightArm.name = 'rightArm';
  g.add(rightArm);

  // Head (Sphere)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2 * s, 6, 5),
    matLP(skinColor)
  );
  head.position.y = 1.18 * s;
  g.add(head);

  // Hat (Cone)
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.22 * s, 0.25 * s, 6),
    matLP(LP.hat)
  );
  hat.position.y = 1.45 * s;
  g.add(hat);

  // Rarity glow ring (for rare+)
  if (cfg.emissive !== 0) {
    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35 * s, 0.42 * s, 16),
      new THREE.MeshBasicMaterial({
        color: cfg.emissive, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
      })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.02;
    glowRing.name = 'glowRing';
    g.add(glowRing);
  }

  g.userData.rarity = rarity;
  return g;
}

/** Animate NPC bob-walk: call in update loop */
export function animateNPCBobWalk(npc: THREE.Group, time: number, walking: boolean): void {
  // Bob up/down
  const bob = walking ? Math.sin(time * 6) * 0.04 : Math.sin(time * 1.5) * 0.015;
  npc.position.y = (npc.userData.baseY ?? 0) + bob;

  // Leg/arm swing when walking
  const swing = walking ? Math.sin(time * 8) * 0.4 : 0;
  const leftLeg = npc.getObjectByName('leftLeg');
  const rightLeg = npc.getObjectByName('rightLeg');
  const leftArm = npc.getObjectByName('leftArm');
  const rightArm = npc.getObjectByName('rightArm');
  if (leftLeg) leftLeg.rotation.x = swing;
  if (rightLeg) rightLeg.rotation.x = -swing;
  if (leftArm) leftArm.rotation.x = -swing * 0.7;
  if (rightArm) rightArm.rotation.x = swing * 0.7;

  // Glow ring pulse
  const glowRing = npc.getObjectByName('glowRing');
  if (glowRing) {
    const pulse = 0.25 + 0.15 * Math.sin(time * 3);
    (glowRing as THREE.Mesh).material = new THREE.MeshBasicMaterial({
      color: (glowRing as THREE.Mesh).material instanceof THREE.MeshBasicMaterial
        ? ((glowRing as THREE.Mesh).material as THREE.MeshBasicMaterial).color : new THREE.Color(0x3a1a5e),
      transparent: true, opacity: pulse, side: THREE.DoubleSide,
    });
  }
}

/** Scale-bounce animation for level-up effect */
export function scaleBounceNPC(npc: THREE.Group, time: number, startTime: number, duration = 0.8): boolean {
  const elapsed = time - startTime;
  if (elapsed > duration) {
    npc.scale.setScalar(1);
    return false; // animation complete
  }
  const t = elapsed / duration;
  const bounce = 1 + 0.3 * Math.sin(t * Math.PI * 3) * (1 - t);
  npc.scale.setScalar(bounce);
  return true; // still animating
}

/** Create a small pet model */
export function createPetModel(type: string, scale = 0.3): THREE.Group {
  const g = new THREE.Group();
  const s = scale;

  switch (type) {
    case 'cat': {
      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.25 * s, 0.6 * s), matLP(0xd4a07a));
      body.position.y = 0.2 * s;
      g.add(body);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 5, 4), matLP(0xd4a07a));
      head.position.set(0, 0.35 * s, 0.25 * s);
      g.add(head);
      // Ears
      for (const dx of [-0.1, 0.1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.1 * s, 4), matLP(0xc48c6a));
        ear.position.set(dx * s, 0.5 * s, 0.25 * s);
        g.add(ear);
      }
      // Tail
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.02 * s, 0.4 * s, 4), matLP(0xd4a07a));
      tail.position.set(0, 0.3 * s, -0.3 * s);
      tail.rotation.x = 0.5;
      tail.name = 'tail';
      g.add(tail);
      break;
    }
    case 'dog': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.35 * s, 0.3 * s, 0.55 * s), matLP(0x8B6914));
      body.position.y = 0.25 * s;
      g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.25 * s, 0.3 * s), matLP(0x8B6914));
      head.position.set(0, 0.42 * s, 0.3 * s);
      g.add(head);
      // Ears (floppy)
      for (const dx of [-0.12, 0.12]) {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.12 * s, 0.06 * s), matLP(0x6d4c2a));
        ear.position.set(dx * s, 0.42 * s, 0.38 * s);
        g.add(ear);
      }
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.02 * s, 0.3 * s, 4), matLP(0x8B6914));
      tail.position.set(0, 0.35 * s, -0.28 * s);
      tail.rotation.x = -0.8;
      tail.name = 'tail';
      g.add(tail);
      break;
    }
    case 'bird': {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.15 * s, 5, 4), matLP(0xe74c3c));
      body.position.y = 0.2 * s;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 5, 4), matLP(0xe74c3c));
      head.position.set(0, 0.35 * s, 0.08 * s);
      g.add(head);
      // Beak
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.1 * s, 4), matLP(0xf39c12));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.34 * s, 0.18 * s);
      g.add(beak);
      // Wings
      for (const dx of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.05 * s, 0.12 * s), matLP(0xc0392b));
        wing.position.set(dx * 0.15 * s, 0.22 * s, 0);
        wing.name = dx < 0 ? 'leftWing' : 'rightWing';
        g.add(wing);
      }
      break;
    }
    default: {
      // Generic pet sphere
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.15 * s, 6, 5), matLP(0x3498db));
      sphere.position.y = 0.15 * s;
      g.add(sphere);
    }
  }

  g.userData.petType = type;
  return g;
}

/** Animate pet idle: tail wag, wing flap, small bob */
export function animatePet(pet: THREE.Group, time: number): void {
  const type = pet.userData.petType;
  pet.position.y = (pet.userData.baseY ?? 0) + Math.sin(time * 2) * 0.02;

  if (type === 'cat' || type === 'dog') {
    const tail = pet.getObjectByName('tail');
    if (tail) tail.rotation.z = Math.sin(time * 5) * 0.3;
  }
  if (type === 'bird') {
    const lw = pet.getObjectByName('leftWing');
    const rw = pet.getObjectByName('rightWing');
    const flap = Math.sin(time * 6) * 0.25;
    if (lw) lw.rotation.z = flap;
    if (rw) rw.rotation.z = -flap;
  }
}

export function createFisherman(shirtColor = LP.shirtBlue): THREE.Group {
  const g = new THREE.Group();
  const b = (w: number, h: number, d: number, x: number, y: number, z: number, c: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLP(c));
    m.position.set(x, y, z);
    g.add(m);
  };
  b(0.9, 1.5, 0.9,   0,  0.75,  0, shirtColor); // тело
  b(0.9, 0.9, 0.9,   0,  2.05,  0, LP.skin);    // голова
  b(1.3, 0.22,1.3,   0,  2.60,  0, LP.hat);     // поля шляпы
  b(0.85,0.45,0.85,  0,  2.85,  0, LP.hat);     // тулья
  b(0.42,0.42,0.42, -0.7, 0.75, 0, shirtColor); // левая рука
  b(0.42,0.42,0.42,  0.7, 0.75, 0, shirtColor); // правая рука
  b(0.42,0.9, 0.42, -0.25,-0.45,0, LP.hat);     // левая нога
  b(0.42,0.9, 0.42,  0.25,-0.45,0, LP.hat);     // правая нога
  return g;
}

// ── Осветить сцену в стиле игры ───────────────────────────────
export function setupGameLighting(scene: THREE.Scene, options?: {
  ambientColor?: number; ambientIntensity?: number;
  sunColor?: number; sunIntensity?: number;
  fillColor?: number; fillIntensity?: number;
}): void {
  const o = options ?? {};
  const ambient = new THREE.AmbientLight(o.ambientColor ?? 0xaaddff, o.ambientIntensity ?? 0.7);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(o.sunColor ?? 0xfff5e0, o.sunIntensity ?? 1.1);
  sun.position.set(15, 22, 15);
  scene.add(sun);
  if (o.fillColor !== undefined || o.fillIntensity !== undefined) {
    const fill = new THREE.DirectionalLight(o.fillColor ?? 0x8899ff, o.fillIntensity ?? 0.3);
    fill.position.set(-10, 5, -8);
    scene.add(fill);
  }
}
