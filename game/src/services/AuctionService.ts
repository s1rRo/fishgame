// ============================================================
// AUCTION SERVICE — аукцион игроков + банковые операции
// River Lord: Pixel Fishery
// Источник: тз/03 Group E, тз/04 Тема 6
// ============================================================

import type { PlayerProfile, AuctionHistoryEntry } from '../models/Player';
import { EconomyManager } from './EconomyManager';

export interface AuctionLot {
  id: string;
  sellerUid: string;
  sellerName: string;
  resourceId: string;
  qty: number;
  pricePerUnit: number;
  totalPrice: number;
  listedAt: number;
  sold: boolean;
}

// Лимит комиссия 5%
const COMMISSION_RATE = 0.05;

export class AuctionService {
  private static instance: AuctionService;
  private lots: AuctionLot[] = [];
  private nextId = 1;

  static getInstance(): AuctionService {
    if (!AuctionService.instance) {
      AuctionService.instance = new AuctionService();
      AuctionService.instance.generateBotLots();
    }
    return AuctionService.instance;
  }

  /** Выставить лот на аукцион */
  listItem(player: PlayerProfile, resourceId: string, qty: number, pricePerUnit: number): AuctionLot | null {
    const available = player.resources[resourceId] ?? 0;
    if (available < qty) return null;

    // Списать ресурсы
    player.resources[resourceId] -= qty;

    const lot: AuctionLot = {
      id: `lot_${this.nextId++}`,
      sellerUid: player.uid,
      sellerName: player.displayName,
      resourceId,
      qty,
      pricePerUnit,
      totalPrice: qty * pricePerUnit,
      listedAt: Date.now(),
      sold: false,
    };

    this.lots.push(lot);

    // Обновить supply в экономике
    EconomyManager.getInstance().updateSupply(resourceId, qty);

    return lot;
  }

  /** Купить лот */
  buyItem(buyer: PlayerProfile, lotId: string): boolean {
    const lot = this.lots.find(l => l.id === lotId && !l.sold);
    if (!lot) return false;
    if (buyer.softCoins < lot.totalPrice) return false;
    if (lot.sellerUid === buyer.uid) return false;

    // Списать монеты (с комиссией)
    buyer.softCoins -= lot.totalPrice;

    // Добавить ресурсы
    buyer.resources[lot.resourceId] = (buyer.resources[lot.resourceId] ?? 0) + lot.qty;

    // Обновить demand
    EconomyManager.getInstance().updateDemand(lot.resourceId, lot.qty);

    // Отметить как проданный
    lot.sold = true;

    // Записать в историю
    const entry: AuctionHistoryEntry = {
      id: lot.id,
      resourceId: lot.resourceId,
      qty: lot.qty,
      price: lot.totalPrice,
      type: 'buy',
      timestamp: Date.now(),
    };
    buyer.auctionHistory.push(entry);

    return true;
  }

  /** Получить активные лоты */
  getActiveLots(resourceId?: string): AuctionLot[] {
    let active = this.lots.filter(l => !l.sold);
    if (resourceId) active = active.filter(l => l.resourceId === resourceId);
    return active.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  }

  /** Банк скупает и сжигает */
  bankBuyAndBurn(resourceId: string, burnPercent: number = 0.9): void {
    const economy = EconomyManager.getInstance();

    // Сжечь процент supply
    economy.bankBurn(resourceId, burnPercent);

    // Убрать лоты этого ресурса (имитация скупки)
    this.lots = this.lots.filter(l => {
      if (l.resourceId === resourceId && !l.sold) {
        l.sold = true;
        return true;
      }
      return true;
    });
  }

  /** Генерация лотов от ботов (PDF2: 80% low-level + 20% mid-level) */
  private generateBotLots(): void {
    const economy = EconomyManager.getInstance();

    // Low-level боты (80%): дешёвые ресурсы L1, малые объёмы
    const lowBotResources = [
      { resourceId: 'carp', qtyRange: [10, 30] },
      { resourceId: 'perch', qtyRange: [8, 25] },
      { resourceId: 'oak_wood', qtyRange: [20, 60] },
      { resourceId: 'stone', qtyRange: [15, 40] },
      { resourceId: 'worm', qtyRange: [5, 15] },
      { resourceId: 'bread', qtyRange: [10, 30] },
      { resourceId: 'herb_patagonia', qtyRange: [5, 20] },
    ];

    // Mid-level боты (20%): L2 ресурсы, средние объёмы
    const midBotResources = [
      { resourceId: 'trout', qtyRange: [5, 15] },
      { resourceId: 'carp_smoked', qtyRange: [3, 10] },
      { resourceId: 'trout_smoked', qtyRange: [2, 8] },
      { resourceId: 'iron_ore', qtyRange: [10, 25] },
      { resourceId: 'beech_wood', qtyRange: [15, 40] },
      { resourceId: 'moth', qtyRange: [3, 10] },
      { resourceId: 'lure', qtyRange: [2, 8] },
    ];

    const lowNames = ['Pescador_77', 'NuevoGaucho', 'RíoNovato', 'Aprendiz_12', 'PezChico'];
    const midNames = ['GauchoPro', 'PatagónMax', 'LagoPescador', 'RíoKing', 'DorадоHunter'];

    // 80% low-level боты (5-7 лотов)
    const lowCount = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < lowCount; i++) {
      const r = lowBotResources[Math.floor(Math.random() * lowBotResources.length)];
      const qty = r.qtyRange[0] + Math.floor(Math.random() * (r.qtyRange[1] - r.qtyRange[0]));
      const basePrice = economy.getCurrentPrice(r.resourceId);
      // Low-level боты ставят цену 85-100% от рынка
      const pricePerUnit = Math.max(1, Math.round(basePrice * (0.85 + Math.random() * 0.15)));
      this.lots.push({
        id: `lot_${this.nextId++}`,
        sellerUid: `bot_low_${i}`,
        sellerName: lowNames[Math.floor(Math.random() * lowNames.length)],
        resourceId: r.resourceId, qty, pricePerUnit,
        totalPrice: qty * pricePerUnit,
        listedAt: Date.now() - Math.random() * 7200000,
        sold: false,
      });
    }

    // 20% mid-level боты (1-2 лота)
    const midCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < midCount; i++) {
      const r = midBotResources[Math.floor(Math.random() * midBotResources.length)];
      const qty = r.qtyRange[0] + Math.floor(Math.random() * (r.qtyRange[1] - r.qtyRange[0]));
      const basePrice = economy.getCurrentPrice(r.resourceId);
      // Mid-level боты: 95-115% от рынка
      const pricePerUnit = Math.max(1, Math.round(basePrice * (0.95 + Math.random() * 0.2)));
      this.lots.push({
        id: `lot_${this.nextId++}`,
        sellerUid: `bot_mid_${i}`,
        sellerName: midNames[Math.floor(Math.random() * midNames.length)],
        resourceId: r.resourceId, qty, pricePerUnit,
        totalPrice: qty * pricePerUnit,
        listedAt: Date.now() - Math.random() * 3600000,
        sold: false,
      });
    }
  }

  /** Обновить бот-лоты (вызывать каждые 5 мин) — убирает старые, добавляет новые */
  refreshBotLots(): void {
    // Удалить проданные и старые (>4ч) бот-лоты
    this.lots = this.lots.filter(l => {
      if (l.sellerUid.startsWith('bot_') && (l.sold || Date.now() - l.listedAt > 14400000)) {
        return false;
      }
      return true;
    });

    // Добавить новые если мало
    const botLots = this.lots.filter(l => l.sellerUid.startsWith('bot_') && !l.sold);
    if (botLots.length < 4) {
      this.generateBotLots();
    }
  }
}
