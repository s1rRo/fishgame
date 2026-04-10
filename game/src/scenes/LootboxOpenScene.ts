// ============================================================
// ЛУТБОКС — 3D СЦЕНА ОТКРЫТИЯ
// River Lord: Pixel Fishery
// Коробка трясётся → открывается → свет → награда вылетает
// ============================================================

import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { ISceneManager } from '../core/BaseScene';
import { LP, matLP } from '../utils/LowPolyStyle';
import { LootboxType, LOOTBOX_COLORS, getLootboxConfig } from '../data/lootboxDatabase';
import { LootboxService, LootboxReward } from '../services/LootboxService';
import { PlayerProfile } from '../models/Player';

interface LootboxOpenData {
  type: LootboxType;
  player: PlayerProfile;
  returnScene: string;
  returnData?: any;
  onComplete?: (reward: LootboxReward | null) => void;
}

export class LootboxOpenScene extends BaseScene {
  private box!: THREE.Mesh;
  private lid!: THREE.Mesh;
  private light!: THREE.PointLight;
  private particles: THREE.Points[] = [];
  private phase: 'shake' | 'open' | 'reveal' | 'done' = 'shake';
  private timer = 0;
  private reward: LootboxReward | null = null;
  private data!: LootboxOpenData;
  private overlayDiv: HTMLDivElement | null = null;
  private confettiGroup!: THREE.Group;

  constructor(manager: ISceneManager) {
    super(manager);
  }

  start(data?: LootboxOpenData): void {
    if (!data) return;
    this.data = data;
    this.phase = 'shake';
    this.timer = 0;

    // Камера
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 2.5, 5);
    this.camera.lookAt(0, 0.5, 0);

    // Фон
    this.scene.background = new THREE.Color(0x0a1628);

    // Освещение
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffd700, 0.6);
    dirLight.position.set(3, 5, 3);
    this.scene.add(dirLight);

    // Свет из коробки (изначально выключен)
    this.light = new THREE.PointLight(LOOTBOX_COLORS[data.type] ?? 0xf39c12, 0, 8);
    this.light.position.set(0, 1.2, 0);
    this.scene.add(this.light);

    // Пьедестал
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.3, 6),
      matLP(LP.stone)
    );
    pedestal.position.y = -0.15;
    this.scene.add(pedestal);

    // Коробка
    const boxColor = LOOTBOX_COLORS[data.type] ?? 0xf39c12;
    this.box = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.0, 1.2),
      matLP(boxColor)
    );
    this.box.position.y = 0.5;
    this.scene.add(this.box);

    // Крышка
    this.lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.15, 1.3),
      matLP(boxColor, { emissive: 0x333333 })
    );
    this.lid.position.y = 1.08;
    this.scene.add(this.lid);

    // Конфетти группа (пустая, заполнится при открытии)
    this.confettiGroup = new THREE.Group();
    this.scene.add(this.confettiGroup);

    // Звёзды фон
    this.createStars();

    // Выполнить открытие
    const service = LootboxService.getInstance();
    this.reward = service.open(data.player, data.type);
    if (this.reward) {
      service.applyReward(data.player, this.reward);
    }
  }

  update(delta: number): void {
    this.timer += delta;

    switch (this.phase) {
      case 'shake':
        this.updateShake(delta);
        break;
      case 'open':
        this.updateOpen(delta);
        break;
      case 'reveal':
        this.updateReveal(delta);
        break;
      case 'done':
        this.updateDone(delta);
        break;
    }

    // Анимация конфетти
    this.confettiGroup.children.forEach(c => {
      c.position.y -= delta * 1.5;
      c.rotation.x += delta * 2;
      c.rotation.z += delta * 3;
    });
  }

  // --- ФАЗА: ТРЯСКА (1.5 сек) ---
  private updateShake(_delta: number): void {
    const intensity = Math.min(this.timer / 1.5, 1.0);
    this.box.position.x = Math.sin(this.timer * 20) * 0.05 * intensity;
    this.box.rotation.z = Math.sin(this.timer * 18) * 0.03 * intensity;
    this.lid.position.x = this.box.position.x;
    this.lid.rotation.z = this.box.rotation.z;

    // Свечение нарастает
    this.light.intensity = intensity * 2;

    if (this.timer >= 1.5) {
      this.phase = 'open';
      this.timer = 0;
      this.box.position.x = 0;
      this.box.rotation.z = 0;
    }
  }

  // --- ФАЗА: ОТКРЫТИЕ (1 сек) ---
  private updateOpen(_delta: number): void {
    const t = Math.min(this.timer / 1.0, 1.0);

    // Крышка поднимается и откидывается
    this.lid.position.y = 1.08 + t * 2.0;
    this.lid.rotation.x = -t * Math.PI * 0.6;
    this.lid.position.z = -t * 0.5;

    // Свет усиливается
    this.light.intensity = 2 + t * 8;
    this.light.position.y = 1.2 + t * 0.5;

    if (t >= 1.0) {
      this.phase = 'reveal';
      this.timer = 0;
      this.spawnConfetti();
      this.showRewardUI();
    }
  }

  // --- ФАЗА: ПОКАЗ НАГРАДЫ (ждём клика) ---
  private updateReveal(_delta: number): void {
    // Пульсация света
    this.light.intensity = 6 + Math.sin(this.timer * 3) * 2;
  }

  // --- ФАЗА: ГОТОВО ---
  private updateDone(_delta: number): void {
    // Ничего — ждём перехода
  }

  private spawnConfetti(): void {
    const colors = [0xf39c12, 0xe74c3c, 0x3498db, 0x27ae60, 0x8e44ad];
    for (let i = 0; i < 40; i++) {
      const geo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
      const mat = matLP(colors[i % colors.length]);
      const piece = new THREE.Mesh(geo, mat);
      piece.position.set(
        (Math.random() - 0.5) * 4,
        3 + Math.random() * 3,
        (Math.random() - 0.5) * 4
      );
      piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.confettiGroup.add(piece);
    }
  }

  private createStars(): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 12 + 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 });
    this.scene.add(new THREE.Points(geo, mat));
  }

  private showRewardUI(): void {
    if (this.overlayDiv) return;

    const config = getLootboxConfig(this.data.type);
    const rewardText = this.reward?.displayName ?? 'Пусто';
    const rarityColor = this.getRarityColor(this.reward?.rarity);

    this.overlayDiv = document.createElement('div');
    this.overlayDiv.style.cssText = `
      position:fixed; inset:0; display:flex; flex-direction:column;
      align-items:center; justify-content:center; z-index:9999;
      pointer-events:auto; animation: rlPopIn 0.5s ease-out;
    `;
    this.overlayDiv.innerHTML = `
      <div style="
        background:rgba(10,22,40,0.95); border:2px solid ${rarityColor};
        padding:32px 48px; border-radius:4px; text-align:center;
        font-family:'Press Start 2P',monospace; color:#fff;
        box-shadow:0 0 30px ${rarityColor}40;
        clip-path:polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
      ">
        <div style="font-size:12px; color:${rarityColor}; margin-bottom:16px;">
          ${config?.name ?? 'ЛУТБОКС'}
        </div>
        <div style="font-size:24px; margin-bottom:8px;">🎁</div>
        <div style="font-size:14px; color:${rarityColor}; margin-bottom:8px;">
          ${this.reward?.rarity ?? ''}
        </div>
        <div style="font-size:11px; margin-bottom:24px;">
          ${rewardText}
        </div>
        <button id="lootbox-close-btn" style="
          font-family:'Press Start 2P',monospace; font-size:9px;
          background:${rarityColor}; color:#fff; border:none;
          padding:10px 24px; cursor:pointer;
          clip-path:polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
        ">ЗАБРАТЬ</button>
      </div>
    `;
    document.body.appendChild(this.overlayDiv);

    const closeBtn = document.getElementById('lootbox-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }

  private getRarityColor(rarity?: string): string {
    switch (rarity) {
      case 'Common':    return '#95a5a6';
      case 'Uncommon':  return '#27ae60';
      case 'Rare':      return '#3498db';
      case 'Epic':      return '#8e44ad';
      case 'Legendary': return '#f39c12';
      default:          return '#3498db';
    }
  }

  private close(): void {
    this.phase = 'done';
    if (this.overlayDiv) {
      this.overlayDiv.remove();
      this.overlayDiv = null;
    }

    if (this.data.onComplete) {
      this.data.onComplete(this.reward);
    }

    if (this.data.returnScene) {
      this.sceneManager.startScene(this.data.returnScene, this.data.returnData);
    }
  }

  stop(): void {
    if (this.overlayDiv) {
      this.overlayDiv.remove();
      this.overlayDiv = null;
    }
    super.stop();
  }
}
