// ============================================================
// PLANET SCENE — 3D глобус, только Аргентина кликабельна
// Из Code_tz/02_PLANET_VILLAGE.md подзадача 2.1
// Камера: PerspectiveCamera(fov=45, pos=(0,0,14))
// OrbitControls: autoRotate=0.3, enablePan=false, minDist=8, maxDist=20
// ============================================================

import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createEarthDayTexture,
} from '../utils/EarthTextures';
import { matLP, setupGameLighting } from '../utils/LowPolyStyle';
import { AudioManager } from '../services/AudioManager';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { BiomeManager } from '../services/BiomeManager';
import type { PlayerProfile } from '../models/Player';
import { getNPCById } from '../data/npcDatabase';
// TopHUD управляется через uiContainer — не синглтон
import { PLAYABLE_BIOMES, latLonToVector3, ARGENTINA_BOUNDS, calcTerritoryRadius } from '../utils/ArgentinaSystem';

interface NPCPath {
  npcId: string;
  npcName: string;
  biomeId: string;
  resourceId: string;
  startedAt: number;
  estimatedReturnAt: number;
  tube: THREE.Mesh;
  dot: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  label: HTMLDivElement;
}

interface BiomeMarker {
  biomeId: string;
  name: string;
  level: number;
  color: number;
  mesh: THREE.Mesh;
  label: HTMLDivElement;
  lat: number;
  lon: number;
}

export class PlanetScene extends BaseScene {
  private controls: OrbitControls | null = null;
  private earthGroup: THREE.Group | null = null;
  private cloudsMesh: THREE.Mesh | null = null;
  private markers: BiomeMarker[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private labelContainer: HTMLDivElement | null = null;
  private fadeOverlay: HTMLDivElement | null = null;
  // HUD не управляется здесь

  private player: PlayerProfile | null = null;
  private npcPaths: NPCPath[] = [];
  private markerRings: THREE.Mesh[] = [];
  private territoryCircle: THREE.Line | null = null;
  private onClickBound = (e: MouseEvent) => this.onClick(e);
  private onResizeBound = () => this.onResize();

  start(_data?: any): void {
    // Камера — стартует глядя на L1 биом (Rio Salado)
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const l1Biome = PLAYABLE_BIOMES.find(b => b.id === 'rio_salado')!;
    const l1Dir = latLonToVector3(l1Biome.lat, l1Biome.lon, 1).normalize();
    this.camera.position.copy(l1Dir.multiplyScalar(14));

    // Музыка
    AudioManager.getInstance().playMusic('main_theme');

    // Фон — текстура космоса из ассетов
    const bgLoader = new THREE.TextureLoader();
    bgLoader.load('/assets/images/textures/space_night.png', (tex) => {
      tex.magFilter = THREE.NearestFilter;
      this.scene.background = tex;
    }, undefined, () => {
      this.scene.background = new THREE.Color(0x0a1628); // fallback
    });
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const sun = new THREE.DirectionalLight(0xffd700, 1.2);
    sun.position.set(20, 5, 15);
    this.scene.add(ambient, sun);

    // Звёзды
    this.createStars();

    // Земля
    this.createEarth();

    // Маркеры биомов Аргентины
    this.createBiomeMarkers();

    // OrbitControls
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enablePan = false;
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = 0.3;
      this.controls.minDistance = 8;
      this.controls.maxDistance = 20;
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
    }

    // Label контейнер
    this.labelContainer = document.createElement('div');
    this.labelContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
    document.body.appendChild(this.labelContainer);

    // Fade overlay
    this.fadeOverlay = document.createElement('div');
    this.fadeOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#0a1628;z-index:999;transition:opacity 0.8s;opacity:1;pointer-events:none;';
    document.body.appendChild(this.fadeOverlay);
    requestAnimationFrame(() => {
      if (this.fadeOverlay) this.fadeOverlay.style.opacity = '0';
    });

    // Загрузка профиля
    this.loadPlayer();

    // Навигация
    this.createNavButtons();

    // Часы — время игрового мира
    this.createClock();

    // Слушатели
    canvas?.addEventListener('click', this.onClickBound);
    window.addEventListener('resize', this.onResizeBound);
  }

  update(delta: number): void {
    if (!this.earthGroup || !this.cloudsMesh) return;

    this.controls?.update();

    // Вращение облаков
    this.cloudsMesh.rotation.y += delta * 0.02;

    // Обновление позиций labels
    this.updateLabels();

    // Обновление NPC путей
    this.updateNPCPaths();

    // Пульсация маркерных колец
    const t = performance.now() * 0.001;
    for (let i = 0; i < this.markerRings.length; i++) {
      const ring = this.markerRings[i];
      const pulse = 1.0 + 0.3 * Math.sin(t * 2.5 + i * 1.2);
      ring.scale.setScalar(pulse);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.3 * Math.sin(t * 2.5 + i * 1.2);
    }

    // LOD: hide NPC paths when zoomed out far
    const camDist = this.camera.position.length();
    const showDetails = camDist < 16;
    for (const np of this.npcPaths) {
      np.tube.visible = showDetails;
      np.dot.visible = showDetails;
      np.label.style.display = showDetails ? '' : 'none';
    }
  }

  stop(): void {
    super.stop();
    this.controls?.dispose();
    this.controls = null;

    // Убираем навбар + event listener
    if ((this as any)._navCloseHandler) {
      document.removeEventListener('click', (this as any)._navCloseHandler);
      (this as any)._navCloseHandler = null;
    }
    if ((this as any)._navBar) {
      (this as any)._navBar.remove();
      (this as any)._navBar = null;
    }

    // Убираем часы
    if ((this as any)._clockInterval) {
      clearInterval((this as any)._clockInterval);
      (this as any)._clockInterval = null;
    }
    if ((this as any)._clockEl) {
      (this as any)._clockEl.remove();
      (this as any)._clockEl = null;
    }

    // Убираем labels
    if (this.labelContainer) {
      this.labelContainer.remove();
      this.labelContainer = null;
    }
    if (this.fadeOverlay) {
      this.fadeOverlay.remove();
      this.fadeOverlay = null;
    }
    this.markers = [];
    this.markerRings = [];
    this.territoryCircle = null;

    // NPC paths cleanup
    for (const np of this.npcPaths) {
      np.tube.geometry.dispose();
      (np.tube.material as THREE.Material).dispose();
      np.dot.geometry.dispose();
      (np.dot.material as THREE.Material).dispose();
      np.label.remove();
    }
    this.npcPaths = [];

    const canvas = document.getElementById('game-canvas');
    canvas?.removeEventListener('click', this.onClickBound);
    window.removeEventListener('resize', this.onResizeBound);

    this.earthGroup = null;
    this.cloudsMesh = null;
  }

  // ─── 3D Объекты ───

  private createStars(): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 50;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true });
    this.scene.add(new THREE.Points(geo, mat));
  }

  private createEarth(): void {
    this.earthGroup = new THREE.Group();
    const EARTH_R = 4;

    // Основная сфера — сразу грузим ассет текстуру материков
    const earthGeo = new THREE.SphereGeometry(EARTH_R, 64, 32);
    const earthMat = new THREE.MeshPhongMaterial({
      specular: new THREE.Color(0x222222),
      shininess: 15,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.earthGroup.add(earthMesh);

    // Загружаем текстуру материков из ассетов
    const texLoader = new THREE.TextureLoader();
    // Пробуем planet_continents → continents → planet_2 → Canvas fallback
    const tryTextures = [
      '/assets/images/textures/planet_continents.png',
      '/assets/images/textures/continents.png',
      '/assets/images/textures/planet_2.png',
    ];
    let loaded = false;
    for (const path of tryTextures) {
      texLoader.load(path, (tex) => {
        if (loaded) return;
        loaded = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        earthMat.map = tex;
        earthMat.needsUpdate = true;
      }, undefined, () => {});
    }
    // Canvas fallback если ничего не загрузилось через 3 сек
    setTimeout(() => {
      if (!loaded) {
        const dayTex = createEarthDayTexture(2048);
        earthMat.map = dayTex;
        earthMat.needsUpdate = true;
      }
    }, 3000);

    // Облака — лёгкие, не перекрывают
    const cloudGeo = new THREE.SphereGeometry(EARTH_R + 0.08, 32, 32);
    const cloudTexFallback = this.createCloudTexture(1024);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudTexFallback,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    this.cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
    this.earthGroup.add(this.cloudsMesh);

    texLoader.load('/assets/images/textures/clouds.png', (cTex) => {
      cTex.magFilter = THREE.NearestFilter;
      cloudMat.map = cTex;
      cloudMat.needsUpdate = true;
    });

    // Атмосфера (glow) — тонкий ободок
    const glowGeo = new THREE.SphereGeometry(EARTH_R + 0.3, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    });
    this.earthGroup.add(new THREE.Mesh(glowGeo, glowMat));

    // Argentina overlay — затемнение не-Аргентины, плотно на поверхности
    this.createArgentinaOverlay();

    this.scene.add(this.earthGroup);
  }

  /** Create a dark overlay sphere that dims non-Argentina regions */
  private createArgentinaOverlay(): void {
    if (!this.earthGroup) return;
    const size = 1024;
    const W = size, H = size / 2;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Fill entire map with subtle dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, W, H);

    // Clear Argentina region (make it transparent)
    const lonToX = (lon: number) => ((lon + 180) / 360) * W;
    const latToY = (lat: number) => ((90 - lat) / 180) * H;

    const x1 = lonToX(ARGENTINA_BOUNDS.lonMin);
    const y1 = latToY(ARGENTINA_BOUNDS.latMax);
    const x2 = lonToX(ARGENTINA_BOUNDS.lonMax);
    const y2 = latToY(ARGENTINA_BOUNDS.latMin);

    // Clear with soft gradient feather around Argentina shape
    const pad = 8;
    // Gradient feather: outer→inner fade
    const grd = ctx.createRadialGradient(
      (x1 + x2) / 2, (y1 + y2) / 2, Math.max(x2 - x1, y2 - y1) * 0.35,
      (x1 + x2) / 2, (y1 + y2) / 2, Math.max(x2 - x1, y2 - y1) * 0.65
    );
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = grd;
    ctx.fillRect(x1 - pad, y1 - pad, (x2 - x1) + pad * 2, (y2 - y1) + pad * 2);
    // Also hard clear the center
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    ctx.globalCompositeOperation = 'source-over';

    // Thin golden glow border around Argentina
    ctx.strokeStyle = 'rgba(241,196,15,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x1 - 2, y1 - 2, (x2 - x1) + 4, (y2 - y1) + 4);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const overlayGeo = new THREE.SphereGeometry(4.005, 64, 32);
    const overlayMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.earthGroup.add(new THREE.Mesh(overlayGeo, overlayMat));
  }

  /** Create territory radius circle for player's village */
  private createTerritoryCircle(): void {
    if (!this.earthGroup || !this.player?.villagePosition) return;
    // Remove old
    if (this.territoryCircle) {
      this.earthGroup.remove(this.territoryCircle);
      this.territoryCircle.geometry.dispose();
      (this.territoryCircle.material as THREE.Material).dispose();
    }

    const biome = PLAYABLE_BIOMES.find(b => b.id === (this.player?.currentBiomeId ?? 'rio_salado'));
    const biomeLevel = biome?.level ?? 1;
    const buildingCount = Object.keys(this.player?.hexFarm?.buildings ?? {}).length;
    const radius = calcTerritoryRadius(biomeLevel, this.player?.villageLevel ?? 1, buildingCount);

    const EARTH_R = 4;
    const segments = 64;
    const points: THREE.Vector3[] = [];
    const lat = this.player.villagePosition.lat;
    const lon = this.player.villagePosition.lon;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const dLat = radius * Math.cos(angle);
      const dLon = radius * Math.sin(angle) / Math.cos((lat * Math.PI) / 180);
      points.push(latLonToVector3(lat + dLat, lon + dLon, EARTH_R + 0.02));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0xf39c12, transparent: true, opacity: 0.6 });
    this.territoryCircle = new THREE.Line(geo, mat);
    this.earthGroup.add(this.territoryCircle);
  }

  private createBiomeMarkers(): void {
    const EARTH_RADIUS = 4;
    const biomeColors: Record<string, number> = {
      'rio_salado': 0x27ae60,
      'nahuel_huapi': 0x3498db,
      'lago_argentino': 0x9b59b6,
    };

    const biomeNames: Record<string, string> = {
      'rio_salado': 'Río Salado (L1)',
      'nahuel_huapi': 'Nahuel Huapi (L2)',
      'lago_argentino': 'Lago Argentino (L3)',
    };

    for (const biome of PLAYABLE_BIOMES) {
      const color = biomeColors[biome.id] ?? 0xffffff;

      // Маркер — октаэдр (компактный, на поверхности)
      const markerGeo = new THREE.OctahedronGeometry(0.1, 0);
      const markerMat = matLP(color);
      const mesh = new THREE.Mesh(markerGeo, markerMat);

      // Позиция на поверхности глобуса (чуть выше чтобы не z-fight)
      const pos = latLonToVector3(biome.lat, biome.lon, EARTH_RADIUS + 0.05);
      mesh.position.copy(pos);
      mesh.userData = { biomeId: biome.id, level: biome.level };

      if (this.earthGroup) this.earthGroup.add(mesh);

      // Пульсирующее кольцо
      const ringGeo = new THREE.RingGeometry(0.12, 0.18, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      if (this.earthGroup) this.earthGroup.add(ring);
      this.markerRings.push(ring);

      // HTML label
      const label = document.createElement('div');
      label.className = 'biome-label';
      label.innerHTML = biomeNames[biome.id] ?? biome.id;
      label.style.cssText = `
        position:absolute;
        color:white;
        font-family:'Press Start 2P',monospace;
        font-size:9px;
        text-shadow:0 0 4px rgba(0,0,0,0.8);
        white-space:nowrap;
        pointer-events:none;
        transform:translate(-50%,-100%);
        padding:2px 6px;
        background:rgba(10,22,40,0.7);
        border-radius:4px;
        border:1px solid ${new THREE.Color(color).getStyle()};
      `;

      this.markers.push({
        biomeId: biome.id,
        name: biomeNames[biome.id] ?? biome.id,
        level: biome.level,
        color,
        mesh,
        label,
        lat: biome.lat,
        lon: biome.lon,
      });
    }
  }

  private updateLabels(): void {
    if (!this.labelContainer) return;

    for (const marker of this.markers) {
      // Проецируем 3D позицию на 2D
      const worldPos = new THREE.Vector3();
      marker.mesh.getWorldPosition(worldPos);

      const projected = worldPos.clone().project(this.camera);
      const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

      // Видимость: маркер на видимой стороне глобуса?
      const camDir = this.camera.position.clone().normalize();
      const markerDir = worldPos.clone().normalize();
      const dot = camDir.dot(markerDir);

      if (dot > 0.15 && projected.z < 1) {
        marker.label.style.left = `${x}px`;
        marker.label.style.top = `${y - 10}px`;
        marker.label.style.display = 'block';
        if (!marker.label.parentElement) {
          this.labelContainer!.appendChild(marker.label);
        }
      } else {
        marker.label.style.display = 'none';
      }
    }
  }

  private async loadPlayer(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (user) {
      this.player = await DatabaseService.getInstance().getPlayerProfile(user.uid);
      if (this.player) {
        this.createNPCPaths(this.player);
        this.createTerritoryCircle();
        this.updateMarkerColors();
      }
    }
  }

  /** Динамическая окраска маркеров по уровню ресурсов биома (blue→yellow→red) */
  private updateMarkerColors(): void {
    if (!this.player) return;
    const biomeManager = BiomeManager.getInstance();

    for (let i = 0; i < this.markers.length; i++) {
      const marker = this.markers[i];
      // Уровень ресурсов: exhaustion 0=свежий(blue), 1=истощён(red)
      const fullId = marker.biomeId === 'rio_salado' ? 'rio_salado_l1'
        : marker.biomeId === 'nahuel_huapi' ? 'nahuel_huapi_l2' : 'lago_argentino_l3';
      const exhaustion = biomeManager.getBiomeExhaustion(fullId);
      const level = 1 - exhaustion; // 1=high(blue), 0=low(red)

      // Interpolate: blue(1.0) → yellow(0.5) → red(0.0)
      let color: THREE.Color;
      if (level > 0.5) {
        const t = (level - 0.5) * 2; // 0→1
        color = new THREE.Color(0xf1c40f).lerp(new THREE.Color(0x3498db), t);
      } else {
        const t = level * 2; // 0→1
        color = new THREE.Color(0xe74c3c).lerp(new THREE.Color(0xf1c40f), t);
      }

      (marker.mesh.material as THREE.MeshStandardMaterial).color.copy(color);
      if (this.markerRings[i]) {
        (this.markerRings[i].material as THREE.MeshBasicMaterial).color.copy(color);
      }
    }
  }

  // ─── Интерактивность ───

  private onClick(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const markerMeshes = this.markers.map((m) => m.mesh);
    const hits = this.raycaster.intersectObjects(markerMeshes);

    if (hits.length > 0) {
      const hit = hits[0].object;
      const biomeId = hit.userData.biomeId;
      const level = hit.userData.level;
      this.handleBiomeClick(biomeId, level);
    }
  }

  private handleBiomeClick(biomeId: string, level: number): void {
    if (!this.player) return;
    const player = this.player;

    const biomeManager = BiomeManager.getInstance();

    // L1 всегда доступен
    if (level === 1) {
      this.transitionToBiome(biomeId);
      return;
    }

    // Проверка разблока
    const fullBiomeId = level === 2 ? 'nahuel_huapi_l2' : 'lago_argentino_l3';
    if (biomeManager.canUnlockBiome(fullBiomeId, player)) {
      this.transitionToBiome(biomeId);
    } else {
      const req = biomeManager.getUnlockRequirements(fullBiomeId);
      this.showLockPopup(biomeId, req.villageLevel, req.totalResources, player.villageLevel ?? 1, player.totalResources ?? 0);
    }
  }

  private transitionToBiome(biomeId: string): void {
    // Fade out
    if (this.fadeOverlay) {
      this.fadeOverlay.style.opacity = '1';
      this.fadeOverlay.style.pointerEvents = 'all';
    }
    setTimeout(() => {
      // Если у игрока нет деревни — VillagePlacementScreen
      if (this.player && !this.player.villagePosition) {
        this.sceneManager.startScene('VillagePlacementScreen', { biomeId });
      } else {
        this.sceneManager.startScene('BiomeView', { biomeId });
      }
    }, 500);
  }

  private showLockPopup(biomeId: string, reqLevel: number, reqRes: number, curLevel: number, curRes: number): void {
    // Попап на document.body
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;';

    const marker = this.markers.find((m) => m.biomeId === biomeId);
    const name = marker?.name ?? biomeId;

    overlay.innerHTML = `
      <div style="background:#1a2a4a;border:2px solid #3498db;border-radius:12px;padding:24px;max-width:380px;text-align:center;font-family:'Rajdhani',sans-serif;color:white;">
        <h3 style="font-family:'Press Start 2P',monospace;font-size:12px;color:#e74c3c;margin-bottom:16px;">🔒 ЗАБЛОКИРОВАНО</h3>
        <p style="font-size:16px;margin-bottom:12px;">${name}</p>
        <div style="text-align:left;padding:8px 12px;background:rgba(0,0,0,0.3);border-radius:8px;margin-bottom:16px;">
          <p style="margin:4px 0;">🏘 Уровень деревни: <span style="color:${curLevel >= reqLevel ? '#27ae60' : '#e74c3c'}">${curLevel}</span> / ${reqLevel}</p>
          <p style="margin:4px 0;">📦 Ресурсы: <span style="color:${curRes >= reqRes ? '#27ae60' : '#e74c3c'}">${curRes}</span> / ${reqRes}</p>
        </div>
        <button id="popup-close-btn" style="padding:10px 24px;background:#3498db;color:white;border:none;border-radius:6px;font-family:'Rajdhani',sans-serif;font-size:16px;cursor:pointer;clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px));">
          Понятно
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#popup-close-btn')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) overlay.remove();
    });
  }

  // ─── NPC Paths ───

  private createNPCPaths(player: PlayerProfile): void {
    if (!this.earthGroup || !this.labelContainer) return;

    const EARTH_R = 4;
    const PATH_R = EARTH_R + 0.12;
    const villageLat = player.villagePosition?.lat ?? -35.5;
    const villageLon = player.villagePosition?.lon ?? -63.2;
    const villagePos = latLonToVector3(villageLat, villageLon, PATH_R);

    const pathColors: Record<string, number> = {
      'rio_salado': 0x27ae60,
      'nahuel_huapi': 0x3498db,
      'lago_argentino': 0x9b59b6,
    };

    for (const [npcId, dispatch] of Object.entries(player.npcDispatches)) {
      const biome = PLAYABLE_BIOMES.find(b => b.id === dispatch.biomeId);
      if (!biome) continue;

      const biomePos = latLonToVector3(biome.lat, biome.lon, PATH_R);
      const color = pathColors[dispatch.biomeId] ?? 0xf39c12;

      // Промежуточная точка — дуга через поверхность
      const midPoint = villagePos.clone().add(biomePos).multiplyScalar(0.5).normalize().multiplyScalar(PATH_R + 0.5);
      const curve = new THREE.CatmullRomCurve3([villagePos, midPoint, biomePos]);

      // Труба по кривой
      const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.02, 4, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.earthGroup.add(tube);

      // NPC точка
      const dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      this.earthGroup.add(dot);

      // Label
      const npcDef = getNPCById(npcId);
      const npcName = npcDef?.name ?? npcId;
      const label = document.createElement('div');
      label.style.cssText = `
        position:absolute;color:#f39c12;
        font-family:'Rajdhani',sans-serif;font-size:11px;
        background:rgba(10,22,40,0.85);padding:2px 6px;border-radius:4px;
        border:1px solid #f39c12;white-space:nowrap;pointer-events:none;
        transform:translate(-50%,-100%);display:none;
      `;
      this.labelContainer.appendChild(label);

      this.npcPaths.push({
        npcId, npcName, biomeId: dispatch.biomeId,
        resourceId: dispatch.resourceId,
        startedAt: dispatch.startedAt,
        estimatedReturnAt: dispatch.estimatedReturnAt,
        tube, dot, curve, label,
      });
    }
  }

  private updateNPCPaths(): void {
    if (!this.labelContainer) return;
    const now = Date.now();

    for (const np of this.npcPaths) {
      // Прогресс: 0 = у деревни, 1 = у биома
      const total = np.estimatedReturnAt - np.startedAt;
      const elapsed = now - np.startedAt;
      const t = Math.min(1, Math.max(0, elapsed / total));

      // Позиция NPC на кривой
      const pos = np.curve.getPoint(t);
      np.dot.position.copy(pos);

      // Проецируем для label
      const worldPos = new THREE.Vector3();
      np.dot.getWorldPosition(worldPos);
      const projected = worldPos.clone().project(this.camera);
      const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

      const camDir = this.camera.position.clone().normalize();
      const dotDir = worldPos.clone().normalize();

      if (camDir.dot(dotDir) > 0.15 && projected.z < 1) {
        const remaining = Math.max(0, np.estimatedReturnAt - now);
        const mins = Math.ceil(remaining / 60000);
        const timeStr = mins > 60 ? `${Math.floor(mins / 60)}ч ${mins % 60}м` : `${mins}м`;
        np.label.innerHTML = `${np.npcName} ⏱${timeStr}`;
        np.label.style.left = `${x}px`;
        np.label.style.top = `${y - 8}px`;
        np.label.style.display = 'block';
      } else {
        np.label.style.display = 'none';
      }
    }
  }

  // ─── Навигация ───

  private createNavButtons(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;top:8px;left:8px;z-index:200;pointer-events:auto;';

    // Гамбургер-кнопка
    const toggle = document.createElement('button');
    toggle.style.cssText = `
      width:42px;height:42px;
      background:rgba(10,22,40,0.9);
      border:2px solid rgba(52,152,219,0.5);
      color:#e8f4fd;font-size:20px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      clip-path:polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px));
      transition:background 0.15s;
    `;
    toggle.textContent = '☰';
    toggle.onmouseenter = () => { toggle.style.background = 'rgba(52,152,219,0.3)'; };
    toggle.onmouseleave = () => { toggle.style.background = 'rgba(10,22,40,0.9)'; };
    wrapper.appendChild(toggle);

    // Выдвижное меню
    const menu = document.createElement('div');
    menu.style.cssText = `
      position:absolute;top:48px;left:0;
      background:linear-gradient(160deg,rgba(15,30,48,0.97),rgba(10,22,40,0.97));
      border:2px solid rgba(52,152,219,0.4);
      backdrop-filter:blur(10px);
      padding:8px;
      display:flex;flex-direction:column;gap:4px;
      min-width:170px;
      clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px));
      box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 16px rgba(52,152,219,0.15);
      opacity:0;transform:translateY(-8px);
      transition:opacity 0.2s,transform 0.2s;
      pointer-events:none;
    `;

    const buttons = [
      { icon: '🏡', text: 'Ферма', scene: 'FarmScene' },
      { icon: '🏪', text: 'Рынок', scene: 'MarketScene' },
      { icon: '📅', text: 'Сезон', scene: 'SeasonPassScene' },
      { icon: '👗', text: 'Магазин', scene: 'CosmeticShopScene' },
      { icon: '👑', text: 'Топ', scene: 'LeaderboardScene' },
      { icon: '👤', text: 'Профиль', scene: 'PlayerProfileScreen' },
    ];

    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.style.cssText = `
        display:flex;align-items:center;gap:10px;
        width:100%;padding:10px 14px;
        background:transparent;
        border:1px solid transparent;
        color:#c8d6e5;font-size:15px;font-weight:600;
        font-family:'Rajdhani',sans-serif;
        cursor:pointer;text-align:left;
        transition:all 0.12s;
      `;
      btn.innerHTML = `<span style="font-size:18px;width:24px;text-align:center">${b.icon}</span><span>${b.text}</span>`;
      btn.onmouseenter = () => {
        btn.style.background = 'rgba(52,152,219,0.15)';
        btn.style.borderColor = 'rgba(52,152,219,0.3)';
        btn.style.color = '#fff';
      };
      btn.onmouseleave = () => {
        btn.style.background = 'transparent';
        btn.style.borderColor = 'transparent';
        btn.style.color = '#c8d6e5';
      };
      btn.onclick = () => this.sceneManager.startScene(b.scene);
      menu.appendChild(btn);
    }

    wrapper.appendChild(menu);

    let open = false;
    const setOpen = (v: boolean) => {
      open = v;
      toggle.textContent = open ? '✕' : '☰';
      menu.style.opacity = open ? '1' : '0';
      menu.style.transform = open ? 'translateY(0)' : 'translateY(-8px)';
      menu.style.pointerEvents = open ? 'auto' : 'none';
    };

    toggle.onclick = () => setOpen(!open);

    // Закрытие при клике вне меню
    const closeHandler = (e: MouseEvent) => {
      if (open && !wrapper.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', closeHandler);
    (this as any)._navCloseHandler = closeHandler;

    document.body.appendChild(wrapper);
    (this as any)._navBar = wrapper;
  }

  // ─── Часы игрового мира ───

  private createClock(): void {
    const clock = document.createElement('div');
    clock.id = 'planet-clock';
    clock.style.cssText = `
      position:fixed;bottom:12px;right:14px;
      font-family:'Press Start 2P','Courier New',monospace;
      font-size:10px;color:rgba(255,255,255,0.5);
      z-index:50;pointer-events:none;
      text-shadow:0 0 6px rgba(52,152,219,0.4);
      letter-spacing:1px;
    `;
    // Определяем день/ночь по реальному времени
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    const isNight = h >= 20 || h < 6;
    const icon = isNight ? '🌙' : '☀️';
    const period = isNight ? 'НОЧЬ' : h >= 6 && h < 12 ? 'УТРО' : h >= 12 && h < 18 ? 'ДЕНЬ' : 'ВЕЧЕР';
    clock.textContent = `${icon} ${h}:${m} ${period}`;
    document.body.appendChild(clock);
    (this as any)._clockEl = clock;

    // Обновлять каждую минуту
    (this as any)._clockInterval = setInterval(() => {
      const n = new Date();
      const hh = n.getHours();
      const mm = n.getMinutes().toString().padStart(2, '0');
      const night = hh >= 20 || hh < 6;
      const ic = night ? '🌙' : '☀️';
      const per = night ? 'НОЧЬ' : hh >= 6 && hh < 12 ? 'УТРО' : hh >= 12 && hh < 18 ? 'ДЕНЬ' : 'ВЕЧЕР';
      clock.textContent = `${ic} ${hh}:${mm} ${per}`;
    }, 30000);
  }

  // ─── Утилиты ───

  private createCloudTexture(size: number): THREE.CanvasTexture {
    const W = size, H = size / 2;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const w = 40 + Math.random() * 150;
      const h = 8 + Math.random() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return new THREE.CanvasTexture(c);
  }

  private onResize(): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }
}
