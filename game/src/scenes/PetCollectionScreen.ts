// ============================================================
// PET COLLECTION SCREEN — коллекция 8 питомцев
// Из Code_tz/05_NPC_PET_SCREENS.md + тз/11_GAME_CONFIGS.md секция 7
// ============================================================

import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import { PET_DATABASE } from '../data/petDatabase';
import { addEscHandler, getButtonStyle } from '../ui/DesignSystem';

export class PetCollectionScreen extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private removeEsc: (() => void) | null = null;

  start(_data?: any): void {
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

    const activePetId = player.activePetId;

    const rarityColors: Record<string, string> = {
      Common: '#95a5a6', Rare: '#9b59b6', Epic: '#e74c3c',
    };

    const petCards = PET_DATABASE.map(pet => {
      const owned = activePetId === pet.id;
      const color = rarityColors[pet.rarity] ?? '#95a5a6';
      return `
        <div class="pet-card" data-id="${pet.id}" style="
          background:rgba(0,0,0,0.4);border:1px solid ${color};border-radius:8px;
          padding:12px;text-align:center;min-width:130px;cursor:pointer;transition:transform 0.2s;
        ">
          <div style="font-size:36px;margin-bottom:4px;">${pet.emoji}</div>
          <p style="font-weight:bold;font-size:14px;margin:0;">${pet.name}</p>
          <p style="color:${color};font-size:11px;text-transform:uppercase;margin:2px 0;">${pet.rarity}</p>
          <p style="font-size:12px;color:#bdc3c7;">+${pet.baseBonus}% ${pet.bonusType}</p>
          <p style="font-size:11px;color:#95a5a6;">🍖 ${pet.feedingRequirement}/сут</p>
          ${owned ? '<p style="color:#27ae60;font-size:11px;margin-top:4px;">✅ Активен</p>' : `<p style="font-size:11px;margin-top:4px;">💎 ${pet.basePrice}</p>`}
        </div>
      `;
    }).join('');

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.8);z-index:1000;
      display:flex;align-items:center;justify-content:center;
    `;

    this.overlay.innerHTML = `
      <div style="
        background:linear-gradient(135deg,#1a2a4a,#0d1b2a);
        border:2px solid #f39c12;border-radius:16px;padding:24px;
        max-width:700px;width:95%;max-height:85vh;overflow-y:auto;
        font-family:'Rajdhani',sans-serif;color:white;
      ">
        <h2 style="font-family:'Press Start 2P',monospace;font-size:13px;color:#f39c12;text-align:center;margin-bottom:16px;">
          🐾 КОЛЛЕКЦИЯ ПИТОМЦЕВ
        </h2>
        <p style="text-align:center;color:#95a5a6;margin-bottom:16px;">
          Активный: ${activePetId ? PET_DATABASE.find(p => p.id === activePetId)?.name ?? 'нет' : 'нет'} | 💎 ${player.gems}
        </p>

        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:20px;">
          ${petCards}
        </div>

        <div style="text-align:center;">
          <button id="pet-back" style="${getButtonStyle('back', 'md')}">← НАЗАД</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.removeEsc = addEscHandler(() => this.goBack());
    this.overlay.querySelector('#pet-back')?.addEventListener('click', () => this.goBack());

    // Клик по карточке → купить/экипировать
    this.overlay.querySelectorAll('.pet-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.id;
        if (id) this.handlePetClick(id, player, user.uid);
      });
    });
  }

  private async handlePetClick(petId: string, player: any, uid: string): Promise<void> {
    const pet = PET_DATABASE.find(p => p.id === petId);
    if (!pet) return;

    if (player.activePetId === petId) {
      // Снять
      player.activePetId = undefined;
    } else if (player.ownedCosmetics?.includes(petId) || player.activePetId === petId) {
      // Экипировать
      player.activePetId = petId;
    } else if (player.gems >= pet.basePrice) {
      // Купить
      player.gems -= pet.basePrice;
      player.activePetId = petId;
      AudioManager.getInstance().playSFX('coin_earn');
    } else {
      alert('Недостаточно гемов!');
      return;
    }

    await DatabaseService.getInstance().updatePlayerStats(uid, {
      gems: player.gems,
      activePetId: player.activePetId,
    });

    this.overlay?.remove();
    this.showScreen();
  }

  private goBack(): void {
    this.sceneManager.startScene('FarmScene');
  }
}
