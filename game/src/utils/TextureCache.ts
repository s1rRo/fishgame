// ============================================================
// TEXTURE CACHE — загрузка и кеширование pixel-art текстур
// Все текстуры: NearestFilter, RepeatWrapping, 64×64 tiles
// ============================================================

import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

/** Базовый путь к текстурам */
const BASE = '/assets/images/textures/';

/** Предопределённые текстуры */
export const TEX = {
  water:      'water_tile.png',
  grass:      'grass_tile.png',
  sand:       'sand_tile.png',
  dirt:       'dirt_tile.png',
  wood:       'wood_tile.png',
  darkwood:   'darkwood_tile.png',
  bricks:     'bricks_tile.png',
  rocks_gray: 'rocks_gray_tile.png',
  rocks_gold: 'rocks_gold_tile.png',
  rocks_ice:  'rocks_ice_tile.png',
  leaves:     'leaves_tile.png',
  tinyleaves: 'tinyleaves_tile.png',
  trunks:     'trunks_tile.png',
  tree_bark:  'tree_bark.png',
  snow:       'snow_tile.png',
  lava:       'lava_tile.png',
  path:       'path_tile.png',
  rapids:     'rapids_tile.png',
  flatstones: 'flatstones_tile.png',
  rock_color: 'rock_color.png',
} as const;

/**
 * Загрузить текстуру (кешируется).
 * @param name — ключ из TEX или имя файла
 * @param repeatX — количество повторов по X (default 1)
 * @param repeatY — количество повторов по Y (default 1)
 */
export function loadTex(
  name: string,
  repeatX = 1,
  repeatY = 1,
): THREE.Texture {
  const file = (TEX as Record<string, string>)[name] ?? name;
  const key = `${file}_${repeatX}_${repeatY}`;

  if (cache.has(key)) return cache.get(key)!;

  const tex = loader.load(BASE + file);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;

  cache.set(key, tex);
  return tex;
}

/**
 * Применить текстуру к MeshStandardMaterial.
 * Сохраняет baseColor как color tint.
 */
export function applyTexture(
  mat: THREE.MeshStandardMaterial,
  name: string,
  repeatX = 1,
  repeatY = 1,
): void {
  mat.map = loadTex(name, repeatX, repeatY);
  mat.needsUpdate = true;
}

/**
 * Создать MeshStandardMaterial с текстурой (pixel-art).
 * Стиль: low-poly + pixel art texture
 */
export function texMat(
  name: string,
  opts: {
    color?: number;
    repeatX?: number;
    repeatY?: number;
    transparent?: boolean;
    opacity?: number;
    roughness?: number;
    metalness?: number;
    flatShading?: boolean;
  } = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: loadTex(name, opts.repeatX ?? 1, opts.repeatY ?? 1),
    color: opts.color ?? 0xffffff,
    flatShading: opts.flatShading ?? true,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.05,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
  });
}
