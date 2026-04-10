// ============================================================
// SEASON PASS MANAGER — Задача №8
// Еженедельный прогресс-пасс (бесплатный + премиум)
// ============================================================
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase-config';
import { DatabaseService } from './DatabaseService';

export interface SeasonReward {
  id: string;
  track: 'free' | 'premium';
  milestone: number; // 0-100 — порог прогресса
  type: 'gems' | 'softCoins' | 'cosmetic';
  amount: number;
  label: string;
  icon: string;
}

// Конфиг наград Season Pass (хранится в коде, не в БД)
export const SEASON_REWARDS: SeasonReward[] = [
  { id: 'free_1',    track: 'free',    milestone: 10,  type: 'gems',       amount: 20,   label: '+20 💎',           icon: '💎' },
  { id: 'free_2',    track: 'free',    milestone: 25,  type: 'softCoins',  amount: 500,  label: '+500 💰',          icon: '💰' },
  { id: 'free_3',    track: 'free',    milestone: 50,  type: 'gems',       amount: 50,   label: '+50 💎',           icon: '💎' },
  { id: 'free_4',    track: 'free',    milestone: 75,  type: 'softCoins',  amount: 1500, label: '+1500 💰',         icon: '💰' },
  { id: 'free_5',    track: 'free',    milestone: 100, type: 'gems',       amount: 150,  label: '+150 💎',          icon: '🏆' },
  { id: 'premium_1', track: 'premium', milestone: 10,  type: 'gems',       amount: 50,   label: '+50 💎',           icon: '💎' },
  { id: 'premium_2', track: 'premium', milestone: 25,  type: 'gems',       amount: 100,  label: '+100 💎',          icon: '💎' },
  { id: 'premium_3', track: 'premium', milestone: 50,  type: 'softCoins',  amount: 3000, label: '+3000 💰',         icon: '💰' },
  { id: 'premium_4', track: 'premium', milestone: 75,  type: 'gems',       amount: 200,  label: '+200 💎',          icon: '💎' },
  { id: 'premium_5', track: 'premium', milestone: 100, type: 'gems',       amount: 500,  label: '+500 💎 GRAND',    icon: '👑' },
];

export class SeasonPassManager {
  private static instance: SeasonPassManager;
  private dbService = DatabaseService.getInstance();

  private constructor() {}

  public static getInstance(): SeasonPassManager {
    if (!SeasonPassManager.instance) {
      SeasonPassManager.instance = new SeasonPassManager();
    }
    return SeasonPassManager.instance;
  }

  /** Добавить очки прогресса (рыбалка, ферма, river lord) */
  public async addProgress(uid: string, points: number): Promise<void> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return;

    const current = profile.seasonPass?.freeTrackProgress || 0;
    const newProgress = Math.min(100, current + points);

    const updates: Record<string, unknown> = {
      'seasonPass.freeTrackProgress': newProgress,
    };

    // Если premium — дублируем прогресс
    if (profile.seasonPass?.premiumOwned) {
      const currPremium = (profile.seasonPass as any).premiumTrackProgress || 0;
      updates['seasonPass.premiumTrackProgress'] = Math.min(100, currPremium + points * 1.5);
    }

    await updateDoc(doc(db, 'users', uid), updates);
    await this.checkSeasonReset(uid, profile.seasonPass?.seasonStartTimestamp || Date.now());
  }

  /** Купить Premium Pass за 500 Gems */
  public async buyPremium(uid: string): Promise<boolean> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile || profile.gems < 500) return false;

    await updateDoc(doc(db, 'users', uid), {
      gems: profile.gems - 500,
      'seasonPass.premiumOwned': true,
    });
    return true;
  }

  /** Забрать награду, если прогресс достигнут */
  public async claimReward(uid: string, rewardId: string): Promise<{ success: boolean; reward?: SeasonReward }> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return { success: false };

    const reward = SEASON_REWARDS.find(r => r.id === rewardId);
    if (!reward) return { success: false };

    const claimed = profile.seasonPass?.claimedRewards || [];
    if (claimed.includes(rewardId)) return { success: false };

    const progress = reward.track === 'free'
      ? profile.seasonPass?.freeTrackProgress || 0
      : (profile.seasonPass as any)?.premiumTrackProgress || 0;

    if (progress < reward.milestone) return { success: false };
    if (reward.track === 'premium' && !profile.seasonPass?.premiumOwned) return { success: false };

    const updates: Record<string, unknown> = {
      'seasonPass.claimedRewards': [...claimed, rewardId],
    };

    if (reward.type === 'gems') {
      updates['gems'] = (profile.gems || 0) + reward.amount;
    } else if (reward.type === 'softCoins') {
      updates['softCoins'] = (profile.softCoins || 0) + reward.amount;
    }

    await updateDoc(doc(db, 'users', uid), updates);
    return { success: true, reward };
  }

  /** Сбросить сезон если прошло 7 дней */
  private async checkSeasonReset(uid: string, startTimestamp: number): Promise<void> {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - startTimestamp > weekMs) {
      await updateDoc(doc(db, 'users', uid), {
        'seasonPass.seasonStartTimestamp': Date.now(),
        'seasonPass.freeTrackProgress': 0,
        'seasonPass.premiumTrackProgress': 0,
        'seasonPass.premiumOwned': false,
        'seasonPass.claimedRewards': [],
      });
    }
  }

  /** Получить список доступных для клейма наград */
  public getClaimableRewards(progress: number, premiumProgress: number, premiumOwned: boolean, claimed: string[]): SeasonReward[] {
    return SEASON_REWARDS.filter(r => {
      if (claimed.includes(r.id)) return false;
      if (r.track === 'premium' && !premiumOwned) return false;
      const p = r.track === 'free' ? progress : premiumProgress;
      return p >= r.milestone;
    });
  }

  /** Секунды до конца недели */
  public getSecondsLeft(startTimestamp: number): number {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - startTimestamp;
    return Math.max(0, Math.floor((weekMs - elapsed) / 1000));
  }

  /** Продлить сезон — сохранить NPC, сбросить таймер */
  public async extendSeason(uid: string): Promise<void> {
    await this.dbService.updatePlayerStats(uid, {
      'seasonPass.seasonStartTimestamp': Date.now(),
      'seasonPass.freeTrackProgress': 0,
      'seasonPass.claimedRewards': [],
    } as any);
  }

  /** Заменить NPC — новая гача + сброс */
  public async replaceSeason(uid: string): Promise<void> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return;

    // Оставить максимум 3 NPC, убрать остальные
    const kept = profile.activeNPCIds.slice(0, 3);
    await this.dbService.updatePlayerStats(uid, {
      activeNPCIds: kept,
      'seasonPass.seasonStartTimestamp': Date.now(),
      'seasonPass.freeTrackProgress': 0,
      'seasonPass.claimedRewards': [],
    } as any);
  }
}
