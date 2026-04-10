import { SceneManager } from './core/SceneManager';
import { BootScene } from './scenes/BootScene';
import { LoginScene } from './scenes/LoginScene';
// Legacy scenes removed — replaced by PlanetScene + BiomeView
import { FishingSessionScene } from './scenes/FishingSessionScene';
import { SummaryScene } from './scenes/SummaryScene';
import { MarketScene } from './scenes/MarketScene';
import { FarmScene } from './scenes/FarmScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { SeasonPassScene } from './scenes/SeasonPassScene';
import { CosmeticShopScene } from './scenes/CosmeticShopScene';
// Новые сцены MVP v1.0
import { PlanetScene } from './scenes/PlanetScene';
import { VillagePlacementScreen } from './scenes/VillagePlacementScreen';
import { BiomeView } from './scenes/BiomeView';
import { BuildingScreen } from './scenes/BuildingScreen';
import { PlayerProfileScreen } from './scenes/PlayerProfileScreen';
import { NPCListScreen } from './scenes/NPCListScreen';
import { NPCDetailScreen } from './scenes/NPCDetailScreen';
import { PetCollectionScreen } from './scenes/PetCollectionScreen';
import { ResourceBiomeScreen } from './scenes/ResourceBiomeScreen';
import { OnboardingFlow } from './scenes/OnboardingFlow';
import { OfflineSummaryPopup } from './scenes/OfflineSummaryPopup';
import { LootboxOpenScene } from './scenes/LootboxOpenScene';
import { CraftingPopup } from './scenes/CraftingPopup';
import { CheckpointMapScene } from './scenes/CheckpointMapScene';
import { initGameRouter } from './core/GameRouter';

const game = new SceneManager();
initGameRouter(game);

// Существующие сцены
game.registerScene('BootScene', BootScene);
game.registerScene('LoginScene', LoginScene);
// MainWorldMapScene and RegionScene removed — use PlanetScene + BiomeView
game.registerScene('FishingSessionScene', FishingSessionScene);
game.registerScene('SummaryScene', SummaryScene);
game.registerScene('MarketScene', MarketScene);
game.registerScene('FarmScene', FarmScene);
game.registerScene('LeaderboardScene', LeaderboardScene);
game.registerScene('SeasonPassScene', SeasonPassScene);
game.registerScene('CosmeticShopScene', CosmeticShopScene);

// Новые сцены MVP v1.0
game.registerScene('PlanetScene', PlanetScene);
game.registerScene('VillagePlacementScreen', VillagePlacementScreen);
game.registerScene('BiomeView', BiomeView);
game.registerScene('BuildingScreen', BuildingScreen);
game.registerScene('PlayerProfileScreen', PlayerProfileScreen);
game.registerScene('NPCListScreen', NPCListScreen);
game.registerScene('NPCDetailScreen', NPCDetailScreen);
game.registerScene('PetCollectionScreen', PetCollectionScreen);
game.registerScene('ResourceBiomeScreen', ResourceBiomeScreen);
game.registerScene('OnboardingFlow', OnboardingFlow);
game.registerScene('OfflineSummaryPopup', OfflineSummaryPopup);
game.registerScene('LootboxOpenScene', LootboxOpenScene);
game.registerScene('CheckpointMapScene', CheckpointMapScene);
game.registerScene('CraftingPopup', CraftingPopup);

game.startScene('BootScene');
