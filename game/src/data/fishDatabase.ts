// ============================================================
// БАЗА РЫБ — 40 видов Аргентины + старые 36 для совместимости
// River Lord: Pixel Fishery — MVP v1.0
// Из тз/11_GAME_CONFIGS.md раздел 2
// ============================================================

import type { FishConfig } from '../models/Fish';

/** Старый интерфейс — алиас для обратной совместимости */
export type FishSpecies = FishConfig & {
  emoji: string;
  baseValuePerKg: number;
  unlockedAtLevel: number;
};

// ===== 40 рыб Аргентины (основная база MVP) =====
export const argentineFishDatabase: FishConfig[] = [
  // ── L1: Río Salado (1-10) ──
  { id: 'carp_common',       name: 'Обычный карп',         rarity: 'common',    baseValue: 12,  minWeight: 0.8, maxWeight: 2.5,   depthMin: 1,  depthMax: 4,  preferredBait: 'worm',     biomeLevels: [1],     strugglePower: 2,  horizontalSpeed: 0.6, uniqueTrait: 'Медленный, клюёт на дне',           isPond: true,  pondGrowthPerHour: 0.3,  iconPath: '/assets/images/fish/carp_common.png',       color3D: 0xf39c12 },
  { id: 'perch_river',       name: 'Речной окунь',         rarity: 'common',    baseValue: 15,  minWeight: 0.5, maxWeight: 1.8,   depthMin: 2,  depthMax: 5,  preferredBait: 'lure',     biomeLevels: [1],     strugglePower: 4,  horizontalSpeed: 1.8, uniqueTrait: 'Быстрые рывки',                     isPond: true,  pondGrowthPerHour: 0.2,  iconPath: '/assets/images/fish/perch_river.png',       color3D: 0x27ae60 },
  { id: 'pejerrey_silver',   name: 'Серебряный пежерей',   rarity: 'common',    baseValue: 18,  minWeight: 0.6, maxWeight: 2.0,   depthMin: 0,  depthMax: 3,  preferredBait: 'bread',    biomeLevels: [1, 2],  strugglePower: 3,  horizontalSpeed: 1.4, uniqueTrait: 'Плавает стайками 3-5',              isPond: true,  pondGrowthPerHour: 0.25, iconPath: '/assets/images/fish/pejerrey_silver.png',   color3D: 0xbdc3c7 },
  { id: 'catfish_small',     name: 'Малый сом',            rarity: 'common',    baseValue: 14,  minWeight: 1.0, maxWeight: 3.5,   depthMin: 3,  depthMax: 6,  preferredBait: 'worm',     biomeLevels: [1],     strugglePower: 3,  horizontalSpeed: 0.7, uniqueTrait: 'Донный хищник',                     isPond: true,  pondGrowthPerHour: 0.35, iconPath: '/assets/images/fish/catfish_small.png',     color3D: 0x7f8c8d },
  { id: 'tararira',          name: 'Тарарира',             rarity: 'uncommon',  baseValue: 24,  minWeight: 2.0, maxWeight: 6.0,   depthMin: 1,  depthMax: 4,  preferredBait: 'lure',     biomeLevels: [1],     strugglePower: 6,  horizontalSpeed: 2.0, uniqueTrait: 'Агрессивный бой',                   isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/tararira.png',          color3D: 0x2c3e50 },
  { id: 'dorado_gold',       name: 'Золотой дорадо',       rarity: 'rare',      baseValue: 55,  minWeight: 8.0, maxWeight: 20.0,  depthMin: 2,  depthMax: 6,  preferredBait: 'lure',     biomeLevels: [1, 3],  strugglePower: 8,  horizontalSpeed: 2.5, uniqueTrait: 'Агрессивный, атакует леску',         isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/dorado_gold.png',       color3D: 0xf1c40f },
  { id: 'catfish_velvet',    name: 'Сом-бархат',           rarity: 'rare',      baseValue: 40,  minWeight: 4.0, maxWeight: 10.0,  depthMin: 4,  depthMax: 9,  preferredBait: 'worm',     biomeLevels: [1],     strugglePower: 5,  horizontalSpeed: 0.8, uniqueTrait: 'Донный хищник, прячется',           isPond: true,  pondGrowthPerHour: 0.4,  iconPath: '/assets/images/fish/catfish_velvet.png',    color3D: 0x5d4037 },
  { id: 'pike_river',        name: 'Речная щука',          rarity: 'uncommon',  baseValue: 30,  minWeight: 1.5, maxWeight: 5.0,   depthMin: 1,  depthMax: 4,  preferredBait: 'lure',     biomeLevels: [1],     strugglePower: 6,  horizontalSpeed: 2.2, uniqueTrait: 'Засадный хищник',                   isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/pike_river.png',        color3D: 0x1e8449 },
  { id: 'boga_common',       name: 'Обычная бога',         rarity: 'common',    baseValue: 10,  minWeight: 0.3, maxWeight: 1.2,   depthMin: 0,  depthMax: 2,  preferredBait: 'bread',    biomeLevels: [1],     strugglePower: 1,  horizontalSpeed: 1.0, uniqueTrait: 'Поверхностная',                     isPond: true,  pondGrowthPerHour: 0.15, iconPath: '/assets/images/fish/boga_common.png',       color3D: 0x95a5a6 },
  { id: 'surubi',            name: 'Суруби',               rarity: 'rare',      baseValue: 48,  minWeight: 5.0, maxWeight: 18.0,  depthMin: 5,  depthMax: 10, preferredBait: 'worm',     biomeLevels: [1],     strugglePower: 7,  horizontalSpeed: 0.6, uniqueTrait: 'Огромный сом, медленный',           isPond: true,  pondGrowthPerHour: 0.5,  iconPath: '/assets/images/fish/surubi.png',            color3D: 0x34495e },

  // ── L2: Nahuel Huapi (11-25) ──
  { id: 'trout_rainbow',     name: 'Радужная форель',      rarity: 'uncommon',  baseValue: 28,  minWeight: 2.0, maxWeight: 8.0,   depthMin: 4,  depthMax: 9,  preferredBait: 'moth',     biomeLevels: [2, 3],  strugglePower: 5,  horizontalSpeed: 1.6, uniqueTrait: 'Красивые прыжки',                  isPond: true,  pondGrowthPerHour: 0.3,  iconPath: '/assets/images/fish/trout_rainbow.png',     color3D: 0xe74c3c },
  { id: 'trout_brown',       name: 'Коричневая форель',    rarity: 'uncommon',  baseValue: 32,  minWeight: 3.0, maxWeight: 12.0,  depthMin: 3,  depthMax: 8,  preferredBait: 'moth',     biomeLevels: [2],     strugglePower: 6,  horizontalSpeed: 1.4, uniqueTrait: 'Сильное сопротивление',             isPond: true,  pondGrowthPerHour: 0.35, iconPath: '/assets/images/fish/trout_brown.png',       color3D: 0x8B4513 },
  { id: 'galaxias',          name: 'Патагонский галаксиас', rarity: 'common',   baseValue: 10,  minWeight: 0.3, maxWeight: 0.9,   depthMin: 3,  depthMax: 6,  preferredBait: 'moth',     biomeLevels: [2],     strugglePower: 2,  horizontalSpeed: 1.2, uniqueTrait: 'Маленький, но частый',             isPond: true,  pondGrowthPerHour: 0.1,  iconPath: '/assets/images/fish/galaxias.png',          color3D: 0x3498db },
  { id: 'perch_creole',      name: 'Креольский окунь',     rarity: 'uncommon',  baseValue: 22,  minWeight: 1.5, maxWeight: 4.0,   depthMin: 2,  depthMax: 7,  preferredBait: 'lure',     biomeLevels: [1, 2],  strugglePower: 5,  horizontalSpeed: 1.8, uniqueTrait: 'Сильный бой',                      isPond: true,  pondGrowthPerHour: 0.25, iconPath: '/assets/images/fish/perch_creole.png',      color3D: 0x2ecc71 },
  { id: 'pike_patagon',      name: 'Патагонская щука',     rarity: 'uncommon',  baseValue: 30,  minWeight: 3.0, maxWeight: 9.0,   depthMin: 2,  depthMax: 7,  preferredBait: 'lure',     biomeLevels: [2, 3],  strugglePower: 6,  horizontalSpeed: 2.0, uniqueTrait: 'Засадный хищник',                   isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/pike_patagon.png',      color3D: 0x1a5276 },
  { id: 'goby_stream',       name: 'Ручьевой голец',       rarity: 'uncommon',  baseValue: 25,  minWeight: 1.0, maxWeight: 5.0,   depthMin: 5,  depthMax: 10, preferredBait: 'moth',     biomeLevels: [2],     strugglePower: 4,  horizontalSpeed: 0.9, uniqueTrait: 'Любит холодную воду',              isPond: true,  pondGrowthPerHour: 0.2,  iconPath: '/assets/images/fish/goby_stream.png',       color3D: 0x5dade2 },
  { id: 'carp_mirror',       name: 'Зеркальный карп',      rarity: 'common',    baseValue: 16,  minWeight: 1.0, maxWeight: 4.0,   depthMin: 1,  depthMax: 5,  preferredBait: 'bread',    biomeLevels: [2],     strugglePower: 3,  horizontalSpeed: 0.8, uniqueTrait: 'Медленный, осторожный',            isPond: true,  pondGrowthPerHour: 0.3,  iconPath: '/assets/images/fish/carp_mirror.png',       color3D: 0xf7dc6f },
  { id: 'trout_lake',        name: 'Озёрная форель',       rarity: 'rare',      baseValue: 42,  minWeight: 3.0, maxWeight: 14.0,  depthMin: 5,  depthMax: 10, preferredBait: 'moth',     biomeLevels: [2, 3],  strugglePower: 7,  horizontalSpeed: 1.3, uniqueTrait: 'Глубоководная, редкая',             isPond: true,  pondGrowthPerHour: 0.4,  iconPath: '/assets/images/fish/trout_lake.png',        color3D: 0xa93226 },
  { id: 'silverside',        name: 'Серебрянка',           rarity: 'common',    baseValue: 8,   minWeight: 0.2, maxWeight: 0.8,   depthMin: 0,  depthMax: 3,  preferredBait: 'bread',    biomeLevels: [2],     strugglePower: 1,  horizontalSpeed: 1.5, uniqueTrait: 'Стайная, поверхностная',            isPond: true,  pondGrowthPerHour: 0.1,  iconPath: '/assets/images/fish/silverside.png',        color3D: 0xd5d8dc },
  { id: 'landlocked_salmon', name: 'Кокухо (жилой лосось)', rarity: 'rare',     baseValue: 50,  minWeight: 4.0, maxWeight: 15.0,  depthMin: 6,  depthMax: 12, preferredBait: 'fly_lure', biomeLevels: [2, 3],  strugglePower: 8,  horizontalSpeed: 1.7, uniqueTrait: 'Мощные рывки',                     isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/landlocked_salmon.png', color3D: 0xe74c3c },
  { id: 'perca_trucha',      name: 'Перка-труча',          rarity: 'uncommon',  baseValue: 26,  minWeight: 2.0, maxWeight: 7.0,   depthMin: 3,  depthMax: 8,  preferredBait: 'lure',     biomeLevels: [2],     strugglePower: 5,  horizontalSpeed: 1.6, uniqueTrait: 'Хитрый хищник, меняет глубину',     isPond: true,  pondGrowthPerHour: 0.25, iconPath: '/assets/images/fish/perca_trucha.png',      color3D: 0x148f77 },
  { id: 'catfish_patagon',   name: 'Патагонский сом',      rarity: 'uncommon',  baseValue: 35,  minWeight: 3.0, maxWeight: 10.0,  depthMin: 4,  depthMax: 9,  preferredBait: 'worm',     biomeLevels: [2],     strugglePower: 5,  horizontalSpeed: 0.7, uniqueTrait: 'Тяжёлый, тянет ко дну',            isPond: true,  pondGrowthPerHour: 0.35, iconPath: '/assets/images/fish/catfish_patagon.png',   color3D: 0x566573 },
  { id: 'roach_patagonia',   name: 'Патагонская плотва',   rarity: 'common',    baseValue: 12,  minWeight: 0.4, maxWeight: 1.5,   depthMin: 1,  depthMax: 4,  preferredBait: 'bread',    biomeLevels: [2],     strugglePower: 2,  horizontalSpeed: 1.1, uniqueTrait: 'Осторожная, пугливая',             isPond: true,  pondGrowthPerHour: 0.15, iconPath: '/assets/images/fish/roach_patagonia.png',   color3D: 0x82e0aa },
  { id: 'trout_tiger',       name: 'Тигровая форель',      rarity: 'rare',      baseValue: 45,  minWeight: 2.5, maxWeight: 9.0,   depthMin: 4,  depthMax: 8,  preferredBait: 'moth',     biomeLevels: [2],     strugglePower: 7,  horizontalSpeed: 1.5, uniqueTrait: 'Полосатая, яростный бой',          isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/trout_tiger.png',       color3D: 0xf5b041 },
  { id: 'goby_lake',         name: 'Озёрный голец',        rarity: 'rare',      baseValue: 45,  minWeight: 5.0, maxWeight: 15.0,  depthMin: 6,  depthMax: 12, preferredBait: 'moth',     biomeLevels: [3],     strugglePower: 8,  horizontalSpeed: 1.0, uniqueTrait: 'Трофейный, редкий',                isPond: true,  pondGrowthPerHour: 0.45, iconPath: '/assets/images/fish/goby_lake.png',         color3D: 0x2471a3 },

  // ── L3: Lago Argentino + общие (26-40) ──
  { id: 'pejerrey_patagon',  name: 'Патагонский пежерей',  rarity: 'rare',      baseValue: 38,  minWeight: 2.0, maxWeight: 7.0,   depthMin: 1,  depthMax: 5,  preferredBait: 'lure',     biomeLevels: [3],     strugglePower: 6,  horizontalSpeed: 2.0, uniqueTrait: 'Серебристый блеск',                isPond: true,  pondGrowthPerHour: 0.3,  iconPath: '/assets/images/fish/pejerrey_patagon.png',  color3D: 0xaed6f1 },
  { id: 'salmon_pacific',    name: 'Тихоокеанский лосось', rarity: 'epic',      baseValue: 70,  minWeight: 10.0, maxWeight: 25.0, depthMin: 7,  depthMax: 15, preferredBait: 'fly_lure', biomeLevels: [3],     strugglePower: 9,  horizontalSpeed: 1.8, uniqueTrait: 'Миграционный, огромный',            isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/salmon_pacific.png',    color3D: 0xe74c3c },
  { id: 'salmon_king',       name: 'Королевский лосось',   rarity: 'epic',      baseValue: 85,  minWeight: 15.0, maxWeight: 35.0, depthMin: 8,  depthMax: 18, preferredBait: 'fly_lure', biomeLevels: [3],     strugglePower: 10, horizontalSpeed: 1.5, uniqueTrait: 'Самый тяжёлый трофей',             isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/salmon_king.png',       color3D: 0xc0392b },
  { id: 'bass_sea',          name: 'Морской окунь',        rarity: 'epic',      baseValue: 65,  minWeight: 6.0, maxWeight: 18.0,  depthMin: 5,  depthMax: 12, preferredBait: 'fly_lure', biomeLevels: [3],     strugglePower: 9,  horizontalSpeed: 2.2, uniqueTrait: 'Яркая окраска',                    isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/bass_sea.png',          color3D: 0x2980b9 },
  { id: 'trout_steelhead',   name: 'Стальноголовая форель', rarity: 'epic',     baseValue: 72,  minWeight: 5.0, maxWeight: 16.0,  depthMin: 6,  depthMax: 14, preferredBait: 'fly_lure', biomeLevels: [3],     strugglePower: 9,  horizontalSpeed: 2.0, uniqueTrait: 'Стальной блеск, мощные прыжки',    isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/trout_steelhead.png',   color3D: 0x95a5a6 },
  { id: 'salmon_coho',       name: 'Кижуч',               rarity: 'rare',      baseValue: 58,  minWeight: 4.0, maxWeight: 14.0,  depthMin: 5,  depthMax: 12, preferredBait: 'fly_lure', biomeLevels: [3],     strugglePower: 8,  horizontalSpeed: 1.9, uniqueTrait: 'Серебристый боец, упорный',         isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/salmon_coho.png',       color3D: 0xd35400 },
  { id: 'flounder_patagon',  name: 'Патагонская камбала',  rarity: 'rare',      baseValue: 44,  minWeight: 2.0, maxWeight: 8.0,   depthMin: 7,  depthMax: 10, preferredBait: 'worm',     biomeLevels: [3],     strugglePower: 5,  horizontalSpeed: 0.5, uniqueTrait: 'Плоская, донная',                  isPond: true,  pondGrowthPerHour: 0.3,  iconPath: '/assets/images/fish/flounder_patagon.png',  color3D: 0xd4a07a },
  { id: 'cusk_eel',          name: 'Патагонский угорь',    rarity: 'uncommon',  baseValue: 28,  minWeight: 0.5, maxWeight: 3.0,   depthMin: 6,  depthMax: 10, preferredBait: 'worm',     biomeLevels: [3],     strugglePower: 4,  horizontalSpeed: 0.7, uniqueTrait: 'Змееподобный',                     isPond: true,  pondGrowthPerHour: 0.2,  iconPath: '/assets/images/fish/cusk_eel.png',          color3D: 0x2c3e50 },
  { id: 'robalo',            name: 'Робало',               rarity: 'rare',      baseValue: 52,  minWeight: 3.0, maxWeight: 12.0,  depthMin: 3,  depthMax: 8,  preferredBait: 'lure',     biomeLevels: [3],     strugglePower: 7,  horizontalSpeed: 2.1, uniqueTrait: 'Быстрый хищник, резкие повороты',  isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/robalo.png',            color3D: 0x1abc9c },
  { id: 'salmon_legendary',  name: 'Легендарный лосось',   rarity: 'legendary', baseValue: 200, minWeight: 20.0, maxWeight: 50.0, depthMin: 10, depthMax: 18, preferredBait: 'fly_lure', biomeLevels: [3],     strugglePower: 10, horizontalSpeed: 2.0, uniqueTrait: '1% шанс, огромный, эпичный',       isPond: false, pondGrowthPerHour: 0,    iconPath: '/assets/images/fish/salmon_legendary.png',  color3D: 0xf39c12 },

  // ── Только для пруда (36-40) ──
  { id: 'pond_carp',         name: 'Прудовой карп',        rarity: 'common',    baseValue: 10,  minWeight: 0.5, maxWeight: 5.0,   depthMin: 1,  depthMax: 3,  preferredBait: 'bread',    biomeLevels: [],      strugglePower: 2,  horizontalSpeed: 0.8, uniqueTrait: 'Только личный пруд',               isPond: true,  pondGrowthPerHour: 0.5,  iconPath: '/assets/images/fish/pond_carp.png',         color3D: 0xe67e22 },
  { id: 'pond_goldfish',     name: 'Золотая рыбка',        rarity: 'uncommon',  baseValue: 20,  minWeight: 0.1, maxWeight: 0.5,   depthMin: 0,  depthMax: 2,  preferredBait: 'bread',    biomeLevels: [],      strugglePower: 1,  horizontalSpeed: 1.0, uniqueTrait: 'Только личный пруд, декор',        isPond: true,  pondGrowthPerHour: 0.1,  iconPath: '/assets/images/fish/pond_goldfish.png',     color3D: 0xf1c40f },
  { id: 'pond_catfish',      name: 'Прудовой сомик',       rarity: 'common',    baseValue: 15,  minWeight: 0.3, maxWeight: 2.0,   depthMin: 2,  depthMax: 4,  preferredBait: 'worm',     biomeLevels: [],      strugglePower: 2,  horizontalSpeed: 0.7, uniqueTrait: 'Только личный пруд',               isPond: true,  pondGrowthPerHour: 0.4,  iconPath: '/assets/images/fish/pond_catfish.png',      color3D: 0x7f8c8d },
  { id: 'pond_trout',        name: 'Прудовая форель',      rarity: 'uncommon',  baseValue: 25,  minWeight: 0.5, maxWeight: 3.0,   depthMin: 2,  depthMax: 5,  preferredBait: 'moth',     biomeLevels: [],      strugglePower: 3,  horizontalSpeed: 1.2, uniqueTrait: 'Только личный пруд',               isPond: true,  pondGrowthPerHour: 0.3,  iconPath: '/assets/images/fish/pond_trout.png',        color3D: 0xe8967a },
  { id: 'pond_pejerrey',     name: 'Прудовой пежерей',     rarity: 'common',    baseValue: 12,  minWeight: 0.3, maxWeight: 1.5,   depthMin: 0,  depthMax: 3,  preferredBait: 'bread',    biomeLevels: [],      strugglePower: 1,  horizontalSpeed: 1.0, uniqueTrait: 'Только личный пруд, стайный',      isPond: true,  pondGrowthPerHour: 0.2,  iconPath: '/assets/images/fish/pond_pejerrey.png',     color3D: 0xaed6f1 },
];

// ===== Старая база (legacy, 36 видов для обратной совместимости) =====
export const fishDatabase: FishSpecies[] = [
  { id: 'perch',       name: 'Окунь',             emoji: '🐟', minWeight: 0.2,   maxWeight: 1.5,    baseValuePerKg: 12,  baseValue: 12,  rarity: 'common',    unlockedAtLevel: 1,  color3D: 0x27ae60, depthMin: 1, depthMax: 5, preferredBait: 'lure', biomeLevels: [1], strugglePower: 3, horizontalSpeed: 1.5, uniqueTrait: 'Быстрый', isPond: true, pondGrowthPerHour: 0.2, iconPath: '/assets/images/fish/perch.png' },
  { id: 'carp',        name: 'Карп',               emoji: '🐟', minWeight: 1.0,   maxWeight: 5.0,    baseValuePerKg: 18,  baseValue: 18,  rarity: 'common',    unlockedAtLevel: 1,  color3D: 0xf39c12, depthMin: 1, depthMax: 4, preferredBait: 'worm', biomeLevels: [1], strugglePower: 2, horizontalSpeed: 0.6, uniqueTrait: 'Медленный', isPond: true, pondGrowthPerHour: 0.3, iconPath: '/assets/images/fish/carp.png' },
  { id: 'roach',       name: 'Плотва',             emoji: '🐟', minWeight: 0.1,   maxWeight: 0.8,    baseValuePerKg: 8,   baseValue: 8,   rarity: 'common',    unlockedAtLevel: 1,  color3D: 0x95a5a6, depthMin: 0, depthMax: 3, preferredBait: 'bread', biomeLevels: [1], strugglePower: 1, horizontalSpeed: 1.0, uniqueTrait: 'Стайная', isPond: true, pondGrowthPerHour: 0.1, iconPath: '/assets/images/fish/roach.png' },
  { id: 'ruffe',       name: 'Ёрш',                emoji: '🐟', minWeight: 0.05,  maxWeight: 0.3,    baseValuePerKg: 6,   baseValue: 6,   rarity: 'common',    unlockedAtLevel: 1,  color3D: 0x8e44ad, depthMin: 1, depthMax: 4, preferredBait: 'worm', biomeLevels: [1], strugglePower: 1, horizontalSpeed: 0.8, uniqueTrait: 'Маленький', isPond: true, pondGrowthPerHour: 0.05, iconPath: '/assets/images/fish/ruffe.png' },
  { id: 'pike',        name: 'Щука',               emoji: '🐟', minWeight: 2.0,   maxWeight: 8.0,    baseValuePerKg: 35,  baseValue: 35,  rarity: 'rare',      unlockedAtLevel: 2,  color3D: 0x2c3e50, depthMin: 1, depthMax: 5, preferredBait: 'lure', biomeLevels: [1,2], strugglePower: 7, horizontalSpeed: 2.0, uniqueTrait: 'Хищник', isPond: false, pondGrowthPerHour: 0, iconPath: '/assets/images/fish/pike.png' },
  { id: 'trout',       name: 'Форель',              emoji: '🐟', minWeight: 0.3,   maxWeight: 3.0,    baseValuePerKg: 45,  baseValue: 45,  rarity: 'rare',      unlockedAtLevel: 2,  color3D: 0xe74c3c, depthMin: 3, depthMax: 8, preferredBait: 'moth', biomeLevels: [2], strugglePower: 5, horizontalSpeed: 1.5, uniqueTrait: 'Прыжки', isPond: true, pondGrowthPerHour: 0.3, iconPath: '/assets/images/fish/trout.png' },
  { id: 'bream',       name: 'Лещ',                emoji: '🐟', minWeight: 0.5,   maxWeight: 4.0,    baseValuePerKg: 22,  baseValue: 22,  rarity: 'common',    unlockedAtLevel: 2,  color3D: 0xd35400, depthMin: 2, depthMax: 6, preferredBait: 'bread', biomeLevels: [1,2], strugglePower: 3, horizontalSpeed: 0.8, uniqueTrait: 'Осторожный', isPond: true, pondGrowthPerHour: 0.2, iconPath: '/assets/images/fish/bream.png' },
];

// ===== ТАБЛИЦА БАЛАНСА 10 УРОВНЕЙ (legacy) =====
export interface LevelData {
  id: number;
  region: string;
  name: string;
  targetValue: number;
  rewardGems: number;
  unlocksFish: string[];
  bgColor: number;
  waterColor: number;
}

export const levelBalance: LevelData[] = [
  { id: 1,  region: 'europe',     name: 'Озеро Европы',    targetValue: 120,   rewardGems: 30,   unlocksFish: ['perch','carp','roach','ruffe'],                              bgColor: 0x87CEEB, waterColor: 0x3498db },
  { id: 2,  region: 'europe',     name: 'Река Европы',     targetValue: 280,   rewardGems: 50,   unlocksFish: ['pike','trout','bream'],                                      bgColor: 0x76b5c5, waterColor: 0x2980b9 },
  { id: 3,  region: 'asia',       name: 'Озеро Азии',      targetValue: 520,   rewardGems: 80,   unlocksFish: ['koi','grass_carp','mandarin'],                               bgColor: 0xc8a165, waterColor: 0x16a085 },
  { id: 4,  region: 'asia',       name: 'Море Азии',       targetValue: 850,   rewardGems: 100,  unlocksFish: ['catfish','eel','puffer'],                                    bgColor: 0x1a6b8a, waterColor: 0x0e4d6b },
  { id: 5,  region: 'africa',     name: 'Озеро Африки',    targetValue: 1300,  rewardGems: 150,  unlocksFish: ['tilapia','nile_perch','afr_catfish','lungfish'],              bgColor: 0xd4a017, waterColor: 0x2ecc71 },
  { id: 6,  region: 'africa',     name: 'Река Африки',     targetValue: 1900,  rewardGems: 200,  unlocksFish: ['tigerfish','vundu','yellowfish'],                            bgColor: 0xc0392b, waterColor: 0x117a65 },
  { id: 7,  region: 'america',    name: 'Море Америки',    targetValue: 2900,  rewardGems: 250,  unlocksFish: ['bass','snapper','tarpon','sailfish'],                        bgColor: 0x1abc9c, waterColor: 0x0e6655 },
  { id: 8,  region: 'america',    name: 'Океан Америки',   targetValue: 4300,  rewardGems: 300,  unlocksFish: ['tuna','mahi','grouper'],                                     bgColor: 0x1a3a5c, waterColor: 0x1b4f72 },
  { id: 9,  region: 'australia',  name: 'Озеро Австралии', targetValue: 6200,  rewardGems: 400,  unlocksFish: ['barramundi','murray_cod','gold_perch'],                      bgColor: 0xe8b86d, waterColor: 0x27ae60 },
  { id: 10, region: 'deep_ocean', name: 'Глубокий Океан',  targetValue: 11000, rewardGems: 1000, unlocksFish: ['marlin','swordfish','giant_squid','whale_shark','oarfish','anglerfish'], bgColor: 0x0a0a1a, waterColor: 0x0d1b2a },
];

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

/** Получить рыб Аргентины по уровню биома */
export const getFishByBiomeLevel = (biomeLevel: number): FishConfig[] =>
  argentineFishDatabase.filter(f => f.biomeLevels.includes(biomeLevel));

/** Получить рыб для пруда */
export const getPondFish = (): FishConfig[] =>
  argentineFishDatabase.filter(f => f.isPond);

/** Случайная рыба для биома с учётом rarity */
export const getRandomFishForBiome = (biomeLevel: number): FishConfig => {
  const pool = getFishByBiomeLevel(biomeLevel);
  if (pool.length === 0) return argentineFishDatabase[0];

  const rand = Math.random();
  const legendary = pool.filter(f => f.rarity === 'legendary');
  const epic      = pool.filter(f => f.rarity === 'epic');
  const rare      = pool.filter(f => f.rarity === 'rare');
  const uncommon  = pool.filter(f => f.rarity === 'uncommon');
  const common    = pool.filter(f => f.rarity === 'common');
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  if (rand > 0.99 && legendary.length > 0) return pick(legendary);
  if (rand > 0.85 && epic.length > 0)      return pick(epic);
  if (rand > 0.70 && rare.length > 0)      return pick(rare);
  if (rand > 0.50 && uncommon.length > 0)   return pick(uncommon);
  return common.length > 0 ? pick(common) : pool[0];
};

// Legacy-совместимые функции
export const getAvailableFish = (level: number): FishSpecies[] =>
  fishDatabase.filter(f => f.unlockedAtLevel <= level);

export const getRandomFishForLevel = (level: number): FishSpecies => {
  const pool = getAvailableFish(level);
  const rand = Math.random();
  const legendary = pool.filter(f => f.rarity === 'legendary');
  const epic      = pool.filter(f => f.rarity === 'epic');
  const rare      = pool.filter(f => f.rarity === 'rare');
  const common    = pool.filter(f => f.rarity === 'common');
  const pick = (arr: FishSpecies[]): FishSpecies => arr[Math.floor(Math.random() * arr.length)];

  if (rand > 0.98 && legendary.length > 0) return pick(legendary);
  if (rand > 0.90 && epic.length > 0)      return pick(epic);
  if (rand > 0.65 && rare.length > 0)      return pick(rare);
  return common.length > 0 ? pick(common) : pool[0];
};

export const getFishById = (id: string): FishConfig | FishSpecies | undefined =>
  argentineFishDatabase.find(f => f.id === id) ?? fishDatabase.find(f => f.id === id);

export const RARITY_COLORS: Record<string, string> = {
  common:    '#95a5a6',
  uncommon:  '#3498db',
  rare:      '#9b59b6',
  epic:      '#e74c3c',
  legendary: '#f39c12',
};

export const RARITY_NAMES: Record<string, string> = {
  common:    'Обычная',
  uncommon:  'Необычная',
  rare:      'Редкая',
  epic:      'Эпическая',
  legendary: 'Легендарная',
};
