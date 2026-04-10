// ============================================================
// RESOURCE BIOME SCREEN — истощение ресурсов биома
// Из Code_tz/05_NPC_PET_SCREENS.md
// ============================================================

import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { BiomeManager } from '../services/BiomeManager';
import { getResourcesByBiome } from '../data/resourceDatabase';
import { BIOMES } from '../data/biomeDatabase';
import { addEscHandler, getButtonStyle } from '../ui/DesignSystem';

export class ResourceBiomeScreen extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private biomeId = 'rio_salado_l1';
  private removeEsc: (() => void) | null = null;

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
    this.overlay?.remove();
    this.overlay = null;
  }

  private async showScreen(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (!user) { this.goBack(); return; }

    const player = await DatabaseService.getInstance().getPlayerProfile(user.uid);
    if (!player) { this.goBack(); return; }

    const bm = BiomeManager.getInstance();
    const exhaustion = Math.round(bm.getBiomeExhaustion(this.biomeId));
    const available = bm.getResourcesAvailable(this.biomeId);

    // Определяем уровень биома
    let biomeLevel = 1;
    if (this.biomeId.includes('l2') || this.biomeId.includes('nahuel')) biomeLevel = 2;
    if (this.biomeId.includes('l3') || this.biomeId.includes('lago')) biomeLevel = 3;

    const biomeConfig = BIOMES.find((b: { id: string }) => b.id === this.biomeId);
    const biomeName = biomeConfig?.name ?? this.biomeId;
    const biomeResources = getResourcesByBiome(biomeLevel).filter(r => r.howToGet === 'npc_gather');

    const playerRes = player.resources ?? {};

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.8);z-index:1000;
      display:flex;align-items:center;justify-content:center;
    `;

    const exhaustColor = exhaustion > 75 ? '#e74c3c' : exhaustion > 40 ? '#f39c12' : '#27ae60';

    const resRows = biomeResources.map(r => {
      const owned = playerRes[r.id] ?? 0;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #2c3e50;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:24px;height:24px;border-radius:4px;background:#${r.meshColor.toString(16).padStart(6, '0')};"></div>
            <span>${r.name}</span>
          </div>
          <div style="text-align:right;">
            <span style="color:#27ae60;font-weight:bold;">${owned}</span>
            <span style="color:#95a5a6;font-size:12px;"> (${r.baseValue}💰/ед)</span>
          </div>
        </div>
      `;
    }).join('');

    this.overlay.innerHTML = `
      <div style="
        background:linear-gradient(135deg,#1a2a4a,#0d1b2a);
        border:2px solid #27ae60;border-radius:16px;padding:28px;
        max-width:450px;width:95%;max-height:85vh;overflow-y:auto;
        font-family:'Rajdhani',sans-serif;color:white;
      ">
        <h2 style="font-family:'Press Start 2P',monospace;font-size:13px;color:#27ae60;text-align:center;margin-bottom:16px;">
          📊 РЕСУРСЫ: ${biomeName}
        </h2>

        <!-- Истощение -->
        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:16px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span>Истощение биома:</span>
            <span style="color:${exhaustColor};font-weight:bold;">${exhaustion}%</span>
          </div>
          <div style="height:8px;background:#2c3e50;border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${exhaustion}%;background:${exhaustColor};border-radius:4px;transition:width 0.3s;"></div>
          </div>
          <p style="font-size:12px;color:#95a5a6;margin-top:4px;">Доступно ресурсов: ${available} / 20</p>
          ${exhaustion > 75 ? '<p style="color:#e74c3c;font-size:13px;margin-top:4px;">⚠ Биом истощён! Ресурсы восстанавливаются медленнее.</p>' : ''}
        </div>

        <!-- Список ресурсов -->
        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;margin-bottom:16px;">
          <h3 style="font-size:14px;color:#3498db;margin-bottom:8px;">Ваши запасы:</h3>
          ${resRows || '<p style="color:#95a5a6;">Нет ресурсов в этом биоме</p>'}
        </div>

        <!-- Перемещение деревни -->
        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;margin-bottom:16px;text-align:center;">
          <p style="font-size:13px;color:#95a5a6;margin-bottom:8px;">Ресурсов мало? Переместите деревню в другую зону.</p>
          <button id="res-relocate" style="${getButtonStyle('secondary', 'sm')}">🏘 Переместить (2000💰)</button>
        </div>

        <div style="text-align:center;">
          <button id="res-back" style="${getButtonStyle('back', 'md')}">← НАЗАД</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.removeEsc = addEscHandler(() => this.goBack());
    this.overlay.querySelector('#res-back')?.addEventListener('click', () => this.goBack());
    this.overlay.querySelector('#res-relocate')?.addEventListener('click', async () => {
      if (player.softCoins < 2000) {
        alert('Недостаточно монет! Нужно 2000💰');
        return;
      }
      player.softCoins -= 2000;
      await DatabaseService.getInstance().updatePlayerStats(user.uid, {
        softCoins: player.softCoins,
        villagePosition: undefined,
      });
      this.sceneManager.startScene('VillagePlacementScreen', { biomeId: this.biomeId });
    });
  }

  private goBack(): void {
    this.sceneManager.startScene('BiomeView', { biomeId: this.biomeId });
  }
}
