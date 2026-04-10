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
