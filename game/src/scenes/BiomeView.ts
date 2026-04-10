// ============================================================
// BIOME VIEW — 3D ландшафт биома с ресурсами и маркерами
// Из Code_tz/03_BIOME_FARM.md подзадача 3.1
// Камера: PerspectiveCamera(fov=55, pos=(0,6,12))
// ============================================================

import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { matLP, createTree } from '../utils/LowPolyStyle';
import { AudioManager } from '../services/AudioManager';
import { BiomeManager } from '../services/BiomeManager';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { getResourcesByBiome } from '../data/resourceDatabase';
import { BIOMES } from '../data/biomeDatabase';
import type { PlayerProfile } from '../models/Player';
import { showNPCSelectUI } from '../ui/NPCSelectUI';
import { showBaitSelectUI } from '../ui/BaitSelectUI';
import type { CheckpointMapData } from './CheckpointMapScene';
import { SeasonalEventManager } from '../services/SeasonalEventManager';

interface ResourceNode {
  mesh: THREE.Mesh;
  resourceId: string;
  yield: number;
  exhausted: boolean;
}

// Цвета ландшафта по уровню биома
const BIOME_TERRAIN: Record<number, { ground: number; water: number; sky: number }> = {
  1: { ground: 0x8BC34A, water: 0x3498db, sky: 0x87CEEB },  // Степь
  2: { ground: 0x4CAF50, water: 0x2980b9, sky: 0x76b5c5 },  // Лес
  3: { ground: 0x78909C, water: 0x1a5276, sky: 0x5d6d7e },  // Горы
};

export class BiomeView extends BaseScene {
  private controls: OrbitControls | null = null;
  private biomeId = 'rio_salado_l1';
  private biomeLevel = 1;
  private resources: ResourceNode[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private player: PlayerProfile | null = null;
  private fishingMarker: THREE.Mesh | null = null;
  private villageMarker: THREE.Group | null = null;
  private navBar: HTMLDivElement | null = null;
  private biomeHud: HTMLDivElement | null = null;
  private eventBanner: HTMLDivElement | null = null;

  private checkpointsCompleted = 0;
  private onClickBound = (e: MouseEvent) => this.onClick(e);
  private onResizeBound = () => this.onResize();

  start(data?: any): void {
    this.biomeId = data?.biomeId ?? 'rio_salado_l1';
    // Определяем уровень из id
    if (this.biomeId.includes('l1') || this.biomeId === 'rio_salado') this.biomeLevel = 1;
    else if (this.biomeId.includes('l2') || this.biomeId === 'nahuel_huapi') this.biomeLevel = 2;
    else if (this.biomeId.includes('l3') || this.biomeId === 'lago_argentino') this.biomeLevel = 3;

    // Камера
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 6, 12);

    // Освещение
    const colors = BIOME_TERRAIN[this.biomeLevel] ?? BIOME_TERRAIN[1];
    this.scene.background = new THREE.Color(colors.sky);
    this.scene.fog = new THREE.Fog(colors.sky, 20, 60);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffd700, 0.8);
    sun.position.set(10, 15, 5);
    this.scene.add(sun);

    // Ландшафт
    this.createTerrain(colors);
    // Река/вода
    this.createWater(colors.water);
    // Деревья
    this.createVegetation();
    // Деревня
    this.createVillage();
    // Маркер рыбалки
    this.createFishingMarker();
    // Ресурсы
    this.createResourceNodes();

    // OrbitControls
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enablePan = true;
      this.controls.maxPolarAngle = Math.PI / 2.2;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 25;
      this.controls.target.set(0, 0, 0);
      this.controls.enableDamping = true;
    }

    // Загрузка игрока
    this.loadPlayer();

    // UI
    this.createUI();

    // Проверка событий
    this.checkEvents();

    // Музыка
    const musicTracks: Record<number, 'biome_l1' | 'biome_l2' | 'biome_l3'> = { 1: 'biome_l1', 2: 'biome_l2', 3: 'biome_l3' };
    AudioManager.getInstance().playMusic(musicTracks[this.biomeLevel] ?? 'biome_l1');

    canvas?.addEventListener('click', this.onClickBound);
    window.addEventListener('resize', this.onResizeBound);
  }

  update(delta: number): void {
    this.controls?.update();

    // Анимация маркера рыбалки
    if (this.fishingMarker) {
      this.fishingMarker.rotation.y += delta * 2;
      this.fishingMarker.position.y = 1.5 + Math.sin(Date.now() * 0.003) * 0.3;
    }
  }

  stop(): void {
    super.stop();
    this.controls?.dispose();
    this.controls = null;
    this.navBar?.remove();
    this.navBar = null;
    this.biomeHud?.remove();
    this.biomeHud = null;
    this.eventBanner?.remove();
    this.eventBanner = null;
    this.resources = [];
    const canvas = document.getElementById('game-canvas');
    canvas?.removeEventListener('click', this.onClickBound);
    window.removeEventListener('resize', this.onResizeBound);
  }

  // ─── 3D Объекты ───

  private createTerrain(colors: { ground: number; water: number; sky: number }): void {
    const geo = new THREE.PlaneGeometry(24, 24, 24, 24);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const noise = Math.sin(x * 0.5) * Math.cos(z * 0.4) * 0.8 +
                    Math.sin(x * 1.2 + z * 0.8) * 0.5 +
                    Math.sin(x * 2.5) * Math.cos(z * 1.8) * 0.2;
      const heightMult = this.biomeLevel === 3 ? 2.5 : this.biomeLevel === 2 ? 1.5 : 0.7;
      pos.setY(i, noise * heightMult);
    }
    geo.computeVertexNormals();

    const mat = matLP(colors.ground);
    const terrainMesh = new THREE.Mesh(geo, mat);
    this.scene.add(terrainMesh);

    const texLoader = new THREE.TextureLoader();
    texLoader.load('/assets/images/textures/biome_topdown.png', (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      (terrainMesh.material as THREE.MeshStandardMaterial).map = tex;
      (terrainMesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
    });
  }

  private createWater(waterColor: number): void {
    const waterGeo = new THREE.PlaneGeometry(24, 8, 12, 6);
    waterGeo.rotateX(-Math.PI / 2);
    // Low-poly wave displacement
    const wPos = waterGeo.attributes.position;
    for (let i = 0; i < wPos.count; i++) {
      wPos.setY(i, (Math.random() - 0.5) * 0.15);
    }
    waterGeo.computeVertexNormals();
    const waterMat = new THREE.MeshStandardMaterial({
      color: waterColor,
      transparent: true,
      opacity: 0.75,
      flatShading: true,
      roughness: 0.3,
      metalness: 0.1,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, -0.15, -6);
    this.scene.add(water);
  }

  private createVegetation(): void {
    const treeCount = this.biomeLevel === 2 ? 12 : this.biomeLevel === 3 ? 5 : 8;
    for (let i = 0; i < treeCount; i++) {
      const x = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10 + 3;
      const tree = createTree(0.7 + Math.random() * 0.5);
      tree.position.set(x, 0, z);
      this.scene.add(tree);
    }

    // Bushes (small green dodecahedrons)
    for (let i = 0; i < 10; i++) {
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.3, 0),
        matLP(0x27ae60)
      );
      bush.position.set(
        (Math.random() - 0.5) * 20,
        0.2,
        (Math.random() - 0.5) * 10 + 3
      );
      bush.scale.y = 0.6 + Math.random() * 0.3;
      this.scene.add(bush);
    }

    // Rocks for L2+ biomes
    if (this.biomeLevel >= 2) {
      for (let i = 0; i < 6; i++) {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.8, 0),
          matLP(0x808080),
        );
        rock.position.set((Math.random() - 0.5) * 18, 0.3, (Math.random() - 0.5) * 10 + 3);
        this.scene.add(rock);
      }
    }
  }

  private createVillage(): void {
    this.villageMarker = new THREE.Group();

    // Основной дом
    const house = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.5), matLP(0x8B4513));
    house.position.y = 0.6;
    this.villageMarker.add(house);

    // Крыша
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.8, 4), matLP(0xc0392b));
    roof.position.y = 1.6;
    roof.rotation.y = Math.PI / 4;
    this.villageMarker.add(roof);

    // Маленькие домики
    for (let i = 0; i < 2; i++) {
      const small = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), matLP(0xa0785a));
      small.position.set(i === 0 ? -2 : 2, 0.4, 0.5);
      this.villageMarker.add(small);
      const sRoof = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.5, 4), matLP(0x7f8c8d));
      sRoof.position.set(i === 0 ? -2 : 2, 1.1, 0.5);
      sRoof.rotation.y = Math.PI / 4;
      this.villageMarker.add(sRoof);
    }

    this.villageMarker.position.set(0, 0, 2);
    this.scene.add(this.villageMarker);
  }

  private createFishingMarker(): void {
    this.fishingMarker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.4, 0),
      matLP(0xf39c12),
    );
    this.fishingMarker.position.set(-3, 1.5, -5);
    this.fishingMarker.userData = { type: 'fishing' };
    this.scene.add(this.fishingMarker);

    // Пульс кольцо
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.7, 16),
      new THREE.MeshBasicMaterial({ color: 0xf39c12, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
    );
    ring.position.copy(this.fishingMarker.position);
    ring.position.y = 0.1;
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
  }

  private createResourceNodes(): void {
    const biomeResources = getResourcesByBiome(this.biomeLevel);
    const gatherableRes = biomeResources.filter(r => r.howToGet === 'npc_gather');

    const positions = [
      { x: 5, z: -2 }, { x: -5, z: -1 }, { x: 7, z: 1 },
      { x: -7, z: 0 }, { x: 3, z: -4 }, { x: -4, z: -5 },
      { x: 8, z: 3 }, { x: -8, z: 2 }, { x: 6, z: -6 }, { x: -3, z: 4 },
    ];

    for (let i = 0; i < Math.min(gatherableRes.length, positions.length); i++) {
      const res = gatherableRes[i];
      const pos = positions[i];

      let geo: THREE.BufferGeometry;
      let color = res.meshColor;

      if (res.type === 'building' && res.id.includes('wood')) {
        geo = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 6);
      } else if (res.type === 'building' && res.id === 'stone') {
        geo = new THREE.DodecahedronGeometry(0.3, 0);
      } else if (res.id.includes('herb')) {
        geo = new THREE.ConeGeometry(0.2, 0.5, 4);
      } else {
        geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      }

      const mesh = new THREE.Mesh(geo, matLP(color));
      mesh.position.set(pos.x, 0.3, pos.z);
      mesh.userData = { type: 'resource', resourceId: res.id, index: i };
      this.scene.add(mesh);

      this.resources.push({ mesh, resourceId: res.id, yield: 1, exhausted: false });
    }
  }

  // ─── Интерактивность ───

  private onClick(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Проверяем маркер рыбалки → Duolingo flow
    if (this.fishingMarker) {
      const fishHits = this.raycaster.intersectObject(this.fishingMarker);
      if (fishHits.length > 0) {
        AudioManager.getInstance().playSFX('button_click');
        this.startDuolingoFlow();
        return;
      }
    }

    // Проверяем деревню (до ресурсов — меньше объект, точнее попадание)
    if (this.villageMarker) {
      const vHits = this.raycaster.intersectObjects(this.villageMarker.children);
      if (vHits.length > 0) {
        this.sceneManager.startScene('FarmScene');
        return;
      }
    }

    // Проверяем ресурсы
    const resMeshes = this.resources.filter(r => !r.exhausted).map(r => r.mesh);
    const resHits = this.raycaster.intersectObjects(resMeshes);
    if (resHits.length > 0) {
      const hit = resHits[0].object;
      const idx = hit.userData.index;
      this.collectResource(idx);
    }
  }

  private async collectResource(index: number): Promise<void> {
    const node = this.resources[index];
    if (!node || node.exhausted) return;

    const user = AuthService.getInstance().getCurrentUser();
    if (!user || !this.player) return;

    // Добавить ресурс
    if (!this.player.resources) this.player.resources = {};
    this.player.resources[node.resourceId] = (this.player.resources[node.resourceId] ?? 0) + node.yield;

    // Обновить totalResources
    this.player.totalResources = Object.values(this.player.resources).reduce((a, b) => a + b, 0);

    // Сохранить
    await DatabaseService.getInstance().updatePlayerStats(user.uid, {
      resources: this.player.resources,
      totalResources: this.player.totalResources,
    });

    // Истощение
    BiomeManager.getInstance().addExhaustion(this.biomeId, 5);

    // Визуальный эффект
    node.exhausted = true;
    (node.mesh.material as THREE.MeshLambertMaterial).opacity = 0.3;
    (node.mesh.material as THREE.MeshLambertMaterial).transparent = true;

    AudioManager.getInstance().playSFX('resource_collect');

    // Respawn через время
    const respawnMs = (this.biomeLevel === 1 ? 3 : this.biomeLevel === 2 ? 5 : 10) * 60000;
    setTimeout(() => {
      node.exhausted = false;
      (node.mesh.material as THREE.MeshLambertMaterial).opacity = 1.0;
    }, respawnMs);

    this.updateBiomeHud();
  }

  // ─── Duolingo Flow: NPC → Bait → Checkpoint → Fishing ───

  private async startDuolingoFlow(): Promise<void> {
    const biomeConfig = BIOMES.find((b: { id: string }) => b.id === this.biomeId);
    const totalCheckpoints = biomeConfig?.checkpointsPerSession ?? 5;

    // Шаг 1: Выбор NPC (ESC/крестик → отмена flow)
    const ownedNPCs = this.player?.activeNPCIds ?? [];
    const npcResult = await showNPCSelectUI(ownedNPCs);

    // Шаг 2: Выбор приманки (ESC/крестик → отмена flow)
    const coins = this.player?.softCoins ?? 0;
    const baitResult = await showBaitSelectUI(coins);
    if (!baitResult.baitId) return; // Отменено

    // Шаг 3: 3D карта чекпоинтов (Duolingo-стиль)
    const cpData: CheckpointMapData = {
      total: totalCheckpoints,
      completed: this.checkpointsCompleted,
      biomeLevel: this.biomeLevel,
      biomeId: this.biomeId,
      onSelect: (checkpointIndex: number) => {
        // Запуск рыбалки с выбранными параметрами
        this.sceneManager.startScene('FishingSessionScene', {
          levelId: this.biomeLevel,
          biomeId: this.biomeId,
          checkpoints: totalCheckpoints,
          checkpointIndex,
          npcId: npcResult.npcId,
          npcDef: npcResult.npcDef,
          baitId: baitResult.baitId,
          baitDef: baitResult.baitDef,
        });
      },
      onCancel: () => {
        // Возврат в BiomeView
        this.sceneManager.startScene('BiomeView', { biomeId: this.biomeId });
      },
    };
    this.sceneManager.startScene('CheckpointMapScene', cpData);
  }

  // ─── UI ───

  private createUI(): void {
    // Верхний HUD биома
    this.biomeHud = document.createElement('div');
    this.biomeHud.style.cssText = `
      position:fixed;top:60px;left:50%;transform:translateX(-50%);
      padding:8px 20px;background:rgba(10,22,40,0.9);border:1px solid #3498db;
      border-radius:8px;color:white;font-family:'Rajdhani',sans-serif;font-size:14px;
      z-index:50;text-align:center;display:flex;gap:16px;align-items:center;
    `;
    this.updateBiomeHud();
    document.body.appendChild(this.biomeHud);

    // Навигация
    this.navBar = document.createElement('div');
    this.navBar.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:50;';

    const buttons = [
      { text: '🎣 Рыбачить', action: () => this.startDuolingoFlow() },
      { text: '🏠 Ферма', action: () => this.sceneManager.startScene('FarmScene') },
      { text: '📊 Ресурсы', action: () => this.sceneManager.startScene('ResourceBiomeScreen', { biomeId: this.biomeId }) },
      { text: '🌍 Карта', action: () => this.sceneManager.startScene('PlanetScene') },
    ];

    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.className = 'pixel-btn';
      btn.textContent = b.text;
      btn.style.cssText = 'padding:10px 16px;font-size:13px;font-family:"Rajdhani",sans-serif;';
      btn.onclick = () => { AudioManager.getInstance().playSFX('button_click'); b.action(); };
      this.navBar.appendChild(btn);
    }
    document.body.appendChild(this.navBar);
  }

  private updateBiomeHud(): void {
    if (!this.biomeHud) return;
    const bm = BiomeManager.getInstance();
    const exhaustion = Math.round(bm.getBiomeExhaustion(this.biomeId));
    const biomeConfig = BIOMES.find((b: { id: string }) => b.id === this.biomeId);
    const name = biomeConfig?.name ?? this.biomeId;
    const event = bm.getActiveEvent(this.biomeId);

    this.biomeHud.innerHTML = `
      <span style="font-family:'Press Start 2P',monospace;font-size:10px;">${name}</span>
      <span>L${this.biomeLevel}</span>
      <span>⛏ ${exhaustion}%</span>
      ${event ? `<span style="color:#f39c12;">⚡ ${event.name}</span>` : ''}
    `;
  }

  private checkEvents(): void {
    const sem = SeasonalEventManager.getInstance();
    const active = sem.checkEventStart(this.biomeId, this.biomeLevel);

    if (active) {
      const ev = active.event;
      const remainMs = sem.getRemainingTime(this.biomeId);
      const remainH = Math.ceil(remainMs / 3600000);

      // Баннер сверху
      this.eventBanner = document.createElement('div');
      this.eventBanner.style.cssText = `
        position:fixed;top:100px;left:50%;transform:translateX(-50%);
        padding:12px 24px;background:rgba(243,156,18,0.9);border-radius:8px;
        color:white;font-family:'Press Start 2P',monospace;font-size:11px;
        z-index:60;text-align:center;cursor:pointer;
      `;
      this.eventBanner.textContent = `⚡ ${ev.name} — ⏱ ${remainH}ч`;
      document.body.appendChild(this.eventBanner);

      // Клик на баннер → попап с деталями
      this.eventBanner.addEventListener('click', () => {
        this.showEventPopup(ev, remainH);
      });

      // Применить sky color override
      if (ev.skyColorOverride !== null) {
        this.scene.background = new THREE.Color(ev.skyColorOverride);
        if (this.scene.fog) (this.scene.fog as THREE.Fog).color.set(ev.skyColorOverride);
      }
    }
  }

  private showEventPopup(ev: import('../data/seasonalEvents').SeasonalEvent, remainH: number): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;';

    const e = ev.effects;
    const bonuses: string[] = [];
    if (e.chanceMultiplier > 1) bonuses.push(`🎯 Шанс поимки ×${e.chanceMultiplier}`);
    if (e.rarityBonus > 0) bonuses.push(`⭐ Редкость +${e.rarityBonus}%`);
    if (e.valueMultiplier > 1) bonuses.push(`💰 Стоимость ×${e.valueMultiplier}`);
    if (e.quantityMultiplier > 1) bonuses.push(`📦 Количество ×${e.quantityMultiplier}`);
    if (e.speedMultiplier > 1) bonuses.push(`⚡ Скорость ×${e.speedMultiplier}`);

    overlay.innerHTML = `
      <div style="background:rgba(10,22,40,0.95);border:2px solid #f39c12;border-radius:12px;padding:24px;max-width:400px;text-align:center;font-family:'Rajdhani',sans-serif;color:white;">
        <h3 style="font-family:'Press Start 2P',monospace;font-size:13px;color:#f39c12;margin-bottom:12px;">⚡ ${ev.name}</h3>
        <p style="font-size:15px;color:#bdc3c7;margin-bottom:16px;">${ev.description}</p>
        <div style="text-align:left;padding:8px 12px;background:rgba(0,0,0,0.3);border-radius:8px;margin-bottom:12px;">
          ${bonuses.map(b => `<p style="margin:4px 0;font-size:14px;">${b}</p>`).join('')}
        </div>
        <p style="font-size:13px;color:#f39c12;">⏱ Осталось: ${remainH}ч</p>
        <p style="font-size:12px;color:#566573;margin-top:8px;">🎁 ${ev.specialReward}</p>
        <button id="event-close" style="margin-top:16px;padding:10px 24px;background:#f39c12;color:white;border:none;border-radius:6px;font-size:15px;cursor:pointer;font-family:'Rajdhani',sans-serif;">Понятно!</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#event-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  private async loadPlayer(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (user) {
      this.player = await DatabaseService.getInstance().getPlayerProfile(user.uid);
    }
  }

  private onResize(): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }
}
