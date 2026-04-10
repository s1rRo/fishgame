// ============================================================
// RESOURCE BIOME SCREEN — истощение ресурсов биома + 3D превью
// Из Code_tz/05_NPC_PET_SCREENS.md
// HTML попап + inline WebGL canvas для ресурсных моделей
// ============================================================

import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { BiomeManager } from '../services/BiomeManager';
import { getResourcesByBiome } from '../data/resourceDatabase';
import { BIOMES } from '../data/biomeDatabase';
import { createTree, createRock, matLP, LP } from '../utils/LowPolyStyle';
import {
  addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle,
  getSectionStyle, getButtonStyle, getButtonRowStyle,
  applyButtonHover, createCloseButton,
} from '../ui/DesignSystem';

interface ResPreview {
  renderer: THREE.WebGLRenderer;
  raf: number;
}

export class ResourceBiomeScreen extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private biomeId = 'rio_salado_l1';
  private removeEsc: (() => void) | null = null;
  private previews: ResPreview[] = [];

  start(data?: any): void {
    this.biomeId = data?.biomeId ?? 'rio_salado_l1';
    this.scene.background = null;
    this.showScreen();
  }

  update(_delta: number): void {}

  stop(): void {
    super.stop();
    this.removeEsc?.();
    this.removeEsc = null;
    this.disposePreviews();
    this.overlay?.remove();
    this.overlay = null;
  }

  private disposePreviews(): void {
    for (const p of this.previews) {
      cancelAnimationFrame(p.raf);
      p.renderer.dispose();
    }
    this.previews = [];
  }

  private async showScreen(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (!user) { this.goBack(); return; }

    const player = await DatabaseService.getInstance().getPlayerProfile(user.uid);
    if (!player) { this.goBack(); return; }

    const bm = BiomeManager.getInstance();
    const exhaustion = Math.round(bm.getBiomeExhaustion(this.biomeId));
    const available = bm.getResourcesAvailable(this.biomeId);

    let biomeLevel = 1;
    if (this.biomeId.includes('l2') || this.biomeId.includes('nahuel')) biomeLevel = 2;
    if (this.biomeId.includes('l3') || this.biomeId.includes('lago')) biomeLevel = 3;

    const biomeConfig = BIOMES.find((b: { id: string }) => b.id === this.biomeId);
    const biomeName = biomeConfig?.name ?? this.biomeId;
    const biomeResources = getResourcesByBiome(biomeLevel).filter(r => r.howToGet === 'npc_gather');
    const playerRes = player.resources ?? {};

    const exhaustColor = exhaustion > 75 ? '#e74c3c' : exhaustion > 40 ? '#f39c12' : '#27ae60';

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = getOverlayStyle();

    const card = document.createElement('div');
    card.style.cssText = getCardStyle(480) + 'text-align:center;max-height:85vh;overflow-y:auto;';

    card.appendChild(createCloseButton(() => this.goBack()));

    // Title
    const title = document.createElement('h2');
    title.style.cssText = getTitleStyle();
    title.textContent = `\uD83D\uDCCA РЕСУРСЫ: ${biomeName}`;
    card.appendChild(title);

    // ── Exhaustion gauge with animated bar ────────────────────
    const exhaustSection = document.createElement('div');
    exhaustSection.style.cssText = getSectionStyle() + 'margin-bottom:16px;';

    const exhaustHeader = document.createElement('div');
    exhaustHeader.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:8px;';
    exhaustHeader.innerHTML = `
      <span style="color:#bdc3c7;">Истощение биома:</span>
      <span style="color:${exhaustColor};font-weight:bold;">${exhaustion}%</span>
    `;
    exhaustSection.appendChild(exhaustHeader);

    // Animated gauge bar
    const barOuter = document.createElement('div');
    barOuter.style.cssText = 'height:10px;background:#2c3e50;border-radius:5px;overflow:hidden;position:relative;';
    const barInner = document.createElement('div');
    barInner.style.cssText = `height:100%;width:0%;background:linear-gradient(90deg,${exhaustColor},${exhaustColor}88);border-radius:5px;transition:width 1s ease-out;`;
    barOuter.appendChild(barInner);
    exhaustSection.appendChild(barOuter);

    const availP = document.createElement('p');
    availP.style.cssText = 'font-size:12px;color:#95a5a6;margin-top:6px;';
    availP.textContent = `Доступно ресурсов: ${available} / 20`;
    exhaustSection.appendChild(availP);

    if (exhaustion > 75) {
      const warnP = document.createElement('p');
      warnP.style.cssText = 'color:#e74c3c;font-size:13px;margin-top:4px;';
      warnP.textContent = '\u26A0 Биом истощён! Ресурсы восстанавливаются медленнее.';
      exhaustSection.appendChild(warnP);
    }

    card.appendChild(exhaustSection);

    // Animate gauge after render
    requestAnimationFrame(() => { barInner.style.width = `${exhaustion}%`; });

    // ── Resource list with 3D mini previews ──────────────────
    const resSection = document.createElement('div');
    resSection.style.cssText = getSectionStyle() + 'margin-bottom:16px;text-align:left;';

    const resTitle = document.createElement('h3');
    resTitle.style.cssText = 'font-size:14px;color:#3498db;margin-bottom:10px;';
    resTitle.textContent = 'Ваши запасы:';
    resSection.appendChild(resTitle);

    if (biomeResources.length === 0) {
      const emptyP = document.createElement('p');
      emptyP.style.cssText = 'color:#95a5a6;';
      emptyP.textContent = 'Нет ресурсов в этом биоме';
      resSection.appendChild(emptyP);
    } else {
      for (const r of biomeResources) {
        const owned = playerRes[r.id] ?? 0;

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #2c3e50;';

        const leftDiv = document.createElement('div');
        leftDiv.style.cssText = 'display:flex;align-items:center;gap:8px;';

        // 3D mini canvas for resource
        const canvasWrap = document.createElement('div');
        canvasWrap.style.cssText = 'width:32px;height:32px;border-radius:4px;overflow:hidden;';
        leftDiv.appendChild(canvasWrap);

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'color:#ecf0f1;font-size:13px;';
        nameSpan.textContent = r.name;
        leftDiv.appendChild(nameSpan);

        const rightDiv = document.createElement('div');
        rightDiv.style.cssText = 'text-align:right;';
        rightDiv.innerHTML = `
          <span style="color:#27ae60;font-weight:bold;">${owned}</span>
          <span style="color:#95a5a6;font-size:12px;"> (${r.baseValue}\uD83D\uDCB0/ед)</span>
        `;

        row.appendChild(leftDiv);
        row.appendChild(rightDiv);
        resSection.appendChild(row);

        // Create mini 3D preview based on resource type
        const resType = this.getResourceModelType(r.id);
        requestAnimationFrame(() => this.createMiniPreview(canvasWrap, resType, r.meshColor));
      }
    }
    card.appendChild(resSection);

    // ── Relocate section ─────────────────────────────────────
    const relocSection = document.createElement('div');
    relocSection.style.cssText = getSectionStyle() + 'text-align:center;margin-bottom:16px;';

    const relocP = document.createElement('p');
    relocP.style.cssText = 'font-size:13px;color:#95a5a6;margin-bottom:8px;';
    relocP.textContent = 'Ресурсов мало? Переместите деревню в другую зону.';
    relocSection.appendChild(relocP);

    const relocBtn = document.createElement('button');
    const canReloc = player.softCoins >= 2000;
    relocBtn.textContent = '\uD83C\uDFD8 Переместить (2000\uD83D\uDCB0)';
    relocBtn.style.cssText = getButtonStyle('secondary', 'sm', !canReloc);
    relocBtn.disabled = !canReloc;
    if (canReloc) {
      applyButtonHover(relocBtn);
      relocBtn.addEventListener('click', async () => {
        player.softCoins -= 2000;
        await DatabaseService.getInstance().updatePlayerStats(user.uid, {
          softCoins: player.softCoins,
          villagePosition: undefined,
        });
        this.sceneManager.startScene('VillagePlacementScreen', { biomeId: this.biomeId });
      });
    }
    relocSection.appendChild(relocBtn);
    card.appendChild(relocSection);

    // Back button
    const btnRow = document.createElement('div');
    btnRow.style.cssText = getButtonRowStyle();
    const backBtn = document.createElement('button');
    backBtn.textContent = '\u2190 НАЗАД';
    backBtn.style.cssText = getButtonStyle('back', 'md');
    applyButtonHover(backBtn);
    backBtn.addEventListener('click', () => this.goBack());
    btnRow.appendChild(backBtn);
    card.appendChild(btnRow);

    this.overlay.appendChild(card);
    document.body.appendChild(this.overlay);

    this.removeEsc = addEscHandler(() => this.goBack());
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.goBack(); });
  }

  // ── Resource type detection ────────────────────────────────
  private getResourceModelType(resourceId: string): 'tree' | 'rock' | 'herb' | 'ore' {
    if (resourceId.includes('wood') || resourceId.includes('oak') || resourceId.includes('pine')) return 'tree';
    if (resourceId.includes('stone') || resourceId.includes('rock')) return 'rock';
    if (resourceId.includes('herb') || resourceId.includes('grass') || resourceId.includes('reed')) return 'herb';
    if (resourceId.includes('ore') || resourceId.includes('iron') || resourceId.includes('gold') || resourceId.includes('mineral')) return 'ore';
    return 'rock'; // default
  }

  // ── Mini 3D Resource Preview ───────────────────────────────
  private createMiniPreview(container: HTMLElement, type: 'tree' | 'rock' | 'herb' | 'ore', color: number): void {
    const size = 32;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffd700, 0.6);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);

    let model: THREE.Object3D;

    switch (type) {
      case 'tree': {
        model = createTree(0.3);
        camera.position.set(0, 0.5, 1.5);
        camera.lookAt(0, 0.3, 0);
        break;
      }
      case 'rock': {
        model = createRock(0.4);
        camera.position.set(0, 0.3, 1.0);
        camera.lookAt(0, 0.1, 0);
        break;
      }
      case 'herb': {
        // Small green cluster
        const g = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const blade = new THREE.Mesh(
            new THREE.ConeGeometry(0.04, 0.2, 4),
            matLP(color || 0x27ae60)
          );
          blade.position.set((i - 1) * 0.08, 0.1, 0);
          blade.rotation.z = (i - 1) * 0.15;
          g.add(blade);
        }
        model = g;
        camera.position.set(0, 0.15, 0.6);
        camera.lookAt(0, 0.08, 0);
        break;
      }
      case 'ore': {
        // Crystal-like ore
        const g = new THREE.Group();
        const main = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.12, 0),
          matLP(color || 0x95a5a6)
        );
        main.position.y = 0.12;
        g.add(main);
        const small = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.07, 0),
          matLP(color || 0x95a5a6)
        );
        small.position.set(0.1, 0.07, 0.05);
        g.add(small);
        model = g;
        camera.position.set(0, 0.2, 0.7);
        camera.lookAt(0, 0.1, 0);
        break;
      }
    }

    scene.add(model);

    const clock = new THREE.Clock();
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      model.rotation.y = t * 1.0;
      renderer.render(scene, camera);
    };
    animate();

    this.previews.push({ renderer, raf: rafId });
  }

  private goBack(): void {
    this.sceneManager.startScene('BiomeView', { biomeId: this.biomeId });
  }
}
