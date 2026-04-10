// ============================================================
// CHECKPOINT ROAD UI — Duolingo-flow шаг 3: дорожка чекпоинтов
// HTML попап на document.body
// ============================================================

import { createCloseButton, createBackButton, addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle, getButtonRowStyle } from './DesignSystem';

export interface CheckpointResult {
  checkpointIndex: number; // 0-based, -1 = отмена
  totalCheckpoints: number;
}

/**
 * Показывает Duolingo-стиль "дорожку" чекпоинтов.
 * @param total - сколько чекпоинтов (5-8)
 * @param completed - сколько уже пройдено
 */
export function showCheckpointRoadUI(total: number, completed: number): Promise<CheckpointResult> {
  return new Promise((resolve) => {
    let resolved = false;
    const close = (result: CheckpointResult) => {
      if (resolved) return;
      resolved = true;
      removeEsc();
      overlay.remove();
      resolve(result);
    };

    const overlay = document.createElement('div');
    overlay.style.cssText = getOverlayStyle();

    const removeEsc = addEscHandler(() => close({ checkpointIndex: -1, totalCheckpoints: total }));

    let nodesHTML = '';
    for (let i = 0; i < total; i++) {
      const isCompleted = i < completed;
      const isCurrent = i === completed;
      const isLocked = i > completed;

      let bg = '#333';
      let border = '#555';
      let icon = '🔒';
      let cursor = 'not-allowed';
      let glow = '';

      if (isCompleted) {
        bg = '#27ae60';
        border = '#2ecc71';
        icon = '✓';
        cursor = 'default';
      } else if (isCurrent) {
        bg = '#3498db';
        border = '#5dade2';
        icon = `${i + 1}`;
        cursor = 'pointer';
        glow = 'box-shadow:0 0 16px rgba(52,152,219,0.6);animation:pulse 1.5s infinite;';
      } else if (isLocked) {
        icon = '🔒';
      }

      const difficulty = i < 3 ? '★' : i < 6 ? '★★' : '★★★';

      nodesHTML += `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="cp-node" data-cp="${i}" style="
            width:56px;height:56px;border-radius:50%;
            background:${bg};border:3px solid ${border};
            display:flex;align-items:center;justify-content:center;
            font-size:${isCompleted ? '20px' : '18px'};color:white;
            cursor:${cursor};font-weight:bold;${glow}
            transition:transform 0.2s;pointer-events:auto;
          ">${icon}</div>
          <span style="color:${isLocked ? '#555' : '#95a5a6'};font-size:11px;margin-top:4px;">
            ${difficulty}
          </span>
        </div>
        ${i < total - 1 ? `<div style="
          width:30px;height:3px;
          background:${i < completed ? '#27ae60' : '#333'};
          margin:0 2px;align-self:center;border-radius:2px;
        "></div>` : ''}`;
    }

    const card = document.createElement('div');
    card.style.cssText = getCardStyle(600);
    card.innerHTML = `
      <style>
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
      <h2 style="${getTitleStyle('#3498db')}">МАРШРУТ РЫБАЛКИ</h2>
      <div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px;">
        ${nodesHTML}
      </div>
      <p style="text-align:center;color:#95a5a6;font-size:13px;margin-top:16px;">
        Пройдено: ${completed} / ${total}
      </p>
      <div style="${getButtonRowStyle()}"></div>
    `;

    // Кнопка закрыть (крестик)
    card.appendChild(createCloseButton(() => close({ checkpointIndex: -1, totalCheckpoints: total })));

    // Кнопка назад внизу
    const btnRow = card.querySelector('div:last-child')!;
    btnRow.appendChild(createBackButton(() => close({ checkpointIndex: -1, totalCheckpoints: total })));

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Клик на текущий чекпоинт → запуск
    overlay.querySelectorAll('.cp-node').forEach(node => {
      const idx = parseInt(node.getAttribute('data-cp')!, 10);
      if (idx === completed) {
        node.addEventListener('click', () => {
          close({ checkpointIndex: idx, totalCheckpoints: total });
        });
        node.addEventListener('mouseenter', () => {
          (node as HTMLElement).style.transform = 'scale(1.15)';
        });
        node.addEventListener('mouseleave', () => {
          (node as HTMLElement).style.transform = 'scale(1)';
        });
      }
    });

    // Клик на оверлей (вне карточки) — закрыть
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close({ checkpointIndex: -1, totalCheckpoints: total });
    });
  });
}
