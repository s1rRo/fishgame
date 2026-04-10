// ============================================================
// CHECKPOINT MAP SCENE — Duolingo-стиль 3D карта чекпоинтов
// Тропа через ландшафт, игрок перемещается по маркерам
// ЗАМЕНЯЕТ popup CheckpointRoadUI
// ============================================================

import * as THREE from 'three';
import { BaseScene, ISceneManager } from '../core/BaseScene';
import { LP, matLP, createTree } from '../utils/LowPolyStyle';

export interface CheckpointMapData {
  total: number;           // 5-8 чекпоинтов
  completed: number;       // уже пройдено
  biomeLevel: number;      // 1-3
  biomeId: string;
  // Callback: после выбора чекпоинта
  onSelect: (index: number) => void;
  onCancel: () => void;
}

interface CheckpointNode {
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  label: HTMLDivElement;
  index: number;
  state: 'completed' | 'current' | 'locked';
}

export class CheckpointMapScene extends BaseScene {
  private path!: THREE.CatmullRomCurve3;
  private pathMesh!: THREE.Mesh;
  private nodes: CheckpointNode[] = [];
  private avatarMesh!: THREE.Group;
  private data!: CheckpointMapData;
  private overlay: HTMLDivElement | null = null;
  private labelsContainer: HTMLDivElement | null = null;
  private isAnimatingAvatar = false;
  private avatarT = 0;      // позиция на кривой 0..1
  private targetT = 0;
  private time = 0;

  // Цвета по биому
  private static TERRAIN: Record<number, { ground: number; water: number; sky: number; path: number }> = {
    1: { ground: 0x8BC34A, water: 0x3498db, sky: 0x87CEEB, path: 0xd4a76a },
    2: { ground: 0x4CAF50, water: 0x2980b9, sky: 0x76b5c5, path: 0xb8956a },
    3: { ground: 0x78909C, water: 0x1a5276, sky: 0x5d6d7e, path: 0x9e8e7e },
  };

  constructor(manager: ISceneManager) {
    super(manager);
  }

  start(data?: CheckpointMapData): void {
    if (!data) return;
    this.data = data;
    this.nodes = [];
    this.time = 0;

    const colors = CheckpointMapScene.TERRAIN[data.biomeLevel] ?? CheckpointMapScene.TERRAIN[1];

    // Камера — сверху-сбоку
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 12, 10);
    this.camera.lookAt(0, 0, 0);

    // Фон
    this.scene.background = new THREE.Color(colors.sky);
    this.scene.fog = new THREE.FogExp2(colors.sky, 0.015);

    // Освещение
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffd700, 0.8);
    sun.position.set(8, 15, 5);
    this.scene.add(sun);

    // Ландшафт (плоскость)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 30, 12, 8),
      matLP(colors.ground)
    );
    ground.rotation.x = -Math.PI / 2;
    // Небольшой vertex noise
    const gPos = ground.geometry.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i);
      const z = gPos.getZ(i);
      gPos.setZ(i, gPos.getZ(i) + (Math.sin(x * 0.5) * Math.cos(z * 0.3) * 0.4));
    }
    gPos.needsUpdate = true;
    ground.geometry.computeVertexNormals();
    this.scene.add(ground);

    // Вода (сбоку)
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 8, 6, 3),
      matLP(colors.water, { transparent: true, opacity: 0.75 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.05, -12);
    this.scene.add(water);

    // Тропа (CatmullRomCurve3)
    this.createPath(data.total, colors.path);

    // Маркеры чекпоинтов
    this.createCheckpoints(data.total, data.completed);

    // Декор
    this.createDecoration(data.biomeLevel);

    // Аватар игрока
    this.createAvatar(data.completed);

    // UI overlay
    this.createUI();

    // Центрировать камеру на текущем чекпоинте
    this.focusOnCheckpoint(data.completed);
  }

  update(delta: number): void {
    this.time += delta;

    // Пульсация текущего чекпоинта
    for (const node of this.nodes) {
      if (node.state === 'current') {
        const scale = 1.0 + Math.sin(this.time * 3) * 0.15;
        node.mesh.scale.setScalar(scale);
      }
    }

    // Анимация аватара по тропе
    if (this.isAnimatingAvatar) {
      const speed = 0.8 * delta;
      if (this.avatarT < this.targetT) {
        this.avatarT = Math.min(this.avatarT + speed, this.targetT);
      } else {
        this.isAnimatingAvatar = false;
      }
      const pos = this.path.getPoint(this.avatarT);
      this.avatarMesh.position.copy(pos);
      this.avatarMesh.position.y += 0.5;

      // Направление движения
      if (this.avatarT < this.targetT - 0.01) {
        const next = this.path.getPoint(Math.min(this.avatarT + 0.02, 1));
        this.avatarMesh.lookAt(next.x, this.avatarMesh.position.y, next.z);
      }
    }

    // Аватар bob-анимация
    if (this.avatarMesh) {
      this.avatarMesh.position.y = this.path.getPoint(this.avatarT).y + 0.5 + Math.sin(this.time * 2) * 0.1;
    }

    // Обновить позиции лейблов (screen-space)
    this.updateLabelPositions();
  }

  // ─── PATH (тропа) ───

  private createPath(total: number, pathColor: number): void {
    const points: THREE.Vector3[] = [];
    const segmentLength = 24 / (total - 1);

    for (let i = 0; i < total; i++) {
      const x = -12 + i * segmentLength;
      const z = Math.sin(i * 1.2) * 2.5;
      const y = 0.05;
      points.push(new THREE.Vector3(x, y, z));
    }

    this.path = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

    // Визуализация тропы
    const tubeGeo = new THREE.TubeGeometry(this.path, 64, 0.35, 5, false);
    this.pathMesh = new THREE.Mesh(tubeGeo, matLP(pathColor));
    this.scene.add(this.pathMesh);
  }

  // ─── CHECKPOINTS ───

  private createCheckpoints(total: number, completed: number): void {
    // Контейнер для лейблов
    this.labelsContainer = document.createElement('div');
    this.labelsContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;';
    document.body.appendChild(this.labelsContainer);

    for (let i = 0; i < total; i++) {
      const t = i / (total - 1);
      const pos = this.path.getPoint(t);

      let state: 'completed' | 'current' | 'locked';
      if (i < completed) state = 'completed';
      else if (i === completed) state = 'current';
      else state = 'locked';

      // 3D маркер
      let markerColor: number;
      let markerGeo: THREE.BufferGeometry;

      if (state === 'completed') {
        markerColor = 0x27ae60;
        markerGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.25, 6);
      } else if (state === 'current') {
        markerColor = 0xf39c12;
        markerGeo = new THREE.OctahedronGeometry(0.55, 0);
      } else {
        markerColor = 0x555555;
        markerGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 6);
      }

      const mesh = new THREE.Mesh(markerGeo, matLP(markerColor, {
        emissive: state === 'current' ? 0x553300 : undefined,
      }));
      mesh.position.copy(pos);
      mesh.position.y += 0.3;
      this.scene.add(mesh);

      // Столб-основание маркера
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.5, 4),
        matLP(LP.wood)
      );
      pole.position.copy(pos);
      pole.position.y += 0.05;
      this.scene.add(pole);

      // HTML лейбл
      const label = document.createElement('div');
      label.style.cssText = `
        position:absolute; transform:translate(-50%,-100%);
        font-family:'Press Start 2P',monospace; font-size:9px;
        color:${state === 'completed' ? '#27ae60' : state === 'current' ? '#f39c12' : '#555'};
        text-align:center; pointer-events:${state === 'current' ? 'auto' : 'none'};
        cursor:${state === 'current' ? 'pointer' : 'default'};
        text-shadow:0 0 4px rgba(0,0,0,0.8);
      `;

      // Звёзды пройденных
      let stars = '';
      if (state === 'completed') {
        const starCount = Math.min(3, Math.floor(Math.random() * 3) + 1);
        stars = '⭐'.repeat(starCount);
      }

      const difficulty = i < 3 ? 'Лёгкий' : i < 6 ? 'Средний' : 'Сложный';

      label.innerHTML = state === 'completed'
        ? `<div>${stars}</div><div style="font-size:7px;color:#95a5a6">${i + 1}</div>`
        : state === 'current'
          ? `<div style="font-size:11px">🎣</div><div style="font-size:7px">${difficulty}</div>`
          : `<div>🔒</div><div style="font-size:7px">${i + 1}</div>`;

      this.labelsContainer.appendChild(label);

      // Клик на текущий чекпоинт
      if (state === 'current') {
        label.addEventListener('click', () => this.selectCheckpoint(i));
      }

      this.nodes.push({ position: pos.clone(), mesh, label, index: i, state });
    }
  }

  // ─── АВАТАР ───

  private createAvatar(completed: number): void {
    this.avatarMesh = new THREE.Group();

    // Тело
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.55, 0.25),
      matLP(LP.shirtBlue)
    );
    body.position.y = 0.28;
    this.avatarMesh.add(body);

    // Голова
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      matLP(LP.skin)
    );
    head.position.y = 0.7;
    this.avatarMesh.add(head);

    // Шляпа
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 0.12, 5),
      matLP(LP.hat)
    );
    hat.position.y = 0.9;
    this.avatarMesh.add(hat);

    // Удочка
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.0, 3),
      matLP(LP.wood)
    );
    rod.position.set(0.25, 0.5, 0);
    rod.rotation.z = -0.3;
    this.avatarMesh.add(rod);

    // Позиция на тропе
    this.avatarT = completed > 0 ? (completed - 1) / (this.data.total - 1) : 0;
    this.targetT = completed / (this.data.total - 1);
    this.isAnimatingAvatar = completed > 0;

    const startPos = this.path.getPoint(this.avatarT);
    this.avatarMesh.position.copy(startPos);
    this.avatarMesh.position.y += 0.5;

    this.scene.add(this.avatarMesh);
  }

  // ─── ДЕКОР ───

  private createDecoration(biomeLevel: number): void {
    // Деревья вдоль тропы
    const treeCount = 12 + biomeLevel * 3;
    for (let i = 0; i < treeCount; i++) {
      const t = Math.random();
      const pathPt = this.path.getPoint(t);
      const offset = (Math.random() - 0.5) * 2 > 0 ? 3 + Math.random() * 4 : -(3 + Math.random() * 4);

      const tree = createTree();
      tree.position.set(pathPt.x + (Math.random() - 0.5) * 2, 0, pathPt.z + offset);
      tree.scale.setScalar(0.6 + Math.random() * 0.5);
      this.scene.add(tree);
    }

    // Камни
    for (let i = 0; i < 8; i++) {
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.2 + Math.random() * 0.3, 0),
        matLP(LP.rock)
      );
      rock.position.set(
        (Math.random() - 0.5) * 20,
        0.1,
        (Math.random() - 0.5) * 12
      );
      this.scene.add(rock);
    }
  }

  // ─── CAMERA FOCUS ───

  private focusOnCheckpoint(index: number): void {
    const t = Math.min(index / (this.data.total - 1), 1);
    const pos = this.path.getPoint(t);
    this.camera.position.set(pos.x, 12, pos.z + 10);
    this.camera.lookAt(pos.x, 0, pos.z);
  }

  // ─── LABEL POSITIONS (world → screen) ───

  private updateLabelPositions(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const node of this.nodes) {
      const pos = node.position.clone();
      pos.y += 1.2;
      pos.project(this.camera);

      const x = (pos.x * 0.5 + 0.5) * w;
      const y = (-pos.y * 0.5 + 0.5) * h;

      node.label.style.left = `${x}px`;
      node.label.style.top = `${y}px`;
    }
  }

  // ─── ВЫБОР ЧЕКПОИНТА ───

  private selectCheckpoint(index: number): void {
    // Анимировать аватар к чекпоинту
    this.targetT = index / (this.data.total - 1);
    this.isAnimatingAvatar = true;

    // Через 1 сек — запустить callback
    setTimeout(() => {
      this.cleanup();
      this.data.onSelect(index);
    }, 1200);
  }

  // ─── UI ───

  private createUI(): void {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed; top:16px; left:50%; transform:translateX(-50%);
      z-index:200; display:flex; gap:12px; align-items:center;
    `;

    // Заголовок
    const title = document.createElement('div');
    title.style.cssText = `
      font-family:'Press Start 2P',monospace; font-size:11px;
      color:#fff; background:rgba(10,22,40,0.9); padding:8px 16px;
      border:1px solid #3498db; border-radius:4px;
      clip-path:polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
    `;
    title.textContent = `МАРШРУТ ${this.data.completed}/${this.data.total}`;
    this.overlay.appendChild(title);

    // Кнопка назад
    const backBtn = document.createElement('button');
    backBtn.style.cssText = `
      font-family:'Press Start 2P',monospace; font-size:9px;
      color:#fff; background:rgba(231,76,60,0.8); border:1px solid #e74c3c;
      padding:8px 14px; cursor:pointer; border-radius:4px;
    `;
    backBtn.textContent = '← НАЗАД';
    backBtn.addEventListener('click', () => {
      this.cleanup();
      this.data.onCancel();
    });
    this.overlay.appendChild(backBtn);

    // Кнопка "РЫБАЧИТЬ" внизу
    const fishBtn = document.createElement('button');
    fishBtn.id = 'cp-fish-btn';
    fishBtn.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      font-family:'Press Start 2P',monospace; font-size:12px;
      color:#fff; background:linear-gradient(135deg,#f39c12,#e67e22);
      border:2px solid #f39c12; padding:14px 32px; cursor:pointer;
      z-index:200; box-shadow:0 0 20px rgba(243,156,18,0.4);
      clip-path:polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
      animation:pulse 2s infinite;
    `;
    fishBtn.innerHTML = '🎣 РЫБАЧИТЬ';
    fishBtn.addEventListener('click', () => this.selectCheckpoint(this.data.completed));

    const style = document.createElement('style');
    style.textContent = `@keyframes pulse{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.05)}}`;

    document.body.appendChild(style);
    document.body.appendChild(this.overlay);
    document.body.appendChild(fishBtn);
  }

  private cleanup(): void {
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    if (this.labelsContainer) { this.labelsContainer.remove(); this.labelsContainer = null; }
    const fishBtn = document.getElementById('cp-fish-btn');
    if (fishBtn) fishBtn.remove();
  }

  stop(): void {
    this.cleanup();
    super.stop();
  }
}
