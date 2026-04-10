// ============================================================
// NPC DETAIL SCREEN — детали NPC, тренировка, привязка питомца
// Из Code_tz/05_NPC_PET_SCREENS.md
// ============================================================

import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import { getNPCById } from '../data/npcDatabase';
import { NPC_RARITY_STATS } from '../models/NPC';
import { addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle, getSectionStyle, getButtonStyle, getButtonRowStyle, applyButtonHover, createCloseButton } from '../ui/DesignSystem';
import type { NPCRarity } from '../models/NPC';

export class NPCDetailScreen extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private npcId = '';
  private trainingTimerHandle: ReturnType<typeof setInterval> | null = null;
  private removeEsc: (() => void) | null = null;

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
    this.overlay?.remove();
    this.overlay = null;
  }

  private async showDetail(): Promise<void> {
    const npc = getNPCById(this.npcId);
    if (!npc) { this.goBack(); return; }

    const user = AuthService.getInstance().getCurrentUser();
    if (!user) { this.goBack(); return; }

    const db = DatabaseService.getInstance();
    const player = await db.getPlayerProfile(user.uid);
    if (!player) { this.goBack(); return; }

    const stats = NPC_RARITY_STATS[npc.rarity as NPCRarity];
    const level = player.npcLevels?.[npc.id] ?? 1;
    const training = player.npcTraining;
    const isTraining = training?.npcId === npc.id;
    const trainingEnd = isTraining ? training!.startedAt + training!.durationMs : 0;

    const rarityColors: Record<string, string> = {
      common: '#95a5a6', uncommon: '#3498db', rare: '#9b59b6', epic: '#e74c3c', legendary: '#f39c12',
    };
    const color = rarityColors[npc.rarity] ?? '#95a5a6';

    // Бонусы по уровню
    const speedBonus = level * 8;
    const cargoBonus = level * 12;
    const fishBonus = level * 15;
    const trainCost = npc.trainingCostPerLevel * level;
    const trainHours = npc.trainingTimeHours;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = getOverlayStyle();

    this.overlay.innerHTML = `
      <div style="
        background:linear-gradient(135deg,#1a2a4a,#0d1b2a);
        border:2px solid ${color};border-radius:16px;padding:28px;
        max-width:420px;width:90%;
        font-family:'Rajdhani',sans-serif;color:white;text-align:center;
      ">
        <div style="width:80px;height:80px;border-radius:50%;background:#${npc.avatarMeshColor.toString(16).padStart(6, '0')};margin:0 auto 12px;border:3px solid ${color};"></div>
        <h2 style="font-family:'Press Start 2P',monospace;font-size:14px;color:${color};margin-bottom:8px;">
          ${npc.name}
        </h2>
        <p style="color:${color};text-transform:uppercase;font-size:12px;margin-bottom:16px;">${npc.rarity}</p>

        <div style="text-align:left;background:rgba(0,0,0,0.3);border-radius:8px;padding:16px;margin-bottom:16px;">
          <p style="margin:4px 0;">📊 Уровень: <b>${level}</b> / ${stats.maxLevel}</p>
          <p style="margin:4px 0;">🎣 Рыбалка: ${npc.predisposition.fish}% <span style="color:#27ae60;">(+${fishBonus}%)</span></p>
          <p style="margin:4px 0;">🪵 Дерево: ${npc.predisposition.wood}%</p>
          <p style="margin:4px 0;">🪨 Камень: ${npc.predisposition.stone}%</p>
          <p style="margin:4px 0;">🌿 Трава: ${npc.predisposition.herb}%</p>
          <p style="margin:4px 0;">⛏ Руда: ${npc.predisposition.mineral}%</p>
          <hr style="border-color:#2c3e50;margin:8px 0;">
          <p style="margin:4px 0;">📦 Грузоподъёмность: ${stats.baseCarryCapacity} кг <span style="color:#27ae60;">(+${cargoBonus}%)</span></p>
          <p style="margin:4px 0;">⚡ Скорость: ${stats.baseGatherSpeed} ед/мин <span style="color:#27ae60;">(+${speedBonus}%)</span></p>
        </div>

        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;margin-bottom:16px;">
          <p style="font-weight:bold;margin-bottom:8px;">🎓 Тренировка</p>
          ${isTraining ? `
            <p id="npc-timer" style="font-size:16px;color:#f39c12;margin-bottom:4px;">⏳ ...</p>
            <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
              <div id="npc-progress" style="height:100%;background:#f39c12;border-radius:3px;transition:width 1s;width:0%;"></div>
            </div>
          ` : level >= stats.maxLevel ? `
            <p style="color:#27ae60;font-size:14px;">✅ Максимальный уровень!</p>
          ` : `
            <p style="font-size:13px;color:#95a5a6;">Стоимость: ${trainCost}💰 | Время: ${trainHours}ч</p>
            <button id="npc-train" style="${getButtonStyle('secondary', 'sm')}margin-top:8px;">Начать тренировку (${trainCost}💰)</button>
          `}
        </div>

        <p style="font-style:italic;color:#7f8c8d;font-size:13px;margin-bottom:16px;">
          "${npc.dialogueLines[Math.floor(Math.random() * npc.dialogueLines.length)]}"
        </p>

        <button id="npc-back" style="${getButtonStyle('back', 'md')}">← НАЗАД</button>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.removeEsc = addEscHandler(() => this.goBack());
    // Обработчики
    this.overlay.querySelector('#npc-back')?.addEventListener('click', () => this.goBack());

    // Кнопка тренировки
    this.overlay.querySelector('#npc-train')?.addEventListener('click', async () => {
      AudioManager.getInstance().playSFX('button_click');
      if ((player.softCoins ?? 0) < trainCost) {
        alert('Недостаточно монет!');
        return;
      }
      player.softCoins -= trainCost;
      const durationMs = trainHours * 3600 * 1000;
      player.npcTraining = { npcId: npc.id, startedAt: Date.now(), durationMs };
      await db.updatePlayerStats(user.uid, {
        softCoins: player.softCoins,
        npcTraining: player.npcTraining,
      });
      // Перерисовать
      this.overlay?.remove();
      this.overlay = null;
      this.showDetail();
    });

    // Таймер тренировки
    if (isTraining) {
      this.updateTrainingTimer(trainingEnd, user.uid, npc.id, level, db, player);
      this.trainingTimerHandle = setInterval(() => {
        this.updateTrainingTimer(trainingEnd, user.uid, npc.id, level, db, player);
      }, 1000);
    }
  }

  private async updateTrainingTimer(
    endTime: number, uid: string, npcId: string, currentLevel: number,
    db: DatabaseService, player: any
  ): Promise<void> {
    const now = Date.now();
    const remaining = endTime - now;
    const timerEl = this.overlay?.querySelector('#npc-timer');
    const progressEl = this.overlay?.querySelector('#npc-progress') as HTMLElement | null;

    if (remaining <= 0) {
      // Тренировка завершена — повышаем уровень
      if (this.trainingTimerHandle) {
        clearInterval(this.trainingTimerHandle);
        this.trainingTimerHandle = null;
      }
      const newLevel = currentLevel + 1;
      const npcLevels = { ...(player.npcLevels ?? {}), [npcId]: newLevel };
      await db.updatePlayerStats(uid, { npcLevels, npcTraining: undefined });
      AudioManager.getInstance().playSFX('level_up');
      // Перерисовать
      this.overlay?.remove();
      this.overlay = null;
      this.showDetail();
      return;
    }

    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    if (timerEl) timerEl.textContent = `⏳ ${hours}ч ${mins}м ${secs}с`;

    const total = player.npcTraining?.durationMs ?? 1;
    const elapsed = total - remaining;
    const pct = Math.min(100, Math.round((elapsed / total) * 100));
    if (progressEl) progressEl.style.width = `${pct}%`;
  }

  private goBack(): void {
    this.sceneManager.startScene('NPCListScreen');
  }
}
