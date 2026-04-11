// ============================================================
// CRAFTING POPUP — UI для крафта ресурсов
// HTML попап на document.body (паттерн BuildingScreen)
// ============================================================

import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { CraftingService } from '../services/CraftingService';
import { AudioManager } from '../services/AudioManager';
import { CRAFTING_RECIPES, CraftingRecipe } from '../data/craftingRecipes';
import {
  addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle,
  getSectionStyle, getButtonStyle, getButtonRowStyle,
  applyButtonHover, createCloseButton,
} from '../ui/DesignSystem';
import { getResourceAmount, resolveBuildingId } from '../utils/IdAliases';
import type { PlayerProfile } from '../models/Player';

export class CraftingPopup extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private removeEsc: (() => void) | null = null;
  private buildingId = 'smokehouse';
  private craftService = CraftingService.getInstance();
  private timerHandle = 0;

  start(data?: any): void {
    this.buildingId = data?.buildingId ?? 'smokehouse';
    this.scene.background = null;
    this.showPopup();
  }

  update(_delta: number): void {}

  stop(): void {
    super.stop();
    this.removeEsc?.();
    this.removeEsc = null;
    this.overlay?.remove();
    this.overlay = null;
    if (this.timerHandle) { clearInterval(this.timerHandle); this.timerHandle = 0; }
  }

  private async showPopup(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (!user) { this.goBack(); return; }

    const player = await DatabaseService.getInstance().getPlayerProfile(user.uid);
    if (!player) { this.goBack(); return; }

    const configBuildingId = resolveBuildingId(this.buildingId);
    // Рецепты для этого здания
    const recipes = CRAFTING_RECIPES.filter(r => resolveBuildingId(r.requiredBuilding) === configBuildingId);
    const activeJob = player.activeCraftJobs.find(j => resolveBuildingId(j.buildingId) === configBuildingId);
    const activeRecipe = activeJob ? CRAFTING_RECIPES.find(r => r.id === activeJob.recipeId) : null;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = getOverlayStyle();

    const card = document.createElement('div');
    card.style.cssText = getCardStyle(460) + 'text-align:center;max-height:80vh;overflow-y:auto;';

    // Заголовок
    const title = document.createElement('h2');
    title.style.cssText = getTitleStyle();
    title.textContent = '⚒ КРАФТ';
    card.appendChild(title);
    card.appendChild(createCloseButton(() => this.goBack()));

    // Активный крафт
    if (activeJob && activeRecipe) {
      this.renderActiveJob(card, player, user.uid, activeJob, activeRecipe);
    } else {
      // Список рецептов
      if (recipes.length === 0) {
        const empty = document.createElement('p');
        empty.style.cssText = 'color:#95a5a6;font-size:14px;margin:20px 0;';
        empty.textContent = 'Нет доступных рецептов для этого здания.';
        card.appendChild(empty);
      } else {
        recipes.forEach(recipe => {
          this.renderRecipeCard(card, player, user.uid, recipe);
        });
      }
    }

    // Кнопка закрыть
    const btnRow = document.createElement('div');
    btnRow.style.cssText = getButtonRowStyle() + 'margin-top:12px;';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'ЗАКРЫТЬ';
    closeBtn.style.cssText = getButtonStyle('danger', 'md');
    applyButtonHover(closeBtn);
    closeBtn.addEventListener('click', () => this.goBack());
    btnRow.appendChild(closeBtn);
    card.appendChild(btnRow);

    this.overlay.appendChild(card);
    document.body.appendChild(this.overlay);

    this.removeEsc = addEscHandler(() => this.goBack());
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.goBack(); });
  }

  // ── Карточка рецепта ──────────────────────────────────────
  private renderRecipeCard(
    parent: HTMLElement,
    player: PlayerProfile,
    uid: string,
    recipe: CraftingRecipe,
  ): void {
    const canAfford = this.craftService.canAfford(player, recipe.id);
    const resolvedRecipeBuildingId = resolveBuildingId(recipe.requiredBuilding);
    const buildingLevel = (player.farmBuildings as any)?.[resolvedRecipeBuildingId]?.level
      ?? (player.farmBuildings as any)?.[recipe.requiredBuilding]?.level
      ?? 0;
    const hasBuilding = buildingLevel >= recipe.requiredBuildingLevel;
    const canStart = canAfford && hasBuilding;

    const section = document.createElement('div');
    section.style.cssText = getSectionStyle() + `
      text-align:left;margin-bottom:10px;
      opacity:${canStart ? '1' : '0.6'};
      border-left:3px solid ${canStart ? '#27ae60' : '#555'};
    `;

    // Название + время + шанс провала
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
    header.innerHTML = `
      <span style="font-weight:bold;font-size:14px;color:#ecf0f1;">${recipe.name}</span>
      <span style="font-size:11px;color:#7f8c8d;">⏱ ${recipe.timeMinutes} мин${recipe.failChance > 0 ? ` • ⚠ ${Math.round(recipe.failChance * 100)}% провал` : ''}</span>
    `;
    section.appendChild(header);

    // Входные ресурсы
    const inputsDiv = document.createElement('div');
    inputsDiv.style.cssText = 'font-size:12px;color:#bdc3c7;margin-bottom:4px;';
    const inputTexts = recipe.inputs.map(inp => {
      const have = getResourceAmount(player.resources, inp.resourceId);
      const enough = have >= inp.amount;
      return `<span style="color:${enough ? '#27ae60' : '#e74c3c'};">${have}/${inp.amount}</span> ${inp.resourceId}`;
    });
    inputsDiv.innerHTML = `📥 ${inputTexts.join(' + ')}`;
    section.appendChild(inputsDiv);

    // Выходные ресурсы
    const outputsDiv = document.createElement('div');
    outputsDiv.style.cssText = 'font-size:12px;color:#f39c12;margin-bottom:8px;';
    outputsDiv.innerHTML = `📤 ${recipe.outputs.map(o => `${o.amount}× ${o.resourceId}`).join(' + ')}`;
    section.appendChild(outputsDiv);

    // Требования здания (если не хватает)
    if (!hasBuilding) {
      const req = document.createElement('div');
      req.style.cssText = 'font-size:11px;color:#e74c3c;margin-bottom:6px;';
      req.textContent = `🔒 Требуется ${recipe.requiredBuilding} ур.${recipe.requiredBuildingLevel} (сейчас ур.${buildingLevel})`;
      section.appendChild(req);
    }

    // Кнопка "Начать"
    const startBtn = document.createElement('button');
    startBtn.textContent = '⚒ НАЧАТЬ КРАФТ';
    startBtn.style.cssText = getButtonStyle('primary', 'sm', !canStart);
    startBtn.disabled = !canStart;
    if (canStart) {
      applyButtonHover(startBtn);
      startBtn.addEventListener('click', async () => {
        const job = this.craftService.startCraft(player, recipe.id, resolveBuildingId(this.buildingId));
        if (job) {
          await DatabaseService.getInstance().updatePlayerStats(uid, {
            resources: player.resources,
            activeCraftJobs: player.activeCraftJobs,
          });
          AudioManager.getInstance().playSFX('button_click');
          this.refreshPopup();
        }
      });
    }
    section.appendChild(startBtn);

    parent.appendChild(section);
  }

  // ── Активный крафт (прогресс-бар) ────────────────────────
  private renderActiveJob(
    parent: HTMLElement,
    player: PlayerProfile,
    uid: string,
    job: { recipeId: string; buildingId: string; startedAt: number; durationMs: number },
    recipe: CraftingRecipe,
  ): void {
    const section = document.createElement('div');
    section.style.cssText = getSectionStyle() + 'text-align:left;margin-bottom:12px;border-left:3px solid #f39c12;';

    section.innerHTML = `
      <div style="font-weight:bold;font-size:15px;color:#f39c12;margin-bottom:8px;">⏳ ${recipe.name}</div>
      <div style="font-size:12px;color:#bdc3c7;margin-bottom:4px;">
        📤 ${recipe.outputs.map(o => `${o.amount}× ${o.resourceId}`).join(' + ')}
        ${recipe.failChance > 0 ? `<span style="color:#e74c3c;"> • ⚠ ${Math.round(recipe.failChance * 100)}% провал</span>` : ''}
      </div>
    `;

    // Прогресс-бар
    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'background:rgba(255,255,255,0.08);border-radius:4px;height:24px;overflow:hidden;margin-bottom:8px;position:relative;';

    const barFill = document.createElement('div');
    barFill.style.cssText = 'height:100%;background:linear-gradient(90deg,#f39c12,#e67e22);border-radius:4px;transition:width 0.5s;';

    const barText = document.createElement('span');
    barText.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:bold;';

    barWrap.appendChild(barFill);
    barWrap.appendChild(barText);
    section.appendChild(barWrap);

    // Кнопка забрать
    const collectBtn = document.createElement('button');
    collectBtn.textContent = '📦 ЗАБРАТЬ';
    collectBtn.style.cssText = getButtonStyle('primary', 'md', true);
    collectBtn.disabled = true;
    section.appendChild(collectBtn);

    parent.appendChild(section);

    // Обновляем прогресс каждую секунду
    const updateProgress = () => {
      const configBuildingId = resolveBuildingId(this.buildingId);
      const progress = this.craftService.getProgress(player, configBuildingId);
      const remaining = this.craftService.getRemainingSeconds(player, configBuildingId);
      barFill.style.width = `${Math.round(progress * 100)}%`;

      if (remaining > 0) {
        const min = Math.floor(remaining / 60);
        const sec = remaining % 60;
        barText.textContent = `${Math.round(progress * 100)}% — ${min}:${String(sec).padStart(2, '0')}`;
      } else {
        barText.textContent = '✅ Готово!';
        barFill.style.width = '100%';
        barFill.style.background = 'linear-gradient(90deg,#27ae60,#2ecc71)';
        collectBtn.disabled = false;
        collectBtn.style.cssText = getButtonStyle('primary', 'md');
        applyButtonHover(collectBtn);
        if (this.timerHandle) { clearInterval(this.timerHandle); this.timerHandle = 0; }
      }
    };

    updateProgress();
    this.timerHandle = window.setInterval(updateProgress, 1000);

    collectBtn.addEventListener('click', async () => {
      const result = this.craftService.completeCraft(player, resolveBuildingId(this.buildingId));
      if (!result) return;

      await DatabaseService.getInstance().updatePlayerStats(uid, {
        resources: player.resources,
        activeCraftJobs: player.activeCraftJobs,
        unlockedRecipes: player.unlockedRecipes,
      });

      if (result.status === 'success') {
        const items = result.outputsGranted!.map(o => `${o.amount}× ${o.resourceId}`).join(', ');
        AudioManager.getInstance().playSFX('coin_earn');
        this.showToast(`✅ Успех! Получено: ${items}`, '#27ae60');
      } else {
        const returned = result.inputsReturned!.map(r => `${r.amount}× ${r.resourceId}`).join(', ');
        AudioManager.getInstance().playSFX('line_break');
        this.showToast(`❌ Провал! Возвращено 30%: ${returned}`, '#e74c3c');
      }

      this.refreshPopup();
    });
  }

  // ── Утилиты ───────────────────────────────────────────────
  private refreshPopup(): void {
    if (this.timerHandle) { clearInterval(this.timerHandle); this.timerHandle = 0; }
    this.overlay?.remove();
    this.overlay = null;
    this.showPopup();
  }

  private showToast(msg: string, color: string): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;top:80px;left:50%;transform:translateX(-50%);
      background:${color};color:#fff;padding:10px 24px;border-radius:6px;
      font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:bold;
      z-index:10001;animation:rlToastIn 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  private goBack(): void {
    this.sceneManager.startScene('BuildingScreen', { buildingId: this.buildingId });
  }
}
