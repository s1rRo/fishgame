// ============================================================
// DESIGN SYSTEM — единые стили кнопок, попапов и модальных окон
// River Lord: Pixel Fishery
// ============================================================

/** Цветовая палитра */
export const DS_COLORS = {
  bg:        '#0a1628',
  bgCard:    'rgba(10,22,40,0.95)',
  bgOverlay: 'rgba(0,0,0,0.7)',
  accent:    '#3498db',
  green:     '#27ae60',
  gold:      '#f39c12',
  red:       '#e74c3c',
  gray:      '#7f8c8d',
  grayLight: '#95a5a6',
  white:     '#ffffff',
  textDim:   'rgba(255,255,255,0.6)',
} as const;

/** Pixel-art clip-path для кнопок */
const CLIP_SM = 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))';
const CLIP_MD = 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))';
const CLIP_LG = 'polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'back' | 'close';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Получить inline-стиль кнопки */
export function getButtonStyle(variant: ButtonVariant, size: ButtonSize = 'md', disabled = false): string {
  const bgMap: Record<ButtonVariant, string> = {
    primary:   DS_COLORS.green,
    secondary: DS_COLORS.accent,
    danger:    DS_COLORS.red,
    ghost:     'transparent',
    back:      'rgba(255,255,255,0.1)',
    close:     'rgba(255,255,255,0.1)',
  };

  const borderMap: Record<ButtonVariant, string> = {
    primary:   'none',
    secondary: 'none',
    danger:    'none',
    ghost:     `1px solid ${DS_COLORS.grayLight}`,
    back:      `1px solid ${DS_COLORS.grayLight}`,
    close:     `1px solid ${DS_COLORS.grayLight}`,
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'padding:6px 14px;font-size:12px;',
    md: 'padding:10px 22px;font-size:14px;',
    lg: 'padding:14px 32px;font-size:16px;',
  };

  const clipMap: Record<ButtonSize, string> = {
    sm: CLIP_SM,
    md: CLIP_MD,
    lg: CLIP_LG,
  };

  const bg = disabled ? DS_COLORS.gray : bgMap[variant];
  const cursor = disabled ? 'not-allowed' : 'pointer';
  const opacity = disabled ? '0.7' : '1';

  return `
    display:inline-flex;align-items:center;justify-content:center;gap:6px;
    background:${bg};color:${DS_COLORS.white};border:${borderMap[variant]};
    ${sizeStyles[size]}
    font-family:'Rajdhani',sans-serif;font-weight:bold;letter-spacing:0.5px;
    cursor:${cursor};opacity:${opacity};
    clip-path:${clipMap[size]};
    pointer-events:auto;
    transition:filter 0.15s,transform 0.1s;
    user-select:none;white-space:nowrap;
  `.replace(/\n\s+/g, '');
}

/** Hover/active эффекты — вызвать при mouseenter/mouseleave/mousedown/mouseup */
export function applyButtonHover(btn: HTMLElement): void {
  btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.2)'; });
  btn.addEventListener('mouseleave', () => { btn.style.filter = ''; btn.style.transform = ''; });
  btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.96)'; });
  btn.addEventListener('mouseup', () => { btn.style.transform = ''; });
}

/** Создать готовую кнопку */
export function createButton(
  text: string,
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  disabled = false,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.cssText = getButtonStyle(variant, size, disabled);
  btn.disabled = disabled;
  if (!disabled) applyButtonHover(btn);
  return btn;
}

/** Создать кнопку "← НАЗАД" */
export function createBackButton(onClick: () => void): HTMLButtonElement {
  const btn = createButton('← НАЗАД', 'back', 'sm');
  btn.addEventListener('click', onClick);
  return btn;
}

/** Создать кнопку "✕" закрыть (угловая) */
export function createCloseButton(onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = '✕';
  btn.style.cssText = `
    position:absolute;top:10px;right:10px;
    width:32px;height:32px;
    background:rgba(255,255,255,0.1);color:${DS_COLORS.white};
    border:1px solid rgba(255,255,255,0.3);border-radius:50%;
    font-size:16px;cursor:pointer;pointer-events:auto;
    display:flex;align-items:center;justify-content:center;
    transition:background 0.15s,transform 0.1s;
    z-index:10;
  `.replace(/\n\s+/g, '');
  btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(231,76,60,0.6)'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
  btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.9)'; });
  btn.addEventListener('mouseup', () => { btn.style.transform = ''; });
  btn.addEventListener('click', onClick);
  return btn;
}

/** Стиль модального оверлея (полноэкранный затемняющий фон) */
export function getOverlayStyle(): string {
  return `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:${DS_COLORS.bgOverlay};
    display:flex;align-items:center;justify-content:center;
    z-index:9999;pointer-events:auto;
  `.replace(/\n\s+/g, '');
}

/** Стиль модальной карточки */
export function getCardStyle(maxWidth = 420): string {
  return `
    position:relative;
    background:${DS_COLORS.bgCard};
    border:2px solid ${DS_COLORS.accent};border-radius:16px;
    padding:28px;max-width:${maxWidth}px;width:90%;
    max-height:80vh;overflow-y:auto;
    font-family:'Rajdhani',sans-serif;color:${DS_COLORS.white};
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
  `.replace(/\n\s+/g, '');
}

/** Добавить ESC-обработчик к попапу. Возвращает функцию для снятия обработчика. */
export function addEscHandler(onClose: () => void): () => void {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}

/** Стиль заголовка попапа */
export function getTitleStyle(color: string = DS_COLORS.gold): string {
  return `font-family:'Press Start 2P',monospace;font-size:13px;color:${color};text-align:center;margin-bottom:12px;`;
}

/** Стиль секции-контейнера внутри попапа */
export function getSectionStyle(): string {
  return `background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;margin-bottom:12px;`;
}

/** Ряд кнопок внизу попапа */
export function getButtonRowStyle(): string {
  return `display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap;`;
}
