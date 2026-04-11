// ============================================================
// CRAFTING SERVICE — запуск, прогресс, завершение крафта
// River Lord: Pixel Fishery
// ============================================================

import { CRAFTING_RECIPES, CraftingRecipe } from '../data/craftingRecipes';
import type { PlayerProfile, CraftJob } from '../models/Player';
import { addResourceAmount, getResourceAmount, resolveBuildingId, spendResourceAmount } from '../utils/IdAliases';

export type CraftStatus = 'in_progress' | 'success' | 'failure' | 'not_found';

export interface CraftResult {
  status: 'success' | 'failure';
  recipe: CraftingRecipe;
  outputsGranted?: { resourceId: string; amount: number }[];
  inputsReturned?: { resourceId: string; amount: number }[];
}

export class CraftingService {
  private static instance: CraftingService;

  static getInstance(): CraftingService {
    if (!CraftingService.instance) {
      CraftingService.instance = new CraftingService();
    }
    return CraftingService.instance;
  }

  /** Получить доступные рецепты (у игрока хватает ресурсов + здание достаточного уровня) */
  getAvailableRecipes(player: PlayerProfile): CraftingRecipe[] {
    return CRAFTING_RECIPES.filter(r => {
      // Проверка уровня здания
      const building = (player.farmBuildings as any)[resolveBuildingId(r.requiredBuilding)]
        ?? (player.farmBuildings as any)[r.requiredBuilding];
      if (!building || building.level < r.requiredBuildingLevel) return false;
      return true;
    });
  }

  /** Проверить хватает ли ресурсов */
  canAfford(player: PlayerProfile, recipeId: string): boolean {
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;

    return recipe.inputs.every(input => {
      const have = getResourceAmount(player.resources, input.resourceId);
      return have >= input.amount;
    });
  }

  /** Запустить крафт */
  startCraft(player: PlayerProfile, recipeId: string, buildingId: string): CraftJob | null {
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return null;
    if (!this.canAfford(player, recipeId)) return null;
    const configBuildingId = resolveBuildingId(buildingId);

    // Проверить что нет активного крафта на этом здании
    const existing = player.activeCraftJobs.find(j => resolveBuildingId(j.buildingId) === configBuildingId);
    if (existing) return null;

    // Списать ресурсы
    for (const input of recipe.inputs) {
      spendResourceAmount(player.resources, input.resourceId, input.amount);
    }

    // Создать джоб
    const job: CraftJob = {
      recipeId,
      buildingId: configBuildingId,
      startedAt: Date.now(),
      durationMs: recipe.timeMinutes * 60 * 1000,
    };

    player.activeCraftJobs.push(job);
    return job;
  }

  /** Проверить статус крафта */
  checkStatus(player: PlayerProfile, buildingId: string): CraftStatus {
    const configBuildingId = resolveBuildingId(buildingId);
    const job = player.activeCraftJobs.find(j => resolveBuildingId(j.buildingId) === configBuildingId);
    if (!job) return 'not_found';

    const elapsed = Date.now() - job.startedAt;
    if (elapsed < job.durationMs) return 'in_progress';

    // Готов — определяем успех/неудачу
    const recipe = CRAFTING_RECIPES.find(r => r.id === job.recipeId);
    if (!recipe) return 'not_found';

    if (recipe.failChance > 0 && Math.random() < recipe.failChance) {
      return 'failure';
    }
    return 'success';
  }

  /** Получить прогресс (0-1) */
  getProgress(player: PlayerProfile, buildingId: string): number {
    const configBuildingId = resolveBuildingId(buildingId);
    const job = player.activeCraftJobs.find(j => resolveBuildingId(j.buildingId) === configBuildingId);
    if (!job) return 0;
    const elapsed = Date.now() - job.startedAt;
    return Math.min(1, elapsed / job.durationMs);
  }

  /** Получить оставшееся время в секундах */
  getRemainingSeconds(player: PlayerProfile, buildingId: string): number {
    const configBuildingId = resolveBuildingId(buildingId);
    const job = player.activeCraftJobs.find(j => resolveBuildingId(j.buildingId) === configBuildingId);
    if (!job) return 0;
    const remaining = job.durationMs - (Date.now() - job.startedAt);
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /** Завершить крафт (забрать результат) */
  completeCraft(player: PlayerProfile, buildingId: string): CraftResult | null {
    const configBuildingId = resolveBuildingId(buildingId);
    const jobIndex = player.activeCraftJobs.findIndex(j => resolveBuildingId(j.buildingId) === configBuildingId);
    if (jobIndex === -1) return null;

    const job = player.activeCraftJobs[jobIndex];
    const recipe = CRAFTING_RECIPES.find(r => r.id === job.recipeId);
    if (!recipe) return null;

    // Удалить джоб
    player.activeCraftJobs.splice(jobIndex, 1);

    // Определить успех/провал
    const failed = recipe.failChance > 0 && Math.random() < recipe.failChance;

    if (failed) {
      // Вернуть 30% ресурсов
      const returned = recipe.inputs.map(input => ({
        resourceId: input.resourceId,
        amount: Math.max(1, Math.floor(input.amount * 0.3)),
      }));
      for (const ret of returned) {
        addResourceAmount(player.resources, ret.resourceId, ret.amount);
      }
      return { status: 'failure', recipe, inputsReturned: returned };
    }

    // Успех — выдать output
    for (const output of recipe.outputs) {
      addResourceAmount(player.resources, output.resourceId, output.amount);
    }

    // Добавить рецепт в разблокированные если ещё нет
    if (!player.unlockedRecipes.includes(recipe.id)) {
      player.unlockedRecipes.push(recipe.id);
    }

    return { status: 'success', recipe, outputsGranted: recipe.outputs };
  }
}
