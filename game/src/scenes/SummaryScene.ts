// ============================================================
// SUMMARY SCENE — Задача №3 + №7 (River Lord) + №10 (Уровни)
// Итог сессии: улов, River Lord проверка, разблокировка уровня
// ============================================================
import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { RiverLordManager } from '../services/RiverLordManager';
import { LevelBalanceManager } from '../services/LevelBalanceManager';
import { Analytics } from '../services/analytics';
import { TopHUD } from '../ui/TopHUD';
import { RARITY_COLORS, RARITY_NAMES, argentineFishDatabase } from '../data/fishDatabase';
import { matLP, LP } from '../utils/LowPolyStyle';
import type { PlayerProfile } from '../models/Player';

interface SummarySceneData {
  caught: { id: string; name: string; weight: number; value: number; processed: boolean; timestamp: number; rarity?: string; maxWeight?: number }[];
  isCrash: boolean;
  levelId: string | number;
  biomeId?: string;
  checkpointIndex?: number;
  attempts: number;
  totalValue: number;
  playTime: number;
}

export class SummaryScene extends BaseScene {
  private authService  = AuthService.getInstance();
  private dbService    = DatabaseService.getInstance();
  private riverLord    = RiverLordManager.getInstance();
  private levelManager = LevelBalanceManager.getInstance();
  private analytics    = Analytics.getInstance();
  private hud!: TopHUD;

  // Частицы-звёзды
  private particles: THREE.Mesh[] = [];
  // River Lord 3D celebration
  private riverLordMeshes: THREE.Object3D[] = [];

  async start(data: SummarySceneData) {
    data.biomeId = data.biomeId ?? 'rio_salado';
    data.checkpointIndex = data.checkpointIndex ?? 0;
    this.scene.background = new THREE.Color(0x0d1b2a);
    this.camera.position.set(0, 0, 10);
    this.setupParticles();

    this.hud = new TopHUD(this.uiContainer);
    this.hud.setDefaultNavigation(this.sceneManager);

    const uid         = this.authService.getCurrentUser()?.uid;
    const profile     = uid ? await this.dbService.getPlayerProfile(uid) : null;
    this.hud.render(profile, 'Итоги');

    let riverLordResult: { isNewRecord: boolean; rewardGems: number } = { isNewRecord: false, rewardGems: 0 };
    let levelResult: { completed: boolean; reward: number; nextLevelUnlocked: boolean } = { completed: false, reward: 0, nextLevelUnlocked: false };

    if (uid && profile && data.caught.length > 0) {
      // Проверяем River Lord рекорд
      riverLordResult = await this.riverLord.checkAndUpdate(
        uid, profile.displayName, String(data.levelId), data.attempts, data.totalValue
      );
      // Проверяем выполнение уровня
      levelResult = await this.levelManager.checkLevelCompletion(uid, parseInt(String(data.levelId)), data.totalValue);
    }

    // River Lord 3D celebration — запускаем если новый рекорд
    if (riverLordResult.isNewRecord) {
      this.spawnRiverLordCelebration();
    }

    // Расчёт звёзд (тз/11_GAME_CONFIGS.md раздел 12)
    const stars = this.calcStars(data);

    this.renderUI(data, profile, riverLordResult, levelResult, stars);
  }

  // ── РАСЧЁТ ЗВЁЗД ПО ТЗ ──────────────────────────────────────
  private calcStars(data: { caught: { rarity?: string; weight?: number; maxWeight?: number }[]; attempts: number }): number {
    let stars = 0;
    const checkpoints = Math.max(1, data.caught.length); // 1 чекпоинт минимум
    // +1★ — мало забросов (≤5 на чекпоинт)
    if (data.attempts <= checkpoints * 5) stars++;
    // +1★ — есть Rare+ рыба
    const rareRarities = ['rare', 'epic', 'legendary'];
    if (data.caught.some(f => rareRarities.includes(f.rarity ?? ''))) stars++;
    // +1★ — самая тяжёлая рыба >50% maxWeight
    if (data.caught.some(f => f.weight && f.maxWeight && f.weight > f.maxWeight * 0.5)) stars++;
    return Math.min(3, stars);
  }

  private setupParticles() {
    // Low-poly частицы: tetrahedra разных цветов (flatShading)
    const colors = [LP.gold, LP.glow, 0xe74c3c, 0x2ecc71, 0x9b59b6, LP.waterLight];
    for (let i = 0; i < 60; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const m = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.12 + Math.random() * 0.1, 0),
        matLP(col)
      );
      m.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 5
      );
      m.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 4 + 1,
        0
      );
      this.scene.add(m);
      this.particles.push(m);
    }
    // Мягкое освещение сцены итогов
    this.scene.add(new THREE.AmbientLight(0xaaddff, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(5, 8, 5);
    this.scene.add(sun);
  }

  // ── RIVER LORD CELEBRATION — 3D корона + золотые частицы ─────
  private spawnRiverLordCelebration() {
    const g = new THREE.Group();

    // Корона: 5 зубьев (OctahedronGeometry — кристальный вид) по кругу
    const crownR = 1.6;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const tooth = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        matLP(LP.gold, { emissive: LP.gold })
      );
      tooth.position.set(Math.cos(angle) * crownR, 0, Math.sin(angle) * crownR);
      tooth.scale.set(0.6, 1.4, 0.6);
      g.add(tooth);

      // Кольцо основания — маленькие кубы
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.18, 0.22),
        matLP(LP.gold)
      );
      band.position.set(Math.cos(angle) * crownR, -0.5, Math.sin(angle) * crownR);
      g.add(band);
    }

    // Соединительное кольцо (сегменты дуги)
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.14, 0.18),
        matLP(LP.gold)
      );
      seg.position.set(Math.cos(a) * crownR, -0.5, Math.sin(a) * crownR);
      g.add(seg);
    }

    // Центральный кристалл — gem
    const gem = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.38, 0),
      matLP(LP.gem, { emissive: LP.gem })
    );
    gem.position.set(0, 0.6, 0);
    g.add(gem);
    this.riverLordMeshes.push(gem); // будет вращаться

    // Золотые частицы-вспышки вокруг короны
    for (let i = 0; i < 24; i++) {
      const spark = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.1 + Math.random() * 0.08, 0),
        matLP(LP.gold, { emissive: LP.gold })
      );
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 1.5;
      spark.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 2, Math.sin(a) * r);
      spark.userData.vel = new THREE.Vector3(
        Math.cos(a) * 1.5,
        Math.random() * 2 + 0.5,
        Math.sin(a) * 1.5
      );
      g.add(spark);
      this.riverLordMeshes.push(spark);
    }

    g.position.set(0, 2.5, 0); // над центром сцены
    g.scale.setScalar(0.01);   // стартуем маленькими — "pop in" анимация
    this.scene.add(g);
    this.riverLordMeshes.push(g);

    // Анимация появления короны через scale
    let t = 0;
    const grow = setInterval(() => {
      t += 0.04;
      const s = Math.min(1, t * 3);
      g.scale.setScalar(s);
      g.rotation.y += 0.04;
      if (s >= 1) clearInterval(grow);
    }, 16);
  }

  private renderUI(
    data: SummarySceneData,
    profile: PlayerProfile | null,
    riverLordResult: { isNewRecord: boolean; rewardGems: number },
    levelResult: { completed: boolean; reward: number; nextLevelUnlocked: boolean },
    stars: number = 0
  ) {
    const isCrash = data.isCrash;

    // Звёзды
    const starsEl = document.createElement('div');
    starsEl.style.cssText = `
      position:absolute; top:52px; width:100%; text-align:center;
      font-size:clamp(28px,4vw,48px); pointer-events:none;
      text-shadow: 0 0 16px rgba(243,156,18,0.6);
    `;
    const starStr = Array.from({ length: 3 }, (_, i) => i < stars ? '\u2B50' : '\u2606').join(' ');
    starsEl.innerText = starStr;
    this.uiContainer.appendChild(starsEl);

    // Заголовок
    const title = document.createElement('div');
    title.style.cssText = `
      position:absolute; top:100px; width:100%; text-align:center;
      font-family:'Courier New',monospace; font-size:clamp(22px,3.5vw,40px);
      font-weight:bold; text-shadow:3px 3px 0 #000;
      color:${isCrash ? '#e74c3c' : data.caught.length > 0 ? '#2ecc71' : '#f39c12'};
    `;
    title.innerText = isCrash ? '\uD83D\uDCA5 ЛЕСКА ПОРВАЛАСЬ!' : data.caught.length > 0 ? '\uD83C\uDF89 УЛОВ ЗАПИСАН!' : '\u23F1 СЕССИЯ ЗАВЕРШЕНА';
    this.uiContainer.appendChild(title);

    // Статистика
    const statsEl = document.createElement('div');
    statsEl.style.cssText = `
      position:absolute; top:160px; left:50%; transform:translateX(-50%);
      font-family:'Courier New',monospace; font-size:18px;
      color:#bdc3c7; text-align:center; line-height:1.8;
      background:rgba(0,0,0,0.5); border:2px solid rgba(255,255,255,0.15);
      padding:18px 32px; min-width:min(360px,85vw);
    `;
    const catchList = data.caught.map(f => {
      const col = f.rarity ? RARITY_COLORS[f.rarity] ?? '#fff' : '#fff';
      const fishDef = argentineFishDatabase.find(fd => fd.id === f.id);
      const icon = fishDef?.iconPath ?? '/assets/images/fish/fish_01.png';
      return `<div style="display:flex;align-items:center;gap:8px;color:${col};margin:3px 0;">
        <img src="${icon}" style="width:32px;height:32px;image-rendering:pixelated;border-radius:4px;background:rgba(0,0,0,0.3);" onerror="this.style.display='none'">
        <span>${f.name} — ${f.weight.toFixed(2)} кг → $${f.value}</span>
      </div>`;
    }).join('');

    statsEl.innerHTML = `
      <div style="color:#3498db;font-size:16px;margin-bottom:10px">
        🎣 Попытки: <b>${data.attempts}</b> &nbsp; 🐟 Поймано: <b>${data.caught.length}</b>
      </div>
      ${catchList || '<div style="color:#7f8c8d">Рыбы не поймано</div>'}
      <div style="color:#f39c12;font-size:22px;margin-top:12px;font-weight:bold">
        Итого: $${data.totalValue}
      </div>
    `;
    this.uiContainer.appendChild(statsEl);

    // River Lord попап
    if (riverLordResult.isNewRecord) {
      const rlEl = document.createElement('div');
      rlEl.style.cssText = `
        position:absolute; top:55%; left:50%; transform:translateX(-50%);
        background:linear-gradient(135deg,#f39c12,#e67e22);
        border:4px solid #fff; padding:16px 28px; text-align:center;
        font-family:'Courier New',monospace; font-weight:bold; font-size:20px;
        color:#fff; box-shadow:6px 6px 0 rgba(0,0,0,0.5);
        animation:popIn 0.5s ease;
      `;
      rlEl.innerHTML = `👑 НОВЫЙ RIVER LORD!<br><span style="font-size:15px">Уровень ${data.levelId} — +${riverLordResult.rewardGems} 💎</span>`;
      if (!document.getElementById('popInStyle')) {
        const st = document.createElement('style');
        st.id = 'popInStyle';
        st.textContent = `@keyframes popIn{from{transform:translateX(-50%) scale(0)}to{transform:translateX(-50%) scale(1)}}`;
        document.head.appendChild(st);
      }
      this.uiContainer.appendChild(rlEl);
    }

    // Уровень пройден
    if (levelResult.completed) {
      const lvlEl = document.createElement('div');
      lvlEl.style.cssText = `
        position:absolute; top:${riverLordResult.isNewRecord ? '67%' : '56%'}; left:50%; transform:translateX(-50%);
        background:linear-gradient(135deg,#27ae60,#2ecc71);
        border:4px solid #fff; padding:14px 24px; text-align:center;
        font-family:'Courier New',monospace; font-size:17px; color:#fff;
        box-shadow:5px 5px 0 rgba(0,0,0,0.4);
      `;
      lvlEl.innerHTML = `🏆 УРОВЕНЬ ${data.levelId} ПРОЙДЕН! +${levelResult.reward} 💎${levelResult.nextLevelUnlocked ? '<br>🔓 Новый уровень открыт!' : ''}`;
      this.uiContainer.appendChild(lvlEl);
    }

    // Кнопки
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `
      position:absolute; bottom:10%; width:100%;
      display:flex; justify-content:center; gap:16px; flex-wrap:wrap;
      pointer-events:auto;
    `;
    this.uiContainer.appendChild(btnRow);

    const mkBtn = (text: string, color: string, action: () => void) => {
      const b = document.createElement('button');
      b.className = 'pixel-btn';
      b.innerText = text;
      b.style.cssText = `
        background:${color}; color:#fff; border:3px solid #fff;
        padding:14px 24px; font-size:17px; font-weight:bold;
        font-family:'Courier New',monospace; cursor:pointer;
        box-shadow:4px 4px 0 rgba(0,0,0,0.4); text-transform:uppercase;
        transition:transform 0.1s;
      `;
      b.onmouseenter = () => { b.style.transform = 'scale(1.05)'; };
      b.onmouseleave = () => { b.style.transform = 'scale(1)'; };
      b.onclick = action;
      btnRow.appendChild(b);
    };

    if (data.caught.length > 0) {
      mkBtn('🐟 НА РЫНОК', '#8e44ad', () => this.sceneManager.startScene('MarketScene'));
    }
    mkBtn('🎣 ЕЩЁ РАЗ', '#27ae60', () => this.sceneManager.startScene('FishingSessionScene', {
      levelId: data.levelId,
      biomeId: data.biomeId ?? 'rio_salado',
      checkpointIndex: data.checkpointIndex ?? 0,
    }));
    mkBtn('🗺 КАРТА', '#2980b9', () => this.goToMap(profile, data));
  }

  private goToMap(profile: PlayerProfile | null, data: SummarySceneData): void {
    if (profile?.villagePosition) {
      this.sceneManager.startScene('BiomeView', {
        biomeId: data.biomeId ?? profile.currentBiomeId ?? 'rio_salado',
      });
      return;
    }
    this.sceneManager.startScene('PlanetScene');
  }

  update(delta: number) {
    // Low-poly частицы — движение + вращение
    this.particles.forEach((p) => {
      p.position.y += (p.userData.vel as THREE.Vector3).y * delta;
      p.position.x += (p.userData.vel as THREE.Vector3).x * delta;
      p.rotation.x += delta * 2.5;
      p.rotation.y += delta * 3.5;
      if (p.position.y > 8)   p.position.y = -6;
      if (p.position.x > 12)  p.position.x = -12;
      if (p.position.x < -12) p.position.x = 12;
    });

    // River Lord celebration — корона медленно вращается, искры летят вверх
    if (this.riverLordMeshes.length > 0) {
      const t = Date.now() * 0.001;
      this.riverLordMeshes.forEach((m, i) => {
        if (m instanceof THREE.Group) {
          // Вся группа (корона) медленно покачивается
          m.rotation.y += delta * 0.4;
          m.position.y = 2.5 + Math.sin(t * 0.8) * 0.12;
        } else if (m.userData.vel) {
          // Золотые искры
          m.position.addScaledVector(m.userData.vel as THREE.Vector3, delta * 0.5);
          m.rotation.x += delta * 4;
          if (m.position.y > 5) { m.position.y = 0; }
        } else {
          // Центральный gem — быстро вращается
          m.rotation.y += delta * 2.5 + Math.sin(t + i) * 0.02;
        }
      });
    }
  }
}
