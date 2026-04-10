import { DatabaseService } from './DatabaseService';
import { AuthService } from './AuthService';

export type AdType = 'extraCast' | 'doubleSell' | 'respawnFish' | 'dailyBonus';

export class AdManager {
  private static instance: AdManager;
  private dbService: DatabaseService;
  private authService: AuthService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.authService = AuthService.getInstance();
  }

  public static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  public async canWatchAd(uid: string): Promise<boolean> {
    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return false;
    // Лимит 3 рекламы в день (упрощенная проверка в MVP)
    return (profile.adWatchedToday || 0) < 3;
  }

  public async watchAd(type: AdType): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    if (!(await this.canWatchAd(user.uid))) {
      alert("Daily ad limit reached (3/3)!");
      return false;
    }

    console.log(`Watching ad for: ${type}...`);
    // Имитация просмотра рекламы (3 секунды)
    await new Promise(resolve => setTimeout(resolve, 3000));

    const profile = await this.dbService.getPlayerProfile(user.uid);
    if (!profile) return false;

    const updates: any = {
      adWatchedToday: (profile.adWatchedToday || 0) + 1,
      [`lastAdWatch.${type}`]: Date.now()
    };

    switch (type) {
      case 'dailyBonus':
        updates.gems = (profile.gems || 0) + 50;
        break;
      case 'doubleSell':
        // Логика удвоения обрабатывается в MarketScene
        break;
      case 'extraCast':
        // Логика доп. попыток обрабатывается в FishingScene
        break;
    }

    await this.dbService.updatePlayerStats(user.uid, updates);
    return true;
  }
}
