// ============================================================
// BAIT SELECT UI — Duolingo-flow шаг 2: выбор приманки
// HTML попап на document.body
// ============================================================

import { BAITS, type BaitConfig } from '../data/baitDatabase';
import { createCloseButton, addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle } from './DesignSystem';

export interface BaitSelectResult {
  baitId: string | null;    // null = отмена
  baitDef: BaitConfig | null;
}

export function showBaitSelectUI(playerCoins: number): Promise<BaitSelectResult> {
  return new Promise((resolve) => {
    let resolved = false;
    const close = (result: BaitSelectResult) => {
      if (resolved) return;
      resolved = true;
      removeEsc();
      overlay.remove();
      resolve(result);
    };

    const overlay = document.createElement('div');
    overlay.style.cssText = getOverlayStyle();

    const removeEsc = addEscHandler(() => close({ baitId: null, baitDef: null }));

    const cardsHTML = BAITS.map(bait => {
      const canAfford = playerCoins >= bait.price;
      const opacity = canAfford ? '1' : '0.5';
      return `
        <div class="bait-card" data-bait="${bait.id}" style="
          background:linear-gradient(135deg,#1a2a4a,#0d1b2a);
          border:2px solid #${bait.color3D.toString(16).padStart(6,'0')};
          border-radius:12px;padding:14px;cursor:${canAfford ? 'pointer' : 'not-allowed'};
          min-width:110px;text-align:center;opacity:${opacity};
          transition:transform 0.2s,box-shadow 0.2s;pointer-events:auto;
        ">
          <div style="width:48px;height:48px;margin:0 auto 6px;
            background:#${bait.color3D.toString(16).padStart(6,'0')};
            border-radius:8px;display:flex;align-items:center;justify-content:center;
            font-size:24px;">🪝</div>
          <div style="font-weight:bold;font-size:15px;color:white;">${bait.name}</div>
          <div style="color:#f39c12;font-size:13px;margin-top:4px;">
            ${bait.price === 0 ? 'Бесплатно' : `${bait.price} 💰`}
          </div>
          <div style="color:#27ae60;font-size:12px;margin-top:4px;">
            +${bait.catchBonusMatch}% шанс
          </div>
          <div style="color:#95a5a6;font-size:11px;margin-top:4px;line-height:1.3;">
            ${bait.targetFishBehavior}
          </div>
          ${!canAfford ? '<div style="color:#e74c3c;font-size:10px;margin-top:4px;">Не хватает монет</div>' : ''}
        </div>`;
    }).join('');

    const card = document.createElement('div');
    card.style.cssText = getCardStyle(650);
    card.innerHTML = `
      <h2 style="${getTitleStyle('#f39c12')}">ВЫБЕРИ ПРИМАНКУ</h2>
      <p style="text-align:center;color:#95a5a6;font-size:13px;margin-bottom:16px;">
        💰 ${playerCoins} монет
      </p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        ${cardsHTML}
      </div>
    `;

    // Кнопка закрыть (крестик)
    card.appendChild(createCloseButton(() => close({ baitId: null, baitDef: null })));

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.bait-card').forEach(el => {
      const baitId = el.getAttribute('data-bait')!;
      const bait = BAITS.find(b => b.id === baitId)!;
      const canAfford = playerCoins >= bait.price;

      if (canAfford) {
        el.addEventListener('click', () => {
          close({ baitId, baitDef: bait });
        });
        el.addEventListener('mouseenter', () => {
          (el as HTMLElement).style.transform = 'scale(1.05)';
        });
        el.addEventListener('mouseleave', () => {
          (el as HTMLElement).style.transform = 'scale(1)';
        });
      }
    });

    // Клик на оверлей (вне карточки) — закрыть
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close({ baitId: null, baitDef: null });
    });
  });
}
