// ============================================================
// LEADERBOARD SCENE — Задача №7 (River Lord таблица рекордов)
// Глобальный топ-10 + личный рекорд по каждому уровню
// ============================================================
import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { RiverLordManager, RiverLordRecord } from '../services/RiverLordManager';
import { TopHUD } from '../ui/TopHUD';
import { levelBalance } from '../data/fishDatabase';
import { PlayerProfile } from '../models/Player';
import { matLP, LP, applyLowPolyToScene } from '../utils/LowPolyStyle';
import { BIOMES } from '../data/biomeDatabase';

const BIOME_FILTERS = [
  { id: 'all', name: 'Все биомы' },
  { id: 'rio_salado', name: 'Рио Саладо' },
  { id: 'nahuel_huapi', name: 'Науэль-Уапи' },
  { id: 'lago_argentino', name: 'Лаго Аргентино' },
];

export class LeaderboardScene extends BaseScene {
  private authService = AuthService.getInstance();
  private dbService   = DatabaseService.getInstance();
  private rlManager   = RiverLordManager.getInstance();
  private hud!: TopHUD;

  private uid         = '';
  private profile: PlayerProfile | null = null;
  private selectedLevel = '1';
  private selectedBiome = 'all';

  private particles: THREE.Mesh[] = [];

  async start(data?: { levelId?: string }) {
    try {
      if (data?.levelId) this.selectedLevel = data.levelId;
      this.hud = new TopHUD(this.uiContainer);
      this.hud.setDefaultNavigation(this.sceneManager);
      await this.loadData();
      this.setup3D();
      await this.renderUI();
    } catch (e) {
      console.error('LeaderboardScene: start() failed', e);
      await this.renderUI();
    }
  }

  private async loadData() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.uid     = user.uid;
    this.profile = await this.dbService.getPlayerProfile(this.uid);
    if (this.profile) this.hud.render(this.profile, 'River Lord');
  }

  private setup3D() {
    this.scene.background = new THREE.Color(0x0b0b1e);
    this.camera.position.set(0, 0, 10);
    const ambient = new THREE.AmbientLight(0x5544cc, 1.0);
    this.scene.add(ambient);
    const point = new THREE.PointLight(0xf39c12, 1.5, 20);
    point.position.set(0, 6, 4);
    this.scene.add(point);

    // Золотая корона low-poly (OctahedronGeometry зубья, matLP)
    const crownGroup = new THREE.Group();
    // Основание
    const crownBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.4, 4, 1, 1), matLP(LP.gold));
    crownGroup.add(crownBase);
    // Зубцы — Octahedron вместо Box
    [[-0.9, 0.9], [0, 1.4], [0.9, 0.9]].forEach(([x, h], i) => {
      const tooth = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), matLP(i === 1 ? LP.gem : LP.gold, { emissive: i === 1 ? LP.gem : LP.gold }));
      tooth.position.set(x, h * 0.5 + 0.2, 0);
      tooth.scale.y = h;
      crownGroup.add(tooth);
    });
    // Камни по основанию
    [[-0.9, 0xe74c3c], [0, LP.glow], [0.9, 0xe74c3c]].forEach(([x, col]) => {
      const gem = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15, 0), matLP(col as number, { emissive: col as number }));
      gem.position.set(x as number, 0.05, 0.28);
      crownGroup.add(gem);
    });
    crownGroup.position.set(-5.5, 2.5, 0);
    this.scene.add(crownGroup);
    crownGroup.userData.crown = true;

    // Частицы — TetrahedronGeometry с matLP
    applyLowPolyToScene(this.scene);

    // Частицы
    for (let i = 0; i < 40; i++) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.12, 1, 0.5 + Math.random()*0.3) })
      );
      p.position.set((Math.random()-0.5)*18, (Math.random()-0.5)*12, (Math.random()-0.5)*5);
      p.userData.vel = { x:(Math.random()-0.5)*0.5, y:(Math.random()-0.5)*0.3 };
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  private async renderUI() {
    // Назад
    const back = document.createElement('button');
    back.className = 'pixel-btn';
    back.innerText  = '← КАРТА';
    back.style.cssText = `position:absolute;top:58px;left:16px;background:#7f8c8d;color:#fff;border:3px solid #fff;padding:10px 20px;font-size:16px;font-family:'Courier New',monospace;cursor:pointer;font-weight:bold;pointer-events:auto;`;
    back.onclick = () => this.sceneManager.startScene('PlanetScene');
    this.uiContainer.appendChild(back);

    // Заголовок
    const title = document.createElement('div');
    title.style.cssText = `position:absolute;top:100px;width:100%;text-align:center;font-family:'Courier New',monospace;font-size:26px;font-weight:bold;color:#f39c12;text-shadow:3px 3px 0 #000;letter-spacing:2px;`;
    title.innerText = '👑 RIVER LORD LEADERBOARD';
    this.uiContainer.appendChild(title);

    // Фильтры: уровень + биом
    const filterRow = document.createElement('div');
    filterRow.style.cssText = `position:absolute;top:140px;width:100%;display:flex;justify-content:center;gap:12px;flex-wrap:wrap;padding:0 12px;align-items:center;pointer-events:auto;`;
    this.uiContainer.appendChild(filterRow);

    // Выбор уровня
    const levelPicker = document.createElement('div');
    levelPicker.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
    levelBalance.forEach(lvl => {
      const b = document.createElement('button');
      b.innerText = `${lvl.id}`;
      b.title = lvl.name;
      b.style.cssText = `
        background:${this.selectedLevel === String(lvl.id) ? '#f39c12' : 'rgba(0,0,0,0.5)'};
        color:#fff; border:2px solid ${this.selectedLevel === String(lvl.id) ? '#fff' : 'rgba(255,255,255,0.3)'};
        padding:8px 12px; font-size:15px; font-family:var(--font-ui);
        cursor:pointer; font-weight:bold; min-width:36px;
        pointer-events:auto;
      `;
      b.onclick = async () => {
        this.selectedLevel = String(lvl.id);
        this.uiContainer.innerHTML = '';
        this.hud = new TopHUD(this.uiContainer);
        this.hud.setDefaultNavigation(this.sceneManager);
        if (this.profile) this.hud.render(this.profile, 'River Lord');
        await this.renderUI();
      };
      levelPicker.appendChild(b);
    });
    filterRow.appendChild(levelPicker);

    // Dropdown фильтра по биому
    const biomeSelect = document.createElement('select');
    biomeSelect.style.cssText = `
      background:rgba(0,0,0,0.6);color:#fff;
      border:2px solid rgba(52,152,219,0.4);
      padding:8px 12px;font-size:14px;font-family:var(--font-ui);font-weight:600;
      cursor:pointer;pointer-events:auto;
      outline:none;
    `;
    BIOME_FILTERS.forEach(bf => {
      const opt = document.createElement('option');
      opt.value = bf.id;
      opt.innerText = bf.name;
      if (bf.id === this.selectedBiome) opt.selected = true;
      biomeSelect.appendChild(opt);
    });
    biomeSelect.onchange = async () => {
      this.selectedBiome = biomeSelect.value;
      this.uiContainer.innerHTML = '';
      this.hud = new TopHUD(this.uiContainer);
      this.hud.setDefaultNavigation(this.sceneManager);
      if (this.profile) this.hud.render(this.profile, 'River Lord');
      await this.renderUI();
    };
    filterRow.appendChild(biomeSelect);

    // Загрузка топ-10
    let leaders: RiverLordRecord[] = [];
    let myRecord: { attempts: number; totalValue: number } | null = null;
    try {
      leaders = await this.rlManager.getLeaderboard(this.selectedLevel);
      if (this.uid) {
        myRecord = await this.rlManager.getPersonalRecord(this.uid, this.selectedLevel);
      }
    } catch (e) {
      console.warn('LeaderboardScene: Failed to load data', e);
    }
    const lvlName  = levelBalance.find(l => l.id === parseInt(this.selectedLevel))?.name || '';

    // Панель
    const panel = document.createElement('div');
    panel.style.cssText = `
      position:absolute; top:200px; left:50%; transform:translateX(-50%);
      width:min(600px,95vw); max-height:calc(100vh - 270px); overflow-y:auto;
      background:rgba(0,0,0,0.7); border:3px solid rgba(255,185,0,0.3);
      padding:12px; pointer-events:auto;
    `;
    this.uiContainer.appendChild(panel);

    // Заголовок таблицы
    const biomeLabel = this.selectedBiome === 'all' ? '' : ` | ${BIOME_FILTERS.find(bf => bf.id === this.selectedBiome)?.name ?? ''}`;
    const lvlTitle = document.createElement('div');
    lvlTitle.style.cssText = `font-family:var(--font-ui);font-size:18px;color:#f39c12;font-weight:bold;text-align:center;margin-bottom:10px;`;
    lvlTitle.innerText = `Уровень ${this.selectedLevel}: ${lvlName}${biomeLabel}`;
    panel.appendChild(lvlTitle);

    // Личный рекорд
    if (myRecord) {
      const myRow = document.createElement('div');
      myRow.style.cssText = `
        background:rgba(243,156,18,0.2); border:2px solid #f39c12;
        padding:10px 14px; margin-bottom:12px;
        font-family:'Courier New',monospace; color:#fff; font-size:15px;
      `;
      myRow.innerHTML = `⭐ Твой рекорд: <b>${myRecord.attempts} попыток</b> — $${myRecord.totalValue}`;
      panel.appendChild(myRow);
    } else {
      const noRecord = document.createElement('div');
      noRecord.style.cssText = `color:#7f8c8d;font-family:'Courier New',monospace;font-size:14px;text-align:center;margin-bottom:10px;`;
      noRecord.innerText = 'У тебя ещё нет рекорда на этом уровне';
      panel.appendChild(noRecord);
    }

    // Топ-10
    if (leaders.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `color:#7f8c8d;font-family:'Courier New',monospace;font-size:18px;text-align:center;padding:30px;`;
      empty.innerText = 'Таблица пуста.\nСтань первым River Lord!';
      panel.appendChild(empty);
    } else {
      leaders.forEach((leader, idx) => {
        const isMe  = leader.uid === this.uid;
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx+1}.`;
        const row   = document.createElement('div');
        row.style.cssText = `
          display:flex; align-items:center; gap:12px;
          padding:10px 12px; margin-bottom:6px;
          background:${isMe ? 'rgba(243,156,18,0.15)' : 'rgba(255,255,255,0.04)'};
          border-left:4px solid ${isMe ? '#f39c12' : 'rgba(255,255,255,0.1)'};
          font-family:'Courier New',monospace; color:#fff;
        `;
        row.innerHTML = `
          <div style="font-size:22px;min-width:36px">${medal}</div>
          <div style="flex:1">
            <div style="font-size:16px;font-weight:bold">${leader.displayName}${isMe ? ' ← ты' : ''}</div>
            <div style="font-size:13px;color:#bdc3c7">${leader.attempts} попыток — $${leader.totalValue}</div>
          </div>
          ${idx === 0 ? '<div style="font-size:20px">👑</div>' : ''}
        `;
        panel.appendChild(row);
      });
    }
  }

  update(delta: number) {
    const time = Date.now() * 0.001;
    this.particles.forEach(p => {
      p.position.x += (p.userData.vel.x as number) * delta;
      p.position.y += (p.userData.vel.y as number) * delta;
      if (Math.abs(p.position.x) > 10) p.userData.vel.x *= -1;
      if (Math.abs(p.position.y) > 7)  p.userData.vel.y *= -1;
      p.rotation.x += delta;
    });
    // Корона вращается
    const crown = this.scene.children.find(c => c.userData.crown);
    if (crown) {
      crown.rotation.y = Math.sin(time * 0.8) * 0.3;
      crown.position.y = 2.5 + Math.sin(time * 1.2) * 0.2;
    }
  }
}
