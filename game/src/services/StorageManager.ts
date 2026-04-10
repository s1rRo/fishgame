// ============================================================
// STORAGE MANAGER — типизированные склады с порчей еды
// River Lord: Pixel Fishery
// Источник: тз/03 Group C, тз/04 Тема 4
// ============================================================

import type { PlayerProfile, StorageSlot } from '../models/Player';

export type StorageType = 'food' | 'fish' | 'stone' | 'wood' | 'tool';

export interface SpoilageReport {
  totalSpoiled: number;
  items: { resourceId: string; qty: number }[];
}

// Маппинг ресурсов → тип склада
const RESOURCE_STORAGE_MAP: Record<string, StorageType> = {
  carp: 'fish', trout: 'fish', salmon_king: 'fish', perch: 'fish',
  carp_smoked: 'food', trout_smoked: 'food', salmon_smoked: 'food',
  oak_wood: 'wood', beech_wood: 'wood',
  stone: 'stone',
  iron_ore: 'stone',
  herb_patagonia: 'food',
  worm: 'tool', moth: 'tool', lure: 'tool', fly: 'tool', bread: 'tool',
  fish_hook: 'tool',
};

// Скорость порчи по типу ресурса (доля/час)
const SPOILAGE_RATES: Record<string, number> = {
  carp: 0.015, trout: 0.015, salmon_king: 0.015, perch: 0.015,
  carp_smoked: 0.005, trout_smoked: 0.005, salmon_smoked: 0.005,
  herb_patagonia: 0.10,
};

// Базовая вместимость по уровню здания
const BASE_CAPACITY: Record<StorageType, number[]> = {
  food:  [0, 200, 500, 1000, 1500],
  fish:  [0, 200, 500, 1000, 1500],
  stone: [0, 300, 600, 1000, 1500],
  wood:  [0, 300, 600, 1000, 1500],
  tool:  [0, 100, 200, 400, 600],
};

export class StorageManager {
  private static instance: StorageManager;

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /** Определить тип склада для ресурса */
  getStorageType(resourceId: string): StorageType {
    return RESOURCE_STORAGE_MAP[resourceId] ?? 'tool';
  }

  /** Получить текущую вместимость склада */
  getCapacity(player: PlayerProfile, storageType: StorageType): { used: number; max: number } {
    const storageLevel = player.farmBuildings.storage?.level ?? 0;
    const max = BASE_CAPACITY[storageType]?.[storageLevel] ?? 200;

    const slots = player.storageSlots[storageType] ?? [];
    const used = slots.reduce((sum, s) => sum + s.qty, 0);

    return { used, max };
  }

  /** Добавить ресурс на склад */
  addToStorage(player: PlayerProfile, resourceId: string, qty: number): boolean {
    const type = this.getStorageType(resourceId);
    const { used, max } = this.getCapacity(player, type);

    if (used + qty > max) return false;

    if (!player.storageSlots[type]) {
      player.storageSlots[type] = [];
    }

    const existing = player.storageSlots[type].find(s => s.resourceId === resourceId);
    if (existing) {
      existing.qty += qty;
    } else {
      const slot: StorageSlot = { resourceId, qty };
      // Если портящийся — установить таймер
      if (SPOILAGE_RATES[resourceId]) {
        slot.spoilTimestamp = Date.now();
      }
      player.storageSlots[type].push(slot);
    }

    return true;
  }

  /** Убрать ресурс со склада */
  removeFromStorage(player: PlayerProfile, resourceId: string, qty: number): boolean {
    const type = this.getStorageType(resourceId);
    const slots = player.storageSlots[type];
    if (!slots) return false;

    const existing = slots.find(s => s.resourceId === resourceId);
    if (!existing || existing.qty < qty) return false;

    existing.qty -= qty;
    if (existing.qty <= 0) {
      const idx = slots.indexOf(existing);
      slots.splice(idx, 1);
    }

    return true;
  }

  /** Применить порчу еды (вызывать при входе в игру и периодически) */
  applySpoilage(player: PlayerProfile, deltaHours: number): SpoilageReport {
    const report: SpoilageReport = { totalSpoiled: 0, items: [] };

    // Коптильня замедляет порчу
    const smokehouseLevel = player.farmBuildings.smokehouse?.level ?? 0;
    const spoilageReduction = smokehouseLevel > 0 ? 0.3 : 1.0; // ×0.3 если есть

    for (const type of Object.keys(player.storageSlots) as StorageType[]) {
      const slots = player.storageSlots[type];
      if (!slots) continue;

      for (const slot of slots) {
        const rate = SPOILAGE_RATES[slot.resourceId];
        if (!rate || rate <= 0) continue;

        const effectiveRate = rate * spoilageReduction;
        const spoiled = Math.floor(slot.qty * effectiveRate * deltaHours);

        if (spoiled > 0) {
          slot.qty = Math.max(0, slot.qty - spoiled);
          report.totalSpoiled += spoiled;
          report.items.push({ resourceId: slot.resourceId, qty: spoiled });
        }
      }

      // Убрать пустые слоты
      player.storageSlots[type] = slots.filter(s => s.qty > 0);
    }

    return report;
  }

  /** Получить содержимое склада по типу */
  getStorageByType(player: PlayerProfile, type: StorageType): StorageSlot[] {
    return player.storageSlots[type] ?? [];
  }
}
