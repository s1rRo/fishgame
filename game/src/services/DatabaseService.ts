// ============================================================
// DATABASE SERVICE — Firebase + LocalStorage fallback
// Когда Firebase недоступен — все данные в localStorage
// Авто-сохранение каждые 30 сек (Задача №12)
// ============================================================
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseAvailable } from './firebase-config';
import { PlayerProfile, DEFAULT_PLAYER_PROFILE } from '../models/Player';

const LS_PREFIX = 'rl_profile_';

// ── LocalStorage helpers ──────────────────────────────────────
function lsKey(uid: string) { return LS_PREFIX + uid; }

function lsGet(uid: string): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(lsKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsSet(uid: string, data: PlayerProfile): void {
  try { localStorage.setItem(lsKey(uid), JSON.stringify(data)); } catch { /**/ }
}

function lsMerge(uid: string, partial: Partial<PlayerProfile>): PlayerProfile | null {
  const existing = lsGet(uid);
  if (!existing) return null;
  // Поддержка dotted paths типа 'seasonPass.premiumOwned'
  const merged = { ...existing } as any;
  for (const [key, value] of Object.entries(partial as any)) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let obj = merged;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
    } else {
      merged[key] = value;
    }
  }
  lsSet(uid, merged);
  return merged;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private currentUid: string | null = null;
  private lastKnownProfile: PlayerProfile | null = null;

  private constructor() {
    // Авто-сохранение каждые 30 секунд (если есть активный пользователь)
    this.autoSaveInterval = setInterval(() => {
      if (this.currentUid && this.lastKnownProfile) {
        lsSet(this.currentUid, this.lastKnownProfile);
      }
    }, 30_000);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ── Приватный: безопасный вызов Firebase ─────────────────────
  private async _fbGet(uid: string): Promise<PlayerProfile | null> {
    if (!isFirebaseAvailable) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data() as PlayerProfile) : null;
    } catch (e) {
      console.warn('[DB] Firebase read failed, using localStorage', e);
      return null;
    }
  }

  private async _fbSet(uid: string, data: PlayerProfile): Promise<void> {
    if (!isFirebaseAvailable) return;
    try { await setDoc(doc(db, 'users', uid), data); } catch (e) {
      console.warn('[DB] Firebase write failed', e);
    }
  }

  private async _fbUpdate(uid: string, partial: Record<string, unknown>): Promise<void> {
    if (!isFirebaseAvailable) return;
    try { await updateDoc(doc(db, 'users', uid), partial); } catch (e) {
      console.warn('[DB] Firebase update failed', e);
    }
  }

  // ── PUBLIC API ───────────────────────────────────────────────

  public async getPlayerProfile(uid: string): Promise<PlayerProfile | null> {
    this.currentUid = uid;
    // Сначала пробуем Firebase
    const fbData = await this._fbGet(uid);
    if (fbData) {
      this.lastKnownProfile = this._ensureStartingCoins(fbData);
      lsSet(uid, this.lastKnownProfile);
      return this.lastKnownProfile;
    }
    // Fallback — localStorage
    const local = lsGet(uid);
    if (local) {
      this.lastKnownProfile = this._ensureStartingCoins(local);
      return this.lastKnownProfile;
    }
    return null;
  }

  /** Если игрок с 0 монет и 0 пойманных рыб — выдать стартовые 500 монет */
  private _ensureStartingCoins(profile: PlayerProfile): PlayerProfile {
    if (profile.softCoins === 0 && profile.totalFishCaught === 0) {
      profile.softCoins = 500;
      lsMerge(profile.uid, { softCoins: 500 });
      // setDoc с merge — безопасно даже если документ не существует
      if (isFirebaseAvailable) {
        setDoc(doc(db, 'users', profile.uid), { softCoins: 500 }, { merge: true }).catch(() => {});
      }
    }
    return profile;
  }

  public async createInitialProfile(uid: string, displayName: string, email: string | null): Promise<void> {
    const profile: PlayerProfile = {
      uid, displayName, email,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      ...DEFAULT_PLAYER_PROFILE
    };
    this.currentUid = uid;
    this.lastKnownProfile = profile;
    lsSet(uid, profile);               // всегда пишем в localStorage
    await this._fbSet(uid, profile);   // и пробуем Firebase
  }

  public async updateLastLogin(uid: string): Promise<void> {
    const upd = { lastLogin: Date.now() };
    lsMerge(uid, upd);
    await this._fbUpdate(uid, upd);
  }

  public async updatePlayerStats(uid: string, stats: Partial<PlayerProfile>): Promise<void> {
    lsMerge(uid, stats);
    // lastKnownProfile тоже обновляем
    if (this.currentUid === uid && this.lastKnownProfile) {
      this.lastKnownProfile = lsGet(uid) || this.lastKnownProfile;
    }
    await this._fbUpdate(uid, stats as Record<string, unknown>);
  }

  public async unlockRegion(uid: string, region: string): Promise<void> {
    const profile = await this.getPlayerProfile(uid);
    if (!profile) return;
    if (!profile.unlockedRegions.includes(region)) {
      const regions = [...profile.unlockedRegions, region];
      await this.updatePlayerStats(uid, { unlockedRegions: regions });
    }
  }

  public async saveFishingResult(uid: string, caughtFish: any[], attempts: number): Promise<void> {
    const data = await this.getPlayerProfile(uid);
    if (!data) return;
    const inventory = [...((data as any).inventory || []), ...caughtFish];
    await this.updatePlayerStats(uid, {
      inventory,
      totalAttemptsAllTime: ((data as any).totalAttemptsAllTime || 0) + attempts,
      totalFishCaught: ((data as any).totalFishCaught || 0) + caughtFish.length,
      totalSessions: (data.totalSessions || 0) + 1,
    } as any);
  }

  public async sellAllFish(uid: string): Promise<number> {
    const data = await this.getPlayerProfile(uid);
    if (!data) return 0;
    const inventory: any[] = (data as any).inventory || [];
    if (inventory.length === 0) return 0;
    const totalGain = inventory.reduce((s: number, f: any) => s + (f.value || 0), 0);
    await this.updatePlayerStats(uid, {
      inventory: [],
      softCoins: (data.softCoins || 0) + totalGain,
      totalRevenue: ((data as any).totalRevenue || 0) + totalGain,
      totalFishSold: ((data as any).totalFishSold || 0) + inventory.length,
    } as any);
    return totalGain;
  }

  public async processAllFish(uid: string): Promise<void> {
    const data = await this.getPlayerProfile(uid);
    if (!data) return;
    const processedInventory = ((data as any).inventory || []).map((fish: any) => ({
      ...fish, value: Math.floor(fish.value * 2.2), processed: true,
    }));
    await this.updatePlayerStats(uid, { inventory: processedInventory } as any);
  }

  public async claimPassiveIncome(uid: string): Promise<number> {
    const data = await this.getPlayerProfile(uid);
    if (!data) return 0;
    const now = Date.now();
    const lastClaim = (data as any).lastPassiveClaim || data.createdAt;
    const minutesPassed = Math.floor((now - lastClaim) / 60000);
    if (minutesPassed < 1) return 0;
    let incomePerMinute = 0;
    Object.values(data.farmBuildings).forEach((b: any) => {
      incomePerMinute += (b.level || 0) * 2;
    });
    const totalEarned = minutesPassed * incomePerMinute;
    await this.updatePlayerStats(uid, {
      softCoins: (data.softCoins || 0) + totalEarned,
      lastPassiveClaim: now,
    } as any);
    return totalEarned;
  }

  public async addSeasonPoints(uid: string, points: number): Promise<void> {
    const data = await this.getPlayerProfile(uid);
    if (!data) return;
    const current = data.seasonPass?.freeTrackProgress || 0;
    await this.updatePlayerStats(uid, {
      'seasonPass.freeTrackProgress': Math.min(100, current + points),
    } as any);
  }

  public async buyPremiumPass(uid: string): Promise<boolean> {
    const data = await this.getPlayerProfile(uid);
    if (!data || data.gems < 500) return false;
    await this.updatePlayerStats(uid, {
      gems: data.gems - 500,
      'seasonPass.premiumOwned': true,
    } as any);
    return true;
  }

  public async claimSeasonReward(uid: string, rewardId: string): Promise<void> {
    const data = await this.getPlayerProfile(uid);
    if (!data) return;
    const claimed = data.seasonPass?.claimedRewards || [];
    if (!claimed.includes(rewardId)) {
      await this.updatePlayerStats(uid, {
        'seasonPass.claimedRewards': [...claimed, rewardId],
      } as any);
    }
  }

  public async buyCosmetic(uid: string, cosmeticId: string, price: number): Promise<boolean> {
    const data = await this.getPlayerProfile(uid);
    if (!data || data.gems < price) return false;
    if (data.ownedCosmetics.includes(cosmeticId)) return true;
    await this.updatePlayerStats(uid, {
      gems: data.gems - price,
      ownedCosmetics: [...data.ownedCosmetics, cosmeticId],
    } as any);
    return true;
  }

  public async equipCosmetic(uid: string, type: string, cosmeticId: string | null): Promise<void> {
    await this.updatePlayerStats(uid, {
      [`equippedCosmetics.${type}`]: cosmeticId,
    } as any);
  }

  public async updateRiverLordRecord(uid: string, _displayName: string, levelId: string, attempts: number, totalValue: number): Promise<boolean> {
    const data = await this.getPlayerProfile(uid);
    if (!data) return false;
    const old = (data as any).riverLords?.[levelId];
    const isNew = !old || attempts < old.attempts || (attempts === old.attempts && totalValue > old.totalValue);
    if (isNew) {
      await this.updatePlayerStats(uid, {
        [`riverLords.${levelId}`]: { attempts, totalValue, timestamp: Date.now(), isRiverLord: true },
      } as any);
    }
    return isNew;
  }
}
