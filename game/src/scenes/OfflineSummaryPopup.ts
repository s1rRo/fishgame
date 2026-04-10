// ============================================================
// OFFLINE SUMMARY POPUP — "Пока вы отдыхали..."
// Из Code_tz/06_DATA_SERVICES.md подзадача 6.6
// HTML попап на document.body
// ============================================================

import { BaseScene } from '../core/BaseScene';
import { OfflineProgressManager } from '../services/OfflineProgressManager';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import { addEscHandler, createCloseButton } from '../ui/DesignSystem';
import type { PlayerProfile } from '../models/Player';

export class OfflineSummaryPopup extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private nextScene = 'PlanetScene';
  private nextData: any = null;
  private removeEsc: (() => void) | null = null;

  start(data?: any): void {
    this.nextScene = data?.nextScene ?? 'PlanetScene';
    this.nextData = data?.nextData ?? null;

    this.scene.background = null; // Прозрачный — это попап

    this.showPopup();
  }

  update(_delta: number): void {}

  stop(): void {
    super.stop();
    this.removeEsc?.();
    this.removeEsc = null;
    this.overlay?.remove();
    this.overlay = null;
  }

  private async showPopup(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (!user) {
      this.proceed();
      return;
    }

    const db = DatabaseService.getInstance();
    const player = await db.getPlayerProfile(user.uid);
    if (!player) {
      this.proceed();
      return;
    }

    const opm = OfflineProgressManager.getInstance();

    if (!opm.shouldShowPopup(player)) {
      this.proceed();
      return;
    }

    const summary = opm.calculateOfflineProgress(player);
    const timeStr = OfflineProgressManager.formatElapsed(summary.elapsedSeconds);

    // Применяем награды
    player.softCoins += summary.coinsEarned;
    player.offlineEarningsAt = Date.now();
    await db.updatePlayerStats(user.uid, {
      softCoins: player.softCoins,
      offlineEarningsAt: player.offlineEarningsAt,
    });

    AudioManager.getInstance().playSFX('coin_earn');

    // Инжектить анимации
    this.injectAnimStyles();

    const fishGrowStr = summary.fishGrown.length > 0
      ? summary.fishGrown.map(f => `+${f.weightGained.toFixed(1)}кг`).join(', ')
      : 'нет рыб в пруду';

    // NPC карточки (отправленные на задание)
    const dispatches = Object.entries(player.npcDispatches ?? {});
    const npcCardsHTML = dispatches.map(([npcId, d], i) => `
      <div class="offline-npc-card" style="
        animation: offlineSlideIn 0.4s ease ${200 + i * 200}ms both;
        background:rgba(52,152,219,0.1);border:1px solid rgba(52,152,219,0.3);
        border-radius:8px;padding:10px;display:flex;align-items:center;gap:10px;
      ">
        <span style="font-size:24px;">👷</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:bold;color:#3498db;">${npcId}</div>
          <div style="font-size:11px;color:#95a5a6;">${d.biomeId} → ${d.resourceId}</div>
        </div>
      </div>
    `).join('');

    // Попап
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:linear-gradient(180deg,rgba(5,10,25,0.95),rgba(10,20,40,0.95));
      z-index:1000;
      display:flex;align-items:center;justify-content:center;
      animation:offlineFadeIn 0.6s ease;
    `;

    this.overlay.innerHTML = `
      <div style="
        background:linear-gradient(135deg,#1a2a4a,#0d1b2a);
        border:2px solid #3498db;border-radius:16px;padding:32px;
        max-width:440px;width:90%;text-align:center;
        font-family:'Rajdhani',sans-serif;color:white;
        box-shadow:0 0 60px rgba(52,152,219,0.3);
        animation:offlinePopIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275);
      ">
        <h2 style="font-family:'Press Start 2P',monospace;font-size:14px;color:#f39c12;margin-bottom:8px;
          animation:offlineSlideIn 0.4s ease 0ms both;">
          🌙 ПОКА ВЫ ОТДЫХАЛИ...
        </h2>
        <p style="color:#95a5a6;font-size:14px;margin-bottom:20px;animation:offlineSlideIn 0.4s ease 100ms both;">(${timeStr})</p>

        ${npcCardsHTML ? `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">${npcCardsHTML}</div>` : ''}

        <div style="text-align:left;background:rgba(0,0,0,0.3);border-radius:8px;padding:16px;margin-bottom:20px;
          animation:offlineSlideIn 0.4s ease ${400 + dispatches.length * 200}ms both;">
          <p style="margin:8px 0;font-size:18px;">
            💰 Заработано: <span id="offline-coin-counter" style="color:#27ae60;font-weight:bold;">0</span> монет
          </p>
          <p style="margin:8px 0;font-size:18px;">🐟 Рыба в пруду: <span style="color:#3498db;">${fishGrowStr}</span></p>
          <p style="margin:8px 0;font-size:18px;">🌿 Ресурсы: <span style="color:#27ae60;">+${summary.resourcesRespawned}</span> восстановлено</p>
          ${summary.foodSpoiled > 0 ? `<p style="margin:8px 0;font-size:18px;">🍖 Порча: <span style="color:#e74c3c;">-${summary.foodSpoiled}</span> ед. еды испортилось</p>` : ''}
        </div>

        <div style="display:flex;gap:12px;justify-content:center;animation:offlineSlideIn 0.4s ease ${600 + dispatches.length * 200}ms both;">
          <button id="offline-collect" style="
            padding:12px 24px;background:#27ae60;color:white;border:none;
            border-radius:8px;font-size:16px;font-family:'Rajdhani',sans-serif;
            cursor:pointer;font-weight:bold;
            clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px));
          ">ПОЛУЧИТЬ ВСЁ</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Кнопка закрыть (крестик)
    const cardEl = this.overlay.querySelector('div > div') as HTMLElement;
    if (cardEl) {
      cardEl.style.position = 'relative';
      cardEl.appendChild(createCloseButton(() => this.proceed()));
    }

    // ESC — закрыть
    this.removeEsc = addEscHandler(() => this.proceed());

    // Count-up анимация для монет
    this.animateCountUp('offline-coin-counter', summary.coinsEarned, 1200);

    this.overlay.querySelector('#offline-collect')?.addEventListener('click', () => {
      this.proceed();
    });
  }

  private proceed(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.sceneManager.startScene(this.nextScene, this.nextData);
  }

  private animateCountUp(elementId: string, target: number, durationMs: number): void {
    const el = document.getElementById(elementId);
    if (!el) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = `+${Math.floor(eased * target)}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private injectAnimStyles(): void {
    if (document.getElementById('offline-summary-anim')) return;
    const style = document.createElement('style');
    style.id = 'offline-summary-anim';
    style.textContent = `
      @keyframes offlineFadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes offlinePopIn { from { opacity: 0; transform: scale(0.9) } to { opacity: 1; transform: scale(1) } }
      @keyframes offlineSlideIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
    `;
    document.head.appendChild(style);
  }
}
