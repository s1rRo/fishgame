// ============================================================
// SEASON PASS SCENE v2.0 — 28 уровней из тз/11_GAME_CONFIGS.md
// Free + Premium треки, таймер, клейм наград
// ============================================================
import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { SeasonPassManager } from '../services/SeasonPassManager';
import { TopHUD } from '../ui/TopHUD';
import { PlayerProfile } from '../models/Player';
import { SEASON_PASS_LEVELS, SEASON_PASS_CONFIG } from '../data/seasonPassConfig';

export class SeasonPassScene extends BaseScene {
  private authService = AuthService.getInstance();
  private dbService   = DatabaseService.getInstance();
  private spManager   = SeasonPassManager.getInstance();
  private hud!: TopHUD;

  private uid     = '';
  private profile: PlayerProfile | null = null;
  private particles: THREE.Mesh[] = [];

  async start() {
    this.hud = new TopHUD(this.uiContainer);
    this.hud.setDefaultNavigation(this.sceneManager);
    await this.loadData();
    this.setup3D();
    this.renderUI();
  }

  private async loadData() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.uid     = user.uid;
    this.profile = await this.dbService.getPlayerProfile(this.uid);
    if (this.profile) this.hud.render(this.profile, 'Season Pass');
  }

  private setup3D() {
    this.scene.background = new THREE.Color(0x0d0d2b);
    this.camera.position.set(0, 0, 10);
    const ambient = new THREE.AmbientLight(0x4466cc, 0.8);
    this.scene.add(ambient);

    for (let i = 0; i < 80; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.07, 0.07),
        new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.9, 0.7) })
      );
      m.position.set((Math.random()-0.5)*18, (Math.random()-0.5)*12, (Math.random()-0.5)*6);
      m.userData.phase = Math.random() * Math.PI * 2;
      this.scene.add(m);
      this.particles.push(m);
    }
  }

  private renderUI() {
    if (!this.profile) {
      const err = document.createElement('div');
      err.style.cssText = 'position:absolute;top:50%;width:100%;text-align:center;font-family:var(--font-pixel);font-size:14px;color:#e74c3c;';
      err.innerText = 'Профиль не загружен';
      this.uiContainer.appendChild(err);
      return;
    }

    const sp = this.profile.seasonPass;
    const xp          = sp?.freeTrackProgress ?? 0; // total XP earned
    const premOwned   = sp?.premiumOwned ?? false;
    const claimed     = sp?.claimedRewards ?? [];
    const startTs     = sp?.seasonStartTimestamp ?? Date.now();
    const secsLeft    = this.spManager.getSecondsLeft(startTs);
    const daysLeft    = Math.floor(secsLeft / 86400);
    const hoursLeft   = Math.floor((secsLeft % 86400) / 3600);

    // Текущий уровень Season Pass (XP / xpPerLevel)
    const currentLevel = Math.min(
      Math.floor(xp / SEASON_PASS_CONFIG.xpPerLevel),
      SEASON_PASS_CONFIG.totalLevels
    );
    const xpInLevel    = xp % SEASON_PASS_CONFIG.xpPerLevel;
    const xpNeeded     = SEASON_PASS_CONFIG.xpPerLevel;

    // Создаём overlay на document.body
    const overlay = document.createElement('div');
    overlay.className = 'rl-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;
      background:rgba(5,12,25,0.92);
      backdrop-filter:blur(4px);
      z-index:1000;
      display:flex;align-items:flex-start;justify-content:center;
      padding-top:20px;
      overflow-y:auto;
      pointer-events:auto;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      width:min(720px,96vw);
      padding:20px;
      padding-bottom:40px;
    `;

    // ── Заголовок + таймер ──
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <div style="font-family:var(--font-pixel);font-size:clamp(12px,2.5vw,16px);color:#f39c12;text-shadow:0 0 20px rgba(243,156,18,0.5);">
          ⭐ SEASON PASS
        </div>
        <div style="font-family:var(--font-ui);font-size:15px;color:#9b59b6;font-weight:700;">
          📅 Осталось: ${daysLeft}д ${hoursLeft}ч
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-family:var(--font-ui);font-size:16px;color:var(--text-dim);">
          Уровень <span style="color:#f39c12;font-weight:700;">${currentLevel}</span> / ${SEASON_PASS_CONFIG.totalLevels}
        </span>
        <span style="font-family:var(--font-ui);font-size:14px;color:var(--text-muted);">
          ${xpInLevel} / ${xpNeeded} XP
        </span>
      </div>

      <div style="height:10px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);margin-bottom:20px;">
        <div style="height:100%;width:${Math.round((xpInLevel / xpNeeded) * 100)}%;background:linear-gradient(90deg,#e67e22,#f39c12);border-radius:2px;transition:width 0.3s;"></div>
      </div>
    `;

    // ── Таблица 28 уровней ──
    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:20px;';

    // Заголовок таблицы
    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
      display:grid;grid-template-columns:50px 1fr 1fr;gap:8px;
      padding:8px 12px;
      font-family:var(--font-ui);font-size:13px;font-weight:700;
      color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;
    `;
    headerRow.innerHTML = '<span>Ур.</span><span>🎣 Free</span><span>👑 Premium</span>';
    grid.appendChild(headerRow);

    SEASON_PASS_LEVELS.forEach(lvl => {
      const reached     = currentLevel >= lvl.level;
      const freeClaimId = `sp_free_${lvl.level}`;
      const premClaimId = `sp_prem_${lvl.level}`;
      const freeClaimed = claimed.includes(freeClaimId);
      const premClaimed = claimed.includes(premClaimId);

      const row = document.createElement('div');
      row.style.cssText = `
        display:grid;grid-template-columns:50px 1fr 1fr;gap:8px;
        padding:8px 12px;
        background:${reached ? 'rgba(243,156,18,0.08)' : 'rgba(255,255,255,0.02)'};
        border-left:3px solid ${reached ? '#f39c12' : 'rgba(255,255,255,0.06)'};
        font-family:var(--font-ui);font-size:14px;color:var(--text);
        transition:background 0.15s;
      `;

      // Номер уровня
      const numEl = document.createElement('span');
      numEl.style.cssText = `font-weight:700;color:${reached ? '#f39c12' : 'var(--text-muted)'};`;
      numEl.innerText = String(lvl.level);
      row.appendChild(numEl);

      // Free reward
      const freeEl = document.createElement('div');
      freeEl.style.cssText = 'display:flex;align-items:center;gap:6px;';
      if (freeClaimed) {
        freeEl.innerHTML = `<span style="color:#27ae60;">✓</span><span style="color:var(--text-dim);text-decoration:line-through;">${lvl.freeIcon} ${lvl.freeReward}</span>`;
      } else if (reached) {
        const claimBtn = document.createElement('button');
        claimBtn.className = 'btn-primary';
        claimBtn.style.cssText = 'padding:4px 12px;font-size:9px;pointer-events:auto;cursor:pointer;';
        claimBtn.innerText = 'ЗАБРАТЬ';
        claimBtn.onclick = () => this.claimReward(freeClaimId, lvl.freeType, lvl.freeAmount, overlay);
        freeEl.innerHTML = `<span>${lvl.freeIcon}</span>`;
        freeEl.appendChild(claimBtn);
      } else {
        freeEl.innerHTML = `<span style="opacity:0.4;">${lvl.freeIcon} ${lvl.freeReward}</span>`;
      }
      row.appendChild(freeEl);

      // Premium reward
      const premEl = document.createElement('div');
      premEl.style.cssText = 'display:flex;align-items:center;gap:6px;';
      if (!premOwned) {
        premEl.innerHTML = `<span style="opacity:0.3;">🔒 ${lvl.premiumReward}</span>`;
      } else if (premClaimed) {
        premEl.innerHTML = `<span style="color:#27ae60;">✓</span><span style="color:var(--text-dim);text-decoration:line-through;">${lvl.premiumIcon} ${lvl.premiumReward}</span>`;
      } else if (reached) {
        const claimBtn = document.createElement('button');
        claimBtn.className = 'btn-gold';
        claimBtn.style.cssText = 'padding:4px 12px;font-size:9px;pointer-events:auto;cursor:pointer;';
        claimBtn.innerText = 'ЗАБРАТЬ';
        claimBtn.onclick = () => this.claimReward(premClaimId, lvl.premiumType, lvl.premiumAmount, overlay);
        premEl.innerHTML = `<span>${lvl.premiumIcon}</span>`;
        premEl.appendChild(claimBtn);
      } else {
        premEl.innerHTML = `<span style="opacity:0.4;">${lvl.premiumIcon} ${lvl.premiumReward}</span>`;
      }
      row.appendChild(premEl);

      grid.appendChild(row);
    });

    container.appendChild(grid);

    // ── Кнопка купить Premium ──
    if (!premOwned) {
      const buyWrap = document.createElement('div');
      buyWrap.style.cssText = 'text-align:center;margin-bottom:16px;';
      const buyBtn = document.createElement('button');
      buyBtn.className = 'btn-gold';
      buyBtn.style.cssText = 'padding:14px 32px;font-size:11px;';
      buyBtn.innerText = `👑 КУПИТЬ PREMIUM — ${SEASON_PASS_CONFIG.premiumCostGems} 💎`;
      buyBtn.onclick = async () => {
        const ok = await this.spManager.buyPremium(this.uid);
        if (ok) {
          this.hud.showToast('👑 Premium Pass куплен!', 'gold');
          overlay.remove();
          this.sceneManager.startScene('SeasonPassScene');
        } else {
          this.hud.showToast('Недостаточно гемов!', 'error');
        }
      };
      buyWrap.appendChild(buyBtn);
      container.appendChild(buyWrap);
    }

    // ── Предупреждение о конце сезона (≤ 1 дня) ──
    if (daysLeft <= 1 && secsLeft > 0) {
      const warnDiv = document.createElement('div');
      warnDiv.style.cssText = `
        padding:16px;margin-bottom:16px;
        background:rgba(231,76,60,0.15);border:2px solid #e74c3c;border-radius:8px;
        text-align:center;font-family:'Rajdhani',sans-serif;color:#e74c3c;font-size:15px;
      `;
      warnDiv.innerHTML = `
        <div style="font-family:'Press Start 2P',monospace;font-size:11px;margin-bottom:8px;">⚠ СЕЗОН ЗАВЕРШАЕТСЯ!</div>
        <p>Осталось менее 24 часов. Заберите все награды!</p>
      `;
      container.appendChild(warnDiv);
    }

    // ── Модал конца сезона (сезон истёк) ──
    if (secsLeft <= 0) {
      const endDiv = document.createElement('div');
      endDiv.style.cssText = `
        padding:24px;margin-bottom:16px;
        background:rgba(10,22,40,0.95);border:2px solid #9b59b6;border-radius:12px;
        text-align:center;font-family:'Rajdhani',sans-serif;color:white;
      `;
      endDiv.innerHTML = `
        <div style="font-size:48px;margin-bottom:12px;">🏆</div>
        <h3 style="font-family:'Press Start 2P',monospace;font-size:13px;color:#9b59b6;margin-bottom:12px;">СЕЗОН ЗАВЕРШЁН</h3>
        <p style="color:#bdc3c7;margin-bottom:20px;">Выберите, что произойдёт с вашими NPC:</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button id="sp-extend" style="padding:12px 20px;background:#9b59b6;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:'Rajdhani',sans-serif;">
            💎 ПРОДЛИТЬ<br><span style="font-size:11px;opacity:0.8;">Сохранить текущих NPC</span>
          </button>
          <button id="sp-replace" style="padding:12px 20px;background:#e67e22;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:'Rajdhani',sans-serif;">
            🔄 ЗАМЕНИТЬ<br><span style="font-size:11px;opacity:0.8;">Новая гача NPC</span>
          </button>
          <button id="sp-later" style="padding:12px 20px;background:#2c3e50;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:'Rajdhani',sans-serif;">
            Позже<br><span style="font-size:11px;opacity:0.8;">NPC уйдут</span>
          </button>
        </div>
      `;
      container.appendChild(endDiv);

      // Обработчики конца сезона — запускаем после вставки в DOM
      setTimeout(() => {
        endDiv.querySelector('#sp-extend')?.addEventListener('click', async () => {
          // Продлить: ничего не меняем, сбрасываем таймер
          await this.spManager.extendSeason(this.uid);
          this.hud.showToast('Сезон продлён! NPC остаются.', 'gold');
          overlay.remove();
          this.sceneManager.startScene('PlanetScene');
        });
        endDiv.querySelector('#sp-replace')?.addEventListener('click', async () => {
          // Заменить: новая гача
          await this.spManager.replaceSeason(this.uid);
          this.hud.showToast('Новый сезон! NPC обновлены.', 'info');
          overlay.remove();
          this.sceneManager.startScene('PlanetScene');
        });
        endDiv.querySelector('#sp-later')?.addEventListener('click', () => {
          overlay.remove();
          this.sceneManager.startScene('PlanetScene');
        });
      }, 0);
    }

    // ── Кнопки навигации ──
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-secondary';
    backBtn.innerText = '← Назад';
    backBtn.onclick = () => {
      overlay.remove();
      this.sceneManager.startScene('PlanetScene');
    };
    btnRow.appendChild(backBtn);
    container.appendChild(btnRow);

    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }

  private async claimReward(rewardId: string, type: string, amount: number, overlay: HTMLElement) {
    const result = await this.spManager.claimReward(this.uid, rewardId);
    if (result.success) {
      let msg = 'Награда получена!';
      if (type === 'softCoins') msg = `+${amount} 💰`;
      else if (type === 'gems') msg = `+${amount} 💎`;
      this.hud.showToast(msg, 'success');
      overlay.remove();
      this.sceneManager.startScene('SeasonPassScene');
    }
  }

  update(delta: number) {
    const time = Date.now() * 0.001;
    this.particles.forEach(p => {
      const phase = p.userData.phase as number;
      const s = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + phase));
      p.scale.setScalar(s);
      p.rotation.x += delta * 1.5;
    });
  }

  stop() {
    super.stop();
    // Убираем overlay если остался
    document.querySelectorAll('.rl-overlay').forEach(el => {
      if (el.closest('#game-container') === null) el.remove();
    });
  }
}
