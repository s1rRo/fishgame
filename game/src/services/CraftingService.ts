// ============================================================
// CRAFTING SERVICE — запуск, прогресс, завершение крафта
// River Lord: Pixel Fishery
// ============================================================

import { CRAFTING_RECIPES, CraftingRecipe } from '../data/craftingRecipes';
import type { PlayerProfile, CraftJob } from '../models/Player';

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
      const building = (player.farmBuildings as any)[r.requiredBuilding];
      if (!building || building.level < r.requiredBuildingLevel) return false;
      return true;
    });
  }

  /** Проверить хватает ли ресурсов */
  canAfford(player: PlayerProfile, recipeId: string): boolean {
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;

    return recipe.inputs.every(input => {
      const have = player.resources[input.resourceId] ?? 0;
      return have >= input.amount;
    });
  }

  /** Запустить крафт */
  startCraft(player: PlayerProfile, recipeId: string, buildingId: string): CraftJob | null {
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return null;
    if (!this.canAfford(player, recipeId)) return null;

    // Проверить что нет активного крафта на этом здании
    const existing = player.activeCraftJobs.find(j => j.buildingId === buildingId);
    if (existing) return null;

    // Списать ресурсы
    for (const input of recipe.inputs) {
      player.resources[input.resourceId] = (player.resources[input.resourceId] ?? 0) - input.amount;
    }

    // Создать джоб
    const job: CraftJob = {
      recipeId,
      buildingId,
      startedAt: Date.now(),
      durationMs: recipe.timeMinutes * 60 * 1000,
    };

    player.activeCraftJobs.push(job);
    return job;
  }

  /** Проверить статус крафта */
  checkStatus(player: PlayerProfile, buildingId: string): CraftStatus {
    const job = player.activeCraftJobs.find(j => j.buildingId === buildingId);
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
    const job = player.activeCraftJobs.find(j => j.buildingId === buildingId);
    if (!job) return 0;
    const elapsed = Date.now() - job.startedAt;
    return Math.min(1, elapsed / job.durationMs);
  }

  /** Получить оставшееся время в секундах */
  getRemainingSeconds(player: PlayerProfile, buildingId: string): number {
    const job = player.activeCraftJobs.find(j => j.buildingId === buildingId);
    if (!job) return 0;
    const remaining = job.durationMs - (Date.now() - job.startedAt);
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /** Завершить крафт (забрать результат) */
  completeCraft(player: PlayerProfile, buildingId: string): CraftResult | null {
    const jobIndex = player.activeCraftJobs.findIndex(j => j.buildingId === buildingId);
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
        player.resources[ret.resourceId] = (player.resources[ret.resourceId] ?? 0) + ret.amount;
      }
      return { status: 'failure', recipe, inputsReturned: returned };
    }

    // Успех — выдать output
    for (const output of recipe.outputs) {
      player.resources[output.resourceId] = (player.resources[output.resourceId] ?? 0) + output.amount;
    }

    // Добавить рецепт в разблокированные если ещё нет
    if (!player.unlockedRecipes.includes(recipe.id)) {
      player.unlockedRecipes.push(recipe.id);
    }

    return { status: 'success', recipe, outputsGranted: recipe.outputs };
  }
}
