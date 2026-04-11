// ============================================================
// BUILDING SCREEN — попап апгрейда здания с 3D превью
// Из Code_tz/03_BIOME_FARM.md + тз/11_GAME_CONFIGS.md секция 5
// HTML попап на document.body + inline WebGL canvas
// ============================================================

import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import { getBuildingById, getBuildingLevel } from '../data/buildingDatabase';
import { CRAFTING_RECIPES } from '../data/craftingRecipes';
import { matLP, LP } from '../utils/LowPolyStyle';
import { getResourceAmount, resolveBuildingId, spendResourceAmount } from '../utils/IdAliases';
import {
  addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle,
  getSectionStyle, getButtonStyle, getButtonRowStyle,
  applyButtonHover, createCloseButton,
} from '../ui/DesignSystem';
import type { PlayerProfile } from '../models/Player';

export class BuildingScreen extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private buildingId = 'house';
  private removeEsc: (() => void) | null = null;
  private previewRenderer: THREE.WebGLRenderer | null = null;
  private previewRaf = 0;

  start(data?: any): void {
    this.buildingId = data?.buildingId ?? 'house';
    this.scene.background = null;
    this.showPopup();
  }

  update(_delta: number): void {}

  stop(): void {
    super.stop();
    this.removeEsc?.();
    this.removeEsc = null;
    this.disposePreview();
    this.overlay?.remove();
    this.overlay = null;
  }

  private disposePreview(): void {
    if (this.previewRaf) cancelAnimationFrame(this.previewRaf);
    this.previewRenderer?.dispose();
    this.previewRenderer = null;
    this.previewRaf = 0;
  }

  private async showPopup(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (!user) { this.goBack(); return; }

    const player = await DatabaseService.getInstance().getPlayerProfile(user.uid);
    if (!player) { this.goBack(); return; }

    const configBuildingId = resolveBuildingId(this.buildingId);
    const building = getBuildingById(configBuildingId);
    if (!building) { this.goBack(); return; }

    const currentLevel = this.getPlayerBuilding(player, configBuildingId)?.level ?? 0;
    const nextLevel = currentLevel + 1;
    const nextConfig = getBuildingLevel(configBuildingId, nextLevel);
    const isMaxLevel = !nextConfig || nextLevel > building.maxLevel;

    const resStr = nextConfig
      ? nextConfig.upgradeResources.map(r => `${r.quantity}\u00D7 ${r.resourceId}`).join(' + ')
      : '';

    const canAfford = nextConfig
      ? player.softCoins >= nextConfig.upgradeCostSoft &&
        nextConfig.upgradeResources.every(r => getResourceAmount(player.resources, r.resourceId) >= r.quantity)
      : false;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = getOverlayStyle();

    const card = document.createElement('div');
    card.style.cssText = getCardStyle(440) + 'text-align:center;max-height:90vh;overflow-y:auto;';

    card.appendChild(createCloseButton(() => this.goBack()));

    // ── 3D Building Preview ──────────────────────────────────
    const modelWrap = document.createElement('div');
    modelWrap.style.cssText = `
      width:140px;height:120px;margin:0 auto 12px;border-radius:8px;overflow:hidden;
      background:radial-gradient(circle, rgba(26,42,74,0.6), rgba(13,27,42,0.8));
    `;
    card.appendChild(modelWrap);

    // Title
    const titleEl = document.createElement('h2');
    titleEl.style.cssText = getTitleStyle();
    titleEl.textContent = building.name;
    card.appendChild(titleEl);

    const desc = document.createElement('p');
    desc.style.cssText = 'color:#95a5a6;font-size:13px;margin-bottom:12px;';
    desc.textContent = building.description;
    card.appendChild(desc);

    // Level indicator
    const levelP = document.createElement('p');
    levelP.style.cssText = 'font-size:16px;margin-bottom:16px;color:#ecf0f1;';
    levelP.innerHTML = `Уровень: <span style="color:#3498db;font-weight:bold;">${currentLevel}</span> / ${building.maxLevel}`;
    card.appendChild(levelP);

    if (isMaxLevel) {
      const maxP = document.createElement('p');
      maxP.style.cssText = 'color:#f39c12;font-size:18px;margin-bottom:16px;';
      maxP.textContent = '\uD83C\uDFC6 Максимальный уровень!';
      card.appendChild(maxP);
    } else {
      const section = document.createElement('div');
      section.style.cssText = getSectionStyle() + 'text-align:left;margin-bottom:12px;';
      section.innerHTML = `
        <p style="margin:4px 0;font-size:14px;">\uD83D\uDCB0 Стоимость: <span style="color:${player.softCoins >= nextConfig!.upgradeCostSoft ? '#27ae60' : '#e74c3c'}">${nextConfig!.upgradeCostSoft}</span> монет</p>
        <p style="margin:4px 0;font-size:14px;">\uD83D\uDCE6 Ресурсы: ${resStr || 'нет'}</p>
        <p style="margin:4px 0;font-size:14px;">\u23F1 Время: ${nextConfig!.upgradeTimeMin} мин</p>
        <p style="margin:4px 0;font-size:14px;">\u2B06 ${nextConfig!.bonusDescription}</p>
      `;
      card.appendChild(section);

      const coinP = document.createElement('p');
      coinP.style.cssText = 'margin-bottom:8px;color:#bdc3c7;';
      coinP.textContent = `У тебя: ${player.softCoins}\uD83D\uDCB0`;
      card.appendChild(coinP);
    }

    // ── Buttons ──────────────────────────────────────────────
    const btnRow = document.createElement('div');
    btnRow.style.cssText = getButtonRowStyle();

    if (!isMaxLevel) {
      const upgradeBtn = document.createElement('button');
      upgradeBtn.textContent = '\u2B06 УЛУЧШИТЬ';
      upgradeBtn.style.cssText = getButtonStyle('primary', 'lg', !canAfford);
      upgradeBtn.disabled = !canAfford;
      if (canAfford) {
        applyButtonHover(upgradeBtn);
        upgradeBtn.addEventListener('click', () => {
          this.doUpgrade(player, user.uid, nextConfig!.upgradeCostSoft, nextConfig!.upgradeResources, nextLevel);
        });
      }
      btnRow.appendChild(upgradeBtn);
    }

    // Кнопка "Крафт" если здание имеет рецепты
    const hasRecipes = CRAFTING_RECIPES.some(r => resolveBuildingId(r.requiredBuilding) === configBuildingId);
    if (hasRecipes && currentLevel > 0) {
      const craftBtn = document.createElement('button');
      craftBtn.textContent = '\u2692 КРАФТ';
      craftBtn.style.cssText = getButtonStyle('primary', 'md');
      applyButtonHover(craftBtn);
      craftBtn.addEventListener('click', () => {
        this.sceneManager.startScene('CraftingPopup', { buildingId: configBuildingId });
      });
      btnRow.appendChild(craftBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'ЗАКРЫТЬ';
    closeBtn.style.cssText = getButtonStyle('danger', 'md');
    applyButtonHover(closeBtn);
    closeBtn.addEventListener('click', () => this.goBack());
    btnRow.appendChild(closeBtn);

    card.appendChild(btnRow);
    this.overlay.appendChild(card);
    document.body.appendChild(this.overlay);

    this.removeEsc = addEscHandler(() => this.goBack());
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.goBack(); });

    // Create 3D preview
    requestAnimationFrame(() => this.create3DPreview(modelWrap, configBuildingId, currentLevel));
  }

  private getPlayerBuilding(player: PlayerProfile, buildingId: string): any {
    const buildings = player.farmBuildings as any;
    return buildings[buildingId] ?? buildings[this.buildingId];
  }

  // ── 3D Building Preview ────────────────────────────────────
  private create3DPreview(container: HTMLElement, buildingId: string, level: number): void {
    this.disposePreview();

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(140, 120);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    this.previewRenderer = renderer;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffd700, 0.8);
    dirLight.position.set(3, 4, 2);
    scene.add(dirLight);

    const camera = new THREE.PerspectiveCamera(35, 140 / 120, 0.1, 20);
    camera.position.set(2, 2, 3);
    camera.lookAt(0, 0.5, 0);

    const model = this.createBuildingModel(buildingId, level);
    scene.add(model);

    // Ground disc
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.05, 8),
      matLP(LP.grass)
    );
    ground.position.y = -0.025;
    scene.add(ground);

    const clock = new THREE.Clock();

    const animate = () => {
      this.previewRaf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      model.rotation.y = t * 0.4;
      renderer.render(scene, camera);
    };
    animate();
  }

  private createBuildingModel(buildingId: string, level: number): THREE.Group {
    const g = new THREE.Group();
    const s = 0.5 + level * 0.05; // Slightly larger at higher levels
    const lvlColor = level >= 4 ? 0xf39c12 : level >= 2 ? 0x8B6914 : 0x6d4c2a;

    switch (buildingId) {
      case 'house': {
        // Main box
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.8 * s, 0.6 * s, 0.7 * s),
          matLP(lvlColor)
        );
        body.position.y = 0.3 * s;
        g.add(body);
        // Roof (cone)
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(0.65 * s, 0.5 * s, 4),
          matLP(0xc0392b)
        );
        roof.position.y = 0.85 * s;
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
        // Door
        const door = new THREE.Mesh(
          new THREE.BoxGeometry(0.2 * s, 0.3 * s, 0.02 * s),
          matLP(0x3d1f00)
        );
        door.position.set(0, 0.15 * s, 0.36 * s);
        g.add(door);
        break;
      }
      case 'smokehouse': {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.7 * s, 0.5 * s, 0.6 * s),
          matLP(0x5d4037)
        );
        body.position.y = 0.25 * s;
        g.add(body);
        // Flat roof
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(0.8 * s, 0.06 * s, 0.7 * s),
          matLP(0x3e2723)
        );
        roof.position.y = 0.53 * s;
        g.add(roof);
        // Chimney
        const chimney = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08 * s, 0.1 * s, 0.4 * s, 6),
          matLP(0x424242)
        );
        chimney.position.set(0.2 * s, 0.73 * s, -0.1 * s);
        g.add(chimney);
        // Smoke particles (static spheres)
        for (let i = 0; i < 3; i++) {
          const smoke = new THREE.Mesh(
            new THREE.SphereGeometry(0.06 * s, 4, 3),
            new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.3 - i * 0.08 })
          );
          smoke.position.set(0.2 * s, (0.95 + i * 0.15) * s, -0.1 * s);
          smoke.name = `smoke_${i}`;
          g.add(smoke);
        }
        break;
      }
      case 'workshop': {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.9 * s, 0.5 * s, 0.7 * s),
          matLP(0x795548)
        );
        body.position.y = 0.25 * s;
        g.add(body);
        // Angled roof
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(1.0 * s, 0.06 * s, 0.8 * s),
          matLP(0x4e342e)
        );
        roof.position.set(0, 0.55 * s, 0);
        roof.rotation.z = 0.15;
        g.add(roof);
        // Anvil (small)
        const anvil = new THREE.Mesh(
          new THREE.BoxGeometry(0.15 * s, 0.12 * s, 0.1 * s),
          matLP(0x37474f)
        );
        anvil.position.set(0.5 * s, 0.06 * s, 0.3 * s);
        g.add(anvil);
        break;
      }
      case 'hut': {
        // Round hut
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4 * s, 0.45 * s, 0.5 * s, 8),
          matLP(0x8d6e63)
        );
        body.position.y = 0.25 * s;
        g.add(body);
        // Cone roof
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(0.5 * s, 0.45 * s, 8),
          matLP(0x4e342e)
        );
        roof.position.y = 0.72 * s;
        g.add(roof);
        break;
      }
      case 'dock': {
        // Platform
        const platform = new THREE.Mesh(
          new THREE.BoxGeometry(1.0 * s, 0.08 * s, 0.5 * s),
          matLP(0x6d4c2a)
        );
        platform.position.y = 0.2 * s;
        g.add(platform);
        // Pillars
        for (const x of [-0.35, 0, 0.35]) {
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.3 * s, 5),
            matLP(0x5d4037)
          );
          pillar.position.set(x * s, 0.05 * s, 0);
          g.add(pillar);
        }
        break;
      }
      default: {
        // Generic box building
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.7 * s, 0.5 * s, 0.6 * s),
          matLP(lvlColor)
        );
        body.position.y = 0.25 * s;
        g.add(body);
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(0.55 * s, 0.4 * s, 4),
          matLP(0xc0392b)
        );
        roof.position.y = 0.7 * s;
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
      }
    }

    // Level indicator: golden stars above building
    if (level > 0) {
      for (let i = 0; i < Math.min(level, 5); i++) {
        const star = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.05, 0),
          new THREE.MeshBasicMaterial({ color: 0xf39c12 })
        );
        const angle = (i / Math.min(level, 5)) * Math.PI * 2;
        star.position.set(Math.cos(angle) * 0.3, 1.2 * s, Math.sin(angle) * 0.3);
        star.name = `star_${i}`;
        g.add(star);
      }
    }

    return g;
  }

  private async doUpgrade(
    player: PlayerProfile,
    uid: string,
    cost: number,
    resources: Array<{ resourceId: string; quantity: number }>,
    newLevel: number,
  ): Promise<void> {
    const configBuildingId = resolveBuildingId(this.buildingId);
    player.softCoins -= cost;
    for (const r of resources) {
      spendResourceAmount(player.resources, r.resourceId, r.quantity);
    }

    const buildings = player.farmBuildings as any;
    const now = Date.now();
    if (!buildings[configBuildingId]) {
      buildings[configBuildingId] = { level: 0, upgradedAt: 0, visualStage: 0 };
    }
    buildings[configBuildingId].level = newLevel;
    buildings[configBuildingId].upgradedAt = now;
    buildings[configBuildingId].visualStage = newLevel;

    if (this.buildingId !== configBuildingId) {
      if (!buildings[this.buildingId]) {
        buildings[this.buildingId] = { level: 0, upgradedAt: 0, visualStage: 0 };
      }
      buildings[this.buildingId].level = newLevel;
      buildings[this.buildingId].upgradedAt = now;
      buildings[this.buildingId].visualStage = newLevel;
    }

    await DatabaseService.getInstance().updatePlayerStats(uid, {
      softCoins: player.softCoins,
      resources: player.resources,
      farmBuildings: player.farmBuildings,
    });

    AudioManager.getInstance().playSFX('upgrade');
    this.disposePreview();
    this.overlay?.remove();
    this.showPopup();
  }

  private goBack(): void {
    this.sceneManager.startScene('FarmScene');
  }
}
