// ============================================================
// NPC MANAGER — централизованное управление NPC
// River Lord: Pixel Fishery
// Источник: тз/03 Group B, тз/04 Тема 3
// ============================================================

import type { PlayerProfile } from '../models/Player';
import { NPC_DATABASE, getNPCById, type NPCDefinition } from '../data/npcDatabase';

/** Вес ресурсов в кг (из PDF1 тема 4) */
const RESOURCE_WEIGHT: Record<string, number> = {
  fish: 1.5, wood: 2.0, stone: 3.0, herb: 0.3, mineral: 2.5, food: 0.8,
};

export interface ResourceStack {
  resourceId: string;
  qty: number;
  value: number;
  weightKg: number;
}

export interface DispatchResult {
  success: boolean;
  error?: string;
}

export class NPCManager {
  private static instance: NPCManager;

  static getInstance(): NPCManager {
    if (!NPCManager.instance) {
      NPCManager.instance = new NPCManager();
    }
    return NPCManager.instance;
  }

  /** Все NPC игрока с определениями */
  getOwnedNPCs(player: PlayerProfile): (NPCDefinition & { level: number; status: string })[] {
    return player.activeNPCIds.map(id => {
      const def = getNPCById(id);
      if (!def) return null;
      const level = player.npcLevels[id] ?? 1;
      let status = 'free';
      if (player.npcTraining?.npcId === id) status = 'training';
      else if (player.npcDispatches[id]) status = 'dispatched';
      return { ...def, level, status };
    }).filter(Boolean) as any[];
  }

  /** Свободные NPC (не в обучении, не на добыче) */
  getFreeNPCs(player: PlayerProfile): NPCDefinition[] {
    return player.activeNPCIds
      .filter(id => {
        if (player.npcTraining?.npcId === id) return false;
        if (player.npcDispatches[id]) return false;
        return true;
      })
      .map(id => getNPCById(id))
      .filter(Boolean) as NPCDefinition[];
  }

  /** Рассчитать carry capacity с прокачкой */
  getCarryCapacity(def: NPCDefinition, level: number): number {
    const base = def.baseCarryCapacity ?? 50;
    return Math.floor(base * (1 + level * 0.12));
  }

  /** Рассчитать gather speed с прокачкой */
  getGatherSpeed(def: NPCDefinition, level: number): number {
    const base = def.baseGatherSpeed ?? 1;
    return +(base * (1 + level * 0.08)).toFixed(2);
  }

  /** Отправить NPC на добычу */
  dispatch(player: PlayerProfile, npcId: string, biomeId: string, resourceId: string): DispatchResult {
    if (!player.activeNPCIds.includes(npcId)) {
      return { success: false, error: 'NPC не принадлежит игроку' };
    }
    if (player.npcTraining?.npcId === npcId) {
      return { success: false, error: 'NPC в обучении' };
    }
    if (player.npcDispatches[npcId]) {
      return { success: false, error: 'NPC уже на добыче' };
    }

    const def = getNPCById(npcId);
    if (!def) return { success: false, error: 'NPC не найден' };

    const level = player.npcLevels[npcId] ?? 1;
    const capacity = this.getCarryCapacity(def, level);

    // Время добычи: 1-4 часа в зависимости от уровня
    const baseHours = 2;
    const speedMult = this.getGatherSpeed(def, level);
    const durationMs = Math.max(1, baseHours / speedMult) * 3600000;

    player.npcDispatches[npcId] = {
      biomeId,
      resourceId,
      startedAt: Date.now(),
      estimatedReturnAt: Date.now() + durationMs,
    };

    return { success: true };
  }

  /** Вернуть NPC домой (с ресурсами) */
  returnHome(player: PlayerProfile, npcId: string): ResourceStack[] {
    const dispatch = player.npcDispatches[npcId];
    if (!dispatch) return [];

    const def = getNPCById(npcId);
    if (!def) { delete player.npcDispatches[npcId]; return []; }

    const level = player.npcLevels[npcId] ?? 1;
    const capacity = this.getCarryCapacity(def, level);
    const speed = this.getGatherSpeed(def, level);

    // Anti-cheat: проверка что прошло достаточно времени
    const elapsedHours = (Date.now() - dispatch.startedAt) / 3600000;
    const maxOfflineHours = 24; // хард-кап
    const clampedHours = Math.min(elapsedHours, maxOfflineHours);

    const predisposition = (def.predisposition as any)?.[dispatch.resourceId] ?? 50;
    const predMult = predisposition / 100;

    // Pet bonus
    const petId = player.petEquipped[npcId];
    let petMult = 1;
    if (petId) {
      const petLevel = 1; // упрощённо; PetManager рассчитает точнее
      petMult = 1 + petLevel * 0.08;
    }

    const rawQty = Math.floor(speed * clampedHours * 10 * predMult * petMult);
    const unitWeight = RESOURCE_WEIGHT[dispatch.resourceId] ?? 1.0;
    // Ограничение по весу: NPC не может унести больше capacity кг
    const maxByWeight = Math.floor(capacity / unitWeight);
    const qty = Math.min(rawQty, maxByWeight);

    const baseValue = 12;
    const resources: ResourceStack[] = [
      {
        resourceId: dispatch.resourceId,
        qty: Math.max(1, qty),
        value: qty * baseValue,
        weightKg: parseFloat((qty * unitWeight).toFixed(1)),
      },
    ];

    // Добавить ресурсы в общий пул
    for (const r of resources) {
      player.resources[r.resourceId] = (player.resources[r.resourceId] ?? 0) + r.qty;
    }

    // Удалить dispatch
    delete player.npcDispatches[npcId];

    return resources;
  }

  /** Проверить — пора ли NPC вернуться? */
  checkReturns(player: PlayerProfile): string[] {
    const readyNPCs: string[] = [];
    for (const [npcId, dispatch] of Object.entries(player.npcDispatches)) {
      if (Date.now() >= dispatch.estimatedReturnAt) {
        readyNPCs.push(npcId);
      }
    }
    return readyNPCs;
  }

  /** Начать обучение NPC */
  startTraining(player: PlayerProfile, npcId: string, durationHours: number, cost: number): boolean {
    if (player.npcTraining) return false; // уже кто-то учится
    if (player.softCoins < cost) return false;
    if (!player.activeNPCIds.includes(npcId)) return false;
    if (player.npcDispatches[npcId]) return false;

    player.softCoins -= cost;
    player.npcTraining = {
      npcId,
      startedAt: Date.now(),
      durationMs: durationHours * 3600000,
    };

    return true;
  }

  /** Проверить и завершить обучение */
  checkTrainingComplete(player: PlayerProfile): boolean {
    if (!player.npcTraining) return false;

    const elapsed = Date.now() - player.npcTraining.startedAt;
    if (elapsed < player.npcTraining.durationMs) return false;

    // Level up!
    const npcId = player.npcTraining.npcId;
    player.npcLevels[npcId] = (player.npcLevels[npcId] ?? 1) + 1;
    player.npcTraining = undefined;

    return true;
  }

  /** Привязать питомца к NPC */
  equipPet(player: PlayerProfile, npcId: string, petId: string): boolean {
    if (!player.activeNPCIds.includes(npcId)) return false;
    if (!player.ownedPetIds.includes(petId)) return false;

    // Убрать питомца с другого NPC
    for (const [id, pid] of Object.entries(player.petEquipped)) {
      if (pid === petId) delete player.petEquipped[id];
    }

    player.petEquipped[npcId] = petId;
    return true;
  }

  /** Отвязать питомца от NPC */
  unequipPet(player: PlayerProfile, npcId: string): void {
    delete player.petEquipped[npcId];
  }
}
