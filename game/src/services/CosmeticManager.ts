// ============================================================
// COSMETIC MANAGER — Задача №9
// Магазин косметики: скины удочек, лодок, зданий, NPC
// ============================================================
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase-config';
import { DatabaseService } from './DatabaseService';

export type CosmeticType = 'rod' | 'boat' | 'house' | 'smokehouse' | 'dock' | 'npcFisher1' | 'tree';

export interface CosmeticItem {
  id: string;
  type: CosmeticType;
  name: string;
  description: string;
  price: number; // в Gems
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color3D: number;  // цвет voxel-версии для 3D-превью
  emoji: string;
}

// Статический каталог — 15 скинов
export const COSMETICS_CATALOG: CosmeticItem[] = [
  // УДОЧКИ (8 шт — по числу ассетов rod_1..rod_8)
  { id: 'rod_golden',    type: 'rod', name: 'Золотая удочка',    description: '+Блеск на воде',     price: 150, rarity: 'rare',      color3D: 0xf1c40f, emoji: '🎣' },
  { id: 'rod_neon',      type: 'rod', name: 'Неоновая удочка',   description: 'Светится в ночи',    price: 200, rarity: 'epic',      color3D: 0x00ff88, emoji: '🎣' },
  { id: 'rod_pirate',    type: 'rod', name: 'Пиратская удочка',  description: 'Кость пирата',       price: 100, rarity: 'common',    color3D: 0x2c3e50, emoji: '🎣' },
  { id: 'rod_bamboo',    type: 'rod', name: 'Бамбуковая удочка', description: 'Лёгкая и гибкая',    price: 80,  rarity: 'common',    color3D: 0x27ae60, emoji: '🎣' },
  { id: 'rod_ice',       type: 'rod', name: 'Ледяная удочка',    description: 'Для зимней рыбалки', price: 180, rarity: 'rare',      color3D: 0x74b9ff, emoji: '🎣' },
  { id: 'rod_fire',      type: 'rod', name: 'Огненная удочка',   description: 'Горит ярко',         price: 250, rarity: 'epic',      color3D: 0xe74c3c, emoji: '🎣' },
  { id: 'rod_crystal',   type: 'rod', name: 'Кристальная удочка',description: 'Из чистого кварца',  price: 350, rarity: 'legendary', color3D: 0x9b59b6, emoji: '🎣' },
  { id: 'rod_shadow',    type: 'rod', name: 'Теневая удочка',    description: 'Невидимая леска',    price: 300, rarity: 'epic',      color3D: 0x34495e, emoji: '🎣' },
  // ЛОДКИ (7 шт — по числу ассетов ship_1..ship_7)
  { id: 'boat_pirate',   type: 'boat', name: 'Пиратская лодка',   description: 'Гроза морей',       price: 200, rarity: 'rare',      color3D: 0x2c3e50, emoji: '⛵' },
  { id: 'boat_neon',     type: 'boat', name: 'Неоновый катер',    description: 'Светится ночью',    price: 300, rarity: 'epic',      color3D: 0x00eaff, emoji: '🚤' },
  { id: 'boat_royal',    type: 'boat', name: 'Королевская ладья', description: 'Для лорда реки',    price: 500, rarity: 'legendary', color3D: 0xf39c12, emoji: '👑' },
  { id: 'boat_fishing',  type: 'boat', name: 'Рыбацкая шхуна',   description: 'Много места',       price: 120, rarity: 'common',    color3D: 0x8B4513, emoji: '🚣' },
  { id: 'boat_steam',    type: 'boat', name: 'Паровой катер',     description: 'Стимпанк мотор',    price: 350, rarity: 'epic',      color3D: 0x7f8c8d, emoji: '🚢' },
  { id: 'boat_ice',      type: 'boat', name: 'Ледокол',           description: 'Ломает лёд',        price: 280, rarity: 'rare',      color3D: 0x5dade2, emoji: '🧊' },
  { id: 'boat_dragon',   type: 'boat', name: 'Драконья ладья',    description: 'Викинг-стиль',      price: 450, rarity: 'legendary', color3D: 0xe74c3c, emoji: '🐉' },
  // ДОМА
  { id: 'house_crystal', type: 'house',     name: 'Хрустальный дом',   description: 'Прозрачные стены', price: 250, rarity: 'epic',     color3D: 0x74b9ff, emoji: '🏠' },
  { id: 'house_bamboo',  type: 'house',     name: 'Бамбуковый дом',    description: 'Азиатский стиль',  price: 150, rarity: 'rare',     color3D: 0x27ae60, emoji: '🏮' },
  // КОПТИЛЬНИ
  { id: 'smoke_volcano', type: 'smokehouse', name: 'Вулкан-коптильня', description: 'Извергает дым',   price: 180, rarity: 'rare',      color3D: 0xe74c3c, emoji: '🌋' },
  { id: 'smoke_steam',   type: 'smokehouse', name: 'Паровая коптильня', description: 'Стимпанк-стиль', price: 220, rarity: 'epic',      color3D: 0x7f8c8d, emoji: '⚙️' },
  // ДОКИ
  { id: 'dock_golden',   type: 'dock',      name: 'Золотой причал',    description: 'Блестит на солнце', price: 200, rarity: 'rare',    color3D: 0xf1c40f, emoji: '⚓' },
  { id: 'dock_neon',     type: 'dock',      name: 'Неоновый причал',   description: 'Ночной рейв',     price: 280, rarity: 'epic',      color3D: 0x9b59b6, emoji: '🌉' },
  // NPC РЫБАК
  { id: 'npc_ninja',     type: 'npcFisher1', name: 'Рыбак-Ниндзя',    description: 'Бесшумный улов',  price: 350, rarity: 'epic',      color3D: 0x2c3e50, emoji: '🥷' },
  { id: 'npc_robot',     type: 'npcFisher1', name: 'Робот-рыбак',     description: 'Ии-оптимизация',  price: 450, rarity: 'legendary', color3D: 0x95a5a6, emoji: '🤖' },
  { id: 'npc_viking',    type: 'npcFisher1', name: 'Рыбак-Викинг',    description: 'Берсерк улова',   price: 400, rarity: 'epic',      color3D: 0x3498db, emoji: '⚔️' },
  // ДЕРЕВЬЯ-ДЕКОРАЦИИ (11 шт — по числу ассетов tree_1..tree_11)
  { id: 'tree_pine',     type: 'tree', name: 'Сосна',             description: 'Классическая ёлка',  price: 30,  rarity: 'common',    color3D: 0x1e8449, emoji: '🌲' },
  { id: 'tree_oak',      type: 'tree', name: 'Дуб',               description: 'Крепкий и старый',   price: 40,  rarity: 'common',    color3D: 0x27ae60, emoji: '🌳' },
  { id: 'tree_birch',    type: 'tree', name: 'Берёза',            description: 'Белый ствол',        price: 35,  rarity: 'common',    color3D: 0x2ecc71, emoji: '🌳' },
  { id: 'tree_palm',     type: 'tree', name: 'Пальма',            description: 'Тропический вайб',   price: 60,  rarity: 'rare',      color3D: 0x27ae60, emoji: '🌴' },
  { id: 'tree_sakura',   type: 'tree', name: 'Сакура',            description: 'Розовые лепестки',   price: 120, rarity: 'epic',      color3D: 0xff69b4, emoji: '🌸' },
  { id: 'tree_crystal',  type: 'tree', name: 'Кристальное дерево',description: 'Из чистого кварца',  price: 200, rarity: 'legendary', color3D: 0x9b59b6, emoji: '💎' },
  { id: 'tree_autumn',   type: 'tree', name: 'Осеннее дерево',    description: 'Золотая листва',     price: 50,  rarity: 'rare',      color3D: 0xf39c12, emoji: '🍂' },
  { id: 'tree_willow',   type: 'tree', name: 'Ива',               description: 'Плакучая красота',   price: 45,  rarity: 'common',    color3D: 0x196f3d, emoji: '🌿' },
  { id: 'tree_bamboo',   type: 'tree', name: 'Бамбук',            description: 'Быстро растёт',      price: 55,  rarity: 'rare',      color3D: 0x27ae60, emoji: '🎋' },
  { id: 'tree_dead',     type: 'tree', name: 'Сухое дерево',      description: 'Хэллоуин декор',     price: 25,  rarity: 'common',    color3D: 0x6d4c2a, emoji: '🌵' },
  { id: 'tree_magic',    type: 'tree', name: 'Волшебное дерево',  description: 'Светящиеся листья',  price: 180, rarity: 'epic',      color3D: 0x3498db, emoji: '✨' },
];

export class CosmeticManager {
  private static instance: CosmeticManager;
  private dbService = DatabaseService.getInstance();

  private constructor() {}

  public static getInstance(): CosmeticManager {
    if (!CosmeticManager.instance) {
      CosmeticManager.instance = new CosmeticManager();
    }
    return CosmeticManager.instance;
  }

  public getCatalog(): CosmeticItem[] {
    return COSMETICS_CATALOG;
  }

  public getCatalogByType(type: CosmeticType): CosmeticItem[] {
    return COSMETICS_CATALOG.filter(c => c.type === type);
  }

  public getItem(id: string): CosmeticItem | undefined {
    return COSMETICS_CATALOG.find(c => c.id === id);
  }

  /** Купить скин за Gems. Возвращает успех. */
  public async buyCosmetic(uid: string, cosmeticId: string): Promise<{ success: boolean; message: string }> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return { success: false, message: 'Профиль не найден' };

    const item = this.getItem(cosmeticId);
    if (!item) return { success: false, message: 'Скин не найден' };

    if (profile.ownedCosmetics.includes(cosmeticId))
      return { success: false, message: 'Уже куплено!' };

    if (profile.gems < item.price)
      return { success: false, message: `Недостаточно 💎 (нужно ${item.price})` };

    await updateDoc(doc(db, 'users', uid), {
      gems: profile.gems - item.price,
      ownedCosmetics: [...profile.ownedCosmetics, cosmeticId],
      totalCosmeticsBought: (profile.totalCosmeticsBought || 0) + 1,
    });

    return { success: true, message: `${item.name} куплено!` };
  }

  /** Экипировать/снять скин. cosmeticId=null — сброс. */
  public async equipCosmetic(uid: string, type: CosmeticType, cosmeticId: string | null): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
      [`equippedCosmetics.${type}`]: cosmeticId,
    });
  }

  /** Получить цвет 3D-объекта с учётом скина */
  public getEquippedColor(equippedId: string | null, defaultColor: number): number {
    if (!equippedId) return defaultColor;
    const item = this.getItem(equippedId);
    return item ? item.color3D : defaultColor;
  }
}
