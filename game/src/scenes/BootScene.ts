// ============================================================
// BOOT SCENE v2.0 — River Lord: Pixel Fishery
// Splash: 3D логотип-рыбак + прогресс-бар + неон-гло эффект
// ============================================================
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { Analytics } from '../services/analytics';
import { matLP, LP, applyLowPolyToScene } from '../utils/LowPolyStyle';

export class BootScene extends BaseScene {
  private authService = AuthService.getInstance();
  private dbService   = DatabaseService.getInstance();
  private analytics   = Analytics.getInstance();

  private waterMeshes: THREE.Mesh[]  = [];
  private logoGroup!: THREE.Group;
  private starPoints!: THREE.Points;
  private loadingEl!: HTMLElement;
  private progressEl!: HTMLElement;
  private statusEl!: HTMLElement;

  start() {
    this.setupScene();
    this.setupUI();
    this.checkAuth();
  }

  // ── 3D ────────────────────────────────────────────────────────
  private setupScene() {
    this.scene.background = new THREE.Color(0x020b18);
    this.camera.position.set(0, 6, 13);
    (this.camera as THREE.PerspectiveCamera).fov = 58;
    (this.camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    this.camera.lookAt(0, 0, 0);

    // Освещение
    const ambient = new THREE.AmbientLight(0x1a3a6a, 1.0);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0x7ab5e8, 0.7);
    dir.position.set(4, 10, 6);
    this.scene.add(dir);
    const fill = new THREE.PointLight(0x3498db, 3.0, 25);
    fill.position.set(0, 3, 4);
    this.scene.add(fill);

    // ── Звёзды ─────────────────────────────────────────────────
    const N = 350;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = 2 + Math.random() * 25;
      pos[i * 3 + 2] = -6 - Math.random() * 35;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.9 });
    this.starPoints = new THREE.Points(geo, starMat);
    this.scene.add(this.starPoints);

    // ── Волны (low-poly flat-shading) ──────────────────────────
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const wGeo = new THREE.BoxGeometry(32, 0.45, 1.6, 8, 1, 2);
      const wCol = new THREE.Color().setHSL(0.60, 0.8, 0.05 + t * 0.10).getHex();
      const wave = new THREE.Mesh(wGeo, matLP(wCol, { transparent: true, opacity: 0.82 + t * 0.1 }));
      wave.position.set(0, -3.2 + i * 0.42, -3.5 + i * 0.9);
      this.scene.add(wave);
      this.waterMeshes.push(wave);
    }

    // ── Логотип-рыбак (low-poly voxels, matLP) ─────────────────
    this.logoGroup = new THREE.Group();
    const add = (w: number, h: number, d: number, x: number, y: number, z: number, c: number) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d, 2, 2, 2),
        matLP(c)
      );
      m.position.set(x, y, z);
      this.logoGroup.add(m);
    };

    // Тело рыбака
    add(1.0, 1.6, 1.0,  0,   1.0,  0, LP.shirtBlue);
    add(1.0, 1.0, 1.0,  0,   2.3,  0, LP.skin);
    add(1.4, 0.25,1.4,  0,   2.92, 0, LP.hat);
    add(0.9, 0.5, 0.9,  0,   3.15, 0, LP.hat);
    add(0.12,3.0, 0.12, 1.2, 2.1, -0.3, LP.wood);
    add(1.2, 0.08,0.08, 1.8, 3.7, -0.3, LP.gold);
    add(1.5, 0.4, 0.4,  0,   1.4,  0, LP.shirtBlue);
    add(0.5, 0.28,0.18, 2.1, 0.6, -0.3, 0xe74c3c); // рыбка

    // Декоративные кристаллы — OctahedronGeometry с matLP
    const glowColors = [LP.glow, LP.grass, LP.gold, LP.gem];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const r = 2.5;
      const glowM = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2, 0),
        matLP(glowColors[i], { emissive: glowColors[i] })
      );
      glowM.position.set(Math.cos(angle) * r, 1.5 + Math.sin(i) * 0.4, Math.sin(angle) * r);
      this.logoGroup.add(glowM);
    }

    // flatShading ко всей BootScene сцене
    applyLowPolyToScene(this.scene);

    this.logoGroup.scale.set(0, 0, 0);
    this.logoGroup.position.set(0, -0.5, 0);
    this.scene.add(this.logoGroup);

    // Анимация появления
    new TWEEN.Tween(this.logoGroup.scale)
      .to({ x: 1.3, y: 1.3, z: 1.3 }, 800)
      .easing(TWEEN.Easing.Back.Out)
      .start();
  }

  // ── UI ────────────────────────────────────────────────────────
  private setupUI() {
    // Виньетка
    const vig = document.createElement('div');
    vig.style.cssText = `
      position:absolute; inset:0;
      background: radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(2,11,24,0.7) 100%);
      pointer-events:none;
    `;
    this.uiContainer.appendChild(vig);

    // ── Заголовок ─────────────────────────────────────────────
    const title = document.createElement('div');
    title.style.cssText = `
      position:absolute; top:9%; width:100%; text-align:center;
      pointer-events:none;
    `;
    title.innerHTML = `
      <div style="
        font-family:'Press Start 2P','Courier New',monospace;
        font-size:clamp(16px,3.5vw,40px);
        color:#ecf0f1;
        text-shadow: 0 0 28px rgba(52,152,219,0.95), 0 0 55px rgba(52,152,219,0.4), 4px 4px 0 rgba(0,0,0,0.7);
        letter-spacing:5px;
        line-height:1.5;
      ">RIVER LORD</div>
      <div style="
        font-family:'Press Start 2P','Courier New',monospace;
        font-size:clamp(8px,1.3vw,13px);
        color:#3498db;
        letter-spacing:9px;
        margin-top:8px;
        text-shadow: 0 0 16px rgba(52,152,219,0.7);
        animation: borderGlow 2s infinite;
      ">PIXEL FISHERY</div>
    `;
    this.uiContainer.appendChild(title);

    // ── Нижний блок (прогресс) ────────────────────────────────
    const bottom = document.createElement('div');
    bottom.style.cssText = `
      position:absolute; bottom:10%; left:50%; transform:translateX(-50%);
      width:min(380px,78vw);
      text-align:center;
      pointer-events:none;
    `;

    // Статус-текст
    this.statusEl = document.createElement('div');
    this.statusEl.style.cssText = `
      font-family:'Rajdhani','Courier New',monospace;
      font-size:15px;
      color:rgba(149,165,166,0.8);
      letter-spacing:2px;
      margin-bottom:10px;
      min-height:22px;
    `;
    this.statusEl.innerText = 'Загрузка...';

    // Полоска прогресса
    const barWrap = document.createElement('div');
    barWrap.style.cssText = `
      width:100%; height:12px;
      background:rgba(0,0,0,0.5);
      border:1px solid rgba(52,152,219,0.3);
      clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px));
      overflow:hidden;
      position:relative;
    `;
    const barFill = document.createElement('div');
    barFill.id = 'boot-progress';
    barFill.style.cssText = `
      height:100%; width:0%;
      background:linear-gradient(90deg,#1a5c8a,#3498db,#5dade2);
      box-shadow:0 0 12px #3498db;
      transition:width 0.5s cubic-bezier(0.4,0,0.2,1);
      position:relative;
    `;
    // Блик
    barFill.innerHTML = `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0.25) 0%,transparent 50%)"></div>`;
    barWrap.appendChild(barFill);
    this.progressEl = barFill;

    // Процент
    this.loadingEl = document.createElement('div');
    this.loadingEl.style.cssText = `
      font-family:'Press Start 2P','Courier New',monospace;
      font-size:11px;
      color:rgba(52,152,219,0.7);
      margin-top:10px;
      letter-spacing:2px;
    `;
    this.loadingEl.innerText = '0%';

    bottom.appendChild(this.statusEl);
    bottom.appendChild(barWrap);
    bottom.appendChild(this.loadingEl);
    this.uiContainer.appendChild(bottom);

    // ── Версия ─────────────────────────────────────────────────
    const ver = document.createElement('div');
    ver.style.cssText = `
      position:absolute; bottom:4%; right:5%;
      font-family:'Rajdhani',monospace; font-size:12px;
      color:rgba(74,96,114,0.6); letter-spacing:1px;
      pointer-events:none;
    `;
    ver.innerText = 'v1.0.0';
    this.uiContainer.appendChild(ver);
  }

  // ── AUTH CHECK ────────────────────────────────────────────────
  private async checkAuth() {
    this._setStatus('Проверка сессии...', 15);
    await new Promise(r => setTimeout(r, 500));
    this._setStatus('Инициализация...', 40);
    await new Promise(r => setTimeout(r, 350));

    const user = this.authService.getCurrentUser();
    this._setStatus('Загрузка профиля...', 65);

    if (user) {
      let profile = await this.dbService.getPlayerProfile(user.uid);
      if (!profile) {
        await this.dbService.createInitialProfile(user.uid, user.displayName || `Fisher_${user.uid.slice(0,4)}`, user.email);
        profile = await this.dbService.getPlayerProfile(user.uid);
      } else {
        await this.dbService.updateLastLogin(user.uid);
      }
      this.analytics.logEvent('session_start', { uid: user.uid });
      this._setStatus('Готово!', 100);
      await new Promise(r => setTimeout(r, 400));

      // Навигация по состоянию игрока
      if (!profile?.tutorialCompleted) {
        this.sceneManager.startScene('OnboardingFlow');
      } else if (!profile?.villagePosition) {
        this.sceneManager.startScene('PlanetScene');
      } else {
        // Проверяем офлайн-прогресс
        const offlineAt = profile?.offlineEarningsAt ?? 0;
        const elapsed = (Date.now() - offlineAt) / 1000;
        if (elapsed >= 1800) {
          this.sceneManager.startScene('OfflineSummaryPopup', { nextScene: 'BiomeView', nextData: { biomeId: profile?.currentBiomeId ?? 'rio_salado' } });
        } else {
          this.sceneManager.startScene('BiomeView', { biomeId: profile?.currentBiomeId ?? 'rio_salado' });
        }
      }
    } else {
      this._setStatus('Готово!', 100);
      await new Promise(r => setTimeout(r, 500));
      this.sceneManager.startScene('LoginScene');
    }
  }

  private _setStatus(text: string, pct: number) {
    if (this.statusEl)  this.statusEl.innerText  = text;
    if (this.progressEl) this.progressEl.style.width = `${pct}%`;
    if (this.loadingEl)  this.loadingEl.innerText = `${pct}%`;
  }

  // ── UPDATE ────────────────────────────────────────────────────
  update(_delta: number) {
    const time = Date.now() * 0.001;

    if (this.logoGroup) {
      this.logoGroup.rotation.y = Math.sin(time * 0.5) * 0.2;
      this.logoGroup.position.y = -0.5 + Math.sin(time * 0.85) * 0.25;
      // Орбитальные огни
      const kids = this.logoGroup.children;
      for (let i = kids.length - 4; i < kids.length; i++) {
        const idx = i - (kids.length - 4);
        const angle = (idx / 4) * Math.PI * 2 + time * 0.8;
        const r = 2.5;
        kids[i].position.set(Math.cos(angle) * r, 1.5 + Math.sin(time + idx) * 0.4, Math.sin(angle) * r);
        const s = 0.8 + 0.4 * Math.abs(Math.sin(time * 2 + idx));
        kids[i].scale.setScalar(s);
      }
    }

    this.waterMeshes.forEach((w, i) => {
      w.position.y = -3.2 + i * 0.42 + Math.sin(time * 1.1 + i * 0.55) * 0.2;
    });

    const smat = this.starPoints?.material as THREE.PointsMaterial;
    if (smat) smat.opacity = 0.7 + 0.2 * Math.sin(time * 1.8);

    TWEEN.update();
  }
}
