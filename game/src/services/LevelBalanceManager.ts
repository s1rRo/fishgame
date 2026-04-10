import { DatabaseService } from './DatabaseService';
import { levelBalance, LevelData } from '../data/fishDatabase';

export class LevelBalanceManager {
  private static instance: LevelBalanceManager;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): LevelBalanceManager {
    if (!LevelBalanceManager.instance) {
      LevelBalanceManager.instance = new LevelBalanceManager();
    }
    return LevelBalanceManager.instance;
  }

  public getLevelData(levelId: number): LevelData | undefined {
    return levelBalance.find(l => l.id === levelId);
  }

  public async checkLevelCompletion(uid: string, levelId: number, totalValue: number): Promise<{ completed: boolean, reward: number, nextLevelUnlocked: boolean }> {
    const level = this.getLevelData(levelId);
    if (!level) return { completed: false, reward: 0, nextLevelUnlocked: false };

    const profile = await this.dbService.getPlayerProfile(uid);
    if (!profile) return { completed: false, reward: 0, nextLevelUnlocked: false };

    if (totalValue >= level.targetValue) {
      const isFirstTime = profile.currentLevel === levelId;
      const nextLevel = levelId + 1;
      
      const updates: any = {
        gems: (profile.gems || 0) + level.rewardGems
      };

      if (isFirstTime && nextLevel <= 10) {
        updates.currentLevel = nextLevel;
        
        // Проверка разблокировки нового региона
        const nextLevelData = this.getLevelData(nextLevel);
        if (nextLevelData && !profile.unlockedRegions.includes(nextLevelData.region)) {
          updates.unlockedRegions = [...profile.unlockedRegions, nextLevelData.region];
        }
      }

      await this.dbService.updatePlayerStats(uid, updates);
      return { completed: true, reward: level.rewardGems, nextLevelUnlocked: isFirstTime };
    }

    return { completed: false, reward: 0, nextLevelUnlocked: false };
  }
}
