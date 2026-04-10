// ============================================================
// КРАФТ — 7 рецептов из тз/11_GAME_CONFIGS.md раздел 9
// ============================================================

export interface CraftingRecipe {
  id: string;
  name: string;
  inputs: { resourceId: string; amount: number }[];
  outputs: { resourceId: string; amount: number }[];
  timeMinutes: number;
  failChance: number;       // 0–1
  requiredBuilding: string; // id здания
  requiredBuildingLevel: number;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'smoke_carp', name: 'Копчёный карп',
    inputs: [{ resourceId: 'carp', amount: 3 }],
    outputs: [{ resourceId: 'carp_smoked', amount: 2 }],
    timeMinutes: 60, failChance: 0,
    requiredBuilding: 'smokehouse', requiredBuildingLevel: 1,
  },
  {
    id: 'smoke_trout', name: 'Копчёная форель',
    inputs: [{ resourceId: 'trout', amount: 2 }],
    outputs: [{ resourceId: 'trout_smoked', amount: 2 }],
    timeMinutes: 90, failChance: 0,
    requiredBuilding: 'smokehouse', requiredBuildingLevel: 2,
  },
  {
    id: 'smoke_salmon', name: 'Копчёный лосось',
    inputs: [{ resourceId: 'salmon_king', amount: 1 }],
    outputs: [{ resourceId: 'salmon_smoked', amount: 1 }],
    timeMinutes: 120, failChance: 0,
    requiredBuilding: 'smokehouse', requiredBuildingLevel: 2,
  },
  {
    id: 'rod_steel', name: 'Стальная удочка',
    inputs: [
      { resourceId: 'wood_oak', amount: 4 },
      { resourceId: 'ore_iron', amount: 2 },
      { resourceId: 'fish_hook', amount: 1 },
    ],
    outputs: [{ resourceId: 'rod_steel_item', amount: 1 }],
    timeMinutes: 120, failChance: 0.20,
    requiredBuilding: 'workshop', requiredBuildingLevel: 2,
  },
  {
    id: 'lure_improved', name: 'Улучшенная блесна',
    inputs: [
      { resourceId: 'ore_iron', amount: 2 },
      { resourceId: 'moth', amount: 1 },
    ],
    outputs: [{ resourceId: 'lure', amount: 3 }],
    timeMinutes: 30, failChance: 0.15,
    requiredBuilding: 'smokehouse', requiredBuildingLevel: 2,
  },
  {
    id: 'bread_bait', name: 'Хлеб/Тесто',
    inputs: [
      { resourceId: 'herb_patagonia', amount: 2 },
      { resourceId: 'water', amount: 1 },
    ],
    outputs: [{ resourceId: 'bread', amount: 5 }],
    timeMinutes: 15, failChance: 0,
    requiredBuilding: 'hut', requiredBuildingLevel: 1,
  },
  {
    id: 'fish_hook', name: 'Крючок',
    inputs: [{ resourceId: 'ore_iron', amount: 1 }],
    outputs: [{ resourceId: 'fish_hook', amount: 3 }],
    timeMinutes: 20, failChance: 0.10,
    requiredBuilding: 'workshop', requiredBuildingLevel: 1,
  },
  {
    id: 'advanced_bait', name: 'Продвинутая приманка',
    inputs: [{ resourceId: 'pearl', amount: 1 }, { resourceId: 'salt', amount: 2 }],
    outputs: [{ resourceId: 'advanced_bait_item', amount: 3 }],
    timeMinutes: 40, failChance: 0.25,
    requiredBuilding: 'smokehouse', requiredBuildingLevel: 3,
  },
  {
    id: 'golden_rod', name: 'Золотая удочка',
    inputs: [{ resourceId: 'gold_nugget', amount: 1 }, { resourceId: 'pearl', amount: 3 }, { resourceId: 'ore_iron', amount: 5 }],
    outputs: [{ resourceId: 'golden_rod_item', amount: 1 }],
    timeMinutes: 180, failChance: 0.30,
    requiredBuilding: 'workshop', requiredBuildingLevel: 4,
  },
];
