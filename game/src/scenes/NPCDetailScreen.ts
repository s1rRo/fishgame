// ============================================================
// NPC DETAIL SCREEN — детали NPC, тренировка, привязка питомца
// С вращающейся 3D моделью NPC + анимированные полоски характеристик
// ============================================================

import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import { getNPCById } from '../data/npcDatabase';
import { NPC_RARITY_STATS } from '../models/NPC';
import { createNPCModel, animateNPCBobWalk } from '../utils/LowPolyStyle';
import {
  addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle,
  getSectionStyle, getButtonStyle, getButtonRowStyle,
  applyButtonHover, createCloseButton,
} from '../ui/DesignSystem';
import type { NPCRarity } from '../models/NPC';

export class NPCDetailScreen extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private npcId = '';
  private trainingTimerHandle: ReturnType<typeof setInterval> | null = null;
  private removeEsc: (() => void) | null = null;
  private previewRenderer: THREE.WebGLRenderer | null = null;
  private previewRaf = 0;

  start(data?: any): void {
    this.npcId = data?.npcId ?? '';
    this.scene.background = null;
    this.showDetail();
  }

  update(_delta: number): void {}

  stop(): void {
    super.stop();
    this.removeEsc?.();
    this.removeEsc = null;
    if (this.trainingTimerHandle) clearInterval(this.trainingTimerHandle);
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

  private async showDetail(): Promise<void> {
    const npc = getNPCById(this.npcId);
    if (!npc) { this.goBack(); return; }

    const user = AuthService.getInstance().getCurrentUser();
    if (!user) { this.goBack(); return; }

    const dbService = DatabaseService.getInstance();
    const player = await dbService.getPlayerProfile(user.uid);
    if (!player) { this.goBack(); return; }

    const stats = NPC_RARITY_STATS[npc.rarity as NPCRarity];
    const level = player.npcLevels?.[npc.id] ?? 1;
    const training = player.npcTraining;
    const isTraining = training?.npcId === npc.id;
    const trainingEnd = isTraining ? training!.startedAt + training!.durationMs : 0;

    const rarityColors: Record<string, string> = {
      common: '#95a5a6', uncommon: '#3498db', rare: '#9b59b6',
      epic: '#e74c3c', legendary: '#f39c12',
    };
    const color = rarityColors[npc.rarity] ?? '#95a5a6';

    const speedBonus = level * 8;
    const cargoBonus = level * 12;
    const fishBonus = level * 15;
    const trainCost = npc.trainingCostPerLevel * level;
    const trainHours = npc.trainingTimeHours;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = getOverlayStyle();

    const card = document.createElement('div');
    card.style.cssText = getCardStyle(440) + 'text-align:center;max-height:90vh;overflow-y:auto;';

    // Close button
    card.appendChild(createCloseButton(() => this.goBack()));

    // ── 3D Model Container ──────────────────────────────────
    const modelWrap = document.createElement('div');
    modelWrap.style.cssText = `
      width:120px;height:120px;margin:0 auto 12px;
      border-radius:50%;border:3px solid ${color};overflow:hidden;
      background:radial-gradient(circle, rgba(26,42,74,0.8), rgba(13,27,42,0.9));
    `;
    card.appendChild(modelWrap);

    // Name & rarity
    const nameH = document.createElement('h2');
    nameH.style.cssText = `font-family:'Press Start 2P',monospace;font-size:14px;color:${color};margin-bottom:4px;`;
    nameH.textContent = npc.name;
    card.appendChild(nameH);

    const rarP = document.createElement('p');
    rarP.style.cssText = `color:${color};text-transform:uppercase;font-size:12px;margin-bottom:16px;`;
    rarP.textContent = npc.rarity;
    card.appendChild(rarP);

    // ── Stats Section with animated bars ─────────────────────
    const statsSection = document.createElement('div');
    statsSection.style.cssText = getSectionStyle() + 'text-align:left;margin-bottom:16px;';

    const levelInfo = document.createElement('p');
    levelInfo.style.cssText = 'margin:4px 0;font-size:14px;color:#ecf0f1;';
    levelInfo.innerHTML = `\uD83D\uDCCA Уровень: <b style="color:#3498db;">${level}</b> / ${stats.maxLevel}`;
    statsSection.appendChild(levelInfo);

    // Animated stat bars
    const statEntries = [
      { label: '\uD83C\uDFA3 Рыбалка', value: npc.predisposition.fish, bonus: fishBonus, color: '#3498db' },
      { label: '\uD83E\uDEB5 Дерево', value: npc.predisposition.wood, bonus: 0, color: '#27ae60' },
      { label: '\uD83E\uDEA8 Камень', value: npc.predisposition.stone, bonus: 0, color: '#95a5a6' },
      { label: '\uD83C\uDF3F Трава', value: npc.predisposition.herb, bonus: 0, color: '#2ecc71' },
      { label: '\u26CF Руда', value: npc.predisposition.mineral, bonus: 0, color: '#e67e22' },
    ];

    for (const stat of statEntries) {
      const row = document.createElement('div');
      row.style.cssText = 'margin:6px 0;';

      const labelRow = document.createElement('div');
      labelRow.style.cssText = 'display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;';
      labelRow.innerHTML = `
        <span style="color:#bdc3c7;">${stat.label}</span>
        <span style="color:#ecf0f1;">${stat.value}%${stat.bonus > 0 ? ` <span style="color:#27ae60;">(+${stat.bonus}%)</span>` : ''}</span>
      `;
      row.appendChild(labelRow);

      const barOuter = document.createElement('div');
      barOuter.style.cssText = 'height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;';
      const barInner = document.createElement('div');
      barInner.style.cssText = `height:100%;width:0%;background:${stat.color};border-radius:3px;transition:width 0.8s ease-out;`;
      barOuter.appendChild(barInner);
      row.appendChild(barOuter);

      statsSection.appendChild(row);

      // Animate bar after render
      requestAnimationFrame(() => {
        barInner.style.width = `${Math.min(100, stat.value)}%`;
      });
    }

    // Cargo & speed
    const hr = document.createElement('hr');
    hr.style.cssText = 'border-color:#2c3e50;margin:10px 0;';
    statsSection.appendChild(hr);

    const cargoP = document.createElement('p');
    cargoP.style.cssText = 'margin:4px 0;font-size:13px;color:#bdc3c7;';
    cargoP.innerHTML = `\uD83D\uDCE6 Грузоподъёмность: ${stats.baseCarryCapacity} кг <span style="color:#27ae60;">(+${cargoBonus}%)</span>`;
    statsSection.appendChild(cargoP);

    const speedP = document.createElement('p');
    speedP.style.cssText = 'margin:4px 0;font-size:13px;color:#bdc3c7;';
    speedP.innerHTML = `\u26A1 Скорость: ${stats.baseGatherSpeed} ед/мин <span style="color:#27ae60;">(+${speedBonus}%)</span>`;
    statsSection.appendChild(speedP);

    card.appendChild(statsSection);

    // ── Training Section ─────────────────────────────────────
    const trainSection = document.createElement('div');
    trainSection.style.cssText = getSectionStyle() + 'text-align:center;margin-bottom:16px;';

    const trainTitle = document.createElement('p');
    trainTitle.style.cssText = 'font-weight:bold;margin-bottom:8px;font-size:14px;color:#ecf0f1;';
    trainTitle.textContent = '\uD83C\uDF93 Тренировка';
    trainSection.appendChild(trainTitle);

    if (isTraining) {
      const timerP = document.createElement('p');
      timerP.id = 'npc-timer';
      timerP.style.cssText = 'font-size:16px;color:#f39c12;margin-bottom:6px;';
      timerP.textContent = '\u23F3 ...';
      trainSection.appendChild(timerP);

      const progressWrap = document.createElement('div');
      progressWrap.style.cssText = 'height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;';
      const progressBar = document.createElement('div');
      progressBar.id = 'npc-progress';
      progressBar.style.cssText = 'height:100%;background:linear-gradient(90deg,#f39c12,#e67e22);border-radius:4px;transition:width 1s;width:0%;';
      progressWrap.appendChild(progressBar);
      trainSection.appendChild(progressWrap);
    } else if (level >= stats.maxLevel) {
      const maxP = document.createElement('p');
      maxP.style.cssText = 'color:#27ae60;font-size:14px;';
      maxP.textContent = '\u2705 Максимальный уровень!';
      trainSection.appendChild(maxP);
    } else {
      const costP = document.createElement('p');
      costP.style.cssText = 'font-size:13px;color:#95a5a6;margin-bottom:8px;';
      costP.textContent = `Стоимость: ${trainCost}\uD83D\uDCB0 | Время: ${trainHours}ч`;
      trainSection.appendChild(costP);

      const trainBtn = document.createElement('button');
      trainBtn.textContent = `\uD83C\uDF93 Начать тренировку (${trainCost}\uD83D\uDCB0)`;
      const canTrain = (player.softCoins ?? 0) >= trainCost;
      trainBtn.style.cssText = getButtonStyle('secondary', 'sm', !canTrain);
      trainBtn.disabled = !canTrain;
      if (canTrain) {
        applyButtonHover(trainBtn);
        trainBtn.addEventListener('click', async () => {
          AudioManager.getInstance().playSFX('button_click');
          player.softCoins -= trainCost;
          const durationMs = trainHours * 3600 * 1000;
          player.npcTraining = { npcId: npc.id, startedAt: Date.now(), durationMs };
          await dbService.updatePlayerStats(user.uid, {
            softCoins: player.softCoins,
            npcTraining: player.npcTraining,
          });
          this.disposePreview();
          this.overlay?.remove();
          this.overlay = null;
          this.showDetail();
        });
      }
      trainSection.appendChild(trainBtn);
    }

    card.appendChild(trainSection);

    // ── Dialogue ─────────────────────────────────────────────
    const dialogueP = document.createElement('p');
    dialogueP.style.cssText = 'font-style:italic;color:#7f8c8d;font-size:13px;margin-bottom:16px;';
    dialogueP.textContent = `"${npc.dialogueLines[Math.floor(Math.random() * npc.dialogueLines.length)]}"`;
    card.appendChild(dialogueP);

    // ── Buttons ──────────────────────────────────────────────
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

    // ── Create 3D Preview ────────────────────────────────────
    requestAnimationFrame(() => this.create3DPreview(modelWrap, npc.avatarMeshColor, npc.rarity));

    // ── Training Timer ───────────────────────────────────────
    if (isTraining) {
      this.updateTrainingTimer(trainingEnd, user.uid, npc.id, level, dbService, player);
      this.trainingTimerHandle = setInterval(() => {
        this.updateTrainingTimer(trainingEnd, user.uid, npc.id, level, dbService, player);
      }, 1000);
    }
  }

  // ── 3D NPC Preview (larger, rotating) ──────────────────────
  private create3DPreview(container: HTMLElement, skinColor: number, rarity: string): void {
    const size = 120;
    this.disposePreview();

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    this.previewRenderer = renderer;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffd700, 0.8);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
    camera.position.set(0, 0.7, 2.5);
    camera.lookAt(0, 0.5, 0);

    const model = createNPCModel(skinColor, rarity, 0.7);
    model.userData.baseY = 0;
    scene.add(model);

    const clock = new THREE.Clock();

    const animate = () => {
      this.previewRaf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      model.rotation.y = t * 0.6;
      animateNPCBobWalk(model, t, false);
      renderer.render(scene, camera);
    };
    animate();
  }

  // ── Training Timer ─────────────────────────────────────────
  private async updateTrainingTimer(
    endTime: number, uid: string, npcId: string, currentLevel: number,
    dbService: DatabaseService, player: any,
  ): Promise<void> {
    const now = Date.now();
    const remaining = endTime - now;
    const timerEl = this.overlay?.querySelector('#npc-timer');
    const progressEl = this.overlay?.querySelector('#npc-progress') as HTMLElement | null;

    if (remaining <= 0) {
      if (this.trainingTimerHandle) {
        clearInterval(this.trainingTimerHandle);
        this.trainingTimerHandle = null;
      }
      const newLevel = currentLevel + 1;
      const npcLevels = { ...(player.npcLevels ?? {}), [npcId]: newLevel };
      await dbService.updatePlayerStats(uid, { npcLevels, npcTraining: undefined });
      AudioManager.getInstance().playSFX('level_up');
      this.disposePreview();
      this.overlay?.remove();
      this.overlay = null;
      this.showDetail();
      return;
    }

    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    if (timerEl) timerEl.textContent = `\u23F3 ${hours}ч ${mins}м ${secs}с`;

    const total = player.npcTraining?.durationMs ?? 1;
    const elapsed = total - remaining;
    const pct = Math.min(100, Math.round((elapsed / total) * 100));
    if (progressEl) progressEl.style.width = `${pct}%`;
  }

  private goBack(): void {
    this.sceneManager.startScene('NPCListScreen');
  }
}
