// ============================================================
// VILLAGE PLACEMENT SCREEN — размещение деревни на карте Аргентины
// Из Code_tz/02_PLANET_VILLAGE.md подзадача 2.2
// Камера: PerspectiveCamera(fov=50, pos=(0,8,12))
// ============================================================

import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import {
  ARGENTINA_BOUNDS,
  isInArgentinaBounds,
  checkVillageConflict,
} from '../utils/ArgentinaSystem';

export class VillagePlacementScreen extends BaseScene {
  private controls: OrbitControls | null = null;
  private mapPlane: THREE.Mesh | null = null;
  private previewMarker: THREE.Mesh | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private currentLat = -35;
  private currentLon = -63;
  private hasConflict = false;
  private biomeId = 'rio_salado';
  private tooltip: HTMLDivElement | null = null;
  private backBtn: HTMLButtonElement | null = null;

  private onMoveBound = (e: MouseEvent) => this.onMouseMove(e);
  private onClickBound = (e: MouseEvent) => this.onPlaceClick(e);
  private onResizeBound = () => this.onResize();

  start(data?: any): void {
    this.biomeId = data?.biomeId ?? 'rio_salado';

    // Камера
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 8, 12);
    this.camera.lookAt(0, 0, 0);

    // Освещение
    this.scene.background = new THREE.Color(0x0a1628);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffd700, 0.8);
    sun.position.set(10, 10, 5);
    this.scene.add(sun);

    // Карта Аргентины
    this.createMap();

    // Сетка
    const grid = new THREE.GridHelper(20, 40, 0x1a4a3a, 0x0d2a1a);
    grid.position.y = 0.02;
    this.scene.add(grid);

    // Маркер превью
    this.previewMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16),
      new THREE.MeshBasicMaterial({ color: 0x27ae60, transparent: true, opacity: 0.6 }),
    );
    this.scene.add(this.previewMarker);

    // OrbitControls
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enablePan = true;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 20;
      this.controls.maxPolarAngle = Math.PI / 2.5;
    }

    this.createUI();

    canvas?.addEventListener('mousemove', this.onMoveBound);
    canvas?.addEventListener('click', this.onClickBound);
    window.addEventListener('resize', this.onResizeBound);

    AudioManager.getInstance().playSFX('popup_open');
  }

  update(_delta: number): void {
    this.controls?.update();
  }

  stop(): void {
    super.stop();
    this.controls?.dispose();
    this.controls = null;
    this.tooltip?.remove();
    this.tooltip = null;
    this.backBtn?.remove();
    this.backBtn = null;
    const canvas = document.getElementById('game-canvas');
    canvas?.removeEventListener('mousemove', this.onMoveBound);
    canvas?.removeEventListener('click', this.onClickBound);
    window.removeEventListener('resize', this.onResizeBound);
  }

  private createMap(): void {
    const geo = new THREE.PlaneGeometry(20, 24, 20, 24);
    geo.rotateX(-Math.PI / 2);
    const tex = this.createMapTexture(512, 614);
    this.mapPlane = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ map: tex, side: THREE.DoubleSide }));
    this.scene.add(this.mapPlane);
  }

  private createMapTexture(w: number, h: number): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, w, h);

    // Упрощённый контур Аргентины
    ctx.fillStyle = '#1a3a2a';
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.05);
    ctx.lineTo(w * 0.65, h * 0.08);
    ctx.lineTo(w * 0.70, h * 0.20);
    ctx.lineTo(w * 0.75, h * 0.35);
    ctx.lineTo(w * 0.60, h * 0.50);
    ctx.lineTo(w * 0.55, h * 0.65);
    ctx.lineTo(w * 0.45, h * 0.80);
    ctx.lineTo(w * 0.40, h * 0.90);
    ctx.lineTo(w * 0.35, h * 0.95);
    ctx.lineTo(w * 0.30, h * 0.85);
    ctx.lineTo(w * 0.25, h * 0.70);
    ctx.lineTo(w * 0.20, h * 0.50);
    ctx.lineTo(w * 0.25, h * 0.30);
    ctx.lineTo(w * 0.30, h * 0.15);
    ctx.closePath();
    ctx.fill();

    // Метки биомов
    const biomes = [
      { lat: -35, lon: -63, color: '#27ae60', label: 'L1' },
      { lat: -41, lon: -71, color: '#3498db', label: 'L2' },
      { lat: -50, lon: -72, color: '#9b59b6', label: 'L3' },
    ];
    for (const b of biomes) {
      const x = ((b.lon - ARGENTINA_BOUNDS.lonMin) / (ARGENTINA_BOUNDS.lonMax - ARGENTINA_BOUNDS.lonMin)) * w;
      const y = ((ARGENTINA_BOUNDS.latMax - b.lat) / (ARGENTINA_BOUNDS.latMax - ARGENTINA_BOUNDS.latMin)) * h;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, x, y + 4);
    }

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#27ae60';
    ctx.textAlign = 'center';
    ctx.fillText('АРГЕНТИНА', w / 2, 20);

    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.mapPlane || !this.previewMarker) return;

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.mapPlane);
    if (hits.length === 0) return;

    const point = hits[0].point;
    const snappedX = Math.round(point.x * 2) / 2;
    const snappedZ = Math.round(point.z * 2) / 2;
    this.previewMarker.position.set(snappedX, 0.1, snappedZ);

    this.currentLat = ARGENTINA_BOUNDS.latMax - ((snappedZ + 12) / 24) * (ARGENTINA_BOUNDS.latMax - ARGENTINA_BOUNDS.latMin);
    this.currentLon = ARGENTINA_BOUNDS.lonMin + ((snappedX + 10) / 20) * (ARGENTINA_BOUNDS.lonMax - ARGENTINA_BOUNDS.lonMin);

    const inBounds = isInArgentinaBounds(this.currentLat, this.currentLon);
    // Пока нет существующих деревень — пустой массив
    this.hasConflict = !inBounds || checkVillageConflict([], this.currentLat, this.currentLon);

    const mat = this.previewMarker.material as THREE.MeshBasicMaterial;
    mat.color.setHex(this.hasConflict ? 0xe74c3c : 0x27ae60);

    if (this.tooltip) {
      this.tooltip.textContent = this.hasConflict
        ? '❌ Нельзя разместить здесь'
        : `📍 ${this.currentLat.toFixed(1)}°, ${this.currentLon.toFixed(1)}°`;
    }
  }

  private async onPlaceClick(_e: MouseEvent): Promise<void> {
    if (this.hasConflict || !isInArgentinaBounds(this.currentLat, this.currentLon)) return;

    const user = AuthService.getInstance().getCurrentUser();
    if (!user) return;

    const db = DatabaseService.getInstance();
    await db.updatePlayerStats(user.uid, {
      villagePosition: { lat: this.currentLat, lon: this.currentLon },
      currentBiomeId: this.biomeId,
    });

    AudioManager.getInstance().playSFX('upgrade');
    this.sceneManager.startScene('FarmScene');
  }

  private createUI(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
      position:fixed;top:80px;left:50%;transform:translateX(-50%);
      padding:10px 20px;background:rgba(10,22,40,0.9);border:1px solid #27ae60;
      border-radius:8px;color:white;font-family:'Rajdhani',sans-serif;font-size:16px;
      z-index:100;text-align:center;
    `;
    this.tooltip.textContent = '🏘 Кликните на карту чтобы разместить деревню';
    document.body.appendChild(this.tooltip);

    this.backBtn = document.createElement('button');
    this.backBtn.className = 'pixel-btn';
    this.backBtn.textContent = '← Назад';
    this.backBtn.style.cssText = 'position:fixed;bottom:20px;left:20px;padding:10px 20px;z-index:100;';
    this.backBtn.onclick = () => this.sceneManager.startScene('PlanetScene');
    document.body.appendChild(this.backBtn);
  }

  private onResize(): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }
}
