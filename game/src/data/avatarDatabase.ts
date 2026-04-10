// ============================================================
// АВАТАРЫ + СКИНЫ УДОЧЕК — из тз/11_GAME_CONFIGS.md раздел 8
// ============================================================

export interface AvatarConfig {
  id: string;
  name: string;
  description: string;
  bodyColor: number;
  shirtColor: number;
  hatType: 'none' | 'cap' | 'sombrero' | 'bandana' | 'crown';
  hatColor: number;
  isDefault: boolean;
  unlockType: 'free' | 'gems' | 'season_pass' | 'achievement';
  unlockValue: number;
  rodSkinId: string;
}

export interface RodSkinConfig {
  id: string;
  name: string;
  description: string;
  visual: string;
  meshColor: number;
  unlockType: 'free' | 'gems' | 'season_pass' | 'achievement';
  unlockValue: number;
}

export const AVATAR_DATABASE: AvatarConfig[] = [
  { id: 'avatar_default_m', name: 'Рыбак',     description: 'Стартовый мужской',    bodyColor: 0xf0c080, shirtColor: 0x2471a3, hatType: 'cap',      hatColor: 0x2471a3, isDefault: true,  unlockType: 'free',         unlockValue: 0,   rodSkinId: 'rod_basic' },
  { id: 'avatar_default_f', name: 'Рыбачка',    description: 'Стартовый женский',    bodyColor: 0xe8b87a, shirtColor: 0x1e8449, hatType: 'bandana',  hatColor: 0x1e8449, isDefault: true,  unlockType: 'free',         unlockValue: 0,   rodSkinId: 'rod_basic' },
  { id: 'avatar_cowboy',    name: 'Ковбой',      description: 'Патагонский ковбой',   bodyColor: 0xd4a07a, shirtColor: 0x8b4513, hatType: 'sombrero', hatColor: 0x8b4513, isDefault: false, unlockType: 'gems',         unlockValue: 150, rodSkinId: 'rod_steel' },
  { id: 'avatar_nomad',     name: 'Кочевник',    description: 'Странник пампасов',    bodyColor: 0xa0785a, shirtColor: 0x5d4037, hatType: 'bandana',  hatColor: 0x5d4037, isDefault: false, unlockType: 'season_pass',  unlockValue: 15,  rodSkinId: 'rod_steel' },
  { id: 'avatar_lord',      name: 'River Lord',  description: 'Легендарный рыбак',    bodyColor: 0xf0d0a0, shirtColor: 0x4a148c, hatType: 'crown',    hatColor: 0xffd700, isDefault: false, unlockType: 'achievement',  unlockValue: 0,   rodSkinId: 'rod_golden' },
];

export const ROD_SKIN_DATABASE: RodSkinConfig[] = [
  { id: 'rod_basic',   name: 'Бамбуковая',   description: 'Стартовая',          visual: 'CylinderGeo коричневый',                meshColor: 0x8b6914, unlockType: 'free',         unlockValue: 0  },
  { id: 'rod_steel',   name: 'Стальная',      description: 'Блестит на солнце',  visual: 'CylinderGeo металлик',                  meshColor: 0xb0b0b0, unlockType: 'gems',         unlockValue: 80 },
  { id: 'rod_golden',  name: 'Золотая',       description: 'Легендарная удочка', visual: 'CylinderGeo золотой + glow',            meshColor: 0xffd700, unlockType: 'season_pass',  unlockValue: 25 },
  { id: 'rod_crystal', name: 'Кристальная',   description: 'Редкая',             visual: 'CylinderGeo + OctahedronGeo кристалл',  meshColor: 0x88ddff, unlockType: 'achievement',  unlockValue: 0  },
];
