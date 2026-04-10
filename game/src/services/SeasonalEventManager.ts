// ============================================================
// SEASONAL EVENT MANAGER — runtime управление сезонными событиями
// River Lord: Pixel Fishery
// Источник: тз/11 секция 11, тз/04 Тема 10
// ============================================================

import { SEASONAL_EVENTS, type SeasonalEvent } from '../data/seasonalEvents';

export interface ActiveEvent {
  event: SeasonalEvent;
  startedAt: number;
  endsAt: number;
}

export interface EventModifiers {
  chanceMultiplier: number;
  speedMultiplier: number;
  quantityMultiplier: number;
  rarityBonus: number;
  valueMultiplier: number;
  skyColorOverride: number | null;
  visualEffect: string;
}

const DEFAULT_MODIFIERS: EventModifiers = {
  chanceMultiplier: 1, speedMultiplier: 1, quantityMultiplier: 1,
  rarityBonus: 0, valueMultiplier: 1, skyColorOverride: null, visualEffect: '',
};

// Seed для детерминированного расписания событий
const EPOCH_MS = new Date('2025-01-01').getTime();

export class SeasonalEventManager {
  private static instance: SeasonalEventManager;
  private activeEvents: Map<string, ActiveEvent> = new Map(); // biomeId → active

  static getInstance(): SeasonalEventManager {
    if (!SeasonalEventManager.instance) {
      SeasonalEventManager.instance = new SeasonalEventManager();
    }
    return SeasonalEventManager.instance;
  }

  /** Получить все активные события */
  getActiveEvents(): ActiveEvent[] {
    this.refreshEvents();
    return Array.from(this.activeEvents.values());
  }

  /** Проверить событие при входе в биом */
  checkEventStart(biomeId: string, biomeLevel: number): ActiveEvent | null {
    this.refreshEvents();

    // Уже есть активное?
    const existing = this.activeEvents.get(biomeId);
    if (existing) return existing;

    // Детерминированная проверка: событие запускается по расписанию
    const now = Date.now();
    for (const ev of SEASONAL_EVENTS) {
      if (!ev.biomeLevels.includes(biomeLevel)) continue;

      const freqMs = ev.frequencyDays * 86400000;
      const durMs = ev.durationHours * 3600000;

      // Вычислить ближайшее окно
      const cyclesSinceEpoch = Math.floor((now - EPOCH_MS) / freqMs);
      const windowStart = EPOCH_MS + cyclesSinceEpoch * freqMs;
      const windowEnd = windowStart + durMs;

      if (now >= windowStart && now < windowEnd) {
        const active: ActiveEvent = {
          event: ev,
          startedAt: windowStart,
          endsAt: windowEnd,
        };
        this.activeEvents.set(biomeId, active);
        return active;
      }
    }

    return null;
  }

  /** Применить модификаторы события к биому */
  applyEventModifiers(biomeId: string, biomeLevel: number): EventModifiers {
    const active = this.checkEventStart(biomeId, biomeLevel);
    if (!active) return { ...DEFAULT_MODIFIERS };

    const e = active.event.effects;
    return {
      chanceMultiplier: e.chanceMultiplier,
      speedMultiplier: e.speedMultiplier,
      quantityMultiplier: e.quantityMultiplier,
      rarityBonus: e.rarityBonus,
      valueMultiplier: e.valueMultiplier,
      skyColorOverride: active.event.skyColorOverride,
      visualEffect: active.event.visualEffect,
    };
  }

  /** Оставшееся время события в мс */
  getRemainingTime(biomeId: string): number {
    const active = this.activeEvents.get(biomeId);
    if (!active) return 0;
    return Math.max(0, active.endsAt - Date.now());
  }

  /** Очистить истёкшие события */
  private refreshEvents(): void {
    const now = Date.now();
    for (const [biomeId, active] of this.activeEvents) {
      if (now >= active.endsAt) {
        this.activeEvents.delete(biomeId);
      }
    }
  }
}
