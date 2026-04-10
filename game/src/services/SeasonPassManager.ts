// ============================================================
// SEASON PASS MANAGER — 28-уровневый прогресс-пасс
// Единственный источник правды: seasonPassConfig.ts
// ============================================================
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase-config';
import { DatabaseService } from './DatabaseService';
import {
  SEASON_PASS_CONFIG,
  SEASON_PASS_LEVELS,
  SeasonPassLevel,
} from '../data/seasonPassConfig';

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

  // ── XP прогресс ─────────────────────────────────────────

  /** Добавить XP (рыбалка, NPC gather, daily login и т.д.) */
  public async addProgress(uid: string, xp: number): Promise<void> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return;

    const maxXP = SEASON_PASS_CONFIG.xpPerLevel * SEASON_PASS_CONFIG.totalLevels;
    const current = profile.seasonPass?.freeTrackProgress || 0;
    const newXP = Math.min(maxXP, current + xp);

    const updates: Record<string, unknown> = {
      'seasonPass.freeTrackProgress': newXP,
    };

    await updateDoc(doc(db, 'users', uid), updates);
    await this.checkSeasonReset(uid, profile.seasonPass?.seasonStartTimestamp || Date.now());
  }

  /** Текущий уровень на основе XP */
  public getLevel(xp: number): number {
    return Math.min(
      Math.floor(xp / SEASON_PASS_CONFIG.xpPerLevel),
      SEASON_PASS_CONFIG.totalLevels
    );
  }

  /** XP внутри текущего уровня */
  public getXPInLevel(xp: number): number {
    return xp % SEASON_PASS_CONFIG.xpPerLevel;
  }

  // ── Покупка Premium ─────────────────────────────────────

  /** Купить Premium Pass */
  public async buyPremium(uid: string): Promise<boolean> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile || profile.gems < SEASON_PASS_CONFIG.premiumCostGems) return false;

    await updateDoc(doc(db, 'users', uid), {
      gems: profile.gems - SEASON_PASS_CONFIG.premiumCostGems,
      'seasonPass.premiumOwned': true,
    });
    return true;
  }

  // ── Награды ─────────────────────────────────────────────

  /** Забрать награду по ID (формат sp_free_N или sp_prem_N) */
  public async claimReward(
    uid: string,
    rewardId: string
  ): Promise<{ success: boolean; level?: SeasonPassLevel; track?: 'free' | 'premium' }> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return { success: false };

    // Парсим rewardId → уровень + трек
    const parsed = this.parseRewardId(rewardId);
    if (!parsed) return { success: false };

    const { levelNum, track } = parsed;
    const levelConfig = SEASON_PASS_LEVELS.find(l => l.level === levelNum);
    if (!levelConfig) return { success: false };

    // Проверки
    const claimed = profile.seasonPass?.claimedRewards || [];
    if (claimed.includes(rewardId)) return { success: false };

    const xp = profile.seasonPass?.freeTrackProgress || 0;
    const currentLevel = this.getLevel(xp);
    if (currentLevel < levelNum) return { success: false };

    if (track === 'premium' && !profile.seasonPass?.premiumOwned) return { success: false };

    // Определяем награду
    const rewardType = track === 'free' ? levelConfig.freeType : levelConfig.premiumType;
    const rewardAmount = track === 'free' ? levelConfig.freeAmount : levelConfig.premiumAmount;

    const updates: Record<string, unknown> = {
      'seasonPass.claimedRewards': [...claimed, rewardId],
    };

    // Выдаём валюту напрямую
    if (rewardType === 'gems') {
      updates['gems'] = (profile.gems || 0) + rewardAmount;
    } else if (rewardType === 'softCoins') {
      updates['softCoins'] = (profile.softCoins || 0) + rewardAmount;
    }
    // item, cosmetic, npc, pet, title — просто отмечаем claimed
    // Конкретная логика выдачи зависит от типа:
    // - cosmetic → profile.ownedCosmetics.push(...)
    // - npc/pet → гача-ролл или конкретный ID
    // - title → profile.riverLordTitles.push(...)
    // - item → добавить в инвентарь
    // Пока сохраняем факт клейма, выдача через отдельные менеджеры

    await updateDoc(doc(db, 'users', uid), updates);
    return { success: true, level: levelConfig, track };
  }

  /** Список наград, доступных для клейма */
  public getClaimableRewards(
    xp: number,
    premiumOwned: boolean,
    claimed: string[]
  ): Array<{ rewardId: string; level: SeasonPassLevel; track: 'free' | 'premium' }> {
    const currentLevel = this.getLevel(xp);
    const result: Array<{ rewardId: string; level: SeasonPassLevel; track: 'free' | 'premium' }> = [];

    for (const lvl of SEASON_PASS_LEVELS) {
      if (currentLevel < lvl.level) continue;

      const freeId = `sp_free_${lvl.level}`;
      if (!claimed.includes(freeId)) {
        result.push({ rewardId: freeId, level: lvl, track: 'free' });
      }

      if (premiumOwned) {
        const premId = `sp_prem_${lvl.level}`;
        if (!claimed.includes(premId)) {
          result.push({ rewardId: premId, level: lvl, track: 'premium' });
        }
      }
    }

    return result;
  }

  // ── Таймер сезона ───────────────────────────────────────

  /** Секунды до конца сезона */
  public getSecondsLeft(startTimestamp: number): number {
    const durationMs = SEASON_PASS_CONFIG.durationDays * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - startTimestamp;
    return Math.max(0, Math.floor((durationMs - elapsed) / 1000));
  }

  /** Сбросить сезон если прошло durationDays */
  private async checkSeasonReset(uid: string, startTimestamp: number): Promise<void> {
    const durationMs = SEASON_PASS_CONFIG.durationDays * 24 * 60 * 60 * 1000;
    if (Date.now() - startTimestamp > durationMs) {
      await updateDoc(doc(db, 'users', uid), {
        'seasonPass.seasonStartTimestamp': Date.now(),
        'seasonPass.freeTrackProgress': 0,
        'seasonPass.premiumOwned': false,
        'seasonPass.claimedRewards': [],
      });
    }
  }

  // ── Конец сезона: продление / замена ────────────────────

  /** Продлить сезон — сбросить таймер и прогресс, сохранить NPC */
  public async extendSeason(uid: string): Promise<void> {
    await this.dbService.updatePlayerStats(uid, {
      'seasonPass.seasonStartTimestamp': Date.now(),
      'seasonPass.freeTrackProgress': 0,
      'seasonPass.claimedRewards': [],
    } as any);
  }

  /** Заменить сезон — новая гача + сброс, оставить максимум 3 NPC */
  public async replaceSeason(uid: string): Promise<void> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return;

    const kept = profile.activeNPCIds.slice(0, 3);
    await this.dbService.updatePlayerStats(uid, {
      activeNPCIds: kept,
      'seasonPass.seasonStartTimestamp': Date.now(),
      'seasonPass.freeTrackProgress': 0,
      'seasonPass.claimedRewards': [],
    } as any);
  }

  // ── Утилиты ─────────────────────────────────────────────

  private parseRewardId(id: string): { levelNum: number; track: 'free' | 'premium' } | null {
    const freeMatch = id.match(/^sp_free_(\d+)$/);
    if (freeMatch) return { levelNum: parseInt(freeMatch[1], 10), track: 'free' };

    const premMatch = id.match(/^sp_prem_(\d+)$/);
    if (premMatch) return { levelNum: parseInt(premMatch[1], 10), track: 'premium' };

    return null;
  }
}
