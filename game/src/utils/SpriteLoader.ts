// ============================================================
// SPRITE LOADER — Загрузка PNG с автоудалением фона
// Автоматически определяет цвет фона (чёрный/белый/любой)
// по угловым пикселям и удаляет его через Canvas API
// ============================================================
import * as THREE from 'three';

const textureCache = new Map<string, THREE.Texture>();

/** Определяет цвет фона по 4 угловым пикселям */
function detectBgColor(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const corners = [
    0,                        // top-left
    (w - 1) * 4,              // top-right
    (h - 1) * w * 4,          // bottom-left
    ((h - 1) * w + w - 1) * 4 // bottom-right
  ];
  let rSum = 0, gSum = 0, bSum = 0;
  for (const idx of corners) {
    rSum += data[idx];
    gSum += data[idx + 1];
    bSum += data[idx + 2];
  }
  return [Math.round(rSum / 4), Math.round(gSum / 4), Math.round(bSum / 4)];
}

/**
 * Загружает PNG, автоматически определяет цвет фона по углам
 * и удаляет его (делает прозрачным).
 * threshold — порог расстояния до фонового цвета (0-255, default 45)
 */
export function loadTransparentTexture(
  url: string,
  threshold = 45
): Promise<THREE.Texture> {
  if (textureCache.has(url)) {
    return Promise.resolve(textureCache.get(url)!);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Определяем цвет фона по углам
      const [bgR, bgG, bgB] = detectBgColor(data, canvas.width, canvas.height);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Расстояние до фонового цвета
        const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
        if (dist < threshold) {
          data[i + 3] = 0; // полностью прозрачный
        } else if (dist < threshold * 2) {
          // Плавный переход на границе
          const alpha = Math.min(255, Math.floor((dist / (threshold * 2)) * 255));
          data[i + 3] = alpha;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.needsUpdate = true;

      textureCache.set(url, tex);
      resolve(tex);
    };
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

/**
 * Создаёт Three.js Sprite с прозрачной текстурой из PNG.
 * Автоматически убирает чёрный фон.
 */
export async function createAssetSprite(
  url: string,
  scale: [number, number] = [2, 2],
  threshold = 35
): Promise<THREE.Sprite> {
  const tex = await loadTransparentTexture(url, threshold);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.05,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale[0], scale[1], 1);
  return sprite;
}

/**
 * Создаёт billboard (PlaneGeometry всегда смотрит на камеру).
 * Полезно для зданий которые должны иметь глубину.
 */
export async function createBillboard(
  url: string,
  width: number,
  height: number,
  threshold = 35
): Promise<THREE.Mesh> {
  const tex = await loadTransparentTexture(url, threshold);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.05,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

/**
 * Обрезает спрайт-лист аватара: берёт только первый (фронтальный) вид.
 * Аватары — это 3 вида в одном PNG (front, 3/4, back).
 */
export function loadAvatarTexture(
  url: string,
  viewIndex = 0, // 0=front-left, 1=front, 2=back
  threshold = 35
): Promise<THREE.Texture> {
  const cacheKey = `${url}__view${viewIndex}`;
  if (textureCache.has(cacheKey)) {
    return Promise.resolve(textureCache.get(cacheKey)!);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const viewW = Math.floor(img.width / 3);
      const canvas = document.createElement('canvas');
      canvas.width = viewW;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Вырезаем нужный вид
      ctx.drawImage(img, viewIndex * viewW, 0, viewW, img.height, 0, 0, viewW, img.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const [bgR, bgG, bgB] = detectBgColor(data, canvas.width, canvas.height);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
        if (dist < threshold) {
          data[i + 3] = 0;
        } else if (dist < threshold * 2) {
          data[i + 3] = Math.min(255, Math.floor((dist / (threshold * 2)) * 255));
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.needsUpdate = true;

      textureCache.set(cacheKey, tex);
      resolve(tex);
    };
    img.onerror = () => reject(new Error(`Failed to load avatar: ${url}`));
    img.src = url;
  });
}
