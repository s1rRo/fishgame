// ============================================================
// BUILDING SCREEN — попап апгрейда здания
// Из Code_tz/03_BIOME_FARM.md + тз/11_GAME_CONFIGS.md секция 5
// HTML попап на document.body
// ============================================================

import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import { getBuildingById, getBuildingLevel } from '../data/buildingDatabase';
import { addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle, getSectionStyle, getButtonStyle, getButtonRowStyle, applyButtonHover, createCloseButton } from '../ui/DesignSystem';
import type { PlayerProfile } from '../models/Player';

export class BuildingScreen extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private buildingId = 'house';
  private removeEsc: (() => void) | null = null;

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
    this.overlay?.remove();
    this.overlay = null;
  }

  private async showPopup(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (!user) { this.goBack(); return; }

    const player = await DatabaseService.getInstance().getPlayerProfile(user.uid);
    if (!player) { this.goBack(); return; }

    const building = getBuildingById(this.buildingId);
    if (!building) { this.goBack(); return; }

    const currentLevel = (player.farmBuildings as any)?.[this.buildingId]?.level ?? 0;
    const nextLevel = currentLevel + 1;
    const nextConfig = getBuildingLevel(this.buildingId, nextLevel);
    const isMaxLevel = !nextConfig || nextLevel > building.maxLevel;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = getOverlayStyle();

    const resStr = nextConfig
      ? nextConfig.upgradeResources.map(r => `${r.quantity}× ${r.resourceId}`).join(' + ')
      : '';

    const canAfford = nextConfig
      ? player.softCoins >= nextConfig.upgradeCostSoft &&
        nextConfig.upgradeResources.every(r => (player.resources?.[r.resourceId] ?? 0) >= r.quantity)
      : false;

    const card = document.createElement('div');
    card.style.cssText = getCardStyle(420) + 'text-align:center;';
    card.innerHTML = `
      <h2 style="${getTitleStyle()}">${building.name}</h2>
      <p style="color:#95a5a6;font-size:13px;margin-bottom:16px;">${building.description}</p>
      <p style="font-size:16px;margin-bottom:16px;">Уровень: <span style="color:#3498db;font-weight:bold;">${currentLevel}</span> / ${building.maxLevel}</p>

      ${isMaxLevel ? '<p style="color:#f39c12;font-size:18px;">🏆 Максимальный уровень!</p>' : `
        <div style="${getSectionStyle()}text-align:left;">
          <p style="margin:4px 0;font-size:14px;">💰 Стоимость: <span style="color:${player.softCoins >= nextConfig!.upgradeCostSoft ? '#27ae60' : '#e74c3c'}">${nextConfig!.upgradeCostSoft}</span> монет</p>
          <p style="margin:4px 0;font-size:14px;">📦 Ресурсы: ${resStr || 'нет'}</p>
          <p style="margin:4px 0;font-size:14px;">⏱ Время: ${nextConfig!.upgradeTimeMin} мин</p>
          <p style="margin:4px 0;font-size:14px;">⬆ ${nextConfig!.bonusDescription}</p>
        </div>
        <p style="margin-bottom:8px;">У тебя: ${player.softCoins}💰</p>
      `}

      <div style="${getButtonRowStyle()}"></div>
    `;

    // Кнопка закрыть (крестик)
    card.appendChild(createCloseButton(() => this.goBack()));

    // Кнопки
    const btnRow = card.querySelector('div:last-child')!;

    if (!isMaxLevel) {
      const upgradeBtn = document.createElement('button');
      upgradeBtn.textContent = '⬆ УЛУЧШИТЬ';
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

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'ЗАКРЫТЬ';
    closeBtn.style.cssText = getButtonStyle('danger', 'md');
    applyButtonHover(closeBtn);
    closeBtn.addEventListener('click', () => this.goBack());
    btnRow.appendChild(closeBtn);

    this.overlay.appendChild(card);
    document.body.appendChild(this.overlay);

    this.removeEsc = addEscHandler(() => this.goBack());
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.goBack(); });
  }

  private async doUpgrade(
    player: PlayerProfile,
    uid: string,
    cost: number,
    resources: Array<{ resourceId: string; quantity: number }>,
    newLevel: number,
  ): Promise<void> {
    player.softCoins -= cost;
    for (const r of resources) {
      if (player.resources) {
        player.resources[r.resourceId] = (player.resources[r.resourceId] ?? 0) - r.quantity;
      }
    }

    // Обновить уровень здания
    const buildings = player.farmBuildings as any;
    if (buildings[this.buildingId]) {
      buildings[this.buildingId].level = newLevel;
      buildings[this.buildingId].upgradedAt = Date.now();
      buildings[this.buildingId].visualStage = newLevel;
    }

    await DatabaseService.getInstance().updatePlayerStats(uid, {
      softCoins: player.softCoins,
      resources: player.resources,
      farmBuildings: player.farmBuildings,
    });

    AudioManager.getInstance().playSFX('upgrade');
    // Перерисовать попап
    this.overlay?.remove();
    this.showPopup();
  }

  private goBack(): void {
    this.sceneManager.startScene('FarmScene');
  }
}
