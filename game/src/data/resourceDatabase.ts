// ============================================================
// RESOURCE DATABASE — 16 типов ресурсов
// Из тз/11_GAME_CONFIGS.md раздел 4
// ============================================================

export type ResourceType = 'food' | 'building' | 'tool' | 'crafting' | 'special';
export type StorageType = 'food_store' | 'stone_store' | 'wood_store' | 'tool_store' | 'any';
export type ResourceSource = 'npc_gather' | 'fishing' | 'shop' | 'craft' | 'farm';

export interface ResourceConfig {
  id: string;
  name: string;
  type: ResourceType;
  baseValue: number;              // softCoins
  weight: number;                 // кг
  volume: number;                 // единиц
  biomeLevels: number[];          // где собирается (пустой = везде/крафт)
  spoilageRatePerHour: number;    // 0–1 (0 = не портится)
  storageType: StorageType;
  howToGet: ResourceSource;
  respawnMin: number;             // минуты до respawn (0 = не respawn)
  maxStackBiome: number;          // максимум в биоме одновременно (0 = не в биоме)
  icon: string;                   // имя файла иконки
  meshColor: number;              // THREE.Color hex для 3D
}

export const RESOURCE_DATABASE: ResourceConfig[] = [
  // ─── Рыба (ресурсы от рыбалки) ───
  {
    id: 'carp', name: 'Карп', type: 'food', baseValue: 12, weight: 1.2, volume: 1.0,
    biomeLevels: [1, 2, 3], spoilageRatePerHour: 0.05, storageType: 'food_store',
    howToGet: 'fishing', respawnMin: 0, maxStackBiome: 0,
    icon: 'res_carp.png', meshColor: 0xd4a07a,
  },
  {
    id: 'trout', name: 'Форель', type: 'food', baseValue: 28, weight: 1.0, volume: 0.9,
    biomeLevels: [2, 3], spoilageRatePerHour: 0.05, storageType: 'food_store',
    howToGet: 'fishing', respawnMin: 0, maxStackBiome: 0,
    icon: 'res_trout.png', meshColor: 0xe8967a,
  },
  {
    id: 'salmon_king', name: 'Корол. лосось', type: 'food', baseValue: 85, weight: 12.0, volume: 12.0,
    biomeLevels: [3], spoilageRatePerHour: 0.03, storageType: 'food_store',
    howToGet: 'fishing', respawnMin: 0, maxStackBiome: 0,
    icon: 'res_salmon.png', meshColor: 0xff6b6b,
  },

  // ─── Переработанная рыба ───
  {
    id: 'carp_smoked', name: 'Копч. карп', type: 'food', baseValue: 30, weight: 1.0, volume: 0.8,
    biomeLevels: [], spoilageRatePerHour: 0.01, storageType: 'food_store',
    howToGet: 'craft', respawnMin: 0, maxStackBiome: 0,
    icon: 'res_carp_smoked.png', meshColor: 0x8B4513,
  },
  {
    id: 'trout_smoked', name: 'Копч. форель', type: 'food', baseValue: 70, weight: 0.9, volume: 0.8,
    biomeLevels: [], spoilageRatePerHour: 0.01, storageType: 'food_store',
    howToGet: 'craft', respawnMin: 0, maxStackBiome: 0,
    icon: 'res_trout_smoked.png', meshColor: 0xa0522d,
  },

  // ─── Строительные ───
  {
    id: 'wood_oak', name: 'Дубовая древесина', type: 'building', baseValue: 8, weight: 0.8, volume: 3.0,
    biomeLevels: [1, 2], spoilageRatePerHour: 0, storageType: 'wood_store',
    howToGet: 'npc_gather', respawnMin: 3, maxStackBiome: 20,
    icon: 'res_wood_oak.png', meshColor: 0x8B6914,
  },
  {
    id: 'wood_beech', name: 'Буковая древесина', type: 'building', baseValue: 10, weight: 0.9, volume: 3.0,
    biomeLevels: [2, 3], spoilageRatePerHour: 0, storageType: 'wood_store',
    howToGet: 'npc_gather', respawnMin: 5, maxStackBiome: 15,
    icon: 'res_wood_beech.png', meshColor: 0xdeb887,
  },
  {
    id: 'stone', name: 'Камень', type: 'building', baseValue: 15, weight: 2.5, volume: 1.0,
    biomeLevels: [1, 2, 3], spoilageRatePerHour: 0, storageType: 'stone_store',
    howToGet: 'npc_gather', respawnMin: 5, maxStackBiome: 25,
    icon: 'res_stone.png', meshColor: 0x808080,
  },
  {
    id: 'ore_iron', name: 'Железная руда', type: 'crafting', baseValue: 20, weight: 2.0, volume: 0.5,
    biomeLevels: [2, 3], spoilageRatePerHour: 0, storageType: 'stone_store',
    howToGet: 'npc_gather', respawnMin: 8, maxStackBiome: 10,
    icon: 'res_ore_iron.png', meshColor: 0x696969,
  },
  {
    id: 'herb_patagonia', name: 'Патагонская трава', type: 'crafting', baseValue: 12, weight: 0.1, volume: 0.2,
    biomeLevels: [2, 3], spoilageRatePerHour: 0.10, storageType: 'food_store',
    howToGet: 'npc_gather', respawnMin: 4, maxStackBiome: 30,
    icon: 'res_herb.png', meshColor: 0x27ae60,
  },

  // ─── Инструменты / приманки ───
  {
    id: 'worm', name: 'Червь (приманка)', type: 'tool', baseValue: 5, weight: 0.1, volume: 0.2,
    biomeLevels: [1], spoilageRatePerHour: 0, storageType: 'tool_store',
    howToGet: 'shop', respawnMin: 0, maxStackBiome: 0,
    icon: 'bait_worm.png', meshColor: 0xc0392b,
  },
  {
    id: 'moth', name: 'Мотыль (приманка)', type: 'tool', baseValue: 35, weight: 0.1, volume: 0.2,
    biomeLevels: [2], spoilageRatePerHour: 0, storageType: 'tool_store',
    howToGet: 'shop', respawnMin: 0, maxStackBiome: 0,
    icon: 'bait_moth.png', meshColor: 0xecf0f1,
  },
  {
    id: 'lure', name: 'Блесна (приманка)', type: 'tool', baseValue: 25, weight: 0.05, volume: 0.1,
    biomeLevels: [], spoilageRatePerHour: 0, storageType: 'tool_store',
    howToGet: 'shop', respawnMin: 0, maxStackBiome: 0,
    icon: 'bait_lure.png', meshColor: 0xbdc3c7,
  },
  {
    id: 'fly_lure', name: 'Иск. мушка', type: 'tool', baseValue: 80, weight: 0.05, volume: 0.1,
    biomeLevels: [], spoilageRatePerHour: 0, storageType: 'tool_store',
    howToGet: 'shop', respawnMin: 0, maxStackBiome: 0,
    icon: 'bait_fly.png', meshColor: 0x9b59b6,
  },
  {
    id: 'bread', name: 'Хлеб/Тесто', type: 'tool', baseValue: 8, weight: 0.1, volume: 0.2,
    biomeLevels: [], spoilageRatePerHour: 0, storageType: 'tool_store',
    howToGet: 'farm', respawnMin: 0, maxStackBiome: 0,
    icon: 'bait_bread.png', meshColor: 0xf5deb3,
  },
  {
    id: 'fish_hook', name: 'Крючок', type: 'crafting', baseValue: 10, weight: 0.05, volume: 0.1,
    biomeLevels: [], spoilageRatePerHour: 0, storageType: 'tool_store',
    howToGet: 'craft', respawnMin: 0, maxStackBiome: 0,
    icon: 'res_hook.png', meshColor: 0x95a5a6,
  },
];

/** Получить ресурс по id */
export const getResourceById = (id: string): ResourceConfig | undefined =>
  RESOURCE_DATABASE.find((r) => r.id === id);

/** Получить ресурсы доступные в биоме */
export const getResourcesByBiome = (biomeLevel: number): ResourceConfig[] =>
  RESOURCE_DATABASE.filter((r) => r.biomeLevels.includes(biomeLevel));

/** Получить ресурсы по типу */
export const getResourcesByType = (type: ResourceType): ResourceConfig[] =>
  RESOURCE_DATABASE.filter((r) => r.type === type);
