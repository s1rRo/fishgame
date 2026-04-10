// ============================================================
// NPC MODEL — интерфейсы NPC-помощников
// Из тз/08_SCENES_SUPPLEMENT.md и тз/11_GAME_CONFIGS.md секция 6
// ============================================================

export type NPCRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Определение NPC из базы данных (статическое) */
export interface NPCDefinition {
  id: string;
  name: string;
  rarity: NPCRarity;
  portrait: string;           // /assets/images/npc/{id}.png
  predispositions: {
    fish: number;             // % склонность к рыбалке
    wood: number;
    stone: number;
    herb: number;
    mineral: number;
  };
  speciality: string;         // описание специализации
}

/** Статистика rarity NPC */
export interface NPCRarityStats {
  dropChance: number;
  basePrice: number;          // gems
  baseCarryCapacity: number;  // кг
  baseGatherSpeed: number;    // ед/мин
  maxLevel: number;
  trainingCostPerLevel: number; // softCoins
  trainingTimeHours: number;
  gatherSpeedBonusPerLevel: number; // %
  carryBonusPerLevel: number; // %
}

export const NPC_RARITY_STATS: Record<NPCRarity, NPCRarityStats> = {
  common:    { dropChance: 0.60, basePrice: 50,   baseCarryCapacity: 25,  baseGatherSpeed: 3.0,  maxLevel: 10, trainingCostPerLevel: 200,  trainingTimeHours: 2,  gatherSpeedBonusPerLevel: 8,  carryBonusPerLevel: 12 },
  uncommon:  { dropChance: 0.25, basePrice: 150,  baseCarryCapacity: 35,  baseGatherSpeed: 4.5,  maxLevel: 15, trainingCostPerLevel: 400,  trainingTimeHours: 4,  gatherSpeedBonusPerLevel: 10, carryBonusPerLevel: 14 },
  rare:      { dropChance: 0.10, basePrice: 400,  baseCarryCapacity: 50,  baseGatherSpeed: 6.5,  maxLevel: 20, trainingCostPerLevel: 800,  trainingTimeHours: 6,  gatherSpeedBonusPerLevel: 12, carryBonusPerLevel: 16 },
  epic:      { dropChance: 0.04, basePrice: 1000, baseCarryCapacity: 75,  baseGatherSpeed: 10.0, maxLevel: 25, trainingCostPerLevel: 2000, trainingTimeHours: 8,  gatherSpeedBonusPerLevel: 15, carryBonusPerLevel: 20 },
  legendary: { dropChance: 0.01, basePrice: 0,    baseCarryCapacity: 120, baseGatherSpeed: 18.0, maxLevel: 30, trainingCostPerLevel: 5000, trainingTimeHours: 12, gatherSpeedBonusPerLevel: 20, carryBonusPerLevel: 25 },
};

/** Экземпляр NPC у игрока (динамическое состояние) */
export interface NPCInstance {
  definitionId: string;       // id из NPCDefinition
  level: number;
  trainingProgress: number;   // 0-100%
  trainingStartedAt?: number; // timestamp начала тренировки
  attachedPetId?: string;
  currentTask?: 'idle' | 'fishing' | 'gathering' | 'training';
  assignedBiomeId?: string;
  lastReturnAt?: number;
  inventory: Array<{ resourceId: string; amount: number }>;
}
