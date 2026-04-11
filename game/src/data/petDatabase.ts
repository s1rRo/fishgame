// ============================================================
// PET DATABASE — 8 питомцев
// Из тз/11_GAME_CONFIGS.md раздел 7
// ============================================================

export type PetBonusType = 'gather_speed' | 'carry_capacity' | 'fish_chance' | 'all';
export type PetRarity = 'Common' | 'Rare' | 'Epic';

export interface PetDefinition {
  id: string;
  name: string;
  emoji: string;
  rarity: PetRarity;
  baseBonus: number;                // % бонус к NPC
  bonusType: PetBonusType;
  basePrice: number;                // gems
  feedingRequirement: number;       // ресурсов/сутки
  affiliationDecayPerHour: number;  // -points/час без кормления
  affiliationGainPerFeed: number;   // +points за кормление
  maxAffiliation: number;
  maxLevel: number;
  howToGet: 'shop' | 'lootbox' | 'season_pass' | 'rare_event';
  meshColor: number;                // THREE.Color hex для 3D
  iconPath: string;                 // PNG icon path
}

export const PET_DATABASE: PetDefinition[] = [
  {
    id: 'pet_parrot', name: 'Попугай', emoji: '🦜', rarity: 'Common',
    baseBonus: 15, bonusType: 'all', basePrice: 30,
    feedingRequirement: 5, affiliationDecayPerHour: 4, affiliationGainPerFeed: 20,
    maxAffiliation: 100, maxLevel: 10, howToGet: 'shop', meshColor: 0x27ae60,
    iconPath: '/assets/images/pets/pet_01.png',
  },
  {
    id: 'pet_otter', name: 'Выдра', emoji: '🦦', rarity: 'Common',
    baseBonus: 20, bonusType: 'fish_chance', basePrice: 35,
    feedingRequirement: 5, affiliationDecayPerHour: 4, affiliationGainPerFeed: 20,
    maxAffiliation: 100, maxLevel: 10, howToGet: 'shop', meshColor: 0x8B4513,
    iconPath: '/assets/images/pets/pet_02.png',
  },
  {
    id: 'pet_armadillo', name: 'Броненосец', emoji: '🦔', rarity: 'Common',
    baseBonus: 18, bonusType: 'carry_capacity', basePrice: 30,
    feedingRequirement: 4, affiliationDecayPerHour: 3, affiliationGainPerFeed: 18,
    maxAffiliation: 100, maxLevel: 10, howToGet: 'shop', meshColor: 0x808080,
    iconPath: '/assets/images/pets/pet_03.png',
  },
  {
    id: 'pet_flamingo', name: 'Фламинго', emoji: '🦩', rarity: 'Rare',
    baseBonus: 32, bonusType: 'gather_speed', basePrice: 100,
    feedingRequirement: 8, affiliationDecayPerHour: 6, affiliationGainPerFeed: 25,
    maxAffiliation: 150, maxLevel: 15, howToGet: 'season_pass', meshColor: 0xff69b4,
    iconPath: '/assets/images/pets/pet_04.png',
  },
  {
    id: 'pet_condor', name: 'Кондор', emoji: '🦅', rarity: 'Rare',
    baseBonus: 35, bonusType: 'all', basePrice: 120,
    feedingRequirement: 8, affiliationDecayPerHour: 6, affiliationGainPerFeed: 25,
    maxAffiliation: 150, maxLevel: 15, howToGet: 'rare_event', meshColor: 0x2c3e50,
    iconPath: '/assets/images/pets/pet_05.png',
  },
  {
    id: 'pet_capybara', name: 'Капибара', emoji: '🐾', rarity: 'Rare',
    baseBonus: 28, bonusType: 'all', basePrice: 100,
    feedingRequirement: 6, affiliationDecayPerHour: 5, affiliationGainPerFeed: 22,
    maxAffiliation: 150, maxLevel: 15, howToGet: 'season_pass', meshColor: 0xd2691e,
    iconPath: '/assets/images/pets/pet_06.png',
  },
  {
    id: 'pet_jaguar', name: 'Ягуар', emoji: '🐆', rarity: 'Epic',
    baseBonus: 60, bonusType: 'fish_chance', basePrice: 250,
    feedingRequirement: 12, affiliationDecayPerHour: 8, affiliationGainPerFeed: 30,
    maxAffiliation: 200, maxLevel: 20, howToGet: 'rare_event', meshColor: 0xf39c12,
    iconPath: '/assets/images/pets/pet_07.png',
  },
  {
    id: 'pet_anaconda', name: 'Анаконда', emoji: '🐍', rarity: 'Epic',
    baseBonus: 55, bonusType: 'carry_capacity', basePrice: 250,
    feedingRequirement: 15, affiliationDecayPerHour: 10, affiliationGainPerFeed: 35,
    maxAffiliation: 200, maxLevel: 20, howToGet: 'season_pass', meshColor: 0x2ecc71,
    iconPath: '/assets/images/pets/pet_08.png',
  },
  {
    id: 'pet_penguin', name: 'Пингвин-ледниковый', emoji: '🐧', rarity: 'Rare',
    baseBonus: 22, bonusType: 'fish_chance', basePrice: 55,
    feedingRequirement: 8, affiliationDecayPerHour: 4, affiliationGainPerFeed: 20,
    maxAffiliation: 150, maxLevel: 15, howToGet: 'rare_event', meshColor: 0x2c3e50,
    iconPath: '/assets/images/pets/pet_09.png',
  },
];

/** Получить питомца по id */
export const getPetById = (id: string): PetDefinition | undefined =>
  PET_DATABASE.find((p) => p.id === id);

/** Формула бонуса питомца: 1 + (level × 0.08) + (rarityBonus × 0.15) */
export const calcPetBonus = (pet: PetDefinition, level: number): number => {
  const rarityMult = pet.rarity === 'Epic' ? 3 : pet.rarity === 'Rare' ? 2 : 1;
  return 1 + (level * 0.08) + (rarityMult * 0.15);
};
