// ============================================================
// ASSET LOADER — загрузка ассетов с fallback при отсутствии
// Паттерн: loadOrFallback() — не крашит игру если файл не найден
// ============================================================

import * as THREE from 'three';

export class AssetLoader {
  private static instance: AssetLoader;
  private textureLoader = new THREE.TextureLoader();
  private cache = new Map<string, THREE.Texture>();

  private constructor() {}

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  /**
   * Загрузить текстуру или вернуть fallback (однотонную текстуру).
   * Никогда не бросает ошибку — безопасно для отсутствующих файлов.
   */
  public loadOrFallback(
    path: string,
    fallbackColor: number = 0x888888,
    width: number = 64,
    height: number = 64,
  ): THREE.Texture {
    // Из кэша
    const cached = this.cache.get(path);
    if (cached) return cached;

    // Создаём fallback текстуру из Canvas
    const fallback = this.createFallbackTexture(fallbackColor, width, height);
    this.cache.set(path, fallback);

    // Пытаемся загрузить реальный файл
    this.textureLoader.load(
      path,
      (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        // Заменяем fallback в кэше
        this.cache.set(path, tex);
        // Обновляем image в fallback чтобы уже использующие его материалы обновились
        fallback.image = tex.image;
        fallback.needsUpdate = true;
      },
      undefined,
      () => {
        console.log(`[AssetLoader] Ассет не найден: ${path} — используется fallback`);
      },
    );

    return fallback;
  }

  /** Загрузить текстуру (Promise). Возвращает fallback при ошибке. */
  public async loadAsync(
    path: string,
    fallbackColor: number = 0x888888,
  ): Promise<THREE.Texture> {
    try {
      const tex = await this.textureLoader.loadAsync(path);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.cache.set(path, tex);
      return tex;
    } catch {
      console.log(`[AssetLoader] Ассет не найден: ${path} — используется fallback`);
      return this.createFallbackTexture(fallbackColor);
    }
  }

  /** Создать однотонную Canvas-текстуру как fallback */
  private createFallbackTexture(
    color: number,
    w: number = 64,
    h: number = 64,
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, w, h);

    // Маленький маркер что это fallback (шахматный узор в углу)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * 2, y * 2, 2, 2);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  /** Очистить кэш */
  public clearCache(): void {
    this.cache.forEach((tex) => tex.dispose());
    this.cache.clear();
  }
}
