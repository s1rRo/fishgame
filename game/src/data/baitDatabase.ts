// ============================================================
// BAIT DATABASE — 5 приманок
// Данные из тз/11_GAME_CONFIGS.md секция 3
// ============================================================

export interface BaitConfig {
  id: string;
  name: string;
  icon: string;
  price: number;
  currency: 'soft' | 'free';
  shopStock: number;         // Infinity = бесконечный
  catchBonusMatch: number;   // % бонус при попадании в предпочтение рыбы
  catchPenaltyMiss: number;  // % штраф при несовпадении
  targetFishBehavior: string;
  description: string;
  howToGet: string;
  geometry3D: string;        // описание 3D геометрии
  color3D: number;
}

export const BAITS: BaitConfig[] = [
  {
    id: 'worm',
    name: 'Червь',
    icon: '/assets/images/baits/bait_worm.png',
    price: 5,
    currency: 'soft',
    shopStock: Infinity,
    catchBonusMatch: 45,
    catchPenaltyMiss: 0,
    targetFishBehavior: 'Донные рыбы (карп, сом)',
    description: 'Универсальная приманка для донных рыб',
    howToGet: 'Старт / магазин',
    geometry3D: 'CylinderGeometry',
    color3D: 0xe74c3c,
  },
  {
    id: 'moth',
    name: 'Мотыль',
    icon: '/assets/images/baits/bait_moth.png',
    price: 35,
    currency: 'soft',
    shopStock: 50,
    catchBonusMatch: 40,
    catchPenaltyMiss: 15,
    targetFishBehavior: 'Форель, голец',
    description: 'Любимая еда форели и гольца',
    howToGet: 'Лутбокс + квест',
    geometry3D: 'ConeGeometry',
    color3D: 0xffffff,
  },
  {
    id: 'lure',
    name: 'Блесна',
    icon: '/assets/images/baits/bait_lure.png',
    price: 25,
    currency: 'soft',
    shopStock: 30,
    catchBonusMatch: 35,
    catchPenaltyMiss: 10,
    targetFishBehavior: 'Хищники (окунь, дорадо)',
    description: 'Блестящая приманка для хищных рыб',
    howToGet: 'Магазин',
    geometry3D: 'SphereGeometry',
    color3D: 0xbdc3c7,
  },
  {
    id: 'fly',
    name: 'Искусственная мушка',
    icon: '/assets/images/baits/bait_fly.png',
    price: 80,
    currency: 'soft',
    shopStock: 15,
    catchBonusMatch: 55,
    catchPenaltyMiss: 20,
    targetFishBehavior: 'Лосось, радужная форель',
    description: 'Редкая приманка для крупных лососёвых',
    howToGet: 'Редкий лутбокс / магазин',
    geometry3D: 'PlaneGeometry',
    color3D: 0x8e44ad,
  },
  {
    id: 'bread',
    name: 'Хлеб/Тесто',
    icon: '/assets/images/baits/bait_bread.png',
    price: 8,
    currency: 'soft',
    shopStock: Infinity,
    catchBonusMatch: 25,
    catchPenaltyMiss: 0,
    targetFishBehavior: 'Всеядные (пежерей, карп)',
    description: 'Простая приманка для всеядных рыб',
    howToGet: 'Бесплатно из фермы',
    geometry3D: 'BoxGeometry',
    color3D: 0xf5deb3,
  },
];

/** Найти приманку по id */
export function getBaitById(id: string): BaitConfig | undefined {
  return BAITS.find(b => b.id === id);
}
