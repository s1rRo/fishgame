// ============================================================
// MARKET SCENE — Задача №4 (Рынок + Продажа + Переработка)
// 3D сцена рынка у озера. Продать по одной / всё / переработать
// ============================================================
import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AdManager } from '../services/AdManager';
import { Analytics } from '../services/analytics';
import { TopHUD } from '../ui/TopHUD';
import { CaughtFishRecord } from '../models/Player';
import { matLP, LP, applyLowPolyToScene, setupGameLighting } from '../utils/LowPolyStyle';
import { CURRENCY_CONFIG } from '../data/balanceConfig';
import { argentineFishDatabase } from '../data/fishDatabase';
import { AuctionService } from '../services/AuctionService';
import { EconomyManager } from '../services/EconomyManager';
import { AudioManager } from '../services/AudioManager';

/**
 * Полная формула аукционной цены из тз/04_GAMEDESIGN_DOC.md + тз/03_TECHNICAL_SPEC.md:
 * price = basePrice × (1 + 0.45 × log10((demand+10) / (supply+10)))
 * deficitMult = max(0.6, 1 - (supply / maxSupply) × 0.75)
 * finalPrice = price × deficitMult × (1 ± 10% флуктуация) × (1 - 5% комиссия)
 *
 * В MVP без серверного marketPrices: supply/demand симулируются локально
 * на основе инвентаря игрока и времени суток.
 */
function calcAuctionPrice(baseValue: number, inventoryCount = 0): number {
  // Симуляция supply/demand — в MVP без Firebase
  const hour = new Date().getHours();
  // Спрос выше утром (6-12) и вечером (18-22)
  const demandBase = (hour >= 6 && hour <= 12) ? 80 : (hour >= 18 && hour <= 22) ? 70 : 40;
  const demand = demandBase + Math.floor(Math.random() * 20);
  // Предложение зависит от инвентаря (больше рыбы = больше supply)
  const supply = Math.max(5, 30 + inventoryCount * 3 + Math.floor(Math.random() * 15));
  const maxSupply = 200;

  // Формула из ТЗ: log10-based pricing
  const multiplier = 1 + 0.45 * Math.log10((demand + 10) / (supply + 10));
  const currentPrice = baseValue * multiplier;

  // Дефицит-множитель
  const deficitMult = Math.max(0.6, 1 - (supply / maxSupply) * 0.75);
  const priceAfterDeficit = currentPrice * deficitMult;

  // Флуктуация ±10% и комиссия 5%
  const fluct = 1 + (Math.random() * 2 - 1) * CURRENCY_CONFIG.auctionFluctuation;
  const net = priceAfterDeficit * fluct * (1 - CURRENCY_CONFIG.auctionCommission);

  return Math.max(1, Math.floor(net));
}

export class MarketScene extends BaseScene {
  private authService = AuthService.getInstance();
  private dbService   = DatabaseService.getInstance();
  private adManager   = AdManager.getInstance();
  private analytics   = Analytics.getInstance();
  private hud!: TopHUD;

  private uid      = '';
  private coins    = 0;
  private gems     = 0;
  private inventory: CaughtFishRecord[] = [];

  private listEl!: HTMLElement;
  private coinsEl!: HTMLElement;
  private activeTab: 'sell' | 'auction' | 'bank' = 'sell';
  private tabContainer!: HTMLElement;

  // 3D объекты
  private stall!: THREE.Group;

  async start() {
    this.hud = new TopHUD(this.uiContainer);
    this.hud.setDefaultNavigation(this.sceneManager);
    await this.loadData();
    this.setup3D();
    this.renderUI();
    AudioManager.getInstance().playMusic('market');
  }

  private async loadData() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.uid = user.uid;
    const profile = await this.dbService.getPlayerProfile(this.uid);
    if (!profile) return;
    this.coins     = profile.softCoins;
    this.gems      = profile.gems;
    this.inventory = (profile.inventory as CaughtFishRecord[]) || [];
    this.hud.render(profile, 'Рынок');
  }

  private setup3D() {
    this.scene.background = new THREE.Color(0x3d2a1a); // тёмный рынок-закат
    this.camera.position.set(0, 4, 12);
    this.camera.lookAt(0, 0, 0);

    // Единый low-poly стиль освещения
    setupGameLighting(this.scene, {
      ambientColor: 0xffe8c0, ambientIntensity: 0.65,
      sunColor: 0xffb347,    sunIntensity: 0.9,
      fillColor: 0x8855aa,   fillIntensity: 0.2,
    });

    // Настил рынка (flat-shading)
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.3, 8, 6, 1, 3),
      matLP(LP.wood)
    );
    floor.position.y = -1.2;
    this.scene.add(floor);

    // Прилавок (flat-shading)
    this.stall = new THREE.Group();
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(8, 1, 2, 4, 1, 2),
      matLP(LP.woodLight)
    );
    counter.position.y = 0;
    this.stall.add(counter);

    // Навес (flat-shading, красный)
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.25, 3, 5, 1, 2),
      matLP(LP.roof)
    );
    roof.position.y = 2.5;
    this.stall.add(roof);

    // Столбы навеса (flat-shading)
    for (const x of [-4, 4]) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 3, 5),
        matLP(LP.wood)
      );
      pillar.position.set(x, 1.5, -1);
      this.stall.add(pillar);
    }

    // NPC-продавец (voxel, flat-shading через matLP)
    const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, color: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 2, 2, 2), matLP(color));
      m.position.set(x, y, z);
      this.stall.add(m);
    };
    addBox(0.9, 1.2, 0.9, -3.5, 1.0, 0, 0xe67e22); // тело
    addBox(0.9, 0.9, 0.9, -3.5, 2.0, 0, LP.skin);  // голова
    addBox(1.3, 0.4, 1.1, -3.5, 2.65, 0, LP.hat);  // шляпа

    this.stall.position.set(0, -0.8, -2);
    this.scene.add(this.stall);

    // Вода позади рынка (low-poly flat-shading)
    const waterGeo = new THREE.PlaneGeometry(26, 10, 8, 4);
    const wPos = waterGeo.attributes.position;
    for (let i = 0; i < wPos.count; i++) wPos.setZ(i, (Math.random() - 0.5) * 0.06);
    waterGeo.computeVertexNormals();
    const water = new THREE.Mesh(waterGeo, matLP(LP.water, { transparent: true, opacity: 0.72 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -1.3, -7);
    this.scene.add(water);

    // Применяем flatShading ко всей сцене
    applyLowPolyToScene(this.scene);
  }

  private renderUI() {
    // Кнопка Назад
    const back = document.createElement('button');
    back.className = 'pixel-btn';
    back.innerText  = '← КАРТА';
    back.style.cssText = `
      position:absolute; top:58px; left:16px;
      background:#7f8c8d; color:#fff; border:3px solid #fff;
      padding:10px 20px; font-size:16px; font-family:'Courier New',monospace;
      cursor:pointer; font-weight:bold; pointer-events:auto;
    `;
    back.onclick = () => this.sceneManager.startScene('PlanetScene');
    this.uiContainer.appendChild(back);

    // Счётчик монет (обновляемый)
    this.coinsEl = document.createElement('div');
    this.coinsEl.style.cssText = `
      position:absolute; top:58px; right:16px;
      font-family:'Courier New',monospace; font-size:22px; font-weight:bold;
      color:#f1c40f; text-shadow:2px 2px 0 #000;
    `;
    this.coinsEl.innerText = `💰 ${this.coins}`;
    this.uiContainer.appendChild(this.coinsEl);

    // Табы: Продажа | Аукцион | Банк
    this.tabContainer = document.createElement('div');
    this.tabContainer.style.cssText = `
      position:absolute; top:90px; left:50%; transform:translateX(-50%);
      display:flex;gap:4px;z-index:10;pointer-events:auto;
    `;
    const tabs: { id: 'sell' | 'auction' | 'bank'; label: string }[] = [
      { id: 'sell', label: '💰 Продажа' },
      { id: 'auction', label: '📊 Аукцион' },
      { id: 'bank', label: '🏦 Банк' },
    ];
    for (const t of tabs) {
      const btn = document.createElement('button');
      btn.style.cssText = `
        padding:8px 16px;font-size:13px;font-family:'Rajdhani',sans-serif;
        border:1px solid #3498db;cursor:pointer;color:white;
        background:${this.activeTab === t.id ? '#3498db' : 'rgba(10,22,40,0.8)'};
        border-radius:4px;
      `;
      btn.textContent = t.label;
      btn.onclick = () => {
        this.activeTab = t.id;
        this.renderTabContent();
        // Обновить стили табов
        this.tabContainer.querySelectorAll('button').forEach((b, i) => {
          (b as HTMLElement).style.background = tabs[i].id === t.id ? '#3498db' : 'rgba(10,22,40,0.8)';
        });
      };
      this.tabContainer.appendChild(btn);
    }
    this.uiContainer.appendChild(this.tabContainer);

    // Панель контента
    const panel = document.createElement('div');
    panel.style.cssText = `
      position:absolute; top:130px; left:50%; transform:translateX(-50%);
      width:min(660px,95vw); max-height:calc(100vh - 260px);
      background:rgba(0,0,0,0.7); border:3px solid rgba(255,255,255,0.2);
      overflow-y:auto; padding:12px; pointer-events:auto;
    `;
    this.uiContainer.appendChild(panel);

    this.listEl = panel;
    this.renderTabContent();

    // Кнопки "Продать всё" и "Переработать всё"
    const bottomRow = document.createElement('div');
    bottomRow.style.cssText = `
      position:absolute; bottom:5%; width:100%;
      display:flex; justify-content:center; gap:16px; flex-wrap:wrap; pointer-events:auto;
    `;
    this.uiContainer.appendChild(bottomRow);

    const mkGlobalBtn = (text: string, color: string, action: () => void) => {
      const b = document.createElement('button');
      b.className = 'pixel-btn';
      b.innerText = text;
      b.style.cssText = `
        background:${color}; color:#fff; border:3px solid #fff;
        padding:14px 26px; font-size:17px; font-weight:bold;
        font-family:'Courier New',monospace; cursor:pointer;
        box-shadow:4px 4px 0 rgba(0,0,0,0.4);
      `;
      b.onmouseenter = () => { b.style.filter = 'brightness(1.2)'; };
      b.onmouseleave = () => { b.style.filter = 'none'; };
      b.onclick = action;
      bottomRow.appendChild(b);
    };

    mkGlobalBtn('💰 ПРОДАТЬ ВСЁ', '#27ae60', () => this.sellAll());
    mkGlobalBtn('🔥 ПЕРЕРАБОТАТЬ ВСЁ (×2.2)', '#e67e22', () => this.processAll());
    mkGlobalBtn('📺 ДВОЙНАЯ ПРОДАЖА (РЕКЛАМА)', '#9b59b6', () => this.watchDoubleSell());
  }

  private renderList() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    if (this.inventory.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `text-align:center;font-family:'Courier New',monospace;font-size:22px;color:#7f8c8d;padding:40px;`;
      empty.innerText = '🐠 Инвентарь пуст\nСначала порыбачи!';
      this.listEl.appendChild(empty);
      return;
    }

    this.inventory.forEach((fish, idx) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display:flex; align-items:center; gap:12px;
        padding:10px 12px; margin-bottom:6px;
        background:rgba(255,255,255,0.06); border-left:4px solid ${fish.processed ? '#e67e22' : '#2ecc71'};
        font-family:'Courier New',monospace; color:#fff;
      `;
      const fishDef = argentineFishDatabase.find(fd => fd.id === fish.fishId);
      const fishIcon = fishDef?.iconPath ?? '/assets/images/fish/fish_01.png';
      row.innerHTML = `
        <img src="${fishIcon}" style="width:40px;height:40px;image-rendering:pixelated;border-radius:6px;background:rgba(0,0,0,0.3);" onerror="this.style.display='none'">
        <div style="flex:1">
          <div style="font-size:17px;font-weight:bold">${fish.name}${fish.processed ? ' 🔥' : ''}</div>
          <div style="font-size:14px;color:#bdc3c7">${fish.weight.toFixed(2)} кг — $${fish.value}</div>
        </div>
      `;

      if (!fish.processed) {
        const procBtn = document.createElement('button');
        procBtn.innerText = '🔥';
        procBtn.title = 'Переработать';
        procBtn.style.cssText = `background:#e67e22;border:2px solid #fff;color:#fff;padding:8px 12px;cursor:pointer;font-size:16px;font-family:'Courier New',monospace;`;
        procBtn.onclick = () => this.processFish(idx);
        row.appendChild(procBtn);
      }

      const auctionPrice = calcAuctionPrice(fish.value, this.inventory.length);
      const sellBtn = document.createElement('button');
      sellBtn.innerText = `$${auctionPrice}`;
      sellBtn.title = `Продать (базовая: $${fish.value}, аукцион: $${auctionPrice})`;
      sellBtn.style.cssText = `background:#27ae60;border:2px solid #fff;color:#fff;padding:8px 14px;cursor:pointer;font-size:16px;font-weight:bold;font-family:'Courier New',monospace;`;
      sellBtn.onclick = () => this.sellFish(idx);
      row.appendChild(sellBtn);

      this.listEl.appendChild(row);
    });
  }

  private async sellFish(idx: number) {
    if (!this.uid) return;
    const fish = this.inventory[idx];
    if (!fish) return;

    const earned = calcAuctionPrice(fish.value, this.inventory.length);
    this.inventory.splice(idx, 1);
    this.coins += earned;

    await this.dbService.updatePlayerStats(this.uid, {
      inventory: this.inventory,
      softCoins: this.coins,
      totalRevenue: 0,
      totalFishSold: 0,
    });
    this.showCoinAnimation(earned);
    this.hud.showToast(`+$${earned} в кармане!`, '#27ae60');
    this.coinsEl.innerText = `💰 ${this.coins}`;
    this.renderList();
    this.analytics.logEvent('fish_sold', { count: 1, value: earned });
  }

  private async processFish(idx: number) {
    if (this.inventory[idx]) {
      this.inventory[idx].value  = Math.floor(this.inventory[idx].value * 2.2);
      this.inventory[idx].processed = true;
      await this.dbService.updatePlayerStats(this.uid, { inventory: this.inventory });
      this.hud.showToast('Рыба переработана! ×2.2', '#e67e22');
      this.renderList();
    }
  }

  private async sellAll() {
    if (!this.uid || this.inventory.length === 0) {
      this.hud.showToast('Инвентарь пуст!', '#e74c3c');
      return;
    }
    const total = this.inventory.reduce((s, f) => s + calcAuctionPrice(f.value, this.inventory.length), 0);

    // Подтверждение перед продажей
    this.hud.showPopup({
      title: 'ПРОДАТЬ ВСЁ?',
      body: `Всего ${this.inventory.length} рыб на сумму <b style="color:#f39c12">${total} 💰</b>.<br>Это действие нельзя отменить.`,
      confirmText: `ПРОДАТЬ — ${total}💰`,
      cancelText: 'ОТМЕНА',
      confirmColor: '#27ae60',
      icon: '💰',
      onConfirm: async () => {
        this.coins += total;
        this.inventory = [];
        await this.dbService.sellAllFish(this.uid);
        this.showCoinAnimation(total);
        this.coinsEl.innerText = `💰 ${this.coins}`;
        this.hud.showToast(`Продано всё! +$${total}`, '#27ae60', 3000);
        this.renderList();
        this.analytics.logEvent('sell_all', { total });
      },
    });
  }

  private async processAll() {
    if (this.inventory.length === 0) { this.hud.showToast('Инвентарь пуст!', '#e74c3c'); return; }
    await this.dbService.processAllFish(this.uid);
    const profile = await this.dbService.getPlayerProfile(this.uid);
    this.inventory = (profile?.inventory as CaughtFishRecord[]) || [];
    this.hud.showToast('Всё переработано! ×2.2 к ценам', '#e67e22');
    this.renderList();
  }

  private async watchDoubleSell() {
    if (!this.uid) return;
    const canWatch = await this.adManager.canWatchAd(this.uid);
    if (!canWatch) { this.hud.showToast('Лимит рекламы (3/3) исчерпан', '#e74c3c'); return; }

    this.hud.showToast('📺 Смотрим рекламу...', '#9b59b6');
    const ok = await this.adManager.watchAd('doubleSell');
    if (ok) {
      // Применяем ×2 ко всем ценам инвентаря
      this.inventory = this.inventory.map(f => ({ ...f, value: f.value * 2 }));
      await this.dbService.updatePlayerStats(this.uid, { inventory: this.inventory });
      this.hud.showToast('🎉 Двойная продажа активна! ×2 к ценам', '#9b59b6', 3000);
      this.renderList();
    }
  }

  private renderTabContent(): void {
    switch (this.activeTab) {
      case 'sell': this.renderList(); break;
      case 'auction': this.renderAuction(); break;
      case 'bank': this.renderBank(); break;
    }
  }

  private renderAuction(): void {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    const auction = AuctionService.getInstance();
    const lots = auction.getActiveLots();

    if (lots.length === 0) {
      this.listEl.innerHTML = `<div style="text-align:center;color:#7f8c8d;padding:40px;font-family:'Rajdhani',sans-serif;font-size:18px;">Нет активных лотов</div>`;
      return;
    }

    for (const lot of lots) {
      const row = document.createElement('div');
      row.style.cssText = `
        display:flex;align-items:center;gap:12px;padding:10px;margin-bottom:4px;
        background:rgba(52,152,219,0.08);border-left:3px solid #3498db;
        font-family:'Rajdhani',sans-serif;color:white;
      `;
      row.innerHTML = `
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:bold;">${lot.resourceId} ×${lot.qty}</div>
          <div style="font-size:13px;color:#95a5a6;">Продавец: ${lot.sellerName}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px;color:#f39c12;font-weight:bold;">${lot.totalPrice} 💰</div>
          <div style="font-size:12px;color:#95a5a6;">${lot.pricePerUnit}/ед.</div>
        </div>
      `;
      const buyBtn = document.createElement('button');
      buyBtn.textContent = 'КУПИТЬ';
      buyBtn.style.cssText = `padding:8px 14px;background:#27ae60;color:white;border:none;border-radius:4px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:14px;`;
      buyBtn.onclick = async () => {
        if (!this.uid) return;
        const profile = await this.dbService.getPlayerProfile(this.uid);
        if (!profile) return;
        const ok = auction.buyItem(profile, lot.id);
        if (ok) {
          this.coins = profile.softCoins;
          this.coinsEl.innerText = `💰 ${this.coins}`;
          await this.dbService.updatePlayerStats(this.uid, {
            softCoins: profile.softCoins,
            resources: profile.resources,
            auctionHistory: profile.auctionHistory,
          });
          this.hud.showToast(`Куплено ${lot.resourceId} ×${lot.qty}!`, 'success');
          this.renderAuction();
        } else {
          this.hud.showToast('Недостаточно монет!', 'error');
        }
      };
      row.appendChild(buyBtn);
      this.listEl.appendChild(row);
    }
  }

  private renderBank(): void {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    const economy = EconomyManager.getInstance();
    const changes = economy.getTopPriceChanges();

    // Заголовок
    const header = document.createElement('div');
    header.style.cssText = `text-align:center;margin-bottom:16px;font-family:'Press Start 2P',monospace;font-size:11px;color:#f39c12;`;
    header.textContent = 'РЫНОЧНЫЕ ЦЕНЫ';
    this.listEl.appendChild(header);

    // Тикеры изменений
    if (changes.length > 0) {
      const ticker = document.createElement('div');
      ticker.style.cssText = `display:flex;gap:16px;justify-content:center;margin-bottom:16px;font-family:'Rajdhani',sans-serif;font-size:15px;`;
      for (const c of changes) {
        const up = c.change >= 0;
        ticker.innerHTML += `<span style="color:${up ? '#27ae60' : '#e74c3c'};">${up ? '▲' : '▼'} ${c.resourceId} ${up ? '+' : ''}${c.change.toFixed(1)}%</span>`;
      }
      this.listEl.appendChild(ticker);
    }

    // Таблица всех ресурсов
    const resources = [
      'carp', 'trout', 'salmon_king', 'perch', 'carp_smoked', 'trout_smoked',
      'wood_oak', 'wood_beech', 'stone', 'ore_iron', 'worm', 'moth', 'lure', 'fly_lure', 'bread',
    ];
    for (const resId of resources) {
      const info = economy.getPriceInfo(resId);
      if (!info) continue;

      const row = document.createElement('div');
      row.style.cssText = `
        display:flex;align-items:center;gap:12px;padding:8px 10px;margin-bottom:2px;
        background:rgba(255,255,255,0.03);font-family:'Rajdhani',sans-serif;color:white;
      `;
      const changeColor = info.change24h >= 0 ? '#27ae60' : '#e74c3c';
      row.innerHTML = `
        <div style="flex:1;font-size:15px;">${resId}</div>
        <div style="font-size:15px;color:#f39c12;font-weight:bold;">${info.currentPrice.toFixed(1)} 💰</div>
        <div style="font-size:13px;color:${changeColor};width:60px;text-align:right;">${info.change24h >= 0 ? '+' : ''}${info.change24h.toFixed(1)}%</div>
        <div style="font-size:12px;color:#566573;width:80px;">S:${Math.round(info.supply)} D:${Math.round(info.demand)}</div>
      `;
      this.listEl.appendChild(row);
    }
  }

  /** Анимация "+N💰" летит вверх */
  private showCoinAnimation(amount: number) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:50%;left:50%;
      transform:translateX(-50%);
      font-family:var(--font-pixel);font-size:clamp(16px,3vw,24px);
      color:#f39c12;font-weight:bold;
      text-shadow:0 0 12px rgba(243,156,18,0.8),2px 2px 0 rgba(0,0,0,0.6);
      pointer-events:none;z-index:9999;
      animation:floatUp 1.5s ease-out forwards;
    `;
    el.innerText = `+${amount}💰`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  update(delta: number) {
    const time = Date.now() * 0.001;
    if (this.stall) {
      // Лёгкое покачивание NPC
      this.stall.children.forEach((c, i) => {
        if (i > 3) c.position.y += Math.sin(time * 1.5) * 0.002;
      });
    }
  }
}
