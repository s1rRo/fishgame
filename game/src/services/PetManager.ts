// ============================================================
// PET MANAGER — кормление, левелинг, привязка к NPC
// River Lord: Pixel Fishery
// Источник: тз/03 Group G, тз/04 Тема 9
// bonusMultiplier = 1 + (pet.level * 0.08) + (rarityBonus * 0.15)
// ============================================================

import type { PlayerProfile } from '../models/Player';
import { PET_DATABASE, getPetById, calcPetBonus, type PetDefinition } from '../data/petDatabase';

export interface FeedResult {
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
}

const XP_PER_LEVEL = 100;
const MAX_PET_LEVEL = 10;

// XP за единицу ресурса
const FEED_XP: Record<string, number> = {
  carp: 5, trout: 8, salmon_king: 15, perch: 6,
  carp_smoked: 10, trout_smoked: 15, salmon_smoked: 25,
  worm: 2, moth: 3, bread: 2,
};

export class PetManager {
  private static instance: PetManager;
  // Локальное хранение XP/уровней (до персистентности в Firestore)
  private petLevels: Record<string, number> = {};
  private petXP: Record<string, number> = {};

  static getInstance(): PetManager {
    if (!PetManager.instance) {
      PetManager.instance = new PetManager();
    }
    return PetManager.instance;
  }

  /** Получить уровень питомца */
  getLevel(petId: string): number {
    return this.petLevels[petId] ?? 1;
  }

  /** Получить XP питомца */
  getXP(petId: string): number {
    return this.petXP[petId] ?? 0;
  }

  /** Покормить питомца ресурсом */
  feedPet(player: PlayerProfile, petId: string, resourceId: string, qty: number): FeedResult | null {
    if (!player.ownedPetIds.includes(petId)) return null;

    const available = player.resources[resourceId] ?? 0;
    if (available < qty) return null;

    const xpPerUnit = FEED_XP[resourceId] ?? 3;
    const totalXP = xpPerUnit * qty;

    // Списать ресурсы
    player.resources[resourceId] -= qty;

    // Добавить XP
    const currentXP = (this.petXP[petId] ?? 0) + totalXP;
    const currentLevel = this.petLevels[petId] ?? 1;

    let newLevel = currentLevel;
    let remainingXP = currentXP;

    while (remainingXP >= XP_PER_LEVEL && newLevel < MAX_PET_LEVEL) {
      remainingXP -= XP_PER_LEVEL;
      newLevel++;
    }

    this.petXP[petId] = remainingXP;
    this.petLevels[petId] = newLevel;

    return {
      xpGained: totalXP,
      leveledUp: newLevel > currentLevel,
      newLevel,
    };
  }

  /** Рассчитать бонус питомца для NPC */
  getBonusForNPC(player: PlayerProfile, npcId: string): number {
    const petId = player.petEquipped[npcId];
    if (!petId) return 0;

    const def = getPetById(petId);
    if (!def) return 0;

    const level = this.getLevel(petId);
    return calcPetBonus(def, level);
  }

  /** Привязать к NPC (макс 1 питомец на 1 NPC) */
  equipToNPC(player: PlayerProfile, petId: string, npcId: string): boolean {
    if (!player.ownedPetIds.includes(petId)) return false;
    if (!player.activeNPCIds.includes(npcId)) return false;

    // Убрать с другого NPC
    for (const [id, pid] of Object.entries(player.petEquipped)) {
      if (pid === petId) delete player.petEquipped[id];
    }

    player.petEquipped[npcId] = petId;
    return true;
  }

  /** Отвязать от NPC */
  unequipFromNPC(player: PlayerProfile, npcId: string): void {
    delete player.petEquipped[npcId];
  }

  /** Все питомцы с полной инфой */
  getOwnedPets(player: PlayerProfile): (PetDefinition & { level: number; xp: number; equippedTo: string | null })[] {
    return player.ownedPetIds.map(id => {
      const def = getPetById(id);
      if (!def) return null;
      const equippedTo = Object.entries(player.petEquipped).find(([, pid]) => pid === id)?.[0] ?? null;
      return {
        ...def,
        level: this.getLevel(id),
        xp: this.getXP(id),
        equippedTo,
      };
    }).filter(Boolean) as any[];
  }
}
