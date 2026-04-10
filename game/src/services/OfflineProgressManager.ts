// ============================================================
// OFFLINE PROGRESS MANAGER — расчёт дохода за время оффлайн
// Из Code_tz/06_DATA_SERVICES.md подзадача 6.5
// Максимум 8 часов офлайн-прогресса
// ============================================================

import type { PlayerProfile } from '../models/Player';

export interface OfflineSummary {
  elapsedSeconds: number;
  coinsEarned: number;
  fishGrown: Array<{ fishId: string; weightGained: number }>;
  resourcesRespawned: number;
  foodSpoiled: number; // кол-во единиц еды потеряно от порчи
}

const MAX_OFFLINE_SECONDS = 8 * 3600; // 8 часов

export class OfflineProgressManager {
  private static instance: OfflineProgressManager;

  private constructor() {}

  public static getInstance(): OfflineProgressManager {
    if (!OfflineProgressManager.instance) {
      OfflineProgressManager.instance = new OfflineProgressManager();
    }
    return OfflineProgressManager.instance;
  }

  /** Основной расчёт офлайн-прогресса */
  public calculateOfflineProgress(player: PlayerProfile): OfflineSummary {
    const lastOnline = player.offlineEarningsAt ?? Date.now();
    const rawElapsed = (Date.now() - lastOnline) / 1000;
    const elapsed = Math.min(rawElapsed, MAX_OFFLINE_SECONDS);

    // Минимум 30 минут для показа попапа
    if (elapsed < 1800) {
      return { elapsedSeconds: elapsed, coinsEarned: 0, fishGrown: [], resourcesRespawned: 0, foodSpoiled: 0 };
    }

    const income = this.calcFarmIncome(player, elapsed);
    const fishGrown = this.calcPondGrowth(player, elapsed);
    const resourcesRespawned = this.calcResourceRespawn(elapsed);
    const foodSpoiled = this.calcFoodSpoilage(player, elapsed);

    return {
      elapsedSeconds: elapsed,
      coinsEarned: income,
      fishGrown,
      resourcesRespawned,
      foodSpoiled,
    };
  }

  /** Должен ли показываться попап */
  public shouldShowPopup(player: PlayerProfile): boolean {
    const lastOnline = player.offlineEarningsAt ?? Date.now();
    const elapsed = (Date.now() - lastOnline) / 1000;
    return elapsed >= 1800; // 30 минут
  }

  /** Доход от фермы (здания + NPC) */
  private calcFarmIncome(player: PlayerProfile, secs: number): number {
    const hours = secs / 3600;

    // Базовый доход от зданий
    let incomePerHour = 5; // базовые 5 монет/час

    // Хижина: +2/час за уровень
    incomePerHour += (player.farmBuildings?.house?.level ?? 1) * 2;

    // Пруд: +4/час за уровень
    incomePerHour += (player.farmBuildings?.pond?.level ?? 0) * 4;

    // Склад: +1/час за уровень
    incomePerHour += (player.farmBuildings?.storage?.level ?? 0) * 1;

    // Коптильня: +3/час за уровень
    incomePerHour += (player.farmBuildings?.smokehouse?.level ?? 0) * 3;

    // Пристань: +4/час за уровень
    incomePerHour += (player.farmBuildings?.dock?.level ?? 0) * 4;

    // NPC рыбак: +8/час если активен
    const npc = player.farmBuildings?.npcFisher1;
    if (npc?.active) {
      incomePerHour += npc.level * 8;
    }

    return Math.floor(incomePerHour * hours);
  }

  /** Рост рыб в пруду */
  private calcPondGrowth(player: PlayerProfile, secs: number): Array<{ fishId: string; weightGained: number }> {
    const hours = secs / 3600;
    const pondLevel = player.farmBuildings?.pond?.level ?? 0;

    if (pondLevel === 0 || !player.pondFish || player.pondFish.length === 0) {
      return [];
    }

    // growthMultiplier по уровню пруда
    const growthMultiplier = pondLevel === 1 ? 1.0 : pondLevel === 2 ? 1.3 : 1.6;

    return player.pondFish.map((pf) => ({
      fishId: pf.fishId,
      // Базовый рост: 0.3 кг/час × множитель
      weightGained: Math.round(0.3 * growthMultiplier * hours * 100) / 100,
    }));
  }

  /**
   * Порча еды: spoilageRate × hours × (1 - storageBonusReduction)
   * Склад еды: L1=0%, L2=-25%, L3=-50%, L4=-75%
   */
  /**
   * Порча еды: spoilageRate × hours × (1 - storageBonusReduction)
   * Склад: L1=0%, L2=-25%, L3=-50%, L4=-75%
   */
  private calcFoodSpoilage(player: PlayerProfile, secs: number): number {
    const hours = secs / 3600;
    const storageLevel = player.farmBuildings?.storage?.level ?? 0;
    const reductionByLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0.25, 3: 0.50, 4: 0.75 };
    const reduction = reductionByLevel[storageLevel] ?? 0;
    // Оцениваем кол-во еды через инвентарь рыбы
    const foodCount = player.inventory?.length ?? 0;
    if (foodCount === 0) return 0;
    const avgSpoilageRate = 0.05;
    const spoiledFraction = avgSpoilageRate * hours * (1 - reduction);
    return Math.min(foodCount, Math.floor(foodCount * spoiledFraction));
  }

  /** Сколько ресурсов восстановилось в биомах */
  private calcResourceRespawn(secs: number): number {
    const minutes = secs / 60;
    // Средний respawn = 5 мин, считаем для всех доступных биомов
    return Math.min(20, Math.floor(minutes / 5));
  }

  /** Форматировать время для UI */
  public static formatElapsed(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours} ч ${mins} мин`;
    return `${mins} мин`;
  }
}
