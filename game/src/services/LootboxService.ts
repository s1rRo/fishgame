// ============================================================
// ЛУТБОКС-СЕРВИС — открытие, покупка, pity system
// River Lord: Pixel Fishery
// ============================================================

import { getLootboxConfig, LootboxType, LootDrop, LootRewardType } from '../data/lootboxDatabase';
import { PlayerProfile } from '../models/Player';

export interface LootboxReward {
  type: LootRewardType;
  rarity?: string;
  value?: number;
  itemId?: string;
  displayName: string;
}

export class LootboxService {
  private static instance: LootboxService;
  private pityCounters: Record<string, number> = {}; // type → opens without rare+

  static getInstance(): LootboxService {
    if (!LootboxService.instance) {
      LootboxService.instance = new LootboxService();
    }
    return LootboxService.instance;
  }

  /** Проверяет можно ли открыть лутбокс */
  canOpen(player: PlayerProfile, type: LootboxType): boolean {
    const config = getLootboxConfig(type);
    if (!config) return false;

    // Есть ли в инвентаре?
    if (player.lootboxInventory[type] <= 0) return false;

    return true;
  }

  /** Проверяет можно ли купить лутбокс */
  canPurchase(player: PlayerProfile, type: LootboxType): boolean {
    const config = getLootboxConfig(type);
    if (!config || config.priceGems <= 0) return false;

    return player.gems >= config.priceGems;
  }

  /** Покупает лутбокс (добавляет в инвентарь) */
  purchase(player: PlayerProfile, type: LootboxType): boolean {
    const config = getLootboxConfig(type);
    if (!config || config.priceGems <= 0) return false;
    if (player.gems < config.priceGems) return false;

    player.gems -= config.priceGems;
    player.lootboxInventory[type] += 1;
    return true;
  }

  /** Открывает лутбокс, возвращает награду */
  open(player: PlayerProfile, type: LootboxType): LootboxReward | null {
    if (!this.canOpen(player, type)) return null;

    const config = getLootboxConfig(type);
    if (!config) return null;

    // Списать из инвентаря
    player.lootboxInventory[type] -= 1;

    // Pity system: каждые 10 basic без Rare+ → гарантированный Rare
    const pityKey = type;
    if (!this.pityCounters[pityKey]) this.pityCounters[pityKey] = 0;

    let selectedDrop: LootDrop;

    if (this.pityCounters[pityKey] >= 9 && type === 'basic') {
      // Pity: гарантированный Rare
      selectedDrop = { type: 'npc', chance: 1, rarity: 'Rare' };
      this.pityCounters[pityKey] = 0;
    } else {
      selectedDrop = this.rollDrop(config.drops);
      // Обновить pity
      if (type === 'basic') {
        const isRarePlus = selectedDrop.rarity === 'Rare' ||
                           selectedDrop.rarity === 'Epic' ||
                           selectedDrop.rarity === 'Legendary';
        if (isRarePlus) {
          this.pityCounters[pityKey] = 0;
        } else {
          this.pityCounters[pityKey]++;
        }
      }
    }

    // Преобразуем дроп в награду
    return this.dropToReward(selectedDrop);
  }

  /** Weighted random выбор из drop table */
  private rollDrop(drops: LootDrop[]): LootDrop {
    const roll = Math.random();
    let cumulative = 0;
    for (const drop of drops) {
      cumulative += drop.chance;
      if (roll <= cumulative) return drop;
    }
    return drops[drops.length - 1];
  }

  /** Конвертирует LootDrop → LootboxReward с конкретными значениями */
  private dropToReward(drop: LootDrop): LootboxReward {
    switch (drop.type) {
      case 'softCoins': {
        const min = drop.valueMin ?? 50;
        const max = drop.valueMax ?? 200;
        const value = Math.floor(Math.random() * (max - min + 1)) + min;
        return { type: 'softCoins', value, displayName: `${value} 💰` };
      }
      case 'gems': {
        const min = drop.valueMin ?? 5;
        const max = drop.valueMax ?? 20;
        const value = Math.floor(Math.random() * (max - min + 1)) + min;
        return { type: 'gems', value, displayName: `${value} 💎` };
      }
      case 'npc': {
        const rarity = drop.rarity ?? 'Common';
        return { type: 'npc', rarity, displayName: `NPC (${rarity})` };
      }
      case 'pet': {
        const rarity = drop.rarity ?? 'Common';
        return { type: 'pet', rarity, displayName: `Питомец (${rarity})` };
      }
      case 'bait': {
        const min = drop.valueMin ?? 3;
        const max = drop.valueMax ?? 5;
        const qty = Math.floor(Math.random() * (max - min + 1)) + min;
        const baitTypes = ['worm', 'moth', 'lure', 'fly', 'bread'];
        const baitId = baitTypes[Math.floor(Math.random() * baitTypes.length)];
        return { type: 'bait', value: qty, itemId: baitId, displayName: `Приманка ×${qty}` };
      }
      case 'cosmetic': {
        const ids = drop.itemIds ?? [];
        const itemId = ids.length > 0 ? ids[Math.floor(Math.random() * ids.length)] : 'cosmetic_random';
        return { type: 'cosmetic', itemId, displayName: `Косметика: ${itemId}` };
      }
      default:
        return { type: 'softCoins', value: 50, displayName: '50 💰' };
    }
  }

  /** Применяет награду к профилю игрока */
  applyReward(player: PlayerProfile, reward: LootboxReward): void {
    switch (reward.type) {
      case 'softCoins':
        player.softCoins += reward.value ?? 0;
        break;
      case 'gems':
        player.gems += reward.value ?? 0;
        break;
      case 'npc':
        // Добавляем NPC id в activeNPCIds (до 12 макс)
        if (player.activeNPCIds.length < 12) {
          const npcId = this.rollNPCByRarity(reward.rarity ?? 'Common');
          if (npcId) player.activeNPCIds.push(npcId);
        }
        break;
      case 'pet':
        // Добавляем pet id
        const petId = this.rollPetByRarity(reward.rarity ?? 'Common');
        if (petId && !player.ownedPetIds.includes(petId)) {
          player.ownedPetIds.push(petId);
        }
        break;
      case 'bait':
        if (reward.itemId && reward.value) {
          player.resources[reward.itemId] = (player.resources[reward.itemId] ?? 0) + reward.value;
        }
        break;
      case 'cosmetic':
        if (reward.itemId && !player.ownedCosmetics.includes(reward.itemId)) {
          player.ownedCosmetics.push(reward.itemId);
        }
        break;
    }
  }

  /** Выбирает случайного NPC по редкости */
  private rollNPCByRarity(rarity: string): string | null {
    const npcsByRarity: Record<string, string[]> = {
      'Common':    ['npc_alejandro', 'npc_carlos', 'npc_rosa'],
      'Uncommon':  ['npc_maria', 'npc_pedro'],
      'Rare':      ['npc_lucia', 'npc_jorge'],
      'Epic':      ['npc_elena', 'npc_tomas'],
      'Legendary': ['npc_spirit_river'],
    };
    const pool = npcsByRarity[rarity] ?? npcsByRarity['Common'];
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  /** Выбирает случайного питомца по редкости */
  private rollPetByRarity(rarity: string): string | null {
    const petsByRarity: Record<string, string[]> = {
      'Common': ['pet_parrot', 'pet_otter', 'pet_armadillo'],
      'Rare':   ['pet_flamingo', 'pet_condor', 'pet_capybara'],
      'Epic':   ['pet_jaguar', 'pet_anaconda'],
    };
    const pool = petsByRarity[rarity] ?? petsByRarity['Common'];
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }
}
