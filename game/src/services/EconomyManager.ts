// ============================================================
// ECONOMY MANAGER — динамическое ценообразование
// River Lord: Pixel Fishery
// Формула: price = basePrice * (1 + 0.45 * log10((demand+10) / (supply+10)))
// Deficit: deficitMult = Math.max(0.6, 1 - (supply / maxSupply) * 0.75)
// ============================================================

import { resolveResourceId } from '../utils/IdAliases';

export interface MarketPrice {
  resourceId: string;
  basePrice: number;
  currentPrice: number;
  supply: number;
  demand: number;
  maxSupply: number;
  lastUpdated: number;
  change24h: number; // процент изменения за 24ч
}

// Базовые цены ресурсов
const BASE_PRICES: Record<string, number> = {
  carp: 12, trout: 28, salmon_king: 85, perch: 15,
  carp_smoked: 24, trout_smoked: 56, salmon_smoked: 170,
  wood_oak: 8, wood_beech: 10,
  stone: 15, ore_iron: 20,
  herb_patagonia: 10,
  worm: 5, moth: 35, lure: 25, fly_lure: 80, bread: 8,
  fish_hook: 18,
};

const MAX_SUPPLY = 10000;

export class EconomyManager {
  private static instance: EconomyManager;
  private prices: Map<string, MarketPrice> = new Map();
  private listeners: Map<string, Set<(price: number) => void>> = new Map();

  static getInstance(): EconomyManager {
    if (!EconomyManager.instance) {
      EconomyManager.instance = new EconomyManager();
      EconomyManager.instance.initPrices();
    }
    return EconomyManager.instance;
  }

  private initPrices(): void {
    for (const [id, base] of Object.entries(BASE_PRICES)) {
      const supply = 3000 + Math.random() * 4000;
      const demand = 2000 + Math.random() * 3000;
      this.prices.set(id, {
        resourceId: id,
        basePrice: base,
        currentPrice: this.calculatePrice(base, supply, demand, MAX_SUPPLY),
        supply,
        demand,
        maxSupply: MAX_SUPPLY,
        lastUpdated: Date.now(),
        change24h: 0,
      });
    }
  }

  /** Основная формула расчёта цены */
  private calculatePrice(basePrice: number, supply: number, demand: number, maxSupply: number): number {
    const multiplier = 1 + 0.45 * Math.log10((demand + 10) / (supply + 10));
    const currentPrice = basePrice * multiplier;

    // Дефицитный множитель
    const deficitMult = Math.max(0.6, 1 - (supply / maxSupply) * 0.75);
    const finalPrice = currentPrice * deficitMult;

    return Math.max(1, Math.round(finalPrice * 100) / 100);
  }

  /** Получить текущую цену */
  getCurrentPrice(resourceId: string): number {
    const canonicalId = resolveResourceId(resourceId);
    const mp = this.prices.get(canonicalId);
    if (!mp) return BASE_PRICES[canonicalId] ?? BASE_PRICES[resourceId] ?? 10;
    return mp.currentPrice;
  }

  /** Получить полную информацию о цене */
  getPriceInfo(resourceId: string): MarketPrice | undefined {
    return this.prices.get(resolveResourceId(resourceId));
  }

  /** Получить топ-3 изменения цен */
  getTopPriceChanges(): { resourceId: string; change: number }[] {
    const all = Array.from(this.prices.values())
      .map(p => ({ resourceId: p.resourceId, change: p.change24h }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    return all.slice(0, 3);
  }

  /** Обновить supply (после продажи/покупки) */
  updateSupply(resourceId: string, delta: number): void {
    const canonicalId = resolveResourceId(resourceId);
    const mp = this.prices.get(canonicalId);
    if (!mp) return;

    const oldPrice = mp.currentPrice;
    mp.supply = Math.max(0, mp.supply + delta);
    mp.currentPrice = this.calculatePrice(mp.basePrice, mp.supply, mp.demand, mp.maxSupply);
    mp.change24h = ((mp.currentPrice - oldPrice) / oldPrice) * 100;
    mp.lastUpdated = Date.now();

    // Уведомить слушателей
    this.notifyListeners(canonicalId, mp.currentPrice);
  }

  /** Обновить demand */
  updateDemand(resourceId: string, delta: number): void {
    const canonicalId = resolveResourceId(resourceId);
    const mp = this.prices.get(canonicalId);
    if (!mp) return;

    const oldPrice = mp.currentPrice;
    mp.demand = Math.max(0, mp.demand + delta);
    mp.currentPrice = this.calculatePrice(mp.basePrice, mp.supply, mp.demand, mp.maxSupply);
    mp.change24h = ((mp.currentPrice - oldPrice) / oldPrice) * 100;
    mp.lastUpdated = Date.now();

    this.notifyListeners(canonicalId, mp.currentPrice);
  }

  /** Банк сжигает ресурсы (supply резко падает → цена взлетает) */
  bankBurn(resourceId: string, burnPercent: number): void {
    const mp = this.prices.get(resolveResourceId(resourceId));
    if (!mp) return;

    const burned = Math.floor(mp.supply * burnPercent);
    this.updateSupply(resourceId, -burned);
  }

  /** Подписка на изменение цены */
  subscribeToPrice(resourceId: string, callback: (price: number) => void): () => void {
    const canonicalId = resolveResourceId(resourceId);
    if (!this.listeners.has(canonicalId)) {
      this.listeners.set(canonicalId, new Set());
    }
    this.listeners.get(canonicalId)!.add(callback);

    return () => {
      this.listeners.get(canonicalId)?.delete(callback);
    };
  }

  private notifyListeners(resourceId: string, price: number): void {
    this.listeners.get(resourceId)?.forEach(cb => cb(price));
  }

  // ── Gems ↔ SoftCoins обмен (из PDF1: 1 gem = 120 softCoins ±10%) ──
  private static readonly BASE_EXCHANGE_RATE = 120;

  /** Текущий курс обмена gems → softCoins (динамический ±10%) */
  getExchangeRate(): number {
    const variance = (Math.random() - 0.5) * 0.2; // ±10%
    return Math.round(EconomyManager.BASE_EXCHANGE_RATE * (1 + variance));
  }

  /** Конвертировать gems в softCoins */
  gemsToSoftCoins(gems: number): number {
    return gems * this.getExchangeRate();
  }

  /** Конвертировать softCoins в gems (округление вниз) */
  softCoinsToGems(softCoins: number): number {
    return Math.floor(softCoins / this.getExchangeRate());
  }

  /** Получить все ресурсы с ценами для Market UI */
  getAllPrices(): MarketPrice[] {
    return Array.from(this.prices.values());
  }
}
