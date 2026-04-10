// ============================================================
// POND GROWTH SERVICE — рост рыб в личном пруду
// Из PDF3: рыбы растут в весе со временем, можно перевыловить
// ============================================================

import { argentineFishDatabase } from '../data/fishDatabase';
import type { PlayerProfile } from '../models/Player';

export interface PondFishEntry {
  fishId: string;
  addedAt: number;  // timestamp ms
}

export interface PondFishStatus {
  fishId: string;
  name: string;
  addedAt: number;
  currentWeight: number;
  maxWeight: number;
  growthRate: number;   // кг/час
  percentGrown: number; // 0..100
  estimatedValue: number;
  canHarvest: boolean;  // > 50% роста
}

export class PondGrowthService {
  private static instance: PondGrowthService;
  static getInstance(): PondGrowthService {
    if (!PondGrowthService.instance) PondGrowthService.instance = new PondGrowthService();
    return PondGrowthService.instance;
  }

  /** Рассчитать текущий статус рыбы в пруду */
  getFishStatus(entry: PondFishEntry): PondFishStatus | null {
    const def = argentineFishDatabase.find(f => f.id === entry.fishId);
    if (!def || !def.isPond) return null;

    const hoursInPond = (Date.now() - entry.addedAt) / (1000 * 60 * 60);
    const growthRate = def.pondGrowthPerHour || 0.2;
    const currentWeight = Math.min(
      def.maxWeight,
      def.minWeight + growthRate * hoursInPond
    );
    const percentGrown = ((currentWeight - def.minWeight) / (def.maxWeight - def.minWeight)) * 100;
    const estimatedValue = Math.floor(currentWeight * def.baseValue);

    return {
      fishId: entry.fishId,
      name: def.name,
      addedAt: entry.addedAt,
      currentWeight: parseFloat(currentWeight.toFixed(2)),
      maxWeight: def.maxWeight,
      growthRate,
      percentGrown: Math.min(100, Math.round(percentGrown)),
      estimatedValue,
      canHarvest: percentGrown >= 50,
    };
  }

  /** Получить статус всех рыб в пруду */
  getAllPondStatus(player: PlayerProfile): PondFishStatus[] {
    return (player.pondFish || [])
      .map(e => this.getFishStatus(e))
      .filter((s): s is PondFishStatus => s !== null);
  }

  /** Добавить рыбу в пруд (проверка isPond + лимит слотов) */
  canAddToPond(player: PlayerProfile, fishId: string): { ok: boolean; reason?: string } {
    const def = argentineFishDatabase.find(f => f.id === fishId);
    if (!def) return { ok: false, reason: 'Рыба не найдена' };
    if (!def.isPond) return { ok: false, reason: 'Эту рыбу нельзя поместить в пруд' };

    // Лимит слотов из здания пруда (по умолчанию 5)
    const pondLevel = player.farmBuildings?.pond?.level ?? 1;
    const maxSlots = 3 + pondLevel * 2;
    if ((player.pondFish || []).length >= maxSlots) {
      return { ok: false, reason: `Пруд заполнен (${maxSlots}/${maxSlots})` };
    }

    return { ok: true };
  }

  /** Добавить рыбу в пруд — возвращает обновлённый массив */
  addFishToPond(player: PlayerProfile, fishId: string): PondFishEntry[] {
    const pond = [...(player.pondFish || [])];
    pond.push({ fishId, addedAt: Date.now() });
    return pond;
  }

  /** Выловить рыбу из пруда — возвращает { harvestedFish, updatedPond } */
  harvestFromPond(player: PlayerProfile, index: number): {
    fish: PondFishStatus | null;
    updatedPond: PondFishEntry[];
  } {
    const pond = [...(player.pondFish || [])];
    if (index < 0 || index >= pond.length) return { fish: null, updatedPond: pond };

    const entry = pond[index];
    const status = this.getFishStatus(entry);
    pond.splice(index, 1);

    return { fish: status, updatedPond: pond };
  }
}
