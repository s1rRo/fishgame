// ============================================================
// NPC SELECT UI — Duolingo-flow шаг 1: выбор NPC
// HTML попап на document.body
// ============================================================

import { NPC_DATABASE, type NPCDefinition } from '../data/npcDatabase';
import { createCloseButton, addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle, getButtonStyle, applyButtonHover } from './DesignSystem';

export interface NPCSelectResult {
  npcId: string | null; // null = "Без NPC" или отмена
  npcDef: NPCDefinition | null;
}

const RARITY_COLOR: Record<string, string> = {
  common: '#95a5a6', uncommon: '#27ae60', rare: '#3498db', epic: '#9b59b6', legendary: '#f39c12',
};

/**
 * @param ownedNPCIds — id NPC игрока
 * @param resourceHint — текущий ресурс (fish, wood, stone, herb, mineral) для сортировки
 * @param petEquipped — маппинг npcId → petId для показа бонуса
 */
export function showNPCSelectUI(
  ownedNPCIds: string[],
  resourceHint: string = 'fish',
  petEquipped: Record<string, string> = {},
): Promise<NPCSelectResult> {
  return new Promise((resolve) => {
    let resolved = false;
    const close = (result: NPCSelectResult) => {
      if (resolved) return;
      resolved = true;
      removeEsc();
      overlay.remove();
      resolve(result);
    };

    const overlay = document.createElement('div');
    overlay.style.cssText = getOverlayStyle();

    const removeEsc = addEscHandler(() => close({ npcId: null, npcDef: null }));

    const owned = ownedNPCIds
      .map(id => NPC_DATABASE.find(n => n.id === id))
      .filter((n): n is NPCDefinition => !!n)
      .sort((a, b) => {
        const aPred = (a.predisposition as any)[resourceHint] ?? 0;
        const bPred = (b.predisposition as any)[resourceHint] ?? 0;
        return bPred - aPred;
      })
      .slice(0, 6);

    const cardsHTML = owned.map((npc, idx) => {
      const color = RARITY_COLOR[npc.rarity] ?? '#95a5a6';
      const pred = (npc.predisposition as any)[resourceHint] ?? 0;
      const hasPet = !!petEquipped[npc.id];
      const bestBadge = idx === 0 ? '<div style="color:#f1c40f;font-size:10px;font-weight:bold;">★ ЛУЧШИЙ</div>' : '';
      return `
        <div class="npc-card" data-npc="${npc.id}" style="
          background:linear-gradient(135deg,#1a2a4a,#0d1b2a);
          border:2px solid ${color};border-radius:12px;padding:16px;
          cursor:pointer;min-width:140px;text-align:center;
          transition:transform 0.2s,box-shadow 0.2s;pointer-events:auto;
        ">
          ${bestBadge}
          <div style="width:64px;height:64px;margin:0 auto 8px;
            background:#${npc.avatarMeshColor.toString(16).padStart(6,'0')};
            border-radius:50%;border:2px solid ${color};"></div>
          <div style="font-weight:bold;font-size:16px;color:white;">${npc.name}</div>
          <div style="color:${color};font-size:12px;text-transform:uppercase;">${npc.rarity}</div>
          <div style="color:#2ecc71;font-size:14px;margin-top:6px;font-weight:bold;">
            ${resourceHint === 'fish' ? '🎣' : '⛏'} ${pred}%
          </div>
          <div style="color:#95a5a6;font-size:12px;">📦 ${npc.baseCarryCapacity}кг</div>
          ${hasPet ? '<div style="color:#e67e22;font-size:11px;">🐾 Питомец</div>' : ''}
        </div>`;
    }).join('');

    const card = document.createElement('div');
    card.style.cssText = getCardStyle(600);
    card.innerHTML = `
      <h2 style="${getTitleStyle('#3498db')}">ВЫБЕРИ НАПАРНИКА</h2>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">
        ${cardsHTML || '<p style="color:#95a5a6;">У вас нет NPC. Наймите в NPCListScreen.</p>'}
      </div>
      <div style="text-align:center;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;"></div>
    `;

    // Кнопка закрыть (крестик)
    card.appendChild(createCloseButton(() => close({ npcId: null, npcDef: null })));

    // Кнопки внизу
    const btnRow = card.querySelector('div:last-child')!;
    if (owned.length > 0) {
      const autoBtn = document.createElement('button');
      autoBtn.textContent = '⚡ Авто-выбор';
      autoBtn.style.cssText = getButtonStyle('primary', 'md');
      applyButtonHover(autoBtn);
      autoBtn.addEventListener('click', () => close({ npcId: owned[0].id, npcDef: owned[0] }));
      btnRow.appendChild(autoBtn);
    }

    const soloBtn = document.createElement('button');
    soloBtn.textContent = '🚶 Без напарника';
    soloBtn.style.cssText = getButtonStyle('ghost', 'md');
    applyButtonHover(soloBtn);
    soloBtn.addEventListener('click', () => close({ npcId: null, npcDef: null }));
    btnRow.appendChild(soloBtn);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Клик на NPC-карту
    overlay.querySelectorAll('.npc-card').forEach(el => {
      el.addEventListener('click', () => {
        const npcId = el.getAttribute('data-npc')!;
        close({ npcId, npcDef: NPC_DATABASE.find(n => n.id === npcId) ?? null });
      });
      el.addEventListener('mouseenter', () => {
        (el as HTMLElement).style.transform = 'scale(1.05)';
        (el as HTMLElement).style.boxShadow = '0 0 20px rgba(52,152,219,0.4)';
      });
      el.addEventListener('mouseleave', () => {
        (el as HTMLElement).style.transform = 'scale(1)';
        (el as HTMLElement).style.boxShadow = 'none';
      });
    });

    // Клик на оверлей (вне карточки) — закрыть
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close({ npcId: null, npcDef: null });
    });
  });
}
