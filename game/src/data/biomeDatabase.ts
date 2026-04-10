// ============================================================
// BIOME DATABASE — 3 игровых биома Аргентины
// Данные из тз/11_GAME_CONFIGS.md секция 2
// ============================================================

export interface BiomeConfig {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  level: number;
  lat: { min: number; max: number };
  lon: { min: number; max: number };
  unlockCondition: { villageLevel: number; totalResources: number };
  maxVillages: number;
  territoryRadiusBase: number;
  respawnRateMin: number;
  checkpointsPerSession: number;
  waterColor: number;
  skyColor: number;
  fogDensity: number;
  ambientLightIntensity: number;
  markerColor: number;
  fishIds: string[];
  resourceIds: string[];
  seasonalEvents: string[];
  musicTrack: string;
}

export const BIOMES: BiomeConfig[] = [
  {
    id: 'rio_salado',
    name: 'Рио Саладо',
    nameEn: 'Río Salado',
    description: 'Спокойная равнинная река в самом сердце пампасов. Идеальное место для начинающих рыбаков — тёплая вода, обилие карпов и окуней.',
    level: 1,
    lat: { min: -34, max: -28 },
    lon: { min: -63, max: -58 },
    unlockCondition: { villageLevel: 1, totalResources: 0 },
    maxVillages: 5,
    territoryRadiusBase: 0.5,
    respawnRateMin: 2,
    checkpointsPerSession: 5,
    waterColor: 0x4a90b8,
    skyColor: 0x87ceeb,
    fogDensity: 0.02,
    ambientLightIntensity: 0.8,
    markerColor: 0x27ae60,
    fishIds: [
      'carp_common', 'perch_river', 'pejerrey_silver', 'catfish_small',
      'tararira', 'dorado_gold', 'catfish_velvet', 'pike_river',
      'boga_common', 'surubi',
    ],
    resourceIds: ['wood_oak', 'stone', 'worm', 'bread'],
    seasonalEvents: ['event_spawn', 'event_golden_week'],
    musicTrack: 'biome_l1',
  },
  {
    id: 'nahuel_huapi',
    name: 'Науэль-Уапи',
    nameEn: 'Nahuel Huapi',
    description: 'Горное озеро в Патагонских Андах. Чистейшая вода, форель и лососи — для опытных рыбаков.',
    level: 2,
    lat: { min: -42, max: -40 },
    lon: { min: -72, max: -70 },
    unlockCondition: { villageLevel: 5, totalResources: 1500 },
    maxVillages: 12,
    territoryRadiusBase: 0.4,
    respawnRateMin: 5,
    checkpointsPerSession: 6,
    waterColor: 0x2980b9,
    skyColor: 0x6baed6,
    fogDensity: 0.04,
    ambientLightIntensity: 0.6,
    markerColor: 0x3498db,
    fishIds: [
      'trout_rainbow', 'trout_brown', 'galaxias', 'perch_creole',
      'pike_patagon', 'goby_stream', 'carp_mirror', 'trout_lake',
      'silverside', 'landlocked_salmon', 'perca_trucha', 'catfish_patagon',
      'roach_patagonia', 'trout_tiger', 'goby_lake',
    ],
    resourceIds: ['wood_oak', 'wood_beech', 'stone', 'ore_iron', 'herb_patagonia', 'moth'],
    seasonalEvents: ['event_spawn', 'event_golden_week', 'event_spring_bloom'],
    musicTrack: 'biome_l2',
  },
  {
    id: 'lago_argentino',
    name: 'Лаго Архентино',
    nameEn: 'Lago Argentino',
    description: 'Ледниковое озеро на юге Патагонии. Суровые условия, редчайшие трофеи — только для мастеров.',
    level: 3,
    lat: { min: -52, max: -50 },
    lon: { min: -73, max: -71 },
    unlockCondition: { villageLevel: 12, totalResources: 8000 },
    maxVillages: 27,
    territoryRadiusBase: 0.3,
    respawnRateMin: 10,
    checkpointsPerSession: 8,
    waterColor: 0x1a6b8a,
    skyColor: 0x5b8fa8,
    fogDensity: 0.06,
    ambientLightIntensity: 0.5,
    markerColor: 0x9b59b6,
    fishIds: [
      'pejerrey_patagon', 'salmon_pacific', 'salmon_king', 'bass_sea',
      'trout_steelhead', 'salmon_coho', 'flounder_patagon', 'cusk_eel',
      'robalo', 'salmon_legendary',
    ],
    resourceIds: ['wood_beech', 'stone', 'ore_iron', 'herb_patagonia', 'fly_lure'],
    seasonalEvents: ['event_spawn', 'event_salmon_migration', 'event_spring_bloom'],
    musicTrack: 'biome_l3',
  },
];

/** Найти биом по id */
export function getBiomeById(id: string): BiomeConfig | undefined {
  return BIOMES.find(b => b.id === id);
}

// ============================================================
// FISHING LOCATIONS — 10 локаций на биом (озёра + реки)
// ============================================================

export interface FishingLocation {
  id: string;
  name: string;
  biomeId: string;
  type: 'lake' | 'river' | 'pond' | 'stream';
  lat: number;
  lon: number;
  /** Подмножество fishIds биома, доступных в этой локации */
  fishSubset: string[];
  /** Модификатор сложности (1.0 = стандарт, 1.5 = сложнее) */
  difficulty: number;
  /** Краткое описание */
  description: string;
}

export const FISHING_LOCATIONS: FishingLocation[] = [
  // ── Биом 1: Río Salado (10 озёр/рек) ───────────────────
  {
    id: 'rs_spot_1', name: 'Излучина Саладо', biomeId: 'rio_salado', type: 'river',
    lat: -35.5, lon: -63.2, difficulty: 1.0,
    fishSubset: ['carp_common', 'perch_river', 'pejerrey_silver', 'catfish_small'],
    description: 'Тихая излучина реки, идеальна для начинающих.',
  },
  {
    id: 'rs_spot_2', name: 'Пруд Пампасов', biomeId: 'rio_salado', type: 'pond',
    lat: -34.8, lon: -62.5, difficulty: 0.8,
    fishSubset: ['carp_common', 'boga_common', 'catfish_small'],
    description: 'Маленький пруд у дороги. Много карпов.',
  },
  {
    id: 'rs_spot_3', name: 'Лагуна Мар Чикита', biomeId: 'rio_salado', type: 'lake',
    lat: -30.5, lon: -62.7, difficulty: 1.2,
    fishSubset: ['pejerrey_silver', 'tararira', 'dorado_gold', 'catfish_velvet'],
    description: 'Солоноватая лагуна — дом дорадо.',
  },
  {
    id: 'rs_spot_4', name: 'Устье Параны', biomeId: 'rio_salado', type: 'river',
    lat: -34.5, lon: -58.5, difficulty: 1.3,
    fishSubset: ['surubi', 'dorado_gold', 'pike_river', 'catfish_velvet'],
    description: 'Мощное течение, крупная рыба.',
  },
  {
    id: 'rs_spot_5', name: 'Тихая заводь', biomeId: 'rio_salado', type: 'pond',
    lat: -33.5, lon: -61.0, difficulty: 0.9,
    fishSubset: ['carp_common', 'perch_river', 'boga_common'],
    description: 'Спокойная заводь без течения.',
  },
  {
    id: 'rs_spot_6', name: 'Перекат Саладо', biomeId: 'rio_salado', type: 'river',
    lat: -36.0, lon: -63.8, difficulty: 1.1,
    fishSubset: ['tararira', 'pike_river', 'perch_river', 'pejerrey_silver'],
    description: 'Быстрое течение привлекает хищников.',
  },
  {
    id: 'rs_spot_7', name: 'Озеро Часкомус', biomeId: 'rio_salado', type: 'lake',
    lat: -35.6, lon: -58.0, difficulty: 1.0,
    fishSubset: ['pejerrey_silver', 'carp_common', 'perch_river', 'catfish_small'],
    description: 'Популярное рыбное озеро пампасов.',
  },
  {
    id: 'rs_spot_8', name: 'Речная дельта', biomeId: 'rio_salado', type: 'river',
    lat: -34.2, lon: -59.0, difficulty: 1.4,
    fishSubset: ['surubi', 'dorado_gold', 'catfish_velvet', 'pike_river'],
    description: 'Дельта Параны — трофейная зона.',
  },
  {
    id: 'rs_spot_9', name: 'Пруд Росарио', biomeId: 'rio_salado', type: 'pond',
    lat: -33.0, lon: -60.7, difficulty: 0.7,
    fishSubset: ['carp_common', 'boga_common'],
    description: 'Простой пруд, хорош для фарма.',
  },
  {
    id: 'rs_spot_10', name: 'Глубокая яма', biomeId: 'rio_salado', type: 'river',
    lat: -35.2, lon: -62.0, difficulty: 1.5,
    fishSubset: ['surubi', 'dorado_gold', 'tararira', 'pike_river'],
    description: 'Глубокая яма на дне реки — шанс на трофей.',
  },

  // ── Биом 2: Nahuel Huapi (10 озёр/рек) ─────────────────
  {
    id: 'nh_spot_1', name: 'Бухта Барилоче', biomeId: 'nahuel_huapi', type: 'lake',
    lat: -41.1, lon: -71.3, difficulty: 1.0,
    fishSubset: ['trout_rainbow', 'trout_brown', 'perch_creole', 'galaxias'],
    description: 'Живописная бухта озера Науэль-Уапи.',
  },
  {
    id: 'nh_spot_2', name: 'Озеро Гутиеррес', biomeId: 'nahuel_huapi', type: 'lake',
    lat: -41.2, lon: -71.4, difficulty: 1.2,
    fishSubset: ['trout_rainbow', 'trout_lake', 'silverside', 'landlocked_salmon'],
    description: 'Кристально чистое горное озеро.',
  },
  {
    id: 'nh_spot_3', name: 'Река Лимай', biomeId: 'nahuel_huapi', type: 'river',
    lat: -40.8, lon: -71.0, difficulty: 1.3,
    fishSubset: ['trout_brown', 'trout_tiger', 'pike_patagon', 'goby_stream'],
    description: 'Быстрая горная река с форелью.',
  },
  {
    id: 'nh_spot_4', name: 'Пролив Хуэмуль', biomeId: 'nahuel_huapi', type: 'lake',
    lat: -41.0, lon: -71.6, difficulty: 1.1,
    fishSubset: ['trout_rainbow', 'carp_mirror', 'perch_creole', 'goby_lake'],
    description: 'Узкий пролив между берегами.',
  },
  {
    id: 'nh_spot_5', name: 'Водопад Бланко', biomeId: 'nahuel_huapi', type: 'stream',
    lat: -41.3, lon: -71.5, difficulty: 1.5,
    fishSubset: ['trout_tiger', 'landlocked_salmon', 'perca_trucha'],
    description: 'У водопада — сильное течение, крупная форель.',
  },
  {
    id: 'nh_spot_6', name: 'Залив Лопес', biomeId: 'nahuel_huapi', type: 'lake',
    lat: -41.05, lon: -71.55, difficulty: 1.0,
    fishSubset: ['trout_rainbow', 'galaxias', 'silverside', 'goby_lake'],
    description: 'Защищённый залив с богатой ихтиофауной.',
  },
  {
    id: 'nh_spot_7', name: 'Ручей Серрано', biomeId: 'nahuel_huapi', type: 'stream',
    lat: -41.15, lon: -71.2, difficulty: 1.2,
    fishSubset: ['trout_brown', 'goby_stream', 'roach_patagonia'],
    description: 'Горный ручей среди лесов.',
  },
  {
    id: 'nh_spot_8', name: 'Остров Виктория', biomeId: 'nahuel_huapi', type: 'lake',
    lat: -40.95, lon: -71.55, difficulty: 1.4,
    fishSubset: ['landlocked_salmon', 'trout_lake', 'pike_patagon', 'catfish_patagon'],
    description: 'Глубокие воды вокруг острова.',
  },
  {
    id: 'nh_spot_9', name: 'Устье Кордон', biomeId: 'nahuel_huapi', type: 'river',
    lat: -40.7, lon: -70.8, difficulty: 1.1,
    fishSubset: ['trout_rainbow', 'trout_brown', 'perch_creole'],
    description: 'Место впадения ручья в озеро.',
  },
  {
    id: 'nh_spot_10', name: 'Глубина Науэль', biomeId: 'nahuel_huapi', type: 'lake',
    lat: -41.1, lon: -71.5, difficulty: 1.6,
    fishSubset: ['landlocked_salmon', 'trout_tiger', 'perca_trucha', 'catfish_patagon'],
    description: 'Самая глубокая точка озера — легенды о монстре.',
  },

  // ── Биом 3: Lago Argentino (10 озёр/рек) ───────────────
  {
    id: 'la_spot_1', name: 'Ледниковый берег', biomeId: 'lago_argentino', type: 'lake',
    lat: -50.3, lon: -72.3, difficulty: 1.2,
    fishSubset: ['pejerrey_patagon', 'trout_steelhead', 'salmon_pacific', 'bass_sea'],
    description: 'У подножия ледника Перито Морено.',
  },
  {
    id: 'la_spot_2', name: 'Канал Упсала', biomeId: 'lago_argentino', type: 'lake',
    lat: -49.9, lon: -72.8, difficulty: 1.5,
    fishSubset: ['salmon_king', 'salmon_coho', 'trout_steelhead', 'salmon_legendary'],
    description: 'Ледяные воды канала — лосось-чинук.',
  },
  {
    id: 'la_spot_3', name: 'Река Санта-Крус', biomeId: 'lago_argentino', type: 'river',
    lat: -50.1, lon: -71.0, difficulty: 1.3,
    fishSubset: ['salmon_pacific', 'trout_steelhead', 'robalo', 'flounder_patagon'],
    description: 'Мощная патагонская река.',
  },
  {
    id: 'la_spot_4', name: 'Озеро Вьедма', biomeId: 'lago_argentino', type: 'lake',
    lat: -49.5, lon: -72.0, difficulty: 1.4,
    fishSubset: ['salmon_coho', 'pejerrey_patagon', 'bass_sea', 'cusk_eel'],
    description: 'Второе по величине ледниковое озеро.',
  },
  {
    id: 'la_spot_5', name: 'Бухта Тихая', biomeId: 'lago_argentino', type: 'lake',
    lat: -50.4, lon: -72.5, difficulty: 1.1,
    fishSubset: ['pejerrey_patagon', 'bass_sea', 'flounder_patagon'],
    description: 'Защищённая от ветра бухта.',
  },
  {
    id: 'la_spot_6', name: 'Ледяной ручей', biomeId: 'lago_argentino', type: 'stream',
    lat: -50.0, lon: -72.6, difficulty: 1.6,
    fishSubset: ['salmon_king', 'salmon_legendary', 'trout_steelhead'],
    description: 'Талая вода ледника — самые редкие лососи.',
  },
  {
    id: 'la_spot_7', name: 'Мыс Патагонии', biomeId: 'lago_argentino', type: 'lake',
    lat: -50.5, lon: -72.2, difficulty: 1.3,
    fishSubset: ['robalo', 'bass_sea', 'flounder_patagon', 'cusk_eel'],
    description: 'Скалистый мыс на южном берегу.',
  },
  {
    id: 'la_spot_8', name: 'Устье Леона', biomeId: 'lago_argentino', type: 'river',
    lat: -50.2, lon: -72.0, difficulty: 1.2,
    fishSubset: ['salmon_pacific', 'pejerrey_patagon', 'trout_steelhead'],
    description: 'Место впадения реки в озеро.',
  },
  {
    id: 'la_spot_9', name: 'Глубина Архентино', biomeId: 'lago_argentino', type: 'lake',
    lat: -50.2, lon: -72.5, difficulty: 1.8,
    fishSubset: ['salmon_legendary', 'salmon_king', 'cusk_eel'],
    description: 'Глубочайшая точка — шанс на легендарного лосося.',
  },
  {
    id: 'la_spot_10', name: 'Лагуна Нимез', biomeId: 'lago_argentino', type: 'pond',
    lat: -50.3, lon: -72.1, difficulty: 0.9,
    fishSubset: ['pejerrey_patagon', 'flounder_patagon'],
    description: 'Маленькая лагуна у города — лёгкий фарм.',
  },
];

/** Локации по биому */
export function getFishingLocations(biomeId: string): FishingLocation[] {
  return FISHING_LOCATIONS.filter(l => l.biomeId === biomeId);
}

/** Найти локацию по id */
export function getFishingLocationById(id: string): FishingLocation | undefined {
  return FISHING_LOCATIONS.find(l => l.id === id);
}
