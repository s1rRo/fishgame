// ============================================================
// LOGIN SCENE v2.0 — River Lord: Pixel Fishery
// Ночная сцена: лодка + волны + карточка входа с неон-акцентами
// ============================================================
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { Analytics } from '../services/analytics';
import { matLP, LP, applyLowPolyToScene } from '../utils/LowPolyStyle';

export class LoginScene extends BaseScene {
  private authService = AuthService.getInstance();
  private dbService   = DatabaseService.getInstance();
  private analytics   = Analytics.getInstance();

  private water!: THREE.Mesh;
  private boat!: THREE.Group;
  private waterWaves: THREE.Mesh[] = [];
  private starPoints!: THREE.Points;
  private isLogging = false;

  // Частицы-пузырьки воды
  private particles: THREE.Mesh[] = [];

  start() {
    this.setup3D();
    this.setupUI();
  }

  // ── 3D СЦЕНА ──────────────────────────────────────────────────
  private setup3D() {
    this.scene.background = new THREE.Color(0x030d1a);
    this.camera.position.set(0, 4.5, 11);
    this.camera.lookAt(0, 0, 0);
    (this.camera as THREE.PerspectiveCamera).fov = 55;
    (this.camera as THREE.PerspectiveCamera).updateProjectionMatrix();

    // Освещение
    const ambient = new THREE.AmbientLight(0x1a3a5c, 1.0);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0x6a9fd8, 0.6);
    dir.position.set(8, 15, 8);
    this.scene.add(dir);
    // Синеватый лунный свет
    const moon = new THREE.PointLight(0x4488cc, 2.5, 40);
    moon.position.set(-6, 10, -4);
    this.scene.add(moon);
    // Тёплый акцент от «огня»
    const fire = new THREE.PointLight(0xff6620, 1.2, 12);
    fire.position.set(0.5, 1.5, 2);
    this.scene.add(fire);

    // ── Звёзды (Points) ────────────────────────────────────────
    const starCount = 250;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 1] = 4 + Math.random() * 20;
      starPos[i * 3 + 2] = -8 - Math.random() * 30;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.85 });
    this.starPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starPoints);

    // ── Луна ───────────────────────────────────────────────────
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff4e0 })
    );
    moonMesh.position.set(-9, 11, -18);
    this.scene.add(moonMesh);
    // Ореол луны
    const haloGeo = new THREE.CircleGeometry(2.4, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x8899ff, transparent: true, opacity: 0.07, side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(moonMesh.position);
    halo.lookAt(this.camera.position);
    this.scene.add(halo);

    // ── Горизонт / дальние горы (low-poly, ConeGeometry 4 грани) ──
    for (let i = 0; i < 5; i++) {
      const h = 1.5 + Math.random() * 2.5;
      const w = 4 + Math.random() * 6;
      const col = new THREE.Color().setHSL(0.6, 0.3, 0.06 + i * 0.01).getHex();
      const m = new THREE.Mesh(new THREE.ConeGeometry(w * 0.5, h, 4), matLP(col));
      m.position.set(-16 + i * 8 + Math.random() * 3, -1.5, -14 - Math.random() * 4);
      m.rotation.y = Math.random() * Math.PI;
      this.scene.add(m);
    }

    // ── Волны (low-poly flat-shading) ──────────────────────────
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const geo = new THREE.BoxGeometry(28, 0.4, 1.8, 6, 1, 2);
      const col = new THREE.Color().setHSL(0.60, 0.75, 0.06 + t * 0.08).getHex();
      const wave = new THREE.Mesh(geo, matLP(col, { transparent: true, opacity: 0.88 }));
      wave.position.set(0, -2.8 + i * 0.45, -2.5 + i * 0.9);
      this.scene.add(wave);
      this.waterWaves.push(wave);
    }

    // ── Лодка (low-poly voxels с matLP) ────────────────────────
    this.boat = new THREE.Group();
    const b = (w: number, h: number, d: number, x: number, y: number, z: number, c: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 2, 2, 2), matLP(c));
      m.position.set(x, y, z);
      this.boat.add(m);
    };
    // Корпус
    b(4.0, 0.9, 6.5, 0, 0.45,  0,  0x1a3a5c);
    b(3.0, 0.35, 5.0, 0, 0.92, 0,  0x2c5282);
    b(0.2, 0.9,  6.5, -2.1, 0.45, 0, 0x0f2440);
    b(0.2, 0.9,  6.5,  2.1, 0.45, 0, 0x0f2440);
    b(0.14, 3.6, 0.14, 0.5, 2.7, -1.0, LP.wood);
    b(1.8, 0.1,  0.1,  1.4, 3.9, -1.0, LP.gold);
    // Рыбак
    b(0.6, 0.9,  0.6,  -0.4, 1.35, 1.0, LP.shirtBlue);
    b(0.55, 0.55, 0.55, -0.4, 2.05, 1.0, LP.skin);
    b(0.9, 0.2,  0.9,  -0.4, 2.4,  1.0, LP.hat);
    b(0.1, 1.8,  0.1,   0.4, 2.2,  0.5, LP.wood);

    // flatShading ко всей сцене Login
    applyLowPolyToScene(this.scene);

    this.boat.position.set(-0.5, 0, 0);
    this.scene.add(this.boat);

    // ── Отражение луны на воде (полоса) ────────────────────────
    const reflGeo = new THREE.PlaneGeometry(0.4, 12);
    const reflMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 });
    const refl = new THREE.Mesh(reflGeo, reflMat);
    refl.rotation.x = -Math.PI / 2;
    refl.position.set(-5, -2.4, -3);
    this.scene.add(refl);
  }

  // ── UI ────────────────────────────────────────────────────────
  private setupUI() {
    // ── Фоновый градиент-оверлей (виньетка снизу) ─────────────
    const vignette = document.createElement('div');
    vignette.style.cssText = `
      position:absolute; inset:0;
      background: radial-gradient(ellipse at 50% 110%, rgba(10,22,40,0.7) 0%, transparent 65%);
      pointer-events:none;
    `;
    this.uiContainer.appendChild(vignette);

    // ── ЗАГОЛОВОК ──────────────────────────────────────────────
    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = `
      position:absolute; top:7%; width:100%; text-align:center;
      pointer-events:none;
    `;
    titleWrap.innerHTML = `
      <div style="
        font-family:'Press Start 2P','Courier New',monospace;
        font-size:clamp(18px,3.8vw,42px);
        color:#ecf0f1;
        text-shadow: 0 0 30px rgba(52,152,219,0.9), 0 0 60px rgba(52,152,219,0.4), 4px 4px 0 rgba(0,0,0,0.6);
        letter-spacing:4px;
        line-height:1.4;
      ">RIVER LORD</div>
      <div style="
        font-family:'Press Start 2P','Courier New',monospace;
        font-size:clamp(9px,1.5vw,14px);
        color:#3498db;
        letter-spacing:8px;
        margin-top:6px;
        text-shadow:0 0 16px rgba(52,152,219,0.7);
      ">PIXEL FISHERY</div>
      <div style="
        font-family:'Rajdhani','Courier New',monospace;
        font-size:clamp(12px,1.8vw,16px);
        color:rgba(149,165,166,0.7);
        letter-spacing:3px;
        margin-top:14px;
      ">— Рыбак. Фермер. Легенда. —</div>
    `;
    this.uiContainer.appendChild(titleWrap);

    // ── ДЕКОРАТИВНАЯ ЛИНИЯ ─────────────────────────────────────
    const divider = document.createElement('div');
    divider.style.cssText = `
      position:absolute; top:32%; left:50%; transform:translateX(-50%);
      width:min(280px,60vw); height:2px;
      background:linear-gradient(90deg,transparent,rgba(52,152,219,0.6),transparent);
      pointer-events:none;
    `;
    this.uiContainer.appendChild(divider);

    // ── КАРТОЧКА ВХОДА ─────────────────────────────────────────
    const card = document.createElement('div');
    card.style.cssText = `
      position:absolute;
      top:50%; left:50%;
      transform:translate(-50%,-50%);
      width:min(400px,88vw);
      background: linear-gradient(160deg, rgba(15,30,50,0.97) 0%, rgba(8,18,32,0.99) 100%);
      border:2px solid rgba(52,152,219,0.4);
      padding:32px 36px 28px;
      text-align:center;
      clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
      box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(52,152,219,0.12), inset 0 1px 0 rgba(255,255,255,0.05);
      pointer-events:auto;
    `;

    // Угловые декорации карточки
    card.innerHTML = `
      <div style="position:absolute;top:8px;right:8px;width:18px;height:18px;border-top:2px solid rgba(52,152,219,0.6);border-right:2px solid rgba(52,152,219,0.6);pointer-events:none"></div>
      <div style="position:absolute;bottom:8px;left:8px;width:18px;height:18px;border-bottom:2px solid rgba(52,152,219,0.6);border-left:2px solid rgba(52,152,219,0.6);pointer-events:none"></div>
      <div style="
        font-family:'Rajdhani','Courier New',monospace;
        font-size:13px;
        font-weight:600;
        color:rgba(52,152,219,0.7);
        letter-spacing:4px;
        text-transform:uppercase;
        margin-bottom:22px;
      ">ВХОД В ИГРУ</div>
    `;

    // Кнопка Guest
    const guestBtn = this._makeBtn('▶  ИГРАТЬ ГОСТЕМ', '#1a7a3c', '#27ae60', '🎣');
    guestBtn.onclick = async () => {
      if (this.isLogging) return;
      this.isLogging = true;
      guestBtn.innerHTML = '<span style="opacity:0.6">⌛</span>  Входим...';
      guestBtn.style.pointerEvents = 'none';
      try {
        const user = await this.authService.loginAnonymously();
        await this.handleLogin(user);
      } catch (e) {
        console.error(e);
        guestBtn.innerHTML = '▶  ИГРАТЬ ГОСТЕМ';
        guestBtn.style.pointerEvents = 'auto';
        this.isLogging = false;
      }
    };

    // Разделитель
    const orLine = document.createElement('div');
    orLine.style.cssText = `
      display:flex; align-items:center; gap:12px;
      margin:14px 0;
      font-family:'Rajdhani',monospace; font-size:13px;
      color:rgba(149,165,166,0.5); letter-spacing:2px;
    `;
    orLine.innerHTML = `
      <div style="flex:1;height:1px;background:rgba(255,255,255,0.08)"></div>
      ИЛИ
      <div style="flex:1;height:1px;background:rgba(255,255,255,0.08)"></div>
    `;

    // Кнопка Google
    const googleBtn = this._makeBtn('G  ВОЙТИ ЧЕРЕЗ GOOGLE', '#8b1a1a', '#e74c3c', '');
    googleBtn.onclick = async () => {
      if (this.isLogging) return;
      this.isLogging = true;
      googleBtn.innerHTML = '<span style="opacity:0.6">⌛</span>  Входим...';
      googleBtn.style.pointerEvents = 'none';
      try {
        const user = await this.authService.loginWithGoogle();
        await this.handleLogin(user);
      } catch (e) {
        console.error(e);
        googleBtn.innerHTML = 'G  ВОЙТИ ЧЕРЕЗ GOOGLE';
        googleBtn.style.pointerEvents = 'auto';
        this.isLogging = false;
      }
    };

    // Сноска
    const note = document.createElement('div');
    note.style.cssText = `
      margin-top:18px;
      font-family:'Rajdhani',monospace;
      font-size:13px;
      color:rgba(149,165,166,0.4);
      line-height:1.5;
    `;
    note.innerText = 'Гостевой прогресс сохраняется локально.\nДля синхронизации — войдите через Google.';

    card.appendChild(guestBtn);
    card.appendChild(orLine);
    card.appendChild(googleBtn);
    card.appendChild(note);
    this.uiContainer.appendChild(card);

    // Анимация появления карточки
    card.style.opacity = '0';
    card.style.transform = 'translate(-50%, -46%)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translate(-50%, -50%)';
    }, 300);

    // ── ВЕРСИЯ ────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.style.cssText = `
      position:absolute; bottom:5%;
      width:100%; text-align:center;
      font-family:'Rajdhani',monospace;
      font-size:12px;
      color:rgba(74,96,114,0.7);
      letter-spacing:2px;
      pointer-events:none;
    `;
    footer.innerHTML = `© 2025 RIVER LORD: PIXEL FISHERY &nbsp;·&nbsp; v1.0.0`;
    this.uiContainer.appendChild(footer);
  }

  private _makeBtn(text: string, bgDark: string, bgLight: string, _icon: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.style.cssText = `
      display: block;
      width: 100%;
      padding: 15px 20px;
      background: linear-gradient(135deg, ${bgDark} 0%, ${bgLight} 100%);
      color: #fff;
      border: 2px solid rgba(255,255,255,0.3);
      font-family: 'Rajdhani','Courier New',monospace;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      cursor: pointer;
      clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      transition: filter 0.15s, transform 0.1s;
      pointer-events: auto;
    `;
    btn.innerHTML = text;
    btn.onmouseenter = () => { btn.style.filter = 'brightness(1.2)'; btn.style.transform = 'translateY(-2px)'; };
    btn.onmouseleave = () => { btn.style.filter = '';               btn.style.transform = ''; };
    btn.onmousedown  = () => { btn.style.transform = 'translateY(1px) scale(0.98)'; };
    btn.onmouseup    = () => { btn.style.transform = 'translateY(-2px)'; };
    return btn;
  }

  // ── ОБРАБОТКА ВХОДА ───────────────────────────────────────────
  private async handleLogin(user: any) {
    const profile = await this.dbService.getPlayerProfile(user.uid);
    if (!profile) {
      await this.dbService.createInitialProfile(user.uid, user.displayName || `Fisher_${user.uid.slice(0,4)}`, user.email);
    } else {
      await this.dbService.updateLastLogin(user.uid);
    }
    this.analytics.logEvent('login', { method: user.isAnonymous ? 'guest' : 'google' });
    this.sceneManager.startScene('PlanetScene');
  }

  // ── UPDATE ────────────────────────────────────────────────────
  update(_delta: number) {
    const time = Date.now() * 0.001;

    // Покачивание лодки
    this.boat.position.y = Math.sin(time * 0.9) * 0.2;
    this.boat.rotation.z = Math.sin(time * 0.55) * 0.045;
    this.boat.rotation.x = Math.cos(time * 0.38) * 0.03;

    // Волны
    this.waterWaves.forEach((w, i) => {
      w.position.y = -2.8 + i * 0.45 + Math.sin(time * 1.15 + i * 0.65) * 0.18;
      (w.material as THREE.MeshStandardMaterial).opacity = 0.75 + Math.sin(time + i) * 0.12;
    });

    // Мерцание звёзд
    const mat = this.starPoints.material as THREE.PointsMaterial;
    mat.opacity = 0.65 + 0.2 * Math.sin(time * 2.1);

    TWEEN.update();
  }
}
