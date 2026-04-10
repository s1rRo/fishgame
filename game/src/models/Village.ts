// ============================================================
// VILLAGE MODEL — интерфейсы деревни и зданий
// Из тз/07_ARGENTINA_SUPPLEMENT.md задача 13 + тз/11_GAME_CONFIGS.md секция 5
// ============================================================

export type GridCellType = 'empty' | 'water' | 'road' | 'building' | 'tree' | 'resource';

export interface GridCell {
  type: GridCellType;
  buildingId?: string;
  resourceId?: string;
}

// ── HEX GRID (Clash of Clans стиль) ──────────────────────────
export type HexCellType = 'empty' | 'water' | 'road' | 'building' | 'tree' | 'rock';

export interface HexCell {
  type: HexCellType;
  buildingId?: string;
  obstacleVariant?: number; // 1-11 для деревьев, 1-5 для камней
}

/** Определение здания из базы данных */
export interface BuildingLevel {
  level: number;
  upgradeCost: number;              // softCoins
  upgradeResources: Record<string, number>; // resourceId → количество
  upgradeTime: number;              // секунды
  bonusDescription: string;
  capacity?: number;
  npcSlots?: number;
  passiveIncome?: number;
  priceMultiplier?: number;
  trainingSpeed?: number;
  fishSlots?: number;
  growthSpeed?: number;
}

export interface BuildingConfig {
  id: string;
  name: string;
  icon: string;
  gridPosition: { x: number; z: number };
  gridSize: { w: number; h: number };
  movable: boolean;
  levels: BuildingLevel[];
}

/** Состояние здания у игрока */
export interface BuildingData {
  level: number;
  upgradedAt: number;
  visualStage: number;
  active: boolean;
}

/** Состояние деревни */
export interface VillageState {
  position: { lat: number; lon: number };
  grid: GridCell[][];           // 20×20
  buildings: Record<string, BuildingData>;
  level: number;
  xp: number;
}
