// ============================================================
// GAME ROUTER — централизованная навигация между сценами
// Из Code_tz/UPDATE_PROJECT.md задача #6
// ============================================================

import type { ISceneManager } from './BaseScene';

let sm: ISceneManager;

export function initGameRouter(sceneManager: ISceneManager): void {
  sm = sceneManager;
}

export const GameRouter = {
  boot:         ()                 => sm.startScene('BootScene'),
  login:        ()                 => sm.startScene('LoginScene'),
  planet:       ()                 => sm.startScene('PlanetScene'),
  placement:    (biomeId?: string) => sm.startScene('VillagePlacementScreen', { biomeId }),
  biome:        (biomeId: string)  => sm.startScene('BiomeView', { biomeId }),
  farm:         ()                 => sm.startScene('FarmScene'),
  fishing:      (biomeId: string, level?: number) => sm.startScene('FishingSessionScene', { biomeId, levelId: level }),
  summary:      (data: any)        => sm.startScene('SummaryScene', data),
  market:       ()                 => sm.startScene('MarketScene'),
  profile:      ()                 => sm.startScene('PlayerProfileScreen'),
  npcList:      ()                 => sm.startScene('NPCListScreen'),
  npcDetail:    (npcId: string)    => sm.startScene('NPCDetailScreen', { npcId }),
  pets:         ()                 => sm.startScene('PetCollectionScreen'),
  seasonPass:   ()                 => sm.startScene('SeasonPassScene'),
  leaderboard:  ()                 => sm.startScene('LeaderboardScene'),
  cosmetics:    ()                 => sm.startScene('CosmeticShopScene'),
  building:     (buildingId: string) => sm.startScene('BuildingScreen', { buildingId }),
  resource:     (biomeId: string)  => sm.startScene('ResourceBiomeScreen', { biomeId }),
  onboarding:   ()                 => sm.startScene('OnboardingFlow'),
  offlineSummary: (nextScene: string, nextData?: any) => sm.startScene('OfflineSummaryPopup', { nextScene, nextData }),
};
