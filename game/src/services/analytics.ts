// ============================================================
// ANALYTICS — Задача №12 (Google Analytics + Firebase Analytics)
// Все события: session_start, fish_caught, level_completed, etc.
// ============================================================

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export class Analytics {
  private static instance: Analytics;
  private isReady = false;

  private constructor() {
    // Firebase Analytics уже инициализирован в firebase-config.ts
    // Проверяем наличие gtag
    if (typeof window !== 'undefined') {
      this.isReady = true;
    }
  }

  public static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  /**
   * Логирует событие в Google Analytics (gtag) и в консоль.
   * Поддерживаемые события: session_start, login, fish_caught, sell_all,
   * level_completed, river_lord_achieved, ad_watched, session_end,
   * building_upgraded, region_clicked, cosmetic_purchased
   */
  public logEvent(eventName: string, params?: Record<string, unknown>): void {
    // Консольный лог для разработки
    console.log(`[Analytics] ${eventName}`, params ?? {});

    // Google Analytics через gtag
    if (window.gtag) {
      try {
        window.gtag('event', eventName, params);
      } catch (e) {
        console.warn('[Analytics] gtag error:', e);
      }
    }

    // Дополнительный dataLayer push (GTM совместимость)
    if (window.dataLayer) {
      window.dataLayer.push({ event: eventName, ...params });
    }
  }

  /** Специальный вызов для отслеживания экранов */
  public logScreen(screenName: string): void {
    this.logEvent('screen_view', { screen_name: screenName });
  }

  /** Отслеживание покупки (IAP или за Gems) */
  public logPurchase(itemId: string, price: number, currency: string = 'GEMS'): void {
    this.logEvent('purchase', {
      currency,
      value: price,
      items: [{ item_id: itemId }],
    });
  }

  /** Кастомные метрики сессии */
  public logSessionComplete(opts: {
    levelId: string;
    attempts: number;
    fishCaught: number;
    totalValue: number;
    isCrash: boolean;
  }): void {
    this.logEvent('session_end', {
      level_id:    opts.levelId,
      attempts:    opts.attempts,
      fish_caught: opts.fishCaught,
      total_value: opts.totalValue,
      is_crash:    opts.isCrash,
    });
  }
}
