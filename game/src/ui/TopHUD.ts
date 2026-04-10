// ============================================================
// TOP HUD v2.0 — River Lord: Pixel Fishery
// Полноценный HUD с pixel-art дизайном и неон-акцентами
// ============================================================
import { PlayerProfile } from '../models/Player';
import { EconomyManager } from '../services/EconomyManager';
import { getNPCById } from '../data/npcDatabase';
import { AudioManager } from '../services/AudioManager';

export interface HUDCallbacks {
  onSettings?: () => void;
  onProfile?: () => void;
  onLeaderboard?: () => void;
}

export class TopHUD {
  private container: HTMLElement;
  private hudEl!: HTMLElement;
  private callbacks: HUDCallbacks = {};

  constructor(container: HTMLElement) {
    this.container = container;
    this._injectStyles();
  }

  /** Установить обработчики для кнопок HUD. Вызывать до render(). */
  public setCallbacks(cb: HUDCallbacks): void {
    this.callbacks = cb;
  }

  /** Установить стандартные навигационные обработчики из sceneManager */
  public setDefaultNavigation(sceneManager: { startScene: (name: string, data?: any) => void }): void {
    this.callbacks = {
      onSettings: () => this.showSettingsPopup(),
      onProfile: () => sceneManager.startScene('PlayerProfileScreen'),
      onLeaderboard: () => sceneManager.startScene('LeaderboardScene'),
    };
  }

  // ── RENDER ────────────────────────────────────────────────────
  public render(profile: PlayerProfile | null, sceneTitle?: string): void {
    const old = this.container.querySelector('#top-hud');
    if (old) old.remove();

    this.hudEl = document.createElement('div');
    this.hudEl.id = 'top-hud';
    this.hudEl.className = 'top-hud';
    this.hudEl.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      z-index: 100;
      pointer-events: none;
      user-select: none;
      background: linear-gradient(180deg, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.7) 100%);
      border-bottom: 1px solid rgba(52,152,219,0.2);
      backdrop-filter: blur(8px);
    `;

    // ── Левая часть: название сцены ──
    const leftSection = document.createElement('div');
    leftSection.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:0;flex-shrink:1;';

    if (sceneTitle) {
      const title = document.createElement('div');
      title.style.cssText = `
        font-family: 'Press Start 2P', 'Courier New', monospace;
        font-size: clamp(8px, 1.3vw, 11px);
        color: rgba(255,255,255,0.9);
        letter-spacing: 2px;
        text-transform: uppercase;
        text-shadow: 0 0 12px rgba(52,152,219,0.8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      title.innerText = sceneTitle;
      leftSection.appendChild(title);
    }
    this.hudEl.appendChild(leftSection);

    // ── Центр: Resource dropdown button ──
    if (profile) {
      const centerSection = document.createElement('div');
      centerSection.style.cssText = 'display:flex;align-items:center;gap:10px;pointer-events:auto;position:relative;';

      // Compact resource button showing coins + gems
      const resBtn = document.createElement('button');
      resBtn.style.cssText = `
        display:flex;align-items:center;gap:8px;
        background:rgba(10,22,40,0.8);border:1px solid rgba(243,156,18,0.4);
        padding:4px 12px;border-radius:4px;cursor:pointer;
        font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:#e8f4fd;
      `;
      resBtn.innerHTML = `<span style="color:#f39c12">💰 ${this._fmt(profile.softCoins)}</span> <span style="color:#9b59b6">💎 ${this._fmt(profile.gems)}</span>`;

      // Dropdown panel
      const dropdown = document.createElement('div');
      dropdown.style.cssText = `
        display:none;position:absolute;top:42px;left:50%;transform:translateX(-50%);
        background:linear-gradient(135deg,#0a1628,#1a2a45);border:1px solid rgba(52,152,219,0.3);
        padding:12px;border-radius:6px;min-width:200px;z-index:9000;
        font-family:'Rajdhani',monospace;font-size:13px;color:#ecf0f1;
        box-shadow:0 8px 24px rgba(0,0,0,0.6);
      `;
      const resources: [string, string, string][] = [
        ['💰', 'Монеты', this._fmt(profile.softCoins)],
        ['💎', 'Гемы', this._fmt(profile.gems)],
        ['🪵', 'Дерево', String(profile.resources?.wood ?? 0)],
        ['🪨', 'Камень', String(profile.resources?.stone ?? 0)],
      ];
      // Add fish from inventory
      const fishCounts: Record<string, number> = {};
      (profile.inventory ?? []).forEach(f => { fishCounts[f.name] = (fishCounts[f.name] ?? 0) + 1; });
      for (const [name, cnt] of Object.entries(fishCounts)) {
        resources.push(['🐟', name, String(cnt)]);
      }
      // Add pond fish
      (profile.pondFish ?? []).forEach(pf => {
        resources.push(['🐠', pf.fishId, '(пруд)']);
      });

      dropdown.innerHTML = resources.map(([icon, name, val]) =>
        `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span>${icon} ${name}</span><span style="color:#f39c12;font-weight:700">${val}</span>
        </div>`
      ).join('');

      let dropdownOpen = false;
      resBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        dropdownOpen = !dropdownOpen;
        dropdown.style.display = dropdownOpen ? 'block' : 'none';
      });
      // Close on click outside
      const closeDropdown = () => { dropdownOpen = false; dropdown.style.display = 'none'; };
      document.addEventListener('click', closeDropdown);

      centerSection.appendChild(resBtn);
      centerSection.appendChild(dropdown);
      this.hudEl.appendChild(centerSection);

      // ── Правая часть: иконки (без уровня) ──
      const rightSection = document.createElement('div');
      rightSection.style.cssText = 'display:flex;align-items:center;gap:6px;pointer-events:auto;';

      const actions = ['⚙', '👤', '🏆'];
      const actionIds = ['hud-settings', 'hud-profile', 'hud-leaderboard'];
      actions.forEach((icon, i) => {
        const btn = document.createElement('button');
        btn.id = actionIds[i];
        btn.style.cssText = `
          background: rgba(52,152,219,0.1);
          border: 1px solid rgba(52,152,219,0.3);
          color: #8fadc4;
          width: 34px; height: 34px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 15px;
          transition: all 0.15s;
          display: flex; align-items: center; justify-content: center;
        `;
        btn.innerText = icon;
        btn.onmouseenter = () => { btn.style.background = 'rgba(52,152,219,0.2)'; btn.style.color = '#e8f4fd'; };
        btn.onmouseleave = () => { btn.style.background = 'rgba(52,152,219,0.1)'; btn.style.color = '#8fadc4'; };
        const cbKey = ['onSettings', 'onProfile', 'onLeaderboard'][i] as keyof HUDCallbacks;
        btn.onclick = () => { this.callbacks[cbKey]?.(); };
        rightSection.appendChild(btn);
      });

      this.hudEl.appendChild(rightSection);

      // ── Нижняя строка HUD: NPC таймеры + цены ──
      const subRow = document.createElement('div');
      subRow.style.cssText = `
        position:absolute;top:52px;left:0;right:0;height:24px;
        display:flex;align-items:center;justify-content:center;gap:16px;
        background:rgba(10,22,40,0.8);border-bottom:1px solid rgba(52,152,219,0.15);
        font-family:'Rajdhani',sans-serif;font-size:12px;color:#8fadc4;
        padding:0 10px;overflow:hidden;
      `;

      // NPC таймеры
      const dispatches = Object.entries(profile.npcDispatches ?? {});
      const now = Date.now();
      for (const [npcId, d] of dispatches.slice(0, 3)) {
        const npcDef = getNPCById(npcId);
        const name = npcDef?.name ?? npcId.slice(0, 8);
        const remaining = Math.max(0, d.estimatedReturnAt - now);
        const mins = Math.ceil(remaining / 60000);
        const timeStr = mins > 60 ? `${Math.floor(mins / 60)}ч${mins % 60}м` : `${mins}м`;
        const done = remaining <= 0;
        const tag = document.createElement('span');
        tag.style.color = done ? '#27ae60' : '#f39c12';
        tag.textContent = done ? `✅ ${name}` : `⏱ ${name} ${timeStr}`;
        subRow.appendChild(tag);
      }

      // Топ-3 изменения цен
      const priceChanges = EconomyManager.getInstance().getTopPriceChanges();
      for (const pc of priceChanges) {
        const up = pc.change >= 0;
        const tag = document.createElement('span');
        tag.style.color = up ? '#27ae60' : '#e74c3c';
        tag.textContent = `${up ? '🟢' : '🔴'} ${pc.resourceId} ${up ? '+' : ''}${pc.change.toFixed(1)}%`;
        subRow.appendChild(tag);
      }

      this.hudEl.appendChild(subRow);
    }

    this.container.appendChild(this.hudEl);
  }

  public update(profile: PlayerProfile): void {
    this.render(profile);
  }

  // ── TOAST ─────────────────────────────────────────────────────
  public showToast(message: string, typeOrColor: 'success' | 'error' | 'info' | 'gold' | string = 'success', duration = 2600): void {
    // Поддерживает как тип ('success','error','info','gold'), так и hex-цвет ('#e74c3c')
    const colorMap: Record<string, { bg: string; border: string; glow: string }> = {
      success: { bg: '#1a5c2e', border: '#27ae60', glow: '#27ae60' },
      error:   { bg: '#5c1a1a', border: '#e74c3c', glow: '#e74c3c' },
      info:    { bg: '#0a2a4a', border: '#3498db', glow: '#3498db' },
      gold:    { bg: '#3d2800', border: '#f39c12', glow: '#f39c12' },
      // hex-цвета из старого кода
      '#27ae60': { bg: '#1a5c2e', border: '#27ae60', glow: '#27ae60' },
      '#2ecc71': { bg: '#1a5c2e', border: '#2ecc71', glow: '#2ecc71' },
      '#e74c3c': { bg: '#5c1a1a', border: '#e74c3c', glow: '#e74c3c' },
      '#f39c12': { bg: '#3d2800', border: '#f39c12', glow: '#f39c12' },
      '#e67e22': { bg: '#3d2000', border: '#e67e22', glow: '#e67e22' },
      '#9b59b6': { bg: '#2a1040', border: '#9b59b6', glow: '#9b59b6' },
      '#8e44ad': { bg: '#2a1040', border: '#8e44ad', glow: '#8e44ad' },
      '#3498db': { bg: '#0a2a4a', border: '#3498db', glow: '#3498db' },
    };
    const c = colorMap[typeOrColor] ?? { bg: '#0a2a4a', border: typeOrColor, glow: typeOrColor };

    const toast = document.createElement('div');
    toast.className = 'rl-toast';
    toast.style.cssText = `
      position: fixed;
      top: 68px;
      left: 50%;
      transform: translateX(-50%);
      background: ${c.bg};
      border: 2px solid ${c.border};
      color: #fff;
      padding: 10px 22px;
      font-family: 'Rajdhani', 'Courier New', monospace;
      font-size: 16px;
      font-weight: 700;
      z-index: 9997;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6), 0 0 12px ${c.glow}44;
      clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
      animation: rlToastIn 0.3s ease;
    `;
    toast.innerHTML = `<span style="color:${c.border};margin-right:8px">▶</span>${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-8px)';
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  // ── POPUP ─────────────────────────────────────────────────────
  public showPopup(opts: {
    title: string;
    body: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmColor?: string;
    icon?: string;
  }): void {
    const overlay = document.createElement('div');
    overlay.className = 'rl-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,5,15,0.88);
      backdrop-filter: blur(5px);
      display: flex; align-items: center; justify-content: center;
      z-index: 9998;
      pointer-events: auto;
      animation: rlFadeIn 0.2s ease;
    `;

    const confirmBg = opts.confirmColor || '#27ae60';

    const box = document.createElement('div');
    box.style.cssText = `
      background: linear-gradient(160deg, #0f1e30 0%, #0a1628 100%);
      border: 2px solid rgba(52,152,219,0.5);
      max-width: 520px;
      width: 92vw;
      padding: 36px 36px 30px;
      text-align: center;
      position: relative;
      clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
      box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(52,152,219,0.2);
      animation: rlPopIn 0.25s cubic-bezier(0.175,0.885,0.32,1.275);
    `;

    // Corner decoration
    box.innerHTML = `
      <div style="position:absolute;top:10px;right:10px;width:20px;height:20px;border-top:2px solid rgba(52,152,219,0.7);border-right:2px solid rgba(52,152,219,0.7);pointer-events:none"></div>
      <div style="position:absolute;bottom:10px;left:10px;width:20px;height:20px;border-bottom:2px solid rgba(52,152,219,0.7);border-left:2px solid rgba(52,152,219,0.7);pointer-events:none"></div>
      ${opts.icon ? `<div style="font-size:42px;margin-bottom:16px;line-height:1">${opts.icon}</div>` : ''}
      <div style="
        font-family:'Press Start 2P','Courier New',monospace;
        font-size:clamp(12px,2.2vw,16px);
        color:#ecf0f1;
        text-shadow:0 0 20px rgba(52,152,219,0.7);
        margin-bottom:14px;
        line-height:1.7;
      ">${opts.title}</div>
      <div style="
        font-family:'Rajdhani','Courier New',monospace;
        font-size:16px;
        color:#95a5a6;
        line-height:1.7;
        margin-bottom:28px;
      ">${opts.body}</div>
    `;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;';

    const removeOverlay = () => {
      overlay.style.animation = 'none';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s';
      setTimeout(() => overlay.remove(), 200);
    };

    const confirmBtn = this._popupBtn(opts.confirmText, confirmBg, () => {
      removeOverlay(); opts.onConfirm();
    });
    btnRow.appendChild(confirmBtn);

    if (opts.cancelText) {
      const cancelBtn = this._popupBtn(opts.cancelText, '#2c3e50', () => {
        removeOverlay(); opts.onCancel?.();
      });
      btnRow.appendChild(cancelBtn);
    }

    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // ── NAVIGATION BAR ─────────────────────────────────────────────
  /** Рендерить нижний нав-бар. Кнопки: [{icon, label, onClick}] */
  public renderNavBar(buttons: { icon: string; label: string; active?: boolean; onClick: () => void }[]): void {
    const old = this.container.querySelector('#nav-bar');
    if (old) old.remove();

    const bar = document.createElement('div');
    bar.id = 'nav-bar';
    bar.className = 'nav-bar';

    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn' + (b.active ? ' active' : '');
      btn.innerHTML = `<span class="nav-icon">${b.icon}</span><span>${b.label}</span>`;
      btn.style.pointerEvents = 'auto';
      btn.onclick = b.onClick;
      bar.appendChild(btn);
    });

    this.container.appendChild(bar);
  }

  // ── PRIVATE HELPERS ──────────────────────────────────────────────
  private _currencyBadge(icon: string, value: string, color: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'hud-currency';
    el.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: 'Rajdhani', sans-serif;
      font-size: 16px; font-weight: 700;
      color: ${color};
      white-space: nowrap;
    `;
    el.innerHTML = `<span style="font-size:14px">${icon}</span><span style="color:#e8f4fd">${value}</span>`;
    return el;
  }

  private _badge(icon: string, text: string, color: string, bgColor: string): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      background: ${bgColor}88;
      border: 1px solid ${color}66;
      font-family: 'Rajdhani', 'Courier New', monospace;
      font-size: 15px;
      font-weight: 700;
      color: ${color};
      clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
      white-space: nowrap;
      text-shadow: 0 0 8px ${color}88;
    `;
    el.innerHTML = `<span style="font-size:14px">${icon}</span><span style="color:#ecf0f1">${text}</span>`;
    return el;
  }

  private _seasonBadge(progress: number): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(15,30,60,0.8);
      border: 1px solid rgba(52,152,219,0.5);
      font-family: 'Rajdhani', 'Courier New', monospace;
      font-size: 14px;
      font-weight: 700;
      color: #5dade2;
      clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
      white-space: nowrap;
    `;
    const barW = Math.round(progress);
    el.innerHTML = `
      <span style="font-size:13px">📅</span>
      <div style="display:flex;flex-direction:column;gap:2px">
        <span style="color:#ecf0f1;font-size:12px">Сезон</span>
        <div style="width:52px;height:4px;background:rgba(0,0,0,0.4);border:1px solid rgba(52,152,219,0.3)">
          <div style="width:${barW}%;height:100%;background:linear-gradient(90deg,#2980b9,#3498db);box-shadow:0 0 4px #3498db"></div>
        </div>
      </div>
      <span style="font-size:12px;color:#3498db">${progress}%</span>
    `;
    return el;
  }

  private _popupBtn(text: string, bg: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.style.cssText = `
      background: ${bg};
      color: #fff;
      border: 2px solid rgba(255,255,255,0.4);
      padding: 13px 28px;
      font-family: 'Rajdhani', 'Courier New', monospace;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
      transition: filter 0.15s, transform 0.1s;
      pointer-events: auto;
    `;
    btn.innerText = text;
    btn.onmouseenter = () => { btn.style.filter = 'brightness(1.2)'; btn.style.transform = 'translateY(-1px)'; };
    btn.onmouseleave = () => { btn.style.filter = ''; btn.style.transform = ''; };
    btn.onmousedown  = () => { btn.style.transform = 'translateY(1px)'; };
    btn.onclick = onClick;
    return btn;
  }

  private _fmt(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  }

  /** Settings popup with sound controls */
  public showSettingsPopup(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;
      display:flex;align-items:center;justify-content:center;
    `;
    const panel = document.createElement('div');
    panel.style.cssText = `
      background:linear-gradient(135deg,#0a1628,#1a2a45);border:1px solid rgba(52,152,219,0.3);
      padding:24px;max-width:350px;width:90%;border-radius:8px;color:#ecf0f1;
      font-family:'Rajdhani',monospace;
    `;
    panel.innerHTML = `
      <h3 style="font-family:'Press Start 2P',monospace;font-size:12px;margin:0 0 16px;color:#3498db;text-align:center;">⚙ НАСТРОЙКИ</h3>
    `;

    const audio = AudioManager.getInstance();

    // SFX Volume slider
    const sfxRow = this._settingsSlider('🔊 Звуки', Math.round(audio.getSFXVolume() * 100), (v) => {
      audio.setSFXVolume(v / 100);
    });
    panel.appendChild(sfxRow);

    // Music Volume slider
    const musicRow = this._settingsSlider('🎵 Музыка', Math.round(audio.getMusicVolume() * 100), (v) => {
      audio.setMusicVolume(v / 100);
    });
    panel.appendChild(musicRow);

    // Mute toggle
    const muteRow = document.createElement('div');
    muteRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);';
    const muteLabel = document.createElement('span');
    muteLabel.style.cssText = 'font-size:14px;';
    muteLabel.textContent = '🔇 Без звука';
    const muteCheck = document.createElement('input');
    muteCheck.type = 'checkbox';
    muteCheck.checked = audio.getIsMuted();
    muteCheck.style.cssText = 'width:20px;height:20px;cursor:pointer;accent-color:#3498db;';
    muteCheck.addEventListener('change', () => {
      audio.setMuted(muteCheck.checked);
    });
    muteRow.appendChild(muteLabel);
    muteRow.appendChild(muteCheck);
    panel.appendChild(muteRow);

    // Language (disabled placeholder)
    const langRow = document.createElement('div');
    langRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);opacity:0.5;';
    langRow.innerHTML = '<span style="font-size:14px;">🌐 Язык</span><span style="font-size:13px;color:#7f8c8d;">Русский</span>';
    panel.appendChild(langRow);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✖ ЗАКРЫТЬ';
    closeBtn.style.cssText = `
      width:100%;padding:10px;margin-top:14px;font-family:'Press Start 2P',monospace;
      font-size:10px;color:#ecf0f1;background:rgba(231,76,60,0.7);
      border:none;cursor:pointer;border-radius:4px;
    `;
    closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
  }

  private _settingsSlider(label: string, currentVal: number, onChange: (v: number) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);';
    const labelEl = document.createElement('div');
    labelEl.style.cssText = 'font-size:14px;margin-bottom:4px;';
    labelEl.textContent = label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(currentVal);
    slider.style.cssText = 'width:100%;accent-color:#3498db;cursor:pointer;';
    const valLabel = document.createElement('span');
    valLabel.style.cssText = 'font-size:12px;color:#7f8c8d;';
    valLabel.textContent = `${currentVal}%`;
    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      valLabel.textContent = `${v}%`;
      onChange(v);
    });
    row.appendChild(labelEl);
    row.appendChild(slider);
    row.appendChild(valLabel);
    return row;
  }

  private _injectStyles(): void {
    if (document.getElementById('rl-hud-anim')) return;
    const style = document.createElement('style');
    style.id = 'rl-hud-anim';
    style.textContent = `
      @keyframes rlFadeIn  { from { opacity: 0 } to { opacity: 1 } }
      @keyframes rlPopIn   { from { opacity: 0; transform: scale(0.85) translateY(20px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      @keyframes rlToastIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }
    `;
    document.head.appendChild(style);
  }
}
