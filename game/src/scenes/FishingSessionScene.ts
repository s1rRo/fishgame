// ============================================================
// FISHING SESSION SCENE — Задача №3 + №6 (Реклама)
// Hold-механика: леска, рыбы в 3D объёме, крашинг, реклама
// ============================================================
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AdManager } from '../services/AdManager';
import { SeasonPassManager } from '../services/SeasonPassManager';
import { Analytics } from '../services/analytics';
import { getRandomFishForBiome, RARITY_COLORS } from '../data/fishDatabase';
import { getBiomeById } from '../data/biomeDatabase';
import type { FishConfig } from '../models/Fish';
import { TopHUD } from '../ui/TopHUD';
import { matLP, LP, createFishMesh, createFisherman, setupGameLighting } from '../utils/LowPolyStyle';
import { texMat } from '../utils/TextureCache';
import { AudioManager } from '../services/AudioManager';
import type { NPCDefinition } from '../data/npcDatabase';
import type { BaitConfig } from '../data/baitDatabase';

/** Паттерн поведения рыбы, определяется из uniqueTrait */
type FishBehavior = 'bottom' | 'jumper' | 'aggressive' | 'ambush' | 'schooling' | 'shy' | 'depthChanger' | 'default';

interface ActiveFish {
  mesh: THREE.Group;
  data: FishConfig;
  speed: number;
  depthY: number;
  behavior: FishBehavior;
  /** Для ambush — таймер ожидания перед рывком */
  ambushTimer: number;
  /** Для jumper — время следующего прыжка */
  nextJumpTime: number;
  /** Для schooling — индекс лидера (-1 = лидер) */
  schoolLeader: number;
  /** Для depthChanger — направление изменения глубины */
  depthDir: number;
}

export class FishingSessionScene extends BaseScene {
  private authService = AuthService.getInstance();
  private dbService   = DatabaseService.getInstance();
  private adManager   = AdManager.getInstance();
  private seasonMgr   = SeasonPassManager.getInstance();
  private analytics   = Analytics.getInstance();
  private hud!: TopHUD;

  // Состояние сессии
  private levelId   = '1';
  private biomeId   = 'rio_salado';
  private attempts  = 0;
  private extraCasts = 3; // бонусные попытки после рекламы
  private sessionValue = 0;
  private caughtFishes: { id: string; name: string; weight: number; value: number; processed: boolean; timestamp: number; rarity?: string; maxWeight?: number }[] = [];
  private sessionStartTime = 0;

  // Механика лески
  private isHolding  = false;
  private lineLength = 0;
  private maxLine    = 22;
  private hook!: THREE.Mesh;
  private line!: THREE.Line;

  // Рыбы в 3D-объёме
  private fishes: ActiveFish[] = [];

  // Таймер
  private timeLeft    = 45;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private sessionEnded = false;

  // ── TENSION MECHANIC (0-100, краш при ≥ CRASH_THRESHOLD) ─────
  private tension          = 0;
  private readonly CRASH_THRESHOLD = 80;
  private tensionBarEl!: HTMLElement;

  // UI элементы
  private timeEl!: HTMLElement;
  private attemptsEl!: HTMLElement;
  private valueEl!: HTMLElement;
  private hintEl!: HTMLElement;

  // Визуал воды
  private waterPlane!: THREE.Mesh;
  private waterWaves: THREE.Mesh[] = [];

  // Duolingo flow данные
  private selectedNPC: NPCDefinition | null = null;
  private selectedBait: BaitConfig | null = null;
  private checkpointIndex = 0;

  start(data?: any) {
    this.biomeId       = this.normalizeBiomeId(data?.biomeId ?? 'rio_salado');
    this.levelId       = String(data?.levelId ?? this.getBiomeLevel(this.biomeId));
    this.sessionEnded  = false;
    this.caughtFishes  = [];
    this.sessionValue  = 0;
    this.attempts      = 0;
    this.timeLeft      = 45;
    this.sessionStartTime = Date.now();
    this.selectedNPC   = data?.npcDef ?? null;
    this.selectedBait  = data?.baitDef ?? null;
    this.checkpointIndex = data?.checkpointIndex ?? 0;

    this.hud = new TopHUD(this.uiContainer);
    this.hud.setDefaultNavigation(this.sceneManager);
    this.setup3D();
    this.setupUI();
    this.spawnFishes();
    AudioManager.getInstance().playMusic('fishing');
    this.startTimer();

    window.addEventListener('pointerdown', this.onHoldStart);
    window.addEventListener('pointerup',   this.onHoldEnd);
  }

  stop() {
    super.stop();
    if (this.timerHandle) { clearInterval(this.timerHandle); this.timerHandle = null; }
    window.removeEventListener('pointerdown', this.onHoldStart);
    window.removeEventListener('pointerup',   this.onHoldEnd);
  }

  // ── 3D СЦЕНА ────────────────────────────────────────────────
  private setup3D() {
    const biome = getBiomeById(this.biomeId);
    this.scene.background = new THREE.Color(biome?.skyColor ?? 0x87ceeb);
    this.camera.position.set(0, 2, 16);
    this.camera.lookAt(0, -2, 0);

    // ── Освещение: единый стиль через LowPolyStyle ───────────────
    setupGameLighting(this.scene, {
      ambientColor: 0xaaddff, ambientIntensity: 0.75,
      sunColor: 0xfff5e0,     sunIntensity: 1.0,
      fillColor: 0x3477aa,    fillIntensity: 0.25,
    });

    // Поверхность воды (flat-shading, low-poly)
    const waterColor = biome?.waterColor ?? LP.water;
    const waterGeo = new THREE.PlaneGeometry(32, 6, 12, 3);
    // Добавляем случайные смещения Y вершинам — low-poly рябь
    const wPos = waterGeo.attributes.position;
    for (let i = 0; i < wPos.count; i++) wPos.setY(i, (Math.random() - 0.5) * 0.07);
    waterGeo.computeVertexNormals();
    this.waterPlane = new THREE.Mesh(waterGeo, texMat('water', {
      color: waterColor, transparent: true, opacity: 0.82, roughness: 0.3, metalness: 0.1,
      repeatX: 8, repeatY: 2,
    }));
    this.waterPlane.rotation.x = -Math.PI / 2;
    this.waterPlane.position.set(0, 0, 0);
    this.scene.add(this.waterPlane);

    // Слои воды (глубина) — flat-shading
    for (let i = 1; i <= 5; i++) {
      const geo = new THREE.BoxGeometry(32, 4, 6, 4, 1, 2);
      const col = new THREE.Color(waterColor).multiplyScalar(1 - i * 0.13).getHex();
      const layer = new THREE.Mesh(geo, matLP(col, { transparent: true, opacity: 0.55 - i * 0.04 }));
      layer.position.set(0, -i * 4 - 0.5, 0);
      this.scene.add(layer);
    }

    // Берег: пара low-poly плит земли
    const bank = new THREE.Mesh(
      new THREE.BoxGeometry(32, 1.5, 4, 8, 1, 2),
      texMat('dirt', { color: LP.earth, repeatX: 8, repeatY: 2 })
    );
    bank.position.set(0, -0.75, 4);
    this.scene.add(bank);
    const bankTop = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.5, 4, 8, 1, 2),
      texMat('grass', { color: LP.grass, repeatX: 8, repeatY: 2 })
    );
    bankTop.position.set(0, 0.05, 4);
    this.scene.add(bankTop);

    // Береговая линия / рыбак (low-poly voxel из LowPolyStyle)
    const fisher = createFisherman(LP.shirtBlue);
    fisher.position.set(-1, 1.2, 2.5);
    this.scene.add(fisher);

    // Удочка (low-poly)
    const rodGeo = new THREE.CylinderGeometry(0.045, 0.07, 3.8, 5);
    const rod = new THREE.Mesh(rodGeo, matLP(LP.wood));
    rod.position.set(-0.2, 2.8, 2.3);
    rod.rotation.z = -0.28;
    this.scene.add(rod);

    // Леска
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.5, 4.5, 2),
      new THREE.Vector3(0.5, 4.5, 2)
    ]);
    this.line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    this.scene.add(this.line);

    // Крючок (low-poly: octahedron)
    this.hook = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      matLP(0xbdc3c7, { emissive: 0xffffff })
    );
    this.hook.position.set(0.5, 4.5, 2);
    this.scene.add(this.hook);
  }

  // ── ОПРЕДЕЛЕНИЕ ПОВЕДЕНИЯ ИЗ uniqueTrait ──────────────────
  private static parseBehavior(trait: string): FishBehavior {
    const t = trait.toLowerCase();
    if (t.includes('донн') || t.includes('дне') || t.includes('плоск'))   return 'bottom';
    if (t.includes('прыж') || t.includes('прыг'))                         return 'jumper';
    if (t.includes('агресс') || t.includes('атак') || t.includes('ярост')) return 'aggressive';
    if (t.includes('засад') || t.includes('пряч'))                        return 'ambush';
    if (t.includes('стай') || t.includes('стаёк') || t.includes('стайк')) return 'schooling';
    if (t.includes('пуглив') || t.includes('осторож'))                    return 'shy';
    if (t.includes('меняет глубину') || t.includes('тянет ко дну'))       return 'depthChanger';
    return 'default';
  }

  // ── РЫБЫ — spawn по depthRange + behavior ────────────────────
  private spawnFishes() {
    const lvl = parseInt(this.levelId);
    const count = 6 + Math.min(lvl, 6);

    for (let i = 0; i < count; i++) {
      const fishData = getRandomFishForBiome(lvl);
      const behavior = FishingSessionScene.parseBehavior(fishData.uniqueTrait);

      const fishScale = 0.55 + Math.random() * 0.35;
      const group = createFishMesh(fishData.color3D, fishScale);

      // Spawn по depthRange из базы рыб (depthMin/depthMax → метры → 3D Y)
      const dMin = fishData.depthMin ?? 1;
      const dMax = fishData.depthMax ?? 10;
      const depthY = -(dMin + Math.random() * (dMax - dMin));
      group.position.set(
        (Math.random() - 0.5) * 22,
        depthY,
        (Math.random() - 0.5) * 2.5
      );

      // Скорость на основе horizontalSpeed из базы
      const baseSpeed = fishData.horizontalSpeed ?? (2 + Math.random() * 3);
      let speed = baseSpeed * (Math.random() > 0.5 ? 1 : -1);

      // Ambush fish — начинают неподвижно
      if (behavior === 'ambush') speed = 0;

      group.rotation.y = speed > 0 ? 0 : Math.PI;
      this.scene.add(group);
      this.fishes.push({
        mesh: group, data: fishData, speed, depthY, behavior,
        ambushTimer: 2 + Math.random() * 4,
        nextJumpTime: Date.now() * 0.001 + 2 + Math.random() * 5,
        schoolLeader: -1,
        depthDir: Math.random() > 0.5 ? 1 : -1,
      });
    }

    // Schooling: привязать «последователей» к первому лидеру того же поведения
    const schoolLeaderIdx = this.fishes.findIndex(f => f.behavior === 'schooling');
    if (schoolLeaderIdx >= 0) {
      this.fishes.forEach((f, idx) => {
        if (f.behavior === 'schooling' && idx !== schoolLeaderIdx) {
          f.schoolLeader = schoolLeaderIdx;
        }
      });
    }
  }

  // ── UI v2.0 ───────────────────────────────────────────────────
  private setupUI() {
    const biome = getBiomeById(this.biomeId);
    this.hud.render(null, biome?.name ?? `БИОМ ${this.levelId}`);

    // ── Боковая панель статистики (левая) ─────────────────────
    const panel = document.createElement('div');
    panel.style.cssText = `
      position:absolute; top:64px; left:14px;
      display:flex; flex-direction:column; gap:8px;
      pointer-events:none;
    `;

    // Таймер
    this.timeEl = document.createElement('div');
    this._styleStatBadge(this.timeEl, '#5c0f0f', '#e74c3c');
    this.timeEl.innerHTML = this._statBadgeHTML('⏱', `${this.timeLeft}с`, '#e74c3c');
    panel.appendChild(this.timeEl);

    // Попытки
    this.attemptsEl = document.createElement('div');
    this._styleStatBadge(this.attemptsEl, '#3d2800', '#f39c12');
    this.attemptsEl.innerHTML = this._statBadgeHTML('🎣', `${this.attempts}`, '#f39c12');
    panel.appendChild(this.attemptsEl);

    // Заработано
    this.valueEl = document.createElement('div');
    this._styleStatBadge(this.valueEl, '#0d3d1a', '#27ae60');
    this.valueEl.innerHTML = this._statBadgeHTML('💰', `$${this.sessionValue}`, '#27ae60');
    panel.appendChild(this.valueEl);

    // Кнопка выхода
    const exitBtn = document.createElement('button');
    exitBtn.innerText = '✕';
    exitBtn.style.cssText = `
      margin-top:8px;
      width:40px;height:40px;
      background:rgba(231,76,60,0.3);
      border:1px solid rgba(231,76,60,0.5);
      color:#e74c3c;font-size:18px;font-weight:bold;
      cursor:pointer;pointer-events:auto;
      border-radius:4px;
      transition:all 0.15s;
    `;
    exitBtn.title = 'Выйти из рыбалки';
    exitBtn.onmouseenter = () => { exitBtn.style.background = 'rgba(231,76,60,0.5)'; };
    exitBtn.onmouseleave = () => { exitBtn.style.background = 'rgba(231,76,60,0.3)'; };
    exitBtn.onclick = () => {
      this.hud.showPopup({
        title: 'ВЫЙТИ?',
        body: 'Вся пойманная рыба будет сохранена.',
        confirmText: 'ВЫЙТИ',
        cancelText: 'ОСТАТЬСЯ',
        confirmColor: '#e74c3c',
        icon: '🚪',
        onConfirm: () => this.goToSummary(false),
      });
    };
    panel.appendChild(exitBtn);

    this.uiContainer.appendChild(panel);

    // ── Подсказка внизу ────────────────────────────────────────
    this.hintEl = document.createElement('div');
    this.hintEl.style.cssText = `
      position:absolute; bottom:18px; width:100%; text-align:center;
      font-family:'Rajdhani','Courier New',monospace;
      font-size:15px; font-weight:600;
      color:rgba(189,195,199,0.75);
      pointer-events:none;
      letter-spacing:1.5px;
      text-shadow: 0 1px 6px rgba(0,0,0,0.9);
    `;
    this.hintEl.innerText = '[ ЗАЖМИ ] мышь/тач — леска опускается  ·  [ ОТПУСТИ ] — поймать!';
    this.uiContainer.appendChild(this.hintEl);

    // ── TENSION BAR ────────────────────────────────────────────
    const tensionWrap = document.createElement('div');
    tensionWrap.style.cssText = `
      position:absolute; bottom:52px; left:50%; transform:translateX(-50%);
      width:min(260px,55vw); pointer-events:none;
    `;
    const tensionLabel = document.createElement('div');
    tensionLabel.style.cssText = `
      font-family:'Rajdhani',monospace; font-size:11px; font-weight:700;
      color:rgba(200,80,80,0.8); letter-spacing:2px; text-align:center;
      margin-bottom:4px; text-shadow:0 0 8px rgba(231,76,60,0.6);
    `;
    tensionLabel.innerText = '— НАТЯЖЕНИЕ ЛЕСКИ —';
    const tensionTrack = document.createElement('div');
    tensionTrack.style.cssText = `
      width:100%; height:8px;
      background:rgba(0,0,0,0.5);
      border:1px solid rgba(231,76,60,0.35);
      clip-path:polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100% - 4px));
    `;
    this.tensionBarEl = document.createElement('div');
    this.tensionBarEl.style.cssText = `
      width:0%; height:100%;
      background:linear-gradient(90deg,#27ae60 0%,#f39c12 60%,#e74c3c 100%);
      transition:width 0.08s linear;
    `;
    tensionTrack.appendChild(this.tensionBarEl);
    tensionWrap.appendChild(tensionLabel);
    tensionWrap.appendChild(tensionTrack);
    this.uiContainer.appendChild(tensionWrap);

    // ── Название локации (правый угол) ─────────────────────────
    const locEl = document.createElement('div');
    locEl.style.cssText = `
      position:absolute; top:64px; right:14px;
      font-family:'Press Start 2P','Courier New',monospace;
      font-size:10px; color:rgba(93,173,226,0.7);
      text-align:right; pointer-events:none;
      text-shadow:0 0 10px rgba(52,152,219,0.5);
      line-height:1.8;
    `;
    locEl.innerHTML = `${biome?.nameEn?.toUpperCase() ?? 'РЫБАЛКА'}<br><span style="font-size:8px;color:rgba(149,165,166,0.5)">ЧЕКПОИНТ ${this.checkpointIndex + 1}</span>`;
    this.uiContainer.appendChild(locEl);
  }

  private _styleStatBadge(el: HTMLElement, bg: string, border: string) {
    el.style.cssText = `
      display:inline-flex; align-items:center; gap:8px;
      padding:7px 14px;
      background:${bg}cc;
      border:1px solid ${border}88;
      clip-path:polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px));
      box-shadow:0 2px 10px rgba(0,0,0,0.5);
      min-width:100px;
    `;
  }
  private _statBadgeHTML(icon: string, val: string, color: string): string {
    return `
      <span style="font-size:16px;line-height:1">${icon}</span>
      <span style="font-family:'Rajdhani',monospace;font-size:18px;font-weight:700;color:${color};text-shadow:0 0 8px ${color}88">${val}</span>
    `;
  }

  // ── ТАЙМЕР ────────────────────────────────────────────────────
  private startTimer() {
    this.timerHandle = setInterval(() => {
      if (this.sessionEnded) return;
      this.timeLeft--;
      if (this.timeEl) {
        const urgent = this.timeLeft <= 5;
        this._styleStatBadge(this.timeEl, urgent ? '#8b0000' : '#5c0f0f', urgent ? '#ff2222' : '#e74c3c');
        this.timeEl.innerHTML = this._statBadgeHTML('⏱', `${this.timeLeft}с`, urgent ? '#ff6666' : '#e74c3c');
      }
      if (this.timeLeft <= 0) this.endSession(false, false);
    }, 1000);
  }

  // ── HOLD МЕХАНИКА ─────────────────────────────────────────────
  private onHoldStart = (e: PointerEvent) => {
    if (this.sessionEnded) return;
    // Не реагируем на клики по кнопкам UI
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    this.isHolding = true;
    this.attempts++;
    if (this.attemptsEl) this.attemptsEl.innerHTML = this._statBadgeHTML('🎣', `${this.attempts}`, '#f39c12');
  };

  private onHoldEnd = (e: PointerEvent) => {
    if (this.sessionEnded || !this.isHolding) return;
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    this.isHolding = false;
    this.checkCatch();
  };

  // ── CATCH CHANCE ПО RARITY (из тз/11_GAME_CONFIGS.md раздел 12) ──
  private static CATCH_CHANCE_BASE: Record<string, number> = {
    common: 0.35, uncommon: 0.22, rare: 0.12, epic: 0.06, legendary: 0.01
  };

  /** Последний рассчитанный бонус приманки — для показа в UI */
  private lastBaitBonusPercent = 0;
  private lastBaitMatched = false;

  private calcCatchChance(fish: FishConfig, npcFishBonus = 0): number {
    const base = FishingSessionScene.CATCH_CHANCE_BASE[fish.rarity] ?? 0.35;
    let baitMult = 1;

    if (this.selectedBait) {
      const fishPrefers = this.normalizeBaitId(fish.preferredBait);
      if (fishPrefers === this.selectedBait.id) {
        // Совпадение приманки → бонус
        baitMult = 1 + this.selectedBait.catchBonusMatch / 100;
        this.lastBaitBonusPercent = this.selectedBait.catchBonusMatch;
        this.lastBaitMatched = true;
      } else {
        // Несовпадение → штраф (из baitDatabase.catchPenaltyMiss)
        baitMult = 1 - this.selectedBait.catchPenaltyMiss / 100;
        this.lastBaitBonusPercent = -this.selectedBait.catchPenaltyMiss;
        this.lastBaitMatched = false;
      }

      // Depth bonus: если крючок в depthRange рыбы → +15%
      const hookDepth = Math.abs(this.hook.position.y); // Y отрицательный в 3D
      const fishDMin = fish.depthMin ?? 0;
      const fishDMax = fish.depthMax ?? 20;
      if (hookDepth >= fishDMin && hookDepth <= fishDMax) {
        baitMult *= 1.15;
      }
    } else {
      this.lastBaitBonusPercent = 0;
      this.lastBaitMatched = false;
    }

    return Math.min(0.95, base * baitMult * (1 + npcFishBonus));
  }

  // ── ПРОВЕРКА УЛОВА ────────────────────────────────────────────
  private checkCatch() {
    if (this.lineLength < 1) return;
    const hookBox = new THREE.Box3().setFromObject(this.hook);

    for (let i = 0; i < this.fishes.length; i++) {
      const f    = this.fishes[i];
      const fBox = new THREE.Box3().setFromObject(f.mesh);

      if (hookBox.intersectsBox(fBox)) {
        // Шанс поимки: rarity base × bait match/penalty × depth × NPC bonus
        const npcBonus = this.selectedNPC ? this.selectedNPC.predisposition.fish / 100 : 0;
        const chance = this.calcCatchChance(f.data, npcBonus);
        if (Math.random() > chance) {
          // Промах — рыба убегает
          f.speed = Math.abs(f.speed) * (f.mesh.position.x > this.hook.position.x ? 1 : -1) * 2;
          return;
        }

        const w = f.data.minWeight + Math.random() * (f.data.maxWeight - f.data.minWeight);
        const v = Math.floor(w * f.data.baseValue);

        this.caughtFishes.push({
          id: f.data.id, name: f.data.name,
          weight: parseFloat(w.toFixed(2)), value: v,
          processed: false, timestamp: Date.now(),
          rarity: f.data.rarity, maxWeight: f.data.maxWeight,
        });
        this.sessionValue += v;
        if (this.valueEl) this.valueEl.innerHTML = this._statBadgeHTML('💰', `$${this.sessionValue}`, '#27ae60');

        // Эффект поимки с информацией о приманке
        this.showCatchEffect(f.data.name, v, RARITY_COLORS[f.data.rarity], this.lastBaitBonusPercent, this.lastBaitMatched, f.data.iconPath);
        this.analytics.logEvent('fish_caught', { fishId: f.data.id, level: this.levelId, biomeId: this.biomeId, value: v });

        // Удаляем рыбу из сцены
        this.scene.remove(f.mesh);
        this.fishes.splice(i, 1);

        this.lineLength = 0;
        this.isHolding = false;
        this.tension = Math.max(0, this.tension * 0.4);
        if (this.fishes.length < 4) setTimeout(() => this.spawnFishes(), 600);
        return;
      }
    }
    // Промах — шанс краша 28% если леска глубоко
    if (this.lineLength > this.maxLine * 0.5 && Math.random() < 0.28) {
      this.endSession(false, true); // краш
    }
  }

  private showCatchEffect(name: string, value: number, color: string, baitBonus = 0, baitMatched = false, iconPath = '') {
    const baitLine = this.selectedBait && baitBonus !== 0
      ? `<div style="font-family:'Rajdhani',monospace;font-size:14px;font-weight:600;color:${baitMatched ? '#2ecc71' : '#e74c3c'};margin-top:4px">
          ${this.selectedBait.name}: ${baitBonus > 0 ? '+' : ''}${baitBonus}% к шансу
        </div>`
      : '';

    const banner = document.createElement('div');
    banner.style.cssText = `
      position:absolute; top:28%; left:50%;
      transform:translateX(-50%);
      background: rgba(0,5,15,0.88);
      border: 2px solid ${color};
      padding: 16px 32px;
      text-align:center;
      clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
      box-shadow: 0 0 24px ${color}66;
      pointer-events:none; z-index:200;
      animation: catchBannerAnim 1.8s ease forwards;
    `;
    banner.innerHTML = `
      <div style="font-family:'Press Start 2P','Courier New',monospace;font-size:11px;color:${color};letter-spacing:2px;margin-bottom:6px">ПОЙМАНО!</div>
      ${iconPath ? `<img src="${iconPath}" style="width:48px;height:48px;image-rendering:pixelated;margin:0 auto 6px;display:block;border-radius:6px;background:rgba(0,0,0,0.3);" onerror="this.style.display='none'">` : ''}
      <div style="font-family:'Rajdhani',monospace;font-size:22px;font-weight:700;color:#ecf0f1;margin-bottom:4px">${name}</div>
      <div style="font-family:'Rajdhani',monospace;font-size:20px;font-weight:700;color:#27ae60">+$${value}</div>
      ${baitLine}
    `;

    // Плавающий «+$value» над рыбой
    const floatEl = document.createElement('div');
    floatEl.style.cssText = `
      position:absolute; top:42%; left:50%;
      transform:translateX(-50%);
      font-family:'Press Start 2P',monospace; font-size:16px;
      color:#f1c40f;
      text-shadow: 0 0 12px #f1c40f, 2px 2px 0 rgba(0,0,0,0.7);
      pointer-events:none; z-index:201;
      animation: floatUpFade 1.4s ease forwards;
    `;
    floatEl.innerText = `+$${value}`;

    if (!document.getElementById('catch-anim-v2')) {
      const style = document.createElement('style');
      style.id = 'catch-anim-v2';
      style.textContent = `
        @keyframes catchBannerAnim {
          0%   { opacity:0; transform:translateX(-50%) scale(0.7); }
          15%  { opacity:1; transform:translateX(-50%) scale(1.05); }
          70%  { opacity:1; transform:translateX(-50%) scale(1); }
          100% { opacity:0; transform:translateX(-50%) scale(0.95) translateY(-20px); }
        }
        @keyframes floatUpFade {
          0%   { opacity:1; top:42%; }
          100% { opacity:0; top:20%; }
        }
      `;
      document.head.appendChild(style);
    }

    this.uiContainer.appendChild(banner);
    this.uiContainer.appendChild(floatEl);
    setTimeout(() => { banner.remove(); floatEl.remove(); }, 1800);
  }

  // ── КОНЕЦ СЕССИИ ─────────────────────────────────────────────
  private async endSession(forced: boolean, isCrash: boolean) {
    if (this.sessionEnded) return;
    this.sessionEnded = true;
    if (this.timerHandle) { clearInterval(this.timerHandle); this.timerHandle = null; }

    const uid = this.authService.getCurrentUser()?.uid;
    if (uid) {
      // Сохраняем в Firebase
      await this.dbService.saveFishingResult(uid, this.caughtFishes, this.attempts);
      // Очки Season Pass (+1 за каждую попытку, +3 за улов)
      const spPoints = this.attempts + this.caughtFishes.length * 3;
      if (spPoints > 0) await this.seasonMgr.addProgress(uid, spPoints);
    }

    this.analytics.logEvent('session_end', {
      levelId: this.levelId, attempts: this.attempts,
      biomeId: this.biomeId, checkpointIndex: this.checkpointIndex,
      caught: this.caughtFishes.length, value: this.sessionValue, isCrash
    });

    // Показываем popup рекламы (если не уже взяли максимум)
    if (isCrash && uid) {
      const canWatch = await this.adManager.canWatchAd(uid);
      if (canWatch) {
        this.showAdPrompt(isCrash);
        return;
      }
    }

    this.goToSummary(isCrash);
  }

  private showAdPrompt(isCrash: boolean) {
    const overlay = document.createElement('div');
    overlay.id = 'ad-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0;
      background:rgba(0,5,15,0.90);
      backdrop-filter:blur(5px);
      display:flex; align-items:center; justify-content:center;
      z-index:9999;
      pointer-events:auto;
      animation:rlFadeIn 0.2s ease;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:linear-gradient(160deg, #0f1e30 0%, #0a1628 100%);
      border:2px solid rgba(52,152,219,0.5);
      padding:36px 40px; text-align:center;
      max-width:460px; width:92vw;
      clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));
      box-shadow:0 20px 60px rgba(0,0,0,0.9),0 0 30px rgba(52,152,219,0.15);
      animation:rlPopIn 0.25s cubic-bezier(0.175,0.885,0.32,1.275);
      position:relative;
    `;

    const crashIcon = isCrash ? '💥' : '⏱';
    const crashColor = isCrash ? '#e74c3c' : '#f39c12';
    const crashBg    = isCrash ? 'rgba(92,15,15,0.6)' : 'rgba(61,40,0,0.6)';

    box.innerHTML = `
      <div style="position:absolute;top:8px;right:8px;width:18px;height:18px;border-top:2px solid rgba(52,152,219,0.5);border-right:2px solid rgba(52,152,219,0.5)"></div>
      <div style="font-size:48px;margin-bottom:14px;line-height:1">${crashIcon}</div>
      <div style="
        font-family:'Press Start 2P','Courier New',monospace;
        font-size:clamp(11px,2vw,15px);
        color:${crashColor};
        text-shadow:0 0 20px ${crashColor}88;
        margin-bottom:10px; line-height:1.6;
      ">${isCrash ? 'ЛЕСКА ПОРВАЛАСЬ!' : 'ВРЕМЯ ВЫШЛО!'}</div>
      <div style="
        font-family:'Rajdhani',monospace; font-size:17px;
        color:rgba(149,165,166,0.85);
        line-height:1.7; margin-bottom:28px;
      ">Хочешь продолжить рыбалку?<br>
      <span style="color:#f39c12;font-weight:700">Посмотри рекламу</span> — получи <span style="color:#27ae60;font-weight:700">+10 секунд</span> бесплатно!</div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button id="watch-ad-btn" style="
          background:linear-gradient(135deg,#a06a00,#f39c12);
          color:#fff; border:2px solid rgba(255,255,255,0.4);
          padding:14px 28px;
          font-family:'Rajdhani',monospace; font-size:16px; font-weight:700;
          letter-spacing:2px; text-transform:uppercase;
          cursor:pointer;
          clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px));
          pointer-events:auto;
        ">📺 СМОТРЕТЬ РЕКЛАМУ</button>
        <button id="skip-ad-btn" style="
          background:rgba(44,62,80,0.8);
          color:rgba(189,195,199,0.8); border:2px solid rgba(255,255,255,0.15);
          padding:14px 22px;
          font-family:'Rajdhani',monospace; font-size:15px; font-weight:600;
          letter-spacing:1px;
          cursor:pointer;
          clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px));
          pointer-events:auto;
        ">Позже →</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const removeOverlay = () => {
      const el = document.getElementById('ad-overlay');
      if (el) el.remove();
    };

    box.querySelector('#watch-ad-btn')!.addEventListener('click', async () => {
      removeOverlay();
      const uid = this.authService.getCurrentUser()?.uid;
      if (uid) {
        const ok = await this.adManager.watchAd('extraCast');
        if (ok) {
          this.hud.showToast('+3 попытки! Удачной рыбалки!', '#f39c12');
          this.resetForExtraCasts();
          return;
        }
      }
      this.goToSummary(isCrash);
    });

    box.querySelector('#skip-ad-btn')!.addEventListener('click', () => {
      removeOverlay();          // сначала убираем оверлей
      this.goToSummary(isCrash); // потом переходим
    });
  }

  private resetForExtraCasts() {
    this.sessionEnded = false;
    this.timeLeft     = 10;
    this.lineLength   = 0;
    this.isHolding    = false;
    if (this.timeEl) { this._styleStatBadge(this.timeEl, '#5c0f0f', '#e74c3c'); this.timeEl.innerHTML = this._statBadgeHTML('⏱', `${this.timeLeft}с`, '#e74c3c'); }
    this.startTimer();
    this.spawnFishes(); // Дополнительные рыбы
  }

  private goToSummary(isCrash: boolean) {
    const playTime = Math.floor((Date.now() - this.sessionStartTime) / 60000);
    this.sceneManager.startScene('SummaryScene', {
      caught:     this.caughtFishes,
      isCrash,
      levelId:    this.levelId,
      biomeId:    this.biomeId,
      checkpointIndex: this.checkpointIndex,
      attempts:   this.attempts,
      totalValue: this.sessionValue,
      playTime,
    });
  }

  private normalizeBiomeId(id: string): string {
    if (id === 'rio_salado_l1') return 'rio_salado';
    if (id === 'nahuel_huapi_l2') return 'nahuel_huapi';
    if (id === 'lago_argentino_l3') return 'lago_argentino';
    return id;
  }

  private getBiomeLevel(id: string): number {
    return getBiomeById(id)?.level ?? 1;
  }

  private normalizeBaitId(id: string): string {
    return id === 'fly_lure' ? 'fly' : id;
  }

  // ── UPDATE ────────────────────────────────────────────────────
  update(delta: number) {
    if (this.sessionEnded) return;
    const time = Date.now() * 0.001;

    // Леска
    if (this.isHolding) {
      this.lineLength = Math.min(this.maxLine, this.lineLength + 12 * delta);
    } else {
      this.lineLength = Math.max(0, this.lineLength - 18 * delta);
    }

    const hookY = 4.5 - this.lineLength;
    this.hook.position.y = hookY;

    const pos = this.line.geometry.attributes.position;
    if (pos) {
      const arr = pos.array as Float32Array;
      arr[4] = hookY;
      pos.needsUpdate = true;
    }

    // ── TENSION MECHANIC (0-100, CRASH_THRESHOLD = 80) ─────────
    if (this.isHolding && this.lineLength > 6) {
      // Натяжение растёт тем быстрее, чем глубже леска
      const depthFactor = this.lineLength / this.maxLine; // 0..1
      this.tension = Math.min(100, this.tension + depthFactor * 15 * delta);
    } else {
      // Отпустили — натяжение спадает
      this.tension = Math.max(0, this.tension - 20 * delta);
    }

    // Обновляем UI бар
    if (this.tensionBarEl) {
      this.tensionBarEl.style.width = `${this.tension}%`;
      // При критическом уровне — пульсация
      if (this.tension >= this.CRASH_THRESHOLD) {
        this.tensionBarEl.style.boxShadow = `0 0 10px rgba(231,76,60,${0.4 + Math.sin(time * 12) * 0.4})`;
      } else {
        this.tensionBarEl.style.boxShadow = 'none';
      }
    }

    // Краш при превышении CRASH_THRESHOLD
    if (this.tension >= this.CRASH_THRESHOLD && !this.sessionEnded) {
      this.tension = 0;
      this.endSession(false, true);
      return;
    }

    // ── FISH AI: trait-based behavior ─────────────────────────
    this.fishes.forEach((f, idx) => {
      const distToHook = Math.abs(f.mesh.position.x - this.hook.position.x)
        + Math.abs(f.mesh.position.y - hookY);
      const struggleMult = (f.data.strugglePower ?? 5) / 5;

      // ── Реакция на крючок (зависит от behavior) ──
      if (distToHook < 3.5 && this.lineLength > 1) {
        switch (f.behavior) {
          case 'aggressive': {
            const dx = this.hook.position.x - f.mesh.position.x;
            f.speed += dx * 2.5 * delta;
            this.tension = Math.min(100, this.tension + 12 * struggleMult * delta);
            break;
          }
          case 'shy':
            f.speed = Math.abs(f.speed) * (f.mesh.position.x > this.hook.position.x ? 1 : -1) * 2.2;
            break;
          case 'ambush':
            if (f.ambushTimer > 0) {
              f.speed *= 0.8;
              f.ambushTimer -= delta;
            } else {
              f.speed = (f.mesh.position.x > this.hook.position.x ? 1 : -1) * 6;
              f.ambushTimer = 2 + Math.random() * 3;
            }
            break;
          default: {
            if (Math.random() < 0.70) {
              f.speed = Math.abs(f.speed) * (f.mesh.position.x > this.hook.position.x ? 1 : -1) * 1.6;
            } else {
              const dx = this.hook.position.x - f.mesh.position.x;
              f.speed += dx * 1.5 * delta;
              this.tension = Math.min(100, this.tension + 8 * struggleMult * delta);
            }
          }
        }
      } else {
        // ── Нейтральное поведение ──
        switch (f.behavior) {
          case 'bottom':
            if (Math.random() < 0.003) f.speed *= -1;
            f.speed *= 0.98;
            break;
          case 'jumper':
            if (time > f.nextJumpTime) {
              f.depthY = Math.min(f.depthY + 3, -0.5);
              f.nextJumpTime = time + 3 + Math.random() * 5;
              const origMin = f.data.depthMin ?? 1;
              const origMax = f.data.depthMax ?? 10;
              setTimeout(() => { f.depthY = -(origMin + Math.random() * (origMax - origMin)); }, 600);
            }
            if (Math.random() < 0.005) f.speed *= -1;
            break;
          case 'schooling': {
            const leader = f.schoolLeader >= 0 ? this.fishes[f.schoolLeader] : null;
            if (leader) {
              f.speed += (leader.mesh.position.x - f.mesh.position.x) * 0.3 * delta;
              f.depthY += (leader.depthY - f.depthY) * 0.05;
            }
            if (Math.random() < 0.005) f.speed *= -1;
            break;
          }
          case 'depthChanger':
            f.depthY += f.depthDir * 0.5 * delta;
            if (f.depthY > -(f.data.depthMin ?? 1)) f.depthDir = -1;
            if (f.depthY < -(f.data.depthMax ?? 10)) f.depthDir = 1;
            if (Math.random() < 0.005) f.speed *= -1;
            break;
          case 'ambush':
            f.speed *= 0.92;
            break;
          default:
            if (Math.random() < 0.005) f.speed *= -1;
        }
      }

      f.mesh.position.x += f.speed * delta;
      const waveAmp = f.behavior === 'bottom' ? 0.15 : f.behavior === 'jumper' ? 0.6 : 0.4;
      f.mesh.position.y = f.depthY + Math.sin(time * 0.8 + f.mesh.position.x * 0.3) * waveAmp;

      if (f.mesh.position.x > 14)  { f.mesh.position.x = -14; }
      if (f.mesh.position.x < -14) { f.mesh.position.x = 14;  }

      f.mesh.rotation.y = f.speed > 0 ? 0 : Math.PI;

      // Проверка краша лески
      if (this.lineLength > 2) {
        const hookBox = new THREE.Box3().setFromObject(this.hook);
        const fBox    = new THREE.Box3().setFromObject(f.mesh);
        const lineHit = fBox.min.x < 0.5 && fBox.max.x > 0.5
          && fBox.max.y > hookY && fBox.min.y < 4.5;

        if (lineHit && !hookBox.intersectsBox(fBox) && !this.sessionEnded) {
          this.tension = Math.min(100, this.tension + 18 * struggleMult);
          if (Math.random() < 0.002) {
            this.endSession(false, true);
          }
        }
      }
    });

    // Анимация воды
    if (this.waterPlane) {
      this.waterPlane.position.y = Math.sin(time * 0.5) * 0.1;
    }
  }
}
