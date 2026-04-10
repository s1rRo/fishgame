// ============================================================
// BIOME MANAGER — истощение, respawn, разблокировка, события
// Из Code_tz/06_DATA_SERVICES.md подзадача 6.4
// ============================================================

import type { PlayerProfile } from '../models/Player';

export type EventType = 'spawn' | 'golden_week' | 'salmon_migration' | 'spring_bloom';

export interface SeasonalEvent {
  id: string;
  name: string;
  type: EventType;
  biomeId: string;
  startedAt: number;
  durationHours: number;
  chanceMultiplier: number;
  speedMultiplier: number;
  quantityMultiplier: number;
  rarityBonus: number;
  valueMultiplier: number;
  visualEffect: 'rain' | 'fog' | 'aurora' | 'heatwave' | 'golden' | 'snow';
  checkpointBonus: number;
}

interface BiomeState {
  exhaustion: number;           // 0-100%
  lastRespawnCheck: number;
  resourcesAvailable: number;
  activeEvent: SeasonalEvent | null;
}

const EVENT_TEMPLATES: Record<EventType, Omit<SeasonalEvent, 'id' | 'biomeId' | 'startedAt'>> = {
  spawn: {
    name: 'Нерест', type: 'spawn', durationHours: 120,
    chanceMultiplier: 2.0, speedMultiplier: 1.2, quantityMultiplier: 1.0,
    rarityBonus: 50, valueMultiplier: 1.0, visualEffect: 'rain', checkpointBonus: 1,
  },
  golden_week: {
    name: 'Золотая неделя', type: 'golden_week', durationHours: 96,
    chanceMultiplier: 1.5, speedMultiplier: 1.0, quantityMultiplier: 1.3,
    rarityBonus: 0, valueMultiplier: 2.5, visualEffect: 'golden', checkpointBonus: 0,
  },
  salmon_migration: {
    name: 'Миграция лосося', type: 'salmon_migration', durationHours: 168,
    chanceMultiplier: 1.0, speedMultiplier: 1.5, quantityMultiplier: 1.0,
    rarityBonus: 150, valueMultiplier: 1.0, visualEffect: 'fog', checkpointBonus: 2,
  },
  spring_bloom: {
    name: 'Весенний расцвет', type: 'spring_bloom', durationHours: 72,
    chanceMultiplier: 1.5, speedMultiplier: 1.0, quantityMultiplier: 1.4,
    rarityBonus: 0, valueMultiplier: 1.0, visualEffect: 'aurora', checkpointBonus: 1,
  },
};

export class BiomeManager {
  private static instance: BiomeManager;
  private biomes = new Map<string, BiomeState>();

  private constructor() {
    // Инициализация стартовых биомов
    for (const id of ['rio_salado_l1', 'nahuel_huapi_l2', 'lago_argentino_l3']) {
      this.biomes.set(id, {
        exhaustion: 0,
        lastRespawnCheck: Date.now(),
        resourcesAvailable: 20,
        activeEvent: null,
      });
    }
  }

  public static getInstance(): BiomeManager {
    if (!BiomeManager.instance) {
      BiomeManager.instance = new BiomeManager();
    }
    return BiomeManager.instance;
  }

  /** Истощение биома (0-100%) */
  public getBiomeExhaustion(biomeId: string): number {
    return this.getState(biomeId).exhaustion;
  }

  /** Добавить истощение после сбора ресурсов */
  public addExhaustion(biomeId: string, amount: number): void {
    const state = this.getState(biomeId);
    state.exhaustion = Math.min(100, state.exhaustion + amount);
    state.resourcesAvailable = Math.max(0, state.resourcesAvailable - 1);
  }

  /** Проверить и применить respawn ресурсов */
  public checkResourceRespawn(biomeId: string): void {
    const state = this.getState(biomeId);
    const now = Date.now();
    const elapsedMin = (now - state.lastRespawnCheck) / 60000;

    // Определяем respawn rate по уровню биома
    let respawnRate = 2; // мин
    if (biomeId.includes('l2')) respawnRate = 5;
    if (biomeId.includes('l3')) respawnRate = 10;

    const respawned = Math.floor(elapsedMin / respawnRate);
    if (respawned > 0) {
      state.resourcesAvailable = Math.min(20, state.resourcesAvailable + respawned);
      state.exhaustion = Math.max(0, state.exhaustion - respawned * 5);
      state.lastRespawnCheck = now;
    }
  }

  /** Доступные ресурсы в биоме */
  public getResourcesAvailable(biomeId: string): number {
    this.checkResourceRespawn(biomeId);
    return this.getState(biomeId).resourcesAvailable;
  }

  // ─── Сезонные события ───

  /** Текущее активное событие */
  public getActiveEvent(biomeId: string): SeasonalEvent | null {
    const state = this.getState(biomeId);
    if (!state.activeEvent) return null;

    // Проверить не истекло ли
    const elapsed = (Date.now() - state.activeEvent.startedAt) / 3600000;
    if (elapsed >= state.activeEvent.durationHours) {
      state.activeEvent = null;
      return null;
    }
    return state.activeEvent;
  }

  /** Запустить событие */
  public startEvent(biomeId: string, type: EventType): void {
    const template = EVENT_TEMPLATES[type];
    const state = this.getState(biomeId);
    state.activeEvent = {
      ...template,
      id: `event_${type}_${Date.now()}`,
      biomeId,
      startedAt: Date.now(),
    };
  }

  /** Бонус события к catch chance */
  public getEventBonus(_event: SeasonalEvent, _fishId: string): number {
    return _event.chanceMultiplier;
  }

  // ─── Разблокировка биомов ───

  /** Можно ли разблокировать биом */
  public canUnlockBiome(biomeId: string, player: PlayerProfile): boolean {
    const vLevel = player.villageLevel ?? 1;
    const totalRes = player.totalResources ?? 0;

    if (biomeId === 'nahuel_huapi_l2' || biomeId === 'nahuel_huapi') {
      return vLevel >= 5 && totalRes >= 1500;
    }
    if (biomeId === 'lago_argentino_l3' || biomeId === 'lago_argentino') {
      return vLevel >= 12 && totalRes >= 8000;
    }
    // L1 всегда доступен
    return true;
  }

  /** Условия разблокировки для UI */
  public getUnlockRequirements(biomeId: string): { villageLevel: number; totalResources: number } {
    if (biomeId.includes('nahuel') || biomeId.includes('l2')) {
      return { villageLevel: 5, totalResources: 1500 };
    }
    if (biomeId.includes('lago') || biomeId.includes('l3')) {
      return { villageLevel: 12, totalResources: 8000 };
    }
    return { villageLevel: 1, totalResources: 0 };
  }

  private getState(biomeId: string): BiomeState {
    if (!this.biomes.has(biomeId)) {
      this.biomes.set(biomeId, {
        exhaustion: 0,
        lastRespawnCheck: Date.now(),
        resourcesAvailable: 20,
        activeEvent: null,
      });
    }
    return this.biomes.get(biomeId)!;
  }
}
