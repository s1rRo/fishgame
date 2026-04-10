// ============================================================
// МОДЕЛЬ ИГРОКА — полная структура Firestore
// River Lord: Pixel Fishery
// ============================================================

export interface CaughtFishRecord {
  fishId: string;
  name: string;
  weight: number;
  value: number;
  processed: boolean;
  timestamp: number;
}

// Лутбокс-инвентарь
export interface LootboxInventory {
  starter: number;
  daily: number;
  basic: number;
  premium: number;
  fishing: number;
  season: number;
  golden: number;
}

// Активный крафт-джоб
export interface CraftJob {
  recipeId: string;
  buildingId: string;
  startedAt: number;
  durationMs: number;
}

// Слот типизированного склада
export interface StorageSlot {
  resourceId: string;
  qty: number;
  spoilTimestamp?: number;
}

// Запись атласа рыб
export interface FishAtlasEntry {
  caught: boolean;
  maxWeight: number;
  count: number;
  firstCaughtAt?: number;
}

// Запись истории аукциона
export interface AuctionHistoryEntry {
  id: string;
  resourceId: string;
  qty: number;
  price: number;
  type: 'buy' | 'sell';
  timestamp: number;
}

export interface BuildingData {
  level: number;
  upgradedAt: number;
  visualStage: number;
  active?: boolean;
}

// ── HEX FARM (Clash of Clans стиль) ──────────────────────────
export interface FarmBuildingPlacement {
  buildingId: string;
  hexQ: number;
  hexR: number;
  level: number;
  upgradedAt: number;
  visualStage: number;
  active?: boolean;
}

export interface HexFarmState {
  /** Размещённые здания: уникальный instanceId → данные */
  buildings: Record<string, FarmBuildingPlacement>;
  /** Дороги: hex-ключи "q,r" */
  roads: string[];
  /** Расчищенные hex-клетки */
  clearedHexes: string[];
  /** Препятствия: hexKey → тип и вариант */
  obstacles: Record<string, { type: 'tree' | 'rock' | 'branch'; variant: number }>;
  /** Текущее задание расчистки */
  clearingJob?: {
    hexKey: string;
    type: 'tree' | 'rock' | 'branch';
    startedAt: number;
    durationMs: number; // 30000 = 30 сек
  };
}

export interface LevelProgress {
  completed: boolean;
  targetReached: boolean;
  bestAttempts: number;
  bestValue: number;
}

export interface PlayerProfile {
  uid: string;
  displayName: string;
  email: string | null;
  createdAt: number;
  lastLogin: number;

  // Валюты
  softCoins: number;
  gems: number;

  // Прогресс уровней
  currentLevel: number;
  unlockedRegions: string[];
  levelsProgress: Record<string, LevelProgress>;
  fishUnlocked: string[];

  // Статистика
  totalSessions: number;
  totalPlayTimeMinutes: number;
  totalAttemptsAllTime: number;
  totalFishCaught: number;
  totalRevenue: number;
  totalFishSold: number;

  // Инвентарь
  inventory: CaughtFishRecord[];

  // Ферма
  farmBuildings: {
    house:      BuildingData;
    pond:       BuildingData;
    storage:    BuildingData;
    smokehouse: BuildingData;
    dock:       BuildingData;
    npcFisher1: BuildingData;
  };
  lastPassiveClaim: number;
  passiveCoinsPerMinute: number;

  // Реклама
  adWatchedToday: number;
  lastAdWatch: {
    extraCast:  number | null;
    doubleSell: number | null;
    respawnFish: number | null;
    dailyBonus: number | null;
  };
  lastAdDayReset: number;

  // River Lord
  riverLords: Record<string, {
    attempts: number;
    totalValue: number;
    timestamp: number;
    isRiverLord: boolean;
  }>;
  riverLordTitles: string[];

  // Season Pass
  seasonPass: {
    seasonStartTimestamp: number;
    currentWeek: number;
    freeTrackProgress: number;
    premiumOwned: boolean;
    claimedRewards: string[];
  };

  // Косметика
  ownedCosmetics: string[];
  equippedCosmetics: {
    rod:       string | null;
    boat:      string | null;
    house:     string | null;
    smokehouse: string | null;
    dock:      string | null;
    npcFisher1: string | null;
  };
  totalCosmeticsBought: number;

  // === MVP v1.0 — Argentina System ===
  villagePosition?: { lat: number; lon: number };
  currentBiomeId?: string;
  activeNPCIds: string[];           // max 3
  activePetId?: string;
  resources: Record<string, number>; // resourceId → количество
  pondFish: Array<{ fishId: string; addedAt: number }>;
  offlineEarningsAt?: number;       // timestamp последнего офлайн-расчёта
  tutorialCompleted?: boolean;
  totalResources?: number;          // для проверки разблока биомов
  villageLevel?: number;            // уровень деревни (1-15)
  avatarId?: string;                // текущий аватар
  rodSkinId?: string;               // текущий скин удочки
  npcLevels: Record<string, number>;           // npcId → уровень
  npcTraining?: { npcId: string; startedAt: number; durationMs: number }; // текущая тренировка

  // === Фаза 0: Новые системы ===
  lootboxInventory: LootboxInventory;
  unlockedRecipes: string[];
  activeCraftJobs: CraftJob[];
  storageSlots: Record<string, StorageSlot[]>;   // storageType → слоты
  fishAtlas: Record<string, FishAtlasEntry>;     // fishId → запись
  achievements: string[];
  auctionHistory: AuctionHistoryEntry[];
  schemaVersion: number;

  // NPC dispatch — NPC отправленные на добычу
  npcDispatches: Record<string, {
    biomeId: string;
    resourceId: string;
    startedAt: number;
    estimatedReturnAt: number;
  }>;

  // Питомцы — привязка к NPC
  petEquipped: Record<string, string>;  // npcId → petId

  // Hex-ферма (Clash of Clans стиль)
  hexFarm?: HexFarmState;
  ownedPetIds: string[];
}

// Расчёт пассивного дохода по зданиям
export const calcPassiveIncome = (buildings: PlayerProfile['farmBuildings']): number => {
  let total = 0;
  total += buildings.house.level      * 2;
  total += (buildings.pond?.level     ?? 0) * 4;  // пруд — хороший источник дохода
  total += buildings.storage.level    * 1;
  total += buildings.smokehouse.level * 3;
  total += buildings.dock.level       * 4;
  total += (buildings.npcFisher1.active ? buildings.npcFisher1.level * 8 : 0);
  return total; // монет в минуту
};

// Стоимость апгрейда здания
export const calcUpgradeCost = (currentLevel: number, baseCost: number): number =>
  Math.floor(baseCost * currentLevel * 1.5);

export const DEFAULT_PLAYER_PROFILE: Omit<PlayerProfile,
  'uid' | 'displayName' | 'email' | 'createdAt' | 'lastLogin'
> = {
  softCoins: 500,
  gems: 30,
  currentLevel: 1,
  unlockedRegions: ['europe'],
  levelsProgress: {},
  fishUnlocked: ['perch', 'carp', 'roach', 'ruffe'],
  totalSessions: 0,
  totalPlayTimeMinutes: 0,
  totalAttemptsAllTime: 0,
  totalFishCaught: 0,
  totalRevenue: 0,
  totalFishSold: 0,
  inventory: [],
  farmBuildings: {
    house:      { level: 1, upgradedAt: 0, visualStage: 1 },
    pond:       { level: 1, upgradedAt: 0, visualStage: 1 },  // пруд с L1
    storage:    { level: 0, upgradedAt: 0, visualStage: 0 },  // строить за монеты
    smokehouse: { level: 0, upgradedAt: 0, visualStage: 0 },
    dock:       { level: 0, upgradedAt: 0, visualStage: 0 },
    npcFisher1: { level: 0, upgradedAt: 0, visualStage: 0, active: false },
  },
  lastPassiveClaim: Date.now(),
  passiveCoinsPerMinute: 8,
  adWatchedToday: 0,
  lastAdWatch: {
    extraCast:   null,
    doubleSell:  null,
    respawnFish: null,
    dailyBonus:  null,
  },
  lastAdDayReset: Date.now(),
  riverLords: {},
  riverLordTitles: [],
  seasonPass: {
    seasonStartTimestamp: Date.now(),
    currentWeek: 1,
    freeTrackProgress: 0,
    premiumOwned: false,
    claimedRewards: [],
  },
  ownedCosmetics: [],
  equippedCosmetics: {
    rod:        null,
    boat:       null,
    house:      null,
    smokehouse: null,
    dock:       null,
    npcFisher1: null,
  },
  totalCosmeticsBought: 0,

  // MVP v1.0
  villagePosition: undefined,
  currentBiomeId: undefined,
  activeNPCIds: [],
  activePetId: undefined,
  resources: {},
  pondFish: [],
  offlineEarningsAt: undefined,
  tutorialCompleted: false,
  totalResources: 0,
  villageLevel: 1,
  avatarId: 'avatar_default_m',
  rodSkinId: 'rod_basic',
  npcLevels: {},
  npcTraining: undefined,

  // Новые системы
  lootboxInventory: { starter: 0, daily: 0, basic: 0, premium: 0, fishing: 0, season: 0, golden: 0 },
  unlockedRecipes: [],
  activeCraftJobs: [],
  storageSlots: {},
  fishAtlas: {},
  achievements: [],
  auctionHistory: [],
  schemaVersion: 2,
  npcDispatches: {},
  petEquipped: {},
  ownedPetIds: [],
};
