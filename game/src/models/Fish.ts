// ============================================================
// FISH MODEL — интерфейсы рыб
// Из тз/08_SCENES_SUPPLEMENT.md и тз/11_GAME_CONFIGS.md
// ============================================================

export interface FishConfig {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  baseValue: number;
  minWeight: number;
  maxWeight: number;
  depthMin: number;           // 0-10 (0=поверхность)
  depthMax: number;
  preferredBait: string;      // id из baitDatabase
  biomeLevels: number[];      // [1] или [2,3] или [1,2,3]
  strugglePower: number;      // 1-10 (влияет на tension)
  horizontalSpeed: number;    // скорость плавания
  uniqueTrait: string;        // описание особенности
  isPond: boolean;            // можно в личный пруд
  pondGrowthPerHour: number;  // кг/час в пруду
  iconPath: string;           // /assets/images/fish/{id}.png
  color3D: number;            // цвет для 3D mesh
}

/** Состояние Fish AI в рыбалке */
export type FishAIState = 'neutral' | 'flee' | 'attract';

/** Рыба в активной сессии рыбалки */
export interface FishAI {
  id: string;
  config: FishConfig;
  mesh: any; // THREE.Mesh (any чтобы не тянуть Three.js в модель)
  state: FishAIState;
  depth: number;
  horizontalSpeed: number;
}

/** Запись о пойманной рыбе */
export interface CaughtFishRecord {
  fishId: string;
  name: string;
  weight: number;
  value: number;
  processed: boolean;
  timestamp: number;
}
