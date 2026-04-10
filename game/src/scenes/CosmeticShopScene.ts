// ============================================================
// COSMETIC SHOP SCENE — Магазин скинов с 3D подставкой
// Вкладки: Удочки | Лодки | Деревья | Здания | NPC
// При клике на предмет — он появляется на подставке с подсветкой
// ============================================================
import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { CosmeticManager, CosmeticItem, CosmeticType } from '../services/CosmeticManager';
import { TopHUD } from '../ui/TopHUD';
import { PlayerProfile } from '../models/Player';
import { matLP, LP, createTree, createRock, createNPCModel } from '../utils/LowPolyStyle';

const TABS: { label: string; icon: string; type: CosmeticType }[] = [
  { label: 'Удочки',  icon: '🎣', type: 'rod' },
  { label: 'Лодки',   icon: '⛵', type: 'boat' },
  { label: 'Деревья', icon: '🌲', type: 'tree' },
  { label: 'Здания',  icon: '🏠', type: 'house' },
  { label: 'NPC',     icon: '🤖', type: 'npcFisher1' },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#95a5a6', rare: '#3498db', epic: '#9b59b6', legendary: '#f39c12',
};
const RARITY_BG: Record<string, string> = {
  common: 'rgba(149,165,166,0.08)', rare: 'rgba(52,152,219,0.1)',
  epic: 'rgba(155,89,182,0.12)', legendary: 'rgba(243,156,18,0.15)',
};

export class CosmeticShopScene extends BaseScene {
  private authService = AuthService.getInstance();
  private dbService = DatabaseService.getInstance();
  private cosmeticMgr = CosmeticManager.getInstance();
  private hud!: TopHUD;

  private uid = '';
  private profile: PlayerProfile | null = null;
  private activeTab: CosmeticType = 'rod';
  private selectedItem: CosmeticItem | null = null;

  // 3D preview
  private previewGroup: THREE.Group | null = null;
  private pedestal!: THREE.Mesh;
  private glowRing!: THREE.Mesh;
  private spotlight!: THREE.SpotLight;
  private particleGroup = new THREE.Group();

  // UI elements
  private gridContainer: HTMLDivElement | null = null;
  private detailPanel: HTMLDivElement | null = null;

  async start() {
    this.hud = new TopHUD(this.uiContainer);
    this.hud.setDefaultNavigation(this.sceneManager);
    await this.loadData();
    this.setup3D();
    this.renderUI();
  }

  stop() {
    super.stop();
    this.detailPanel?.remove();
    this.detailPanel = null;
  }

  private async loadData() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.uid = user.uid;
    this.profile = await this.dbService.getPlayerProfile(this.uid);
    if (this.profile) this.hud.render(this.profile, 'МАГАЗИН');
  }

  // ── 3D SETUP ────────────────────────────────────────────────
  private setup3D() {
    this.scene.background = new THREE.Color(0x0a1628);
    this.camera.position.set(0, 2.5, 5.5);
    this.camera.lookAt(0, 0.3, 0);

    // Ambient — мягкий голубоватый свет
    const ambient = new THREE.AmbientLight(0x4466aa, 0.4);
    this.scene.add(ambient);

    // Hemisphere — тёплый сверху, холодный снизу
    const hemi = new THREE.HemisphereLight(0xffeeb3, 0x1a2a4a, 0.5);
    this.scene.add(hemi);

    // Spotlight сверху вниз на подставку (ключевой свет)
    this.spotlight = new THREE.SpotLight(0xffd700, 2.5, 12, Math.PI / 6, 0.5, 1);
    this.spotlight.position.set(0, 6, 1);
    this.spotlight.target.position.set(0, 0, 0);
    this.scene.add(this.spotlight);
    this.scene.add(this.spotlight.target);

    // Подставка — деревянный цилиндр
    const pedestalGeo = new THREE.CylinderGeometry(1.0, 1.15, 0.4, 12);
    this.pedestal = new THREE.Mesh(pedestalGeo, matLP(0xc49870));
    this.pedestal.position.set(0, -0.8, 0);
    this.scene.add(this.pedestal);

    // Верхняя поверхность подставки — светлая
    const topGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.05, 12);
    const topMesh = new THREE.Mesh(topGeo, matLP(0xf5e6cc));
    topMesh.position.set(0, -0.58, 0);
    this.scene.add(topMesh);

    // Золотое кольцо свечения вокруг подставки
    const ringGeo = new THREE.TorusGeometry(1.05, 0.03, 8, 32);
    this.glowRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0xffd700, transparent: true, opacity: 0.6,
    }));
    this.glowRing.rotation.x = Math.PI / 2;
    this.glowRing.position.set(0, -0.6, 0);
    this.scene.add(this.glowRing);

    // Пол — тёмная плоскость
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x0d1b2e, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.01;
    this.scene.add(floor);

    // Частицы-искры
    this.scene.add(this.particleGroup);
    this.createSparkles();

    // Задний фон — мягкие стены магазина
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 6),
      new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 1 })
    );
    backWall.position.set(0, 2, -4);
    this.scene.add(backWall);
  }

  private createSparkles() {
    for (let i = 0; i < 20; i++) {
      const spark = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.04),
        new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.7 })
      );
      spark.position.set(
        (Math.random() - 0.5) * 3,
        Math.random() * 3 - 0.5,
        (Math.random() - 0.5) * 2
      );
      spark.userData.baseY = spark.position.y;
      spark.userData.speed = 0.5 + Math.random() * 1.5;
      spark.userData.phase = Math.random() * Math.PI * 2;
      this.particleGroup.add(spark);
    }
  }

  // ── UI ──────────────────────────────────────────────────────
  private renderUI() {
    // Назад
    const back = document.createElement('button');
    back.innerText = '← НАЗАД';
    back.style.cssText = `
      position:absolute;top:58px;left:16px;
      background:rgba(127,140,141,0.8);color:#fff;border:2px solid rgba(255,255,255,0.3);
      padding:8px 16px;font-size:13px;font-family:'Press Start 2P',monospace;
      cursor:pointer;pointer-events:auto;border-radius:4px;
    `;
    back.onclick = () => this.sceneManager.startScene('FarmScene');
    this.uiContainer.appendChild(back);

    // Вкладки
    const tabRow = document.createElement('div');
    tabRow.style.cssText = `
      position:absolute;top:56px;left:50%;transform:translateX(-50%);
      display:flex;gap:6px;pointer-events:auto;
    `;
    this.uiContainer.appendChild(tabRow);

    TABS.forEach(tab => {
      const isActive = this.activeTab === tab.type;
      const btn = document.createElement('button');
      btn.innerHTML = `<span style="font-size:16px">${tab.icon}</span><br><span style="font-size:10px">${tab.label}</span>`;
      btn.style.cssText = `
        background:${isActive ? 'linear-gradient(135deg,#9b59b6,#8e44ad)' : 'rgba(0,0,0,0.5)'};
        color:#fff;border:2px solid ${isActive ? '#f39c12' : 'rgba(255,255,255,0.2)'};
        padding:8px 14px;font-family:'Rajdhani',sans-serif;
        cursor:pointer;border-radius:6px;min-width:60px;
        transition:all 0.2s;
      `;
      btn.onclick = () => {
        this.activeTab = tab.type;
        this.selectedItem = null;
        this.clearPreview();
        this.detailPanel?.remove();
        this.detailPanel = null;
        this.uiContainer.innerHTML = '';
        this.hud = new TopHUD(this.uiContainer);
        this.hud.setDefaultNavigation(this.sceneManager);
        if (this.profile) this.hud.render(this.profile, 'МАГАЗИН');
        this.renderUI();
      };
      tabRow.appendChild(btn);
    });

    // Сетка товаров (слева)
    this.renderItemGrid();
  }

  private renderItemGrid() {
    // Для вкладки "Здания" включаем house, smokehouse, dock
    let items: CosmeticItem[];
    if (this.activeTab === 'house') {
      items = [
        ...this.cosmeticMgr.getCatalogByType('house'),
        ...this.cosmeticMgr.getCatalogByType('smokehouse'),
        ...this.cosmeticMgr.getCatalogByType('dock'),
      ];
    } else {
      items = this.cosmeticMgr.getCatalogByType(this.activeTab);
    }
    const owned = this.profile?.ownedCosmetics || [];
    const equipped = (this.profile?.equippedCosmetics as any) || {};
    const gems = this.profile?.gems || 0;

    this.gridContainer = document.createElement('div');
    this.gridContainer.style.cssText = `
      position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
      width:min(700px,96vw);display:flex;gap:8px;
      overflow-x:auto;padding:10px 8px;
      background:rgba(0,0,0,0.6);border:2px solid rgba(255,255,255,0.1);
      border-radius:10px;pointer-events:auto;
      scrollbar-width:thin;scrollbar-color:#9b59b6 transparent;
    `;
    this.uiContainer.appendChild(this.gridContainer);

    // Asset mappings
    const assetMap: Record<string, string[]> = {
      rod: Array.from({ length: 8 }, (_, i) => `/assets/images/rods/rod_${i + 1}.png`),
      boat: Array.from({ length: 7 }, (_, i) => `/assets/images/ships/ship_${i + 1}.png`),
      tree: Array.from({ length: 11 }, (_, i) => `/assets/images/trees/tree_${i + 1}.png`),
      house: ['/assets/images/buildings/house_main.png', '/assets/images/buildings/smokehouse.png',
              '/assets/images/buildings/market.png', '/assets/images/buildings/shop_inventory.png'],
    };

    items.forEach((item, idx) => {
      const isOwned = owned.includes(item.id);
      const isEquipped = equipped[item.type] === item.id;
      const isSelected = this.selectedItem?.id === item.id;
      const canAfford = gems >= item.price;
      const rarityCol = RARITY_COLORS[item.rarity] ?? '#95a5a6';

      const card = document.createElement('div');
      card.style.cssText = `
        min-width:120px;max-width:120px;
        background:${isSelected ? 'rgba(243,156,18,0.2)' : RARITY_BG[item.rarity] ?? 'rgba(0,0,0,0.3)'};
        border:2px solid ${isSelected ? '#f39c12' : isEquipped ? '#f39c12' : isOwned ? '#2ecc71' : rarityCol};
        padding:10px 6px;text-align:center;border-radius:8px;
        font-family:'Rajdhani',sans-serif;color:#fff;
        cursor:pointer;transition:all 0.15s;flex-shrink:0;
        ${isSelected ? 'box-shadow:0 0 12px rgba(243,156,18,0.4);transform:scale(1.05);' : ''}
      `;

      const assetUrl = assetMap[item.type]?.[idx % (assetMap[item.type]?.length || 1)];
      const imgHtml = assetUrl
        ? `<img src="${assetUrl}" style="width:56px;height:56px;object-fit:contain;image-rendering:pixelated;margin-bottom:4px;border-radius:4px;background:rgba(0,0,0,0.3);" onerror="this.style.display='none'" />`
        : `<div style="font-size:32px;margin-bottom:4px">${item.emoji}</div>`;

      card.innerHTML = `
        ${imgHtml}
        <div style="font-size:11px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
        <div style="font-size:9px;color:${rarityCol};text-transform:uppercase;margin:2px 0;">${item.rarity}</div>
        <div style="font-size:12px;font-weight:bold;color:${isOwned ? '#2ecc71' : canAfford ? '#f1c40f' : '#e74c3c'}">
          ${isOwned ? (isEquipped ? '✓' : '◎') : `${item.price} 💎`}
        </div>
      `;

      card.onclick = () => {
        this.selectedItem = item;
        this.showPreview(item);
        this.showDetailPanel(item, isOwned, isEquipped, canAfford);
        // Re-render grid to update selection highlight
        if (this.gridContainer) {
          this.gridContainer.remove();
          this.gridContainer = null;
        }
        this.renderItemGrid();
      };

      this.gridContainer!.appendChild(card);
    });
  }

  // ── DETAIL PANEL (рядом с подставкой) ──────────────────────
  private showDetailPanel(item: CosmeticItem, isOwned: boolean, isEquipped: boolean, canAfford: boolean) {
    this.detailPanel?.remove();

    const rarityCol = RARITY_COLORS[item.rarity] ?? '#95a5a6';

    this.detailPanel = document.createElement('div');
    this.detailPanel.style.cssText = `
      position:fixed;right:20px;top:50%;transform:translateY(-50%);
      width:200px;background:linear-gradient(135deg,rgba(26,42,74,0.95),rgba(13,27,46,0.95));
      border:2px solid ${rarityCol};border-radius:12px;padding:20px;
      font-family:'Rajdhani',sans-serif;color:#fff;text-align:center;
      z-index:100;box-shadow:0 0 20px rgba(0,0,0,0.5);
    `;

    const actionBtnColor = isOwned
      ? (isEquipped ? '#e74c3c' : '#2ecc71')
      : (canAfford ? '#9b59b6' : '#555');
    const actionBtnText = isOwned
      ? (isEquipped ? 'СНЯТЬ' : 'ЭКИПИРОВАТЬ')
      : (canAfford ? `КУПИТЬ ${item.price} 💎` : 'НЕТ 💎');

    this.detailPanel.innerHTML = `
      <h3 style="font-family:'Press Start 2P',monospace;font-size:11px;color:${rarityCol};margin-bottom:8px;">
        ${item.name}
      </h3>
      <div style="font-size:10px;color:${rarityCol};text-transform:uppercase;margin-bottom:12px;letter-spacing:2px;">
        ${item.rarity}
      </div>
      <div style="font-size:13px;color:#bdc3c7;margin-bottom:16px;line-height:1.4;">
        ${item.description}
      </div>
      <button id="shop-action-btn" style="
        width:100%;padding:10px;background:${actionBtnColor};color:#fff;
        border:none;border-radius:6px;font-family:'Press Start 2P',monospace;
        font-size:10px;cursor:pointer;
        clip-path:polygon(0 0,calc(100%-6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100%-6px));
      ">${actionBtnText}</button>
    `;

    document.body.appendChild(this.detailPanel);

    const btn = this.detailPanel.querySelector('#shop-action-btn') as HTMLButtonElement;
    btn.onclick = async () => {
      if (!this.profile || !this.uid) return;
      if (isOwned) {
        const newId = isEquipped ? null : item.id;
        await this.cosmeticMgr.equipCosmetic(this.uid, item.type, newId);
        this.hud.showToast(newId ? `${item.name} экипирован!` : 'Скин снят', 'success');
        this.sceneManager.startScene('CosmeticShopScene');
      } else {
        if (!canAfford) { this.hud.showToast('Недостаточно 💎', 'error'); return; }
        const result = await this.cosmeticMgr.buyCosmetic(this.uid, item.id);
        this.hud.showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) this.sceneManager.startScene('CosmeticShopScene');
      }
    };
  }

  // ── 3D PREVIEW ─────────────────────────────────────────────
  private clearPreview() {
    if (this.previewGroup) {
      this.scene.remove(this.previewGroup);
      this.previewGroup = null;
    }
  }

  private showPreview(item: CosmeticItem) {
    this.clearPreview();
    this.previewGroup = new THREE.Group();

    const type = item.type;
    if (type === 'rod') {
      // Удочка — цилиндр + катушка + наконечник
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.03, 2.2, 6),
        matLP(item.color3D)
      );
      rod.rotation.z = Math.PI / 6;
      this.previewGroup.add(rod);
      // Катушка
      const reel = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.04, 6, 8),
        matLP(item.color3D, { emissive: item.color3D })
      );
      reel.position.set(-0.15, -0.4, 0);
      this.previewGroup.add(reel);
      // Наконечник
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 4, 4),
        matLP(0xffffff, { emissive: item.color3D })
      );
      tip.position.set(0.55, 1.05, 0);
      this.previewGroup.add(tip);
      // Ручка
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 0.4, 6),
        matLP(LP.wood)
      );
      handle.rotation.z = Math.PI / 6;
      handle.position.set(-0.35, -0.85, 0);
      this.previewGroup.add(handle);
    } else if (type === 'boat') {
      // Лодка — hull + cabin
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.35, 0.7),
        matLP(item.color3D)
      );
      // Деформируем нос
      const hp = hull.geometry.attributes.position;
      for (let i = 0; i < hp.count; i++) {
        if (hp.getX(i) > 0.7) hp.setZ(i, hp.getZ(i) * 0.4);
      }
      hull.geometry.computeVertexNormals();
      this.previewGroup.add(hull);
      // Кабина
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.35, 0.45),
        matLP(LP.wood)
      );
      cabin.position.set(-0.3, 0.3, 0);
      this.previewGroup.add(cabin);
      // Мачта
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5),
        matLP(LP.wood)
      );
      mast.position.set(0.2, 0.65, 0);
      this.previewGroup.add(mast);
    } else if (type === 'tree') {
      // Дерево — используем createTree с вариантом
      const treeIdx = this.cosmeticMgr.getCatalogByType('tree').indexOf(item) + 1;
      const treeMesh = createTree(0.6, treeIdx);
      this.previewGroup.add(treeMesh);
    } else if (type === 'house' || type === 'smokehouse' || type === 'dock') {
      // Здание
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.0, 1.0),
        matLP(item.color3D)
      );
      this.previewGroup.add(body);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 0.6, 4),
        matLP(LP.roof)
      );
      roof.position.y = 0.8;
      roof.rotation.y = Math.PI / 4;
      this.previewGroup.add(roof);
      // Дверь
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.5, 0.05),
        matLP(LP.wood)
      );
      door.position.set(0, -0.25, 0.53);
      this.previewGroup.add(door);
      // Окно
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.05),
        matLP(0x74b9ff)
      );
      win.position.set(0.25, 0.2, 0.53);
      this.previewGroup.add(win);
    } else {
      // NPC — используем createNPCModel
      const npcMesh = createNPCModel(LP.skin, 'epic', 0.8);
      this.previewGroup.add(npcMesh);
    }

    this.previewGroup.position.set(0, 0.2, 0);
    // Auto-scale to fit nicely on pedestal
    const box = new THREE.Box3().setFromObject(this.previewGroup);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const targetSize = 2.0;
      const s = targetSize / maxDim;
      this.previewGroup.scale.setScalar(Math.min(s, 2.5));
    }
    this.scene.add(this.previewGroup);

    // Обновляем цвет spotlight по rarity
    const raritySpotColors: Record<string, number> = {
      common: 0xffffff, rare: 0x3498db, epic: 0x9b59b6, legendary: 0xffd700,
    };
    this.spotlight.color.setHex(raritySpotColors[item.rarity] ?? 0xffffff);
    (this.glowRing.material as THREE.MeshBasicMaterial).color.setHex(
      raritySpotColors[item.rarity] ?? 0xffd700
    );
  }

  // ── UPDATE ─────────────────────────────────────────────────
  update(delta: number) {
    const time = performance.now() * 0.001;

    // Вращение предмета на подставке
    if (this.previewGroup) {
      this.previewGroup.rotation.y += delta * 0.8;
    }

    // Пульсация кольца
    if (this.glowRing) {
      (this.glowRing.material as THREE.MeshBasicMaterial).opacity =
        0.4 + 0.25 * Math.sin(time * 3);
    }

    // Анимация искр
    this.particleGroup.children.forEach(spark => {
      const s = spark.userData;
      spark.position.y = s.baseY + Math.sin(time * s.speed + s.phase) * 0.5;
      (spark as THREE.Mesh).material = new THREE.MeshBasicMaterial({
        color: 0xffd700, transparent: true,
        opacity: 0.3 + 0.4 * Math.sin(time * s.speed * 2 + s.phase),
      });
    });
  }
}
