// ============================================================
// NPC LIST SCREEN — список NPC игрока + найм (с 3D превью)
// Из Code_tz/05_NPC_PET_SCREENS.md
// HTML попап на document.body + inline WebGL canvas для NPC моделей
// ============================================================

import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import { NPC_DATABASE, getNPCById } from '../data/npcDatabase';
import { NPC_RARITY_STATS } from '../models/NPC';
import { createNPCModel, animateNPCBobWalk } from '../utils/LowPolyStyle';
import {
  addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle,
  getButtonStyle, getButtonRowStyle, applyButtonHover, createCloseButton,
} from '../ui/DesignSystem';

/** Inline 3D preview handle for cleanup */
interface NPCPreview {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  model: THREE.Group;
  raf: number;
}

export class NPCListScreen extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private removeEsc: (() => void) | null = null;
  private previews: NPCPreview[] = [];

  start(_data?: any): void {
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

    const ownedIds = player.activeNPCIds ?? [];

    const rarityColors: Record<string, string> = {
      common: '#95a5a6', uncommon: '#3498db', rare: '#9b59b6',
      epic: '#e74c3c', legendary: '#f39c12',
    };

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = getOverlayStyle();

    const card = document.createElement('div');
    card.style.cssText = getCardStyle(720) + 'text-align:center;max-height:85vh;overflow-y:auto;';

    // Заголовок
    const title = document.createElement('h2');
    title.style.cssText = getTitleStyle();
    title.textContent = '\uD83D\uDC65 NPC ПОМОЩНИКИ';
    card.appendChild(title);
    card.appendChild(createCloseButton(() => this.goBack()));

    // Инфо
    const info = document.createElement('p');
    info.style.cssText = 'color:#95a5a6;font-size:13px;margin-bottom:16px;';
    info.textContent = `В отряде: ${ownedIds.length} / 3 | \uD83D\uDC8E ${player.gems} гемов`;
    card.appendChild(info);

    // Сетка NPC
    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:20px;';

    const visibleNPCs = NPC_DATABASE.filter(n => !n.seasonalOnly || ownedIds.includes(n.id));

    for (const npc of visibleNPCs) {
      const owned = ownedIds.includes(npc.id);
      const color = rarityColors[npc.rarity] ?? '#95a5a6';

      const npcCard = document.createElement('div');
      npcCard.style.cssText = `
        background:rgba(0,0,0,0.4);border:1px solid ${color};border-radius:8px;
        padding:12px;cursor:pointer;transition:transform 0.2s;min-width:140px;
        ${owned ? '' : 'opacity:0.5;'}
      `;
      npcCard.addEventListener('mouseenter', () => { npcCard.style.transform = 'scale(1.05)'; });
      npcCard.addEventListener('mouseleave', () => { npcCard.style.transform = 'scale(1)'; });

      // NPC portrait image
      const npcImg = document.createElement('img');
      npcImg.src = npc.iconPath;
      npcImg.style.cssText = 'width:80px;height:80px;margin:0 auto 8px;border-radius:50%;overflow:hidden;image-rendering:pixelated;background:rgba(0,0,0,0.3);display:block;object-fit:cover;';
      npcImg.onerror = () => { npcImg.style.display = 'none'; };
      npcCard.appendChild(npcImg);

      // 3D canvas preview (fallback)
      const canvasWrap = document.createElement('div');
      canvasWrap.style.cssText = 'width:80px;height:80px;margin:0 auto 8px;border-radius:50%;overflow:hidden;display:none;';
      npcCard.appendChild(canvasWrap);

      // Имя
      const nameP = document.createElement('p');
      nameP.style.cssText = 'font-weight:bold;font-size:14px;margin:0;color:#ecf0f1;';
      nameP.textContent = npc.name;
      npcCard.appendChild(nameP);

      // Редкость
      const rarP = document.createElement('p');
      rarP.style.cssText = `color:${color};font-size:11px;text-transform:uppercase;margin:2px 0;`;
      rarP.textContent = npc.rarity;
      npcCard.appendChild(rarP);

      // Характеристики
      const statsP = document.createElement('p');
      statsP.style.cssText = 'font-size:11px;color:#95a5a6;margin:2px 0;';
      statsP.textContent = `\uD83C\uDFA3${npc.predisposition.fish}% \uD83E\uDEB5${npc.predisposition.wood}% \uD83E\uDEA8${npc.predisposition.stone}%`;
      npcCard.appendChild(statsP);

      // Статус
      const statusP = document.createElement('p');
      statusP.style.cssText = `font-size:11px;color:${owned ? '#27ae60' : '#95a5a6'};margin:2px 0;`;
      statusP.textContent = owned ? '\u2705 В отряде' : `\uD83D\uDC8E ${npc.basePrice || '\u2014'}`;
      npcCard.appendChild(statusP);

      // Click → detail
      if (owned) {
        npcCard.addEventListener('click', () => {
          this.sceneManager.startScene('NPCDetailScreen', { npcId: npc.id });
        });
      }

      grid.appendChild(npcCard);

      // Create 3D preview after card is in DOM
      requestAnimationFrame(() => this.create3DPreview(canvasWrap, npc.avatarMeshColor, npc.rarity));
    }

    card.appendChild(grid);

    // Кнопки
    const btnRow = document.createElement('div');
    btnRow.style.cssText = getButtonRowStyle();

    const hireBtn = document.createElement('button');
    hireBtn.textContent = '\uD83C\uDFB2 Нанять (150 \uD83D\uDC8E)';
    hireBtn.style.cssText = getButtonStyle('secondary', 'lg');
    applyButtonHover(hireBtn);
    hireBtn.addEventListener('click', () => this.hireNPC(player, user.uid));
    btnRow.appendChild(hireBtn);

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

  // ── Inline 3D NPC Preview ────────────────────────────────
  private create3DPreview(container: HTMLElement, skinColor: number, rarity: string): void {
    const size = 80;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffd700, 0.8);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
    camera.position.set(0, 0.6, 2.2);
    camera.lookAt(0, 0.5, 0);

    const model = createNPCModel(skinColor, rarity, 0.6);
    model.userData.baseY = 0;
    scene.add(model);

    let running = true;
    const clock = new THREE.Clock();
    let rafId = 0;

    const animate = () => {
      if (!running) return;
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      // Медленное вращение + idle bob
      model.rotation.y = t * 0.8;
      animateNPCBobWalk(model, t, false);
      renderer.render(scene, camera);
    };
    animate();

    this.previews.push({ renderer, scene, camera, model, raf: rafId });
  }

  // ── Найм NPC ────────────────────────────────────────────
  private async hireNPC(player: any, uid: string): Promise<void> {
    if (player.gems < 150) {
      this.showToast('\u274C Недостаточно гемов!', '#e74c3c');
      return;
    }
    if ((player.activeNPCIds?.length ?? 0) >= 3) {
      this.showToast('\u274C Максимум 3 NPC!', '#e74c3c');
      return;
    }

    // Rarity roll: 60% common, 25% uncommon, 10% rare, 4% epic, 1% legendary
    const roll = Math.random();
    let rarity: string;
    if (roll > 0.99) rarity = 'legendary';
    else if (roll > 0.95) rarity = 'epic';
    else if (roll > 0.85) rarity = 'rare';
    else if (roll > 0.60) rarity = 'uncommon';
    else rarity = 'common';

    const candidates = NPC_DATABASE.filter(n => n.rarity === rarity && !player.activeNPCIds?.includes(n.id));
    if (candidates.length === 0) {
      this.showToast('\u274C Нет доступных NPC этой редкости', '#e74c3c');
      return;
    }

    const npc = candidates[Math.floor(Math.random() * candidates.length)];

    player.gems -= 150;
    player.activeNPCIds = [...(player.activeNPCIds ?? []), npc.id];

    await DatabaseService.getInstance().updatePlayerStats(uid, {
      gems: player.gems,
      activeNPCIds: player.activeNPCIds,
    });

    AudioManager.getInstance().playSFX('level_up');
    this.showToast(`\uD83C\uDF89 Нанят: ${npc.name} (${npc.rarity})!`, '#27ae60');

    // Перерисовать
    this.disposePreviews();
    this.overlay?.remove();
    this.showScreen();
  }

  // ── Утилиты ──────────────────────────────────────────────
  private showToast(msg: string, color: string): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;top:80px;left:50%;transform:translateX(-50%);
      background:${color};color:#fff;padding:10px 24px;border-radius:6px;
      font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:bold;
      z-index:10001;animation:rlToastIn 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  private goBack(): void {
    this.sceneManager.startScene('FarmScene');
  }
}
