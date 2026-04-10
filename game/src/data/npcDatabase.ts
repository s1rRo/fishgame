// ============================================================
// NPC DATABASE — 12 именованных NPC
// Из тз/11_GAME_CONFIGS.md раздел 6
// ============================================================

import { NPCRarity } from '../models/NPC';

export interface NPCDefinition {
  id: string;
  name: string;
  rarity: NPCRarity;
  dropChance: number;
  basePrice: number;              // gems (0 = не продаётся)
  baseCarryCapacity: number;      // кг
  baseGatherSpeed: number;        // ед/мин
  predisposition: {
    fish: number;
    wood: number;
    stone: number;
    herb: number;
    mineral: number;
  };
  maxLevel: number;
  trainingCostPerLevel: number;   // softCoins
  trainingTimeHours: number;
  avatarMeshColor: number;        // THREE.Color hex
  dialogueLines: string[];
  seasonalOnly: boolean;
  availableSeasons?: number[];
}

export const NPC_DATABASE: NPCDefinition[] = [
  {
    id: 'npc_alejandro',
    name: 'Алехандро',
    rarity: 'common',
    dropChance: 0.60,
    basePrice: 50,
    baseCarryCapacity: 25,
    baseGatherSpeed: 3.0,
    predisposition: { fish: 42, wood: 55, stone: 40, herb: 30, mineral: 25 },
    maxLevel: 10,
    trainingCostPerLevel: 200,
    trainingTimeHours: 2,
    avatarMeshColor: 0xd4a07a,
    dialogueLines: ['¡Hola! Готов к работе!', 'Дай мне топор — срублю всё!', 'Универсал — моё второе имя.'],
    seasonalOnly: false,
  },
  {
    id: 'npc_maria',
    name: 'Мария',
    rarity: 'uncommon',
    dropChance: 0.25,
    basePrice: 150,
    baseCarryCapacity: 35,
    baseGatherSpeed: 4.5,
    predisposition: { fish: 62, wood: 45, stone: 35, herb: 65, mineral: 20 },
    maxLevel: 15,
    trainingCostPerLevel: 400,
    trainingTimeHours: 4,
    avatarMeshColor: 0xe8b87a,
    dialogueLines: ['Рыба сама идёт ко мне!', 'Знаю каждую травку в пампасах.', 'Дай мне удочку — и увидишь чудо.'],
    seasonalOnly: false,
  },
  {
    id: 'npc_carlos',
    name: 'Карлос',
    rarity: 'common',
    dropChance: 0.60,
    basePrice: 50,
    baseCarryCapacity: 25,
    baseGatherSpeed: 3.0,
    predisposition: { fish: 35, wood: 70, stone: 60, herb: 25, mineral: 45 },
    maxLevel: 10,
    trainingCostPerLevel: 200,
    trainingTimeHours: 2,
    avatarMeshColor: 0xa0785a,
    dialogueLines: ['Строю быстрее всех!', 'Камень и дерево — мои друзья.', 'Дом построю за один день!'],
    seasonalOnly: false,
  },
  {
    id: 'npc_rosa',
    name: 'Роса',
    rarity: 'common',
    dropChance: 0.60,
    basePrice: 50,
    baseCarryCapacity: 25,
    baseGatherSpeed: 3.0,
    predisposition: { fish: 55, wood: 40, stone: 30, herb: 55, mineral: 20 },
    maxLevel: 10,
    trainingCostPerLevel: 200,
    trainingTimeHours: 2,
    avatarMeshColor: 0xf0c080,
    dialogueLines: ['Люблю утреннюю рыбалку!', 'Тишина реки — лучшая музыка.', 'Сегодня поймаем большую!'],
    seasonalOnly: false,
  },
  {
    id: 'npc_pedro',
    name: 'Педро',
    rarity: 'uncommon',
    dropChance: 0.25,
    basePrice: 150,
    baseCarryCapacity: 35,
    baseGatherSpeed: 4.5,
    predisposition: { fish: 45, wood: 65, stone: 55, herb: 35, mineral: 50 },
    maxLevel: 15,
    trainingCostPerLevel: 400,
    trainingTimeHours: 4,
    avatarMeshColor: 0xc49870,
    dialogueLines: ['Руда и камень — моя стихия!', 'Найду любое месторождение.', 'Лучший добытчик в деревне!'],
    seasonalOnly: false,
  },
  {
    id: 'npc_lucia',
    name: 'Лусия',
    rarity: 'rare',
    dropChance: 0.10,
    basePrice: 400,
    baseCarryCapacity: 50,
    baseGatherSpeed: 6.5,
    predisposition: { fish: 75, wood: 50, stone: 40, herb: 80, mineral: 30 },
    maxLevel: 20,
    trainingCostPerLevel: 800,
    trainingTimeHours: 6,
    avatarMeshColor: 0xf0d0a0,
    dialogueLines: ['Мастер-рыбак к вашим услугам!', 'Чую рыбу за километр.', 'Легендарный улов — мой стиль.'],
    seasonalOnly: false,
  },
  {
    id: 'npc_jorge',
    name: 'Хорхе',
    rarity: 'rare',
    dropChance: 0.10,
    basePrice: 400,
    baseCarryCapacity: 50,
    baseGatherSpeed: 6.5,
    predisposition: { fish: 50, wood: 80, stone: 75, herb: 40, mineral: 65 },
    maxLevel: 20,
    trainingCostPerLevel: 800,
    trainingTimeHours: 6,
    avatarMeshColor: 0x8B6914,
    dialogueLines: ['Построю что угодно!', 'Камень поддаётся моим рукам.', 'Мастер-строитель — это я.'],
    seasonalOnly: false,
  },
  {
    id: 'npc_elena',
    name: 'Елена',
    rarity: 'epic',
    dropChance: 0.04,
    basePrice: 1000,
    baseCarryCapacity: 75,
    baseGatherSpeed: 10.0,
    predisposition: { fish: 85, wood: 60, stone: 55, herb: 90, mineral: 45 },
    maxLevel: 25,
    trainingCostPerLevel: 2000,
    trainingTimeHours: 8,
    avatarMeshColor: 0xffd700,
    dialogueLines: ['Легенда рыбалки здесь!', 'Ни одна рыба не уйдёт.', 'Травы и рыба — моя жизнь.'],
    seasonalOnly: false,
  },
  {
    id: 'npc_tomas',
    name: 'Томас',
    rarity: 'epic',
    dropChance: 0.04,
    basePrice: 1000,
    baseCarryCapacity: 75,
    baseGatherSpeed: 10.0,
    predisposition: { fish: 65, wood: 90, stone: 85, herb: 50, mineral: 80 },
    maxLevel: 25,
    trainingCostPerLevel: 2000,
    trainingTimeHours: 8,
    avatarMeshColor: 0xb8860b,
    dialogueLines: ['Архитектор Томас к услугам!', 'Любое здание — за полцены.', 'Руда? Камень? Без проблем!'],
    seasonalOnly: false,
  },
  {
    id: 'npc_spirit_river',
    name: 'Дух реки',
    rarity: 'legendary',
    dropChance: 0.01,
    basePrice: 0, // не продаётся
    baseCarryCapacity: 120,
    baseGatherSpeed: 18.0,
    predisposition: { fish: 95, wood: 70, stone: 60, herb: 95, mineral: 70 },
    maxLevel: 30,
    trainingCostPerLevel: 5000,
    trainingTimeHours: 12,
    avatarMeshColor: 0x00bfff,
    dialogueLines: ['Река говорит со мной...', 'Я — часть воды и земли.', 'Легендарная сила течёт во мне.'],
    seasonalOnly: false,
  },
  {
    id: 'npc_season_1',
    name: 'Гаучо Мигель',
    rarity: 'rare',
    dropChance: 0.10,
    basePrice: 400,
    baseCarryCapacity: 50,
    baseGatherSpeed: 6.5,
    predisposition: { fish: 60, wood: 70, stone: 55, herb: 50, mineral: 40 },
    maxLevel: 20,
    trainingCostPerLevel: 800,
    trainingTimeHours: 6,
    avatarMeshColor: 0x8B4513,
    dialogueLines: ['Гаучо никогда не сдаётся!', 'Пампасы — мой дом.', 'Сезонный работник — но лучший!'],
    seasonalOnly: true,
    availableSeasons: [1, 3],
  },
  {
    id: 'npc_season_2',
    name: 'Шаманка Инти',
    rarity: 'epic',
    dropChance: 0.04,
    basePrice: 1000,
    baseCarryCapacity: 75,
    baseGatherSpeed: 10.0,
    predisposition: { fish: 80, wood: 55, stone: 50, herb: 85, mineral: 60 },
    maxLevel: 25,
    trainingCostPerLevel: 2000,
    trainingTimeHours: 8,
    avatarMeshColor: 0x9b59b6,
    dialogueLines: ['Духи предков ведут меня.', 'Вижу рыбу сквозь воду.', 'Сезон щедрости пришёл!'],
    seasonalOnly: true,
    availableSeasons: [2, 4],
  },
];

/** Получить NPC по id */
export const getNPCById = (id: string): NPCDefinition | undefined =>
  NPC_DATABASE.find((n) => n.id === id);

/** Получить всех NPC определённой редкости */
export const getNPCsByRarity = (rarity: NPCRarity): NPCDefinition[] =>
  NPC_DATABASE.filter((n) => n.rarity === rarity);

/** Получить только несезонных NPC */
export const getPermanentNPCs = (): NPCDefinition[] =>
  NPC_DATABASE.filter((n) => !n.seasonalOnly);
