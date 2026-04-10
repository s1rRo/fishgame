// ============================================================
// LOD HELPER — обёртка над THREE.LOD для динамической детализации
// 3 уровня: полная геометрия (<20), упрощённая (<50), billboard (>50)
// ============================================================

import * as THREE from 'three';
import { matLP, LP } from './LowPolyStyle';

/**
 * Конфиг LOD уровней.
 * distance — на каком расстоянии от камеры переключаемся.
 */
export interface LODConfig {
  /** Расстояние переключения: полная → упрощённая */
  mediumDistance: number;
  /** Расстояние переключения: упрощённая → billboard */
  farDistance: number;
}

const DEFAULT_LOD: LODConfig = {
  mediumDistance: 20,
  farDistance: 50,
};

/**
 * Создаёт THREE.LOD объект с тремя уровнями детализации.
 *
 * @param highDetail - Полная геометрия (ближняя)
 * @param color - Основной цвет для упрощённых версий
 * @param approxHeight - Примерная высота объекта для billboard
 * @param config - Пороги расстояний
 */
export function createLOD(
  highDetail: THREE.Object3D,
  color: number = LP.grass,
  approxHeight = 1.0,
  config: Partial<LODConfig> = {},
): THREE.LOD {
  const cfg = { ...DEFAULT_LOD, ...config };
  const lod = new THREE.LOD();

  // Level 0: полная геометрия (ближняя камера)
  lod.addLevel(highDetail, 0);

  // Level 1: упрощённая геометрия (средняя дистанция)
  const medium = createSimplifiedMesh(color, approxHeight);
  lod.addLevel(medium, cfg.mediumDistance);

  // Level 2: billboard sprite (дальняя дистанция)
  const billboard = createBillboard(color, approxHeight);
  lod.addLevel(billboard, cfg.farDistance);

  return lod;
}

/**
 * Упрощённая версия: single Box или Cone с основным цветом
 */
function createSimplifiedMesh(color: number, height: number): THREE.Group {
  const g = new THREE.Group();

  // Простой box для обозначения
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(height * 0.5, height, height * 0.5),
    matLP(color)
  );
  box.position.y = height * 0.5;
  g.add(box);

  return g;
}

/**
 * Billboard: плоский квад, всегда повёрнут к камере (через lookAt в update)
 */
function createBillboard(color: number, height: number): THREE.Group {
  const g = new THREE.Group();

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    })
  );
  sprite.scale.set(height * 0.6, height, 1);
  sprite.position.y = height * 0.5;
  g.add(sprite);

  return g;
}

/**
 * Применяет LOD к массиву объектов в сцене.
 * Заменяет каждый объект на LOD версию на той же позиции.
 *
 * @param parent - Родительский Group/Scene
 * @param objects - Объекты для замены
 * @param color - Основной цвет
 * @param approxHeight - Высота
 * @param config - LOD конфиг
 * @returns Массив LOD объектов (для обновления)
 */
export function applyLODToGroup(
  parent: THREE.Object3D,
  objects: THREE.Object3D[],
  color: number = LP.grass,
  approxHeight = 1.0,
  config: Partial<LODConfig> = {},
): THREE.LOD[] {
  const lods: THREE.LOD[] = [];

  for (const obj of objects) {
    const pos = obj.position.clone();
    const rot = obj.rotation.clone();
    const scale = obj.scale.clone();

    parent.remove(obj);

    const lod = createLOD(obj, color, approxHeight, config);
    lod.position.copy(pos);
    lod.rotation.copy(rot);
    lod.scale.copy(scale);

    parent.add(lod);
    lods.push(lod);
  }

  return lods;
}

/**
 * Обновляет все LOD объекты (вызывать в update loop).
 * THREE.LOD.update() автоматически переключает уровни на основе расстояния до камеры.
 */
export function updateLODs(lods: THREE.LOD[], camera: THREE.Camera): void {
  for (const lod of lods) {
    lod.update(camera);
  }
}
