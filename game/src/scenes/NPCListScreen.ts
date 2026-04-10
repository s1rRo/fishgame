// ============================================================
// NPC LIST SCREEN — список NPC игрока + найм
// Из Code_tz/05_NPC_PET_SCREENS.md
// HTML попап на document.body
// ============================================================

import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import { NPC_DATABASE, getNPCById } from '../data/npcDatabase';
import { NPC_RARITY_STATS } from '../models/NPC';
import { addEscHandler, getButtonStyle } from '../ui/DesignSystem';

export class NPCListScreen extends BaseScene {
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

    const ownedIds = player.activeNPCIds ?? [];

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.8);z-index:1000;
      display:flex;align-items:center;justify-content:center;
    `;

    const rarityColors: Record<string, string> = {
      common: '#95a5a6', uncommon: '#3498db', rare: '#9b59b6', epic: '#e74c3c', legendary: '#f39c12',
    };

    const npcCards = NPC_DATABASE.filter(n => !n.seasonalOnly || ownedIds.includes(n.id)).map(npc => {
      const owned = ownedIds.includes(npc.id);
      const color = rarityColors[npc.rarity] ?? '#95a5a6';
      return `
        <div class="npc-card" data-id="${npc.id}" style="
          background:rgba(0,0,0,0.4);border:1px solid ${color};border-radius:8px;
          padding:12px;cursor:pointer;transition:transform 0.2s;min-width:140px;
          ${owned ? '' : 'opacity:0.6;'}
        ">
          <div style="width:48px;height:48px;border-radius:50%;background:#${npc.avatarMeshColor.toString(16).padStart(6, '0')};margin:0 auto 8px;"></div>
          <p style="font-weight:bold;font-size:14px;margin:0;">${npc.name}</p>
          <p style="color:${color};font-size:11px;text-transform:uppercase;margin:2px 0;">${npc.rarity}</p>
          <p style="font-size:11px;color:#95a5a6;">🎣${npc.predisposition.fish}% 🪵${npc.predisposition.wood}% 🪨${npc.predisposition.stone}%</p>
          ${owned ? '<p style="color:#27ae60;font-size:11px;">✅ В отряде</p>' : `<p style="font-size:11px;">💎 ${npc.basePrice || '—'}</p>`}
        </div>
      `;
    }).join('');

    this.overlay.innerHTML = `
      <div style="
        background:linear-gradient(135deg,#1a2a4a,#0d1b2a);
        border:2px solid #3498db;border-radius:16px;padding:24px;
        max-width:700px;width:95%;max-height:85vh;overflow-y:auto;
        font-family:'Rajdhani',sans-serif;color:white;
      ">
        <h2 style="font-family:'Press Start 2P',monospace;font-size:13px;color:#f39c12;text-align:center;margin-bottom:16px;">
          👥 NPC ПОМОЩНИКИ
        </h2>
        <p style="text-align:center;color:#95a5a6;margin-bottom:16px;">
          В отряде: ${ownedIds.length} / 3 | 💎 ${player.gems} гемов
        </p>

        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:20px;">
          ${npcCards}
        </div>

        <div style="text-align:center;">
          <button id="npc-hire" style="${getButtonStyle('secondary', 'lg')}margin-right:8px;">🎲 Нанять (150 💎)</button>
          <button id="npc-back" style="${getButtonStyle('back', 'md')}">← НАЗАД</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.removeEsc = addEscHandler(() => this.goBack());

    // Клик по карточке → NPCDetailScreen
    this.overlay.querySelectorAll('.npc-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.id;
        if (id && ownedIds.includes(id)) {
          this.sceneManager.startScene('NPCDetailScreen', { npcId: id });
        }
      });
    });

    this.overlay.querySelector('#npc-hire')?.addEventListener('click', () => {
      this.hireNPC(player, user.uid);
    });

    this.overlay.querySelector('#npc-back')?.addEventListener('click', () => this.goBack());
  }

  private async hireNPC(player: any, uid: string): Promise<void> {
    if (player.gems < 150) {
      alert('Недостаточно гемов!');
      return;
    }
    if ((player.activeNPCIds?.length ?? 0) >= 3) {
      alert('Максимум 3 NPC!');
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
    if (candidates.length === 0) return;

    const npc = candidates[Math.floor(Math.random() * candidates.length)];

    player.gems -= 150;
    player.activeNPCIds = [...(player.activeNPCIds ?? []), npc.id];

    await DatabaseService.getInstance().updatePlayerStats(uid, {
      gems: player.gems,
      activeNPCIds: player.activeNPCIds,
    });

    AudioManager.getInstance().playSFX('level_up');

    // Перерисовать
    this.overlay?.remove();
    this.showScreen();
  }

  private goBack(): void {
    this.sceneManager.startScene('FarmScene');
  }
}
