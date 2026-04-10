// ============================================================
// RIVER LORD MANAGER — Задача №7
// Глобальный и личный рейтинг рыбаков по уровням
// ============================================================
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase-config';
import { DatabaseService } from './DatabaseService';
import { Analytics } from './analytics';

export interface RiverLordRecord {
  uid: string;
  displayName: string;
  attempts: number;
  totalValue: number;
  timestamp: number;
}

export class RiverLordManager {
  private static instance: RiverLordManager;
  private dbService = DatabaseService.getInstance();
  private analytics = Analytics.getInstance();

  private constructor() {}

  public static getInstance(): RiverLordManager {
    if (!RiverLordManager.instance) {
      RiverLordManager.instance = new RiverLordManager();
    }
    return RiverLordManager.instance;
  }

  /** Проверяет и обновляет рекорд. Возвращает { isNew, reward } */
  public async checkAndUpdate(
    uid: string,
    displayName: string,
    levelId: string,
    attempts: number,
    totalValue: number
  ): Promise<{ isNewRecord: boolean; rewardGems: number }> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return { isNewRecord: false, rewardGems: 0 };

    const current = (profile as any).riverLords?.[levelId];
    const isNewRecord = !current
      || attempts < current.attempts
      || (attempts === current.attempts && totalValue > current.totalValue);

    if (!isNewRecord) return { isNewRecord: false, rewardGems: 0 };

    // Вычисляем награду (чем выше уровень — тем больше)
    const rewardGems = parseInt(levelId) * 20 + 100;

    await updateDoc(doc(db, 'users', uid), {
      [`riverLords.${levelId}`]: { attempts, totalValue, timestamp: Date.now(), isRiverLord: true },
      gems: (profile.gems || 0) + rewardGems
    });

    // Обновляем глобальную таблицу лидеров
    await this.updateGlobalLeaderboard(levelId, { uid, displayName, attempts, totalValue, timestamp: Date.now() });

    this.analytics.logEvent('river_lord_achieved', { levelId, attempts, totalValue, rewardGems });
    return { isNewRecord: true, rewardGems };
  }

  /** Обновляет топ-10 глобального лидерборда для уровня */
  private async updateGlobalLeaderboard(levelId: string, record: RiverLordRecord): Promise<void> {
    try {
      const docRef = doc(db, 'riverLordLeaders', levelId);
      const snap = await getDoc(docRef);
      let leaders: RiverLordRecord[] = snap.exists() ? (snap.data().leaderboard || []) : [];

      // Удаляем старую запись этого игрока и добавляем новую
      leaders = leaders.filter(l => l.uid !== record.uid);
      leaders.push(record);

      // Сортировка: меньше попыток лучше, при равных — больше денег
      leaders.sort((a, b) => {
        if (a.attempts !== b.attempts) return a.attempts - b.attempts;
        return b.totalValue - a.totalValue;
      });

      // Топ-10
      leaders = leaders.slice(0, 10);

      await setDoc(docRef, { leaderboard: leaders }, { merge: true });
    } catch (e) {
      console.warn('RiverLordManager: Failed to update global leaderboard', e);
    }
  }

  /** Получить топ-10 для уровня */
  public async getLeaderboard(levelId: string): Promise<RiverLordRecord[]> {
    try {
      const docRef = doc(db, 'riverLordLeaders', levelId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return [];
      return snap.data().leaderboard || [];
    } catch (e) {
      console.warn('RiverLordManager: Failed to fetch leaderboard', e);
      return [];
    }
  }

  /** Получить личный рекорд игрока для уровня */
  public async getPersonalRecord(uid: string, levelId: string): Promise<{ attempts: number; totalValue: number } | null> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return null;
    return (profile as any).riverLords?.[levelId] || null;
  }
}
