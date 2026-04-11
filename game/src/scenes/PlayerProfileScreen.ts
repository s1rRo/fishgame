// ============================================================
// PLAYER PROFILE SCREEN — полный профиль с 6 табами
// Обзор | Атлас рыб | NPC | Питомцы | Достижения | Статистика
// ============================================================

import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import type { PlayerProfile } from '../models/Player';
import { argentineFishDatabase } from '../data/fishDatabase';
import { NPC_DATABASE } from '../data/npcDatabase';
import { PET_DATABASE } from '../data/petDatabase';
import { addEscHandler } from '../ui/DesignSystem';

const AVATARS = [
  { id: 'avatar_default_m', name: 'Рыбак', color: '#f0c080', unlock: 'free' },
  { id: 'avatar_default_f', name: 'Рыбачка', color: '#e8b87a', unlock: 'free' },
  { id: 'avatar_cowboy', name: 'Ковбой', color: '#d4a07a', unlock: '150 💎' },
  { id: 'avatar_nomad', name: 'Кочевник', color: '#a0785a', unlock: 'Season Pass 15' },
  { id: 'avatar_lord', name: 'River Lord', color: '#f0d0a0', unlock: 'Достижение' },
];

const ROD_SKINS = [
  { id: 'rod_basic', name: 'Бамбуковая', color: '#8B4513', unlock: 'free' },
  { id: 'rod_steel', name: 'Стальная', color: '#bdc3c7', unlock: '80 💎' },
  { id: 'rod_golden', name: 'Золотая', color: '#f39c12', unlock: 'Season Pass 25' },
  { id: 'rod_crystal', name: 'Кристальная', color: '#3498db', unlock: 'Достижение' },
];

const avatarImagePath = (index: number): string => `/assets/images/avatars/avatar_${index + 1}.png`;

const ACHIEVEMENTS = [
  { id: 'first_fish', name: 'Первая рыба', desc: 'Поймай свою первую рыбу', icon: '🐟' },
  { id: 'fish_100', name: 'Рыбак-ветеран', desc: 'Поймай 100 рыб', icon: '🎣' },
  { id: 'rare_catch', name: 'Редкая добыча', desc: 'Поймай рыбу редкости Rare', icon: '⭐' },
  { id: 'epic_catch', name: 'Эпический улов', desc: 'Поймай рыбу редкости Epic', icon: '💫' },
  { id: 'legendary', name: 'Легенда', desc: 'Поймай легендарную рыбу', icon: '👑' },
  { id: 'village_5', name: 'Деревня L5', desc: 'Достигни 5 уровня деревни', icon: '🏘' },
  { id: 'village_12', name: 'Поселение', desc: 'Достигни 12 уровня деревни', icon: '🏰' },
  { id: 'biome_l2', name: 'Науэль-Уапи', desc: 'Открой второй биом', icon: '🗻' },
  { id: 'biome_l3', name: 'Лаго Архентино', desc: 'Открой третий биом', icon: '❄️' },
  { id: 'river_lord', name: 'River Lord', desc: 'Стань River Lord в регионе', icon: '🏆' },
  { id: 'npc_10', name: 'Управленец', desc: 'Найми 10 NPC', icon: '👥' },
  { id: 'coins_10k', name: 'Богач', desc: 'Заработай 10,000 монет', icon: '💰' },
  { id: 'sell_100', name: 'Торговец', desc: 'Продай 100 рыб', icon: '🛒' },
  { id: 'pet_collector', name: 'Зоолог', desc: 'Собери 5 питомцев', icon: '🐾' },
  { id: 'season_complete', name: 'Сезонный герой', desc: 'Завершить Season Pass', icon: '📅' },
  { id: 'fish_atlas_50', name: 'Ихтиолог', desc: 'Открой 50% атласа рыб', icon: '📖' },
  { id: 'craft_master', name: 'Мастер крафта', desc: 'Скрафти 10 предметов', icon: '🔨' },
  { id: 'big_fish', name: 'Большая рыба', desc: 'Поймай рыбу > 10кг', icon: '🐋' },
  { id: 'speed_run', name: 'Спидран', desc: 'Пройди чекпоинт за 45 сек', icon: '⚡' },
  { id: 'lootbox_luck', name: 'Удача', desc: 'Получи Legendary из лутбокса', icon: '🎰' },
];

type TabId = 'overview' | 'atlas' | 'npc' | 'pets' | 'achievements' | 'stats';

export class PlayerProfileScreen extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private removeEsc: (() => void) | null = null;
  private player: PlayerProfile | null = null;
  private userId = '';
  private activeTab: TabId = 'overview';

  start(_data?: any): void {
    this.scene.background = null;
    this.loadAndShow();
  }

  update(_delta: number): void {}

  stop(): void {
    super.stop();
    this.removeEsc?.();
    this.removeEsc = null;
    this.overlay?.remove();
    this.overlay = null;
  }

  private async loadAndShow(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (!user) { console.warn('[Profile] No user, going back'); this.goBack(); return; }
    this.userId = user.uid;
    try {
      this.player = await DatabaseService.getInstance().getPlayerProfile(user.uid);
    } catch (err) {
      console.error('[Profile] Failed to load profile:', err);
      this.goBack();
      return;
    }
    if (!this.player) { console.warn('[Profile] No player, going back'); this.goBack(); return; }
    console.log('[Profile] Player loaded, rendering...');
    try {
      this.render();
      console.log('[Profile] Render complete, overlay exists:', !!this.overlay);
    } catch (err) {
      console.error('[Profile] Render failed:', err);
      this.goBack();
    }
  }

  private render(): void {
    this.overlay?.remove();
    if (!this.player) return;
    const p = this.player;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.85);z-index:1000;
      display:flex;flex-direction:column;align-items:center;
      font-family:'Rajdhani',sans-serif;color:#fff;
      overflow-y:auto;padding:16px 0;
    `;

    // Табы
    const tabs: { id: TabId; label: string }[] = [
      { id: 'overview', label: '👤 Обзор' },
      { id: 'atlas', label: '🐟 Атлас' },
      { id: 'npc', label: '👥 NPC' },
      { id: 'pets', label: '🐾 Питомцы' },
      { id: 'achievements', label: '🏆 Награды' },
      { id: 'stats', label: '📊 Стат.' },
    ];

    const tabsHTML = tabs.map(t => `
      <button class="prof-tab" data-tab="${t.id}" style="
        padding:8px 14px;font-family:'Press Start 2P',monospace;font-size:8px;
        background:${this.activeTab === t.id ? '#3498db' : 'rgba(52,152,219,0.2)'};
        color:${this.activeTab === t.id ? '#fff' : '#95a5a6'};
        border:1px solid ${this.activeTab === t.id ? '#3498db' : '#2c3e50'};
        cursor:pointer;border-radius:4px;white-space:nowrap;
      ">${t.label}</button>
    `).join('');

    let content = '';
    switch (this.activeTab) {
      case 'overview': content = this.renderOverview(p); break;
      case 'atlas': content = this.renderAtlas(p); break;
      case 'npc': content = this.renderNPC(p); break;
      case 'pets': content = this.renderPets(p); break;
      case 'achievements': content = this.renderAchievements(p); break;
      case 'stats': content = this.renderStats(p); break;
    }

    this.overlay.innerHTML = `
      <div style="max-width:600px;width:95%;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:16px;">
          ${tabsHTML}
        </div>
        <div style="
          background:linear-gradient(135deg,#1a2a4a,#0d1b2a);
          border:2px solid #3498db;border-radius:12px;padding:24px;
          clip-path:polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
        ">
          ${content}
        </div>
        <div style="text-align:center;margin-top:12px;">
          <button id="prof-back" style="
            padding:10px 20px;background:#e74c3c;color:#fff;border:none;
            font-family:'Rajdhani',sans-serif;font-size:15px;cursor:pointer;border-radius:4px;
          ">← Назад</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.removeEsc = addEscHandler(() => this.goBack());

    // Обработчики табов
    this.overlay.querySelectorAll('.prof-tab').forEach(el => {
      el.addEventListener('click', () => {
        this.activeTab = (el as HTMLElement).dataset.tab as TabId;
        this.render();
      });
    });

    this.overlay.querySelector('#prof-back')?.addEventListener('click', () => this.goBack());

    // Обработчики внутри табов
    this.bindTabEvents(p);
  }

  // ─── ТАБ: ОБЗОР ───

  private renderOverview(p: PlayerProfile): string {
    const avatar = AVATARS.find(a => a.id === (p.avatarId ?? 'avatar_default_m'));
    const rod = ROD_SKINS.find(r => r.id === (p.rodSkinId ?? 'rod_basic'));
    const fishCount = Object.keys(p.fishAtlas ?? {}).filter(k => p.fishAtlas?.[k]?.caught).length;
    const avatarIndex = Math.max(0, AVATARS.indexOf(avatar!));

    return `
      <div style="text-align:center;margin-bottom:16px;">
        <img src="${avatarImagePath(avatarIndex)}" alt="${avatar?.name ?? 'avatar'}" style="width:80px;height:80px;border-radius:50%;margin:0 auto 8px;border:3px solid #f39c12;background:${avatar?.color ?? '#111'};image-rendering:pixelated;object-fit:cover;display:block;" onerror="this.style.display='none'">
        <p style="font-size:20px;font-weight:bold;">${p.displayName}</p>
        <p style="color:#95a5a6;font-size:13px;">${avatar?.name ?? 'Рыбак'} | ${rod?.name ?? 'Бамбуковая'}</p>
      </div>
      <div style="display:flex;justify-content:space-around;margin-bottom:16px;font-size:16px;">
        <span>💰 ${p.softCoins}</span><span>💎 ${p.gems}</span><span>🏘 Ур.${p.villageLevel ?? 1}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
        <div style="background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;">
          <div style="font-size:20px;color:#27ae60;">${p.totalFishCaught}</div>
          <div style="font-size:11px;color:#95a5a6;">Рыб поймано</div>
        </div>
        <div style="background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;">
          <div style="font-size:20px;color:#3498db;">${fishCount}/40</div>
          <div style="font-size:11px;color:#95a5a6;">Атлас рыб</div>
        </div>
        <div style="background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;">
          <div style="font-size:20px;color:#f39c12;">${(p.achievements ?? []).length}</div>
          <div style="font-size:11px;color:#95a5a6;">Достижений</div>
        </div>
      </div>
      <div style="margin-top:16px;">
        <h3 style="font-size:13px;color:#3498db;margin-bottom:8px;">🎭 Аватар</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${AVATARS.map((a, i) => `
            <div class="avatar-pick" data-id="${a.id}" style="
              width:48px;height:48px;border-radius:50%;overflow:hidden;
              border:3px solid ${(p.avatarId ?? 'avatar_default_m') === a.id ? '#f39c12' : '#2c3e50'};
              cursor:pointer;background:${a.color};image-rendering:pixelated;" title="${a.name}">
              <img src="${avatarImagePath(i)}" alt="${a.name}" style="width:100%;height:100%;object-fit:cover;image-rendering:pixelated;display:block;" onerror="this.style.display='none'">
            </div>
          `).join('')}
        </div>
      </div>
      <div style="margin-top:12px;">
        <h3 style="font-size:13px;color:#3498db;margin-bottom:8px;">🎣 Удочка</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${ROD_SKINS.map(r => `
            <div class="rod-pick" data-id="${r.id}" style="
              width:56px;height:14px;border-radius:7px;background:${r.color};
              border:2px solid ${(p.rodSkinId ?? 'rod_basic') === r.id ? '#f39c12' : '#2c3e50'};
              cursor:pointer;" title="${r.name}"></div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ─── ТАБ: АТЛАС РЫБ ───

  private renderAtlas(p: PlayerProfile): string {
    const fishList = Array.isArray(argentineFishDatabase) ? argentineFishDatabase : [];
    const total = fishList.length;
    const caught = Object.keys(p.fishAtlas ?? {}).filter(k => p.fishAtlas?.[k]?.caught).length;

    const rarityColors: Record<string, string> = {
      'Common': '#95a5a6', 'Uncommon': '#27ae60', 'Rare': '#3498db',
      'Epic': '#8e44ad', 'Legendary': '#f39c12',
    };

    const fishCards = fishList.map((f: any) => {
      const entry = (p.fishAtlas ?? {})[f.id];
      const isCaught = entry?.caught ?? false;

      return `
        <div style="
          background:rgba(0,0,0,0.3);border:1px solid ${isCaught ? (rarityColors[f.rarity] ?? '#555') : '#333'};
          border-radius:6px;padding:8px;text-align:center;min-width:80px;
          opacity:${isCaught ? '1' : '0.5'};
        ">
          ${isCaught
            ? `<img src="${f.iconPath}" style="width:40px;height:40px;image-rendering:pixelated;border-radius:4px;margin:0 auto;display:block;background:rgba(0,0,0,0.3);" onerror="this.outerHTML='<div style=\\'font-size:18px\\'>🐟</div>'">`
            : `<div style="font-size:18px;">❓</div>`
          }
          <div style="font-size:10px;color:${rarityColors[f.rarity] ?? '#aaa'};margin-top:2px;">
            ${isCaught ? f.name : '???'}
          </div>
          ${isCaught && entry ? `<div style="font-size:9px;color:#95a5a6;">Макс: ${entry.maxWeight.toFixed(1)}кг (×${entry.count})</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <h3 style="font-family:'Press Start 2P',monospace;font-size:11px;color:#3498db;text-align:center;margin-bottom:12px;">
        🐟 АТЛАС РЫБ: ${caught}/${total}
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(85px,1fr));gap:6px;max-height:50vh;overflow-y:auto;">
        ${fishCards}
      </div>
    `;
  }

  // ─── ТАБ: NPC РОСТЕР ───

  private renderNPC(p: PlayerProfile): string {
    const npcList = Array.isArray(NPC_DATABASE) ? NPC_DATABASE : [];
    const rarityColors: Record<string, string> = {
      'Common': '#95a5a6', 'Uncommon': '#27ae60', 'Rare': '#3498db',
      'Epic': '#8e44ad', 'Legendary': '#f39c12',
    };

    const cards = npcList.map((npc: any) => {
      const owned = (p.activeNPCIds ?? []).includes(npc.id);
      const level = (p.npcLevels ?? {})[npc.id] ?? 1;
      const isTraining = p.npcTraining?.npcId === npc.id;
      const dispatched = (p.npcDispatches ?? {})[npc.id];

      let statusText = '🔒 Не нанят';
      let statusColor = '#555';
      if (owned) {
        if (isTraining) { statusText = '🎓 В обучении'; statusColor = '#f39c12'; }
        else if (dispatched) { statusText = '⛏ На добыче'; statusColor = '#27ae60'; }
        else { statusText = '✅ Свободен'; statusColor = '#3498db'; }
      }

      return `
        <div style="
          background:rgba(0,0,0,0.3);border:1px solid ${owned ? (rarityColors[npc.rarity] ?? '#555') : '#333'};
          border-radius:6px;padding:10px;opacity:${owned ? '1' : '0.5'};
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <img src="${npc.iconPath}" style="width:36px;height:36px;image-rendering:pixelated;border-radius:50%;background:rgba(0,0,0,0.3);flex-shrink:0;" onerror="this.style.display='none'">
            <span style="font-size:14px;font-weight:bold;flex:1;">${npc.name}</span>
            <span style="font-size:10px;color:${rarityColors[npc.rarity] ?? '#aaa'};">${npc.rarity}</span>
          </div>
          ${owned ? `
            <div style="font-size:11px;color:#95a5a6;margin-top:4px;">Ур.${level} | 🐟${npc.predisposition?.fish ?? 0}%</div>
            <div style="font-size:10px;color:${statusColor};margin-top:2px;">${statusText}</div>
          ` : `<div style="font-size:10px;color:#555;margin-top:4px;">Не получен</div>`}
        </div>
      `;
    }).join('');

    return `
      <h3 style="font-family:'Press Start 2P',monospace;font-size:11px;color:#3498db;text-align:center;margin-bottom:12px;">
        👥 NPC: ${p.activeNPCIds.length} нанято
      </h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:50vh;overflow-y:auto;">
        ${cards}
      </div>
    `;
  }

  // ─── ТАБ: ПИТОМЦЫ ───

  private renderPets(p: PlayerProfile): string {
    const petList = Array.isArray(PET_DATABASE) ? PET_DATABASE : [];
    const rarityColors: Record<string, string> = {
      'Common': '#95a5a6', 'Rare': '#3498db', 'Epic': '#8e44ad',
    };

    const cards = petList.map((pet: any) => {
      const owned = p.ownedPetIds.includes(pet.id);
      const equippedTo = Object.entries(p.petEquipped ?? {}).find(([, pid]) => pid === pet.id);

      return `
        <div style="
          background:rgba(0,0,0,0.3);border:1px solid ${owned ? (rarityColors[pet.rarity] ?? '#555') : '#333'};
          border-radius:6px;padding:10px;text-align:center;opacity:${owned ? '1' : '0.5'};
        ">
          ${owned
            ? `<img src="${pet.iconPath}" style="width:48px;height:48px;image-rendering:pixelated;border-radius:6px;margin:0 auto;display:block;background:rgba(0,0,0,0.3);" onerror="this.outerHTML='<div style=\\'font-size:22px\\'>${pet.emoji ?? '🐾'}</div>'">`
            : `<div style="font-size:22px;">🐾</div>`
          }
          <div style="font-size:12px;margin-top:4px;">${owned ? pet.name : '???'}</div>
          <div style="font-size:10px;color:${rarityColors[pet.rarity] ?? '#aaa'};">${pet.rarity}</div>
          ${owned && equippedTo ? `<div style="font-size:9px;color:#27ae60;margin-top:2px;">→ ${equippedTo[0]}</div>` : ''}
          ${owned ? `<div style="font-size:9px;color:#95a5a6;">+${pet.bonusPercent ?? 15}% ${pet.bonusType ?? 'all'}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <h3 style="font-family:'Press Start 2P',monospace;font-size:11px;color:#3498db;text-align:center;margin-bottom:12px;">
        🐾 ПИТОМЦЫ: ${p.ownedPetIds.length}/${petList.length}
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;max-height:50vh;overflow-y:auto;">
        ${cards}
      </div>
    `;
  }

  // ─── ТАБ: ДОСТИЖЕНИЯ ───

  private renderAchievements(p: PlayerProfile): string {
    const cards = ACHIEVEMENTS.map(a => {
      const unlocked = (p.achievements ?? []).includes(a.id);
      return `
        <div style="
          background:rgba(0,0,0,0.3);border:1px solid ${unlocked ? '#f39c12' : '#333'};
          border-radius:6px;padding:10px;display:flex;gap:10px;align-items:center;
          opacity:${unlocked ? '1' : '0.5'};
        ">
          <div style="font-size:24px;">${unlocked ? a.icon : '🔒'}</div>
          <div>
            <div style="font-size:13px;font-weight:bold;color:${unlocked ? '#f39c12' : '#aaa'};">${a.name}</div>
            <div style="font-size:11px;color:#95a5a6;">${a.desc}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <h3 style="font-family:'Press Start 2P',monospace;font-size:11px;color:#f39c12;text-align:center;margin-bottom:12px;">
        🏆 ДОСТИЖЕНИЯ: ${(p.achievements ?? []).length}/${ACHIEVEMENTS.length}
      </h3>
      <div style="display:grid;gap:6px;max-height:55vh;overflow-y:auto;">
        ${cards}
      </div>
    `;
  }

  // ─── ТАБ: СТАТИСТИКА ───

  private renderStats(p: PlayerProfile): string {
    const playTimeH = Math.floor(p.totalPlayTimeMinutes / 60);
    const playTimeM = p.totalPlayTimeMinutes % 60;
    const fishCaught = Object.keys(p.fishAtlas ?? {}).filter(k => p.fishAtlas?.[k]?.caught).length;

    const rows = [
      ['🐟 Рыб поймано', `${p.totalFishCaught ?? 0}`],
      ['🐟 Видов открыто', `${fishCaught}/40`],
      ['💰 Монет заработано', `${p.totalRevenue ?? 0}`],
      ['💰 Текущий баланс', `${p.softCoins ?? 0}`],
      ['💎 Гемов', `${p.gems ?? 0}`],
      ['🛒 Рыб продано', `${p.totalFishSold ?? 0}`],
      ['🎮 Сессий', `${p.totalSessions ?? 0}`],
      ['⏱ Время в игре', `${playTimeH}ч ${playTimeM}м`],
      ['🏘 Уровень деревни', `${p.villageLevel ?? 1}`],
      ['📦 Ресурсов всего', `${p.totalResources ?? 0}`],
      ['👥 NPC нанято', `${(p.activeNPCIds ?? []).length}`],
      ['🐾 Питомцев', `${(p.ownedPetIds ?? []).length}`],
      ['🏆 Достижений', `${(p.achievements ?? []).length}`],
      ['📅 Season Pass', `Ур.${p.seasonPass?.freeTrackProgress ?? 0}`],
      ['💰 Пассив доход', `${p.passiveCoinsPerMinute ?? 0}/мин`],
      ['📊 Аукцион сделок', `${(p.auctionHistory ?? []).length}`],
    ];

    return `
      <h3 style="font-family:'Press Start 2P',monospace;font-size:11px;color:#3498db;text-align:center;margin-bottom:12px;">
        📊 ПОЛНАЯ СТАТИСТИКА
      </h3>
      <div style="max-height:55vh;overflow-y:auto;">
        ${rows.map(([label, val]) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;">
            <span style="color:#95a5a6;">${label}</span>
            <span style="color:#fff;font-weight:bold;">${val}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── EVENTS ───

  private bindTabEvents(p: PlayerProfile): void {
    if (!this.overlay) return;

    // Аватар
    this.overlay.querySelectorAll('.avatar-pick').forEach(el => {
      el.addEventListener('click', async () => {
        const id = (el as HTMLElement).dataset.id;
        if (!id || !this.player) return;
        if (!this.isCosmeticAvailable(p, id)) {
          window.alert('Этот аватар пока не открыт.');
          return;
        }
        await this.saveProfileCosmetic({ avatarId: id });
      });
    });

    // Удочка
    this.overlay.querySelectorAll('.rod-pick').forEach(el => {
      el.addEventListener('click', async () => {
        const id = (el as HTMLElement).dataset.id;
        if (!id || !this.player) return;
        if (!this.isCosmeticAvailable(p, id)) {
          window.alert('Этот скин удочки пока не открыт.');
          return;
        }
        await this.saveProfileCosmetic({ rodSkinId: id });
      });
    });
  }

  private isCosmeticAvailable(p: PlayerProfile, id: string): boolean {
    const avatar = AVATARS.find(a => a.id === id);
    const rod = ROD_SKINS.find(r => r.id === id);
    const isFree = avatar?.unlock === 'free' || rod?.unlock === 'free';
    return isFree || (p.ownedCosmetics ?? []).includes(id);
  }

  private async saveProfileCosmetic(update: Pick<PlayerProfile, 'avatarId'> | Pick<PlayerProfile, 'rodSkinId'>): Promise<void> {
    if (!this.player || !this.userId) return;

    try {
      await DatabaseService.getInstance().updatePlayerStats(this.userId, update);
      this.player = { ...this.player, ...update };
      this.render();
    } catch (err) {
      console.error('[Profile] Failed to save cosmetic:', err);
      window.alert('Не удалось сохранить выбор. Попробуй ещё раз.');
    }
  }

  private goBack(): void {
    const biomeId = this.player?.currentBiomeId ?? 'rio_salado';
    if (this.player?.villagePosition) {
      this.sceneManager.startScene('BiomeView', { biomeId });
      return;
    }
    this.sceneManager.startScene('PlanetScene');
  }
}
