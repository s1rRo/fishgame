// ============================================================
// FARM SCENE v3 — Hex Grid (Clash of Clans стиль)
// Большая hex-карта, свободное размещение зданий, дороги,
// расчистка деревьев/камней, аватар с A* патфайндингом
// ============================================================
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { Analytics } from '../services/analytics';
import { TopHUD } from '../ui/TopHUD';
import { PlayerProfile, HexFarmState, FarmBuildingPlacement } from '../models/Player';
import {
  matLP, LP, createRock, createTree, createBranch, createFishMesh, setupGameLighting,
} from '../utils/LowPolyStyle';
import {
  hexToWorld, worldToHex, hexKey, parseHexKey,
  hexNeighbors, hexesInRadius, buildingFootprint,
  isValidPlacement, findPath,
  HEX_RADIUS, FARM_COLS, FARM_ROWS,
  HexCoord,
} from '../utils/HexGrid';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { ParticlePool } from '../utils/ParticlePool';

// ── BUILDING DEFINITIONS ──────────────────────────────────────
interface BuildingDef {
  id: string;
  name: string;
  desc: string;
  buildCost: number;
  upgradeCost: number[];
  maxLevel: number;
  hexW: number; hexH: number; // footprint in hex cells
  baseColor: number;
  roofColor: number;
  bonuses: string[];
  isPond: boolean;
}

const BUILDING_DEFS: BuildingDef[] = [
  {
    id: 'house', name: 'Хижина рыбака', desc: 'Штаб-квартира. Хранит улов, даёт базовый доход.',
    buildCost: 0, upgradeCost: [300, 800, 2000], maxLevel: 4,
    hexW: 2, hexH: 2, baseColor: 0xc0392b, roofColor: 0x8e44ad,
    bonuses: ['+2/мин', '+4/мин', '+8/мин', '+15/мин'], isPond: false,
  },
  {
    id: 'pond', name: 'Рыбный водоём', desc: 'Водоём с рыбой. Растёт при улучшении.',
    buildCost: 0, upgradeCost: [200, 600, 1500], maxLevel: 4,
    hexW: 2, hexH: 1, baseColor: 0x2980b9, roofColor: 0x1a5276,
    bonuses: ['2 hex, обычная рыба', '4 hex, + карп', '6 hex, + щука', '9 hex, + лосось'], isPond: true,
  },
  {
    id: 'storage', name: 'Склад', desc: 'Хранилище для рыбы и ресурсов.',
    buildCost: 500, upgradeCost: [400, 1000, 2500], maxLevel: 4,
    hexW: 2, hexH: 2, baseColor: 0x34495e, roofColor: 0x1c2833,
    bonuses: ['50 слотов', '100 слотов', '200 слотов', 'безлимит'], isPond: false,
  },
  {
    id: 'smokehouse', name: 'Коптильня', desc: 'Коптит рыбу, повышая стоимость.',
    buildCost: 800, upgradeCost: [600, 1500, 3500], maxLevel: 4,
    hexW: 2, hexH: 2, baseColor: 0xe67e22, roofColor: 0x935116,
    bonuses: ['×1.5 цена', '×2.2', '×3.0', '×4.0'], isPond: false,
  },
  {
    id: 'dock', name: 'Причал', desc: 'Бонус к рыбалке.',
    buildCost: 1200, upgradeCost: [800, 2000, 4500], maxLevel: 4,
    hexW: 3, hexH: 1, baseColor: 0x8e44ad, roofColor: 0x5b2c6f,
    bonuses: ['+5%', '+15%', '+30%', '+50%'], isPond: false,
  },
  {
    id: 'npcFisher1', name: 'NPC-рыбак', desc: 'Автономный рыбак.',
    buildCost: 2000, upgradeCost: [1200, 3000, 6000], maxLevel: 4,
    hexW: 2, hexH: 2, baseColor: 0x3498db, roofColor: 0x154360,
    bonuses: ['+8/мин авто', '+16/мин', '+30/мин', '+50/мин'], isPond: false,
  },
];

// ── HEX COLORS ────────────────────────────────────────────────
const HEX_COLORS = {
  grass:    0x27ae60,
  grassAlt: 0x2ecc71,
  road:     0xd4ac0d,
  water:    0x2980b9,
  building: 0x626567,
  hover:    0x3498db,
  valid:    0x27ae60,
  invalid:  0xe74c3c,
};

// ══════════════════════════════════════════════════════════════
export class FarmScene extends BaseScene {
  private authService = AuthService.getInstance();
  private dbService   = DatabaseService.getInstance();
  private analytics   = Analytics.getInstance();

  private hud!: TopHUD;
  private profile: PlayerProfile | null = null;
  private uid = '';

  // Hex grid rendering
  private hexInstances!: THREE.InstancedMesh;
  private hexColors!: Float32Array;
  private hexCount = FARM_COLS * FARM_ROWS;

  // Obstacles (trees/rocks)
  private obstacleGroup = new THREE.Group();
  private obstacleMeshes = new Map<string, THREE.Object3D>();

  // Buildings
  private buildingGroup = new THREE.Group();
  private buildingMeshes = new Map<string, THREE.Group>();

  // Avatar
  private avatarGroup: THREE.Group | null = null;
  private avatarTarget: HexCoord | null = null;
  private avatarPath: HexCoord[] = [];
  private avatarPathIndex = 0;
  private avatarLegs: THREE.Mesh[] = [];
  private avatarArms: THREE.Mesh[] = [];

  // Interaction
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private groundPlane!: THREE.Mesh;
  private hoverHex: THREE.Mesh | null = null;
  private orbitControls: OrbitControls | null = null;

  // Farm state
  private farm: HexFarmState | null = null;

  // Modes
  private placementMode: { buildingDef: BuildingDef; ghostGroup: THREE.Group } | null = null;
  private roadMode = false;
  private editMode = false;
  private editDragging: { instanceId: string; def: BuildingDef; origQ: number; origR: number } | null = null;
  private avatarActivity = 'Стоит у дома';
  private particlePool = ParticlePool.getInstance();
  private css2dRenderer: CSS2DRenderer | null = null;

  // ── START ──────────────────────────────────────────────────
  async start() {
    this.hud = new TopHUD(this.uiContainer);
    this.hud.setDefaultNavigation(this.sceneManager);
    this.setup3D();
    this.setupUI();
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    await this.loadProfile();
  }

  stop() {
    super.stop();
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    // Cleanup CSS2D renderer
    if (this.css2dRenderer) {
      this.css2dRenderer.domElement.remove();
      this.css2dRenderer = null;
    }
    // Remove particle points from scene
    this.particlePool.clear();
  }

  // ── PROFILE ────────────────────────────────────────────────
  private async loadProfile() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.uid = user.uid;
    this.profile = await this.dbService.getPlayerProfile(this.uid);
    if (!this.profile) return;

    this.hud.render(this.profile, 'ФЕРМА');

    // Initialize or migrate hex farm
    if (!this.profile.hexFarm) {
      this.profile.hexFarm = this.generateInitialFarm();
      await this.dbService.updatePlayerStats(this.uid, { hexFarm: this.profile.hexFarm });
    }
    this.farm = this.profile.hexFarm;
    this.renderFarm();
    this.createAvatar();
  }

  // ── GENERATE INITIAL FARM ──────────────────────────────────
  private generateInitialFarm(): HexFarmState {
    const obstacles: Record<string, { type: 'tree' | 'rock' | 'branch'; variant: number }> = {};
    const center: HexCoord = { q: Math.floor(FARM_COLS / 2), r: Math.floor(FARM_ROWS / 2) };

    // Seed RNG based on uid for deterministic layout
    let seed = 0;
    for (let i = 0; i < this.uid.length; i++) seed = ((seed << 5) - seed + this.uid.charCodeAt(i)) | 0;
    const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 2147483647; };

    for (let q = 0; q < FARM_COLS; q++) {
      for (let r = 0; r < FARM_ROWS; r++) {
        const dist = Math.abs(q - center.q) + Math.abs(r - center.r);
        if (dist < 4) continue; // Clear area around center
        const roll = rng();
        if (roll < 0.15) {
          obstacles[hexKey(q, r)] = { type: 'tree', variant: Math.floor(rng() * 11) + 1 };
        } else if (roll < 0.21) {
          obstacles[hexKey(q, r)] = { type: 'rock', variant: Math.floor(rng() * 5) + 1 };
        } else if (roll < 0.26) {
          obstacles[hexKey(q, r)] = { type: 'branch', variant: Math.floor(rng() * 3) + 1 };
        }
      }
    }

    // Place initial house at center
    const buildings: Record<string, FarmBuildingPlacement> = {
      house_0: {
        buildingId: 'house', hexQ: center.q, hexR: center.r,
        level: 1, upgradedAt: Date.now(), visualStage: 1,
      },
    };
    // Clear hexes under house
    const houseFP = buildingFootprint(center.q, center.r, 2, 2);
    houseFP.forEach(h => delete obstacles[hexKey(h.q, h.r)]);

    // Initial roads around house
    const roads: string[] = [];
    for (const h of houseFP) {
      for (const n of hexNeighbors(h.q, h.r)) {
        const nk = hexKey(n.q, n.r);
        if (!obstacles[nk] && !houseFP.some(fp => hexKey(fp.q, fp.r) === nk)) {
          if (!roads.includes(nk)) roads.push(nk);
        }
      }
    }
    // Keep only a ring of roads
    const roadSet = roads.slice(0, 12);

    return {
      buildings,
      roads: roadSet,
      clearedHexes: [],
      obstacles,
    };
  }

  // ── 3D SETUP ───────────────────────────────────────────────
  private setup3D() {
    this.scene.background = new THREE.Color(0x87ceeb);

    // Orthographic isometric camera
    const asp = window.innerWidth / window.innerHeight;
    const d = 12;
    this.camera = new THREE.OrthographicCamera(-d * asp, d * asp, d, -d, 1, 1000);
    this.camera.position.set(14, 14, 14);
    this.camera.lookAt(0, 0, 0);

    // OrbitControls — pan + zoom only, no rotation
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      this.orbitControls = new OrbitControls(this.camera, canvas);
      this.orbitControls.enableRotate = false;
      this.orbitControls.enableDamping = true;
      this.orbitControls.dampingFactor = 0.1;
      this.orbitControls.zoomSpeed = 0.8;
      this.orbitControls.minZoom = 0.3;
      this.orbitControls.maxZoom = 2.5;
      this.orbitControls.enablePan = true;
      this.orbitControls.screenSpacePanning = false;
      // Center on farm center
      const center = hexToWorld(Math.floor(FARM_COLS / 2), Math.floor(FARM_ROWS / 2));
      this.orbitControls.target.set(center.x, 0, center.z);
    }

    // Lighting
    setupGameLighting(this.scene, {
      ambientColor: 0xc8e8ff, ambientIntensity: 0.7,
      sunColor: 0xfff5d6, sunIntensity: 1.0,
      fillColor: 0x8fb8d8, fillIntensity: 0.3,
    });

    // ── Hex Grid (InstancedMesh) ─────────────────────────────
    const hexGeo = this.createHexGeometry(HEX_RADIUS * 0.95);
    const hexMat = new THREE.MeshStandardMaterial({
      flatShading: true, roughness: 0.8, metalness: 0.05,
    });
    this.hexInstances = new THREE.InstancedMesh(hexGeo, hexMat, this.hexCount);
    this.hexColors = new Float32Array(this.hexCount * 3);

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let q = 0; q < FARM_COLS; q++) {
      for (let r = 0; r < FARM_ROWS; r++) {
        const pos = hexToWorld(q, r);
        dummy.position.set(pos.x, 0, pos.z);
        dummy.updateMatrix();
        this.hexInstances.setMatrixAt(idx, dummy.matrix);
        // Default grass color with slight variation
        const isAlt = (q + r) % 3 === 0;
        const col = new THREE.Color(isAlt ? HEX_COLORS.grassAlt : HEX_COLORS.grass);
        this.hexColors[idx * 3] = col.r;
        this.hexColors[idx * 3 + 1] = col.g;
        this.hexColors[idx * 3 + 2] = col.b;
        idx++;
      }
    }
    this.hexInstances.instanceColor = new THREE.InstancedBufferAttribute(this.hexColors, 3);
    this.scene.add(this.hexInstances);

    // Ocean around the farm
    const oceanGeo = new THREE.PlaneGeometry(120, 120);
    const ocean = new THREE.Mesh(oceanGeo, new THREE.MeshStandardMaterial({
      color: 0x1a5276, flatShading: true, transparent: true, opacity: 0.7,
    }));
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.3;
    this.scene.add(ocean);

    // Invisible ground plane for raycasting
    this.groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = 0.01;
    this.scene.add(this.groundPlane);

    // Hover hex indicator
    const hoverGeo = this.createHexGeometry(HEX_RADIUS * 0.93);
    this.hoverHex = new THREE.Mesh(hoverGeo, new THREE.MeshStandardMaterial({
      color: HEX_COLORS.hover, transparent: true, opacity: 0.4, flatShading: true,
    }));
    this.hoverHex.position.y = 0.05;
    this.hoverHex.visible = false;
    this.scene.add(this.hoverHex);

    // Groups
    this.scene.add(this.obstacleGroup);
    this.scene.add(this.buildingGroup);

    // Particle pool
    this.scene.add(this.particlePool.getPoints());

    // CSS2D label renderer
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(window.innerWidth, window.innerHeight);
    this.css2dRenderer.domElement.style.position = 'absolute';
    this.css2dRenderer.domElement.style.top = '0';
    this.css2dRenderer.domElement.style.left = '0';
    this.css2dRenderer.domElement.style.pointerEvents = 'none';
    this.css2dRenderer.domElement.style.zIndex = '5';
    document.body.appendChild(this.css2dRenderer.domElement);
  }

  // ── CREATE HEX GEOMETRY ────────────────────────────────────
  private createHexGeometry(radius: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6; // pointy-top
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    // Rotate to lie flat on XZ plane
    geo.rotateX(-Math.PI / 2);
    return geo;
  }

  // ── RENDER FARM STATE ──────────────────────────────────────
  private renderFarm() {
    if (!this.farm) return;
    this.updateHexColors();
    this.renderObstacles();
    this.renderBuildings();
  }

  // ── UPDATE HEX COLORS ─────────────────────────────────────
  private updateHexColors() {
    if (!this.farm) return;
    const roadSet = new Set(this.farm.roads);
    let idx = 0;
    for (let q = 0; q < FARM_COLS; q++) {
      for (let r = 0; r < FARM_ROWS; r++) {
        const key = hexKey(q, r);
        let col: THREE.Color;
        if (roadSet.has(key)) {
          col = new THREE.Color(HEX_COLORS.road);
        } else if (this.farm.obstacles[key]) {
          const isAlt = (q + r) % 3 === 0;
          col = new THREE.Color(isAlt ? 0x1e8449 : 0x196f3d); // darker grass for obstacles
        } else {
          const isAlt = (q + r) % 3 === 0;
          col = new THREE.Color(isAlt ? HEX_COLORS.grassAlt : HEX_COLORS.grass);
        }
        this.hexColors[idx * 3] = col.r;
        this.hexColors[idx * 3 + 1] = col.g;
        this.hexColors[idx * 3 + 2] = col.b;
        idx++;
      }
    }
    (this.hexInstances.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  // ── RENDER OBSTACLES ───────────────────────────────────────
  private renderObstacles() {
    if (!this.farm) return;
    // Clear old
    this.obstacleGroup.clear();
    this.obstacleMeshes.clear();

    for (const [key, obs] of Object.entries(this.farm.obstacles)) {
      const { q, r } = parseHexKey(key);
      const pos = hexToWorld(q, r);
      let mesh: THREE.Object3D;
      if (obs.type === 'tree') {
        mesh = createTree(0.4 + (obs.variant % 5) * 0.08, obs.variant);
      } else if (obs.type === 'rock') {
        mesh = createRock(0.3 + (obs.variant % 3) * 0.1);
      } else {
        // branches/logs
        mesh = createBranch(0.5 + (obs.variant % 3) * 0.15);
      }
      mesh.position.set(pos.x, 0, pos.z);
      mesh.userData = { hexKey: key, obstacleType: obs.type };
      this.obstacleGroup.add(mesh);
      this.obstacleMeshes.set(key, mesh);
    }
  }

  // ── RENDER BUILDINGS ───────────────────────────────────────
  private renderBuildings() {
    if (!this.farm) return;
    this.buildingGroup.clear();
    this.buildingMeshes.clear();

    for (const [instanceId, bp] of Object.entries(this.farm.buildings)) {
      const def = BUILDING_DEFS.find(d => d.id === bp.buildingId);
      if (!def) continue;

      const group = new THREE.Group();
      const center = this.getBuildingCenter(bp.hexQ, bp.hexR, def.hexW, def.hexH);

      if (def.isPond) {
        this.buildPondMesh(group, def, bp.level);
      } else {
        this.buildBuildingMesh(group, def, bp.level);
      }

      group.position.set(center.x, 0, center.z);
      group.userData = { instanceId, buildingId: bp.buildingId, level: bp.level };

      // CSS2D label (building name + level)
      const labelDiv = document.createElement('div');
      labelDiv.textContent = `${def.name} Ур.${bp.level}`;
      labelDiv.style.cssText = `
        color:white;font-family:'Rajdhani',sans-serif;font-size:11px;
        background:rgba(10,22,40,0.75);padding:2px 6px;border-radius:4px;
        border:1px solid rgba(52,152,219,0.5);white-space:nowrap;
      `;
      const label2d = new CSS2DObject(labelDiv);
      label2d.position.set(0, def.isPond ? 0.6 : 2.2, 0);
      group.add(label2d);

      this.buildingGroup.add(group);
      this.buildingMeshes.set(instanceId, group);

      // Color building footprint hexes
      const fp = buildingFootprint(bp.hexQ, bp.hexR, def.hexW, def.hexH);
      fp.forEach(h => {
        const idx = h.q * FARM_ROWS + h.r;
        if (idx >= 0 && idx < this.hexCount) {
          const col = new THREE.Color(HEX_COLORS.building);
          this.hexColors[idx * 3] = col.r;
          this.hexColors[idx * 3 + 1] = col.g;
          this.hexColors[idx * 3 + 2] = col.b;
        }
      });
    }
    (this.hexInstances.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  private getBuildingCenter(q: number, r: number, w: number, h: number): { x: number; z: number } {
    let sx = 0, sz = 0;
    const fp = buildingFootprint(q, r, w, h);
    for (const hex of fp) {
      const pos = hexToWorld(hex.q, hex.r);
      sx += pos.x;
      sz += pos.z;
    }
    return { x: sx / fp.length, z: sz / fp.length };
  }

  // ── BUILD 3D BUILDING MESH ─────────────────────────────────
  private buildBuildingMesh(group: THREE.Group, def: BuildingDef, level: number) {
    const h = 0.6 + level * 0.5;
    const w = 1.0 + level * 0.15;

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, w),
      matLP(def.baseColor)
    );
    body.position.y = h / 2;
    group.add(body);

    // Roof (pyramid)
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(w * 0.75, h * 0.5, 4),
      matLP(def.roofColor)
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + h * 0.25;
    group.add(roof);

    // Window (L2+)
    if (level >= 2) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xf9e79f })
      );
      win.position.set(0, h * 0.6, w / 2 + 0.01);
      group.add(win);
    }

    // Level stars
    for (let i = 0; i < level; i++) {
      const star = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.12),
        matLP(LP.gold)
      );
      star.position.set(-0.3 + i * 0.2, h + h * 0.5 + 0.2, 0);
      group.add(star);
    }
  }

  // ── BUILD POND MESH ────────────────────────────────────────
  private buildPondMesh(group: THREE.Group, _def: BuildingDef, level: number) {
    const pw = 1.0 + level * 0.5;
    const pd = 0.6 + level * 0.3;

    // Border
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(pw + 0.3, 0.15, pd + 0.3),
      matLP(LP.earth)
    );
    border.position.y = 0.08;
    group.add(border);

    // Water surface with wave animation vertices
    const waterGeo = new THREE.PlaneGeometry(pw, pd, 8, 8);
    waterGeo.computeVertexNormals();
    const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({
      color: LP.water, flatShading: true, transparent: true, opacity: 0.8,
    }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.16;
    water.userData.isWater = true;
    group.add(water);

    // Fish
    const fishCount = Math.min(level * 2, 6);
    const fishColors = [0xff6b6b, 0xf39c12, 0x2ecc71, 0x9b59b6];
    for (let i = 0; i < fishCount; i++) {
      const fish = createFishMesh(fishColors[i % fishColors.length], 0.15);
      fish.position.set(
        (Math.random() - 0.5) * pw * 0.6,
        0.2,
        (Math.random() - 0.5) * pd * 0.4
      );
      fish.userData.fishIndex = i;
      group.add(fish);
    }

    // Rocks around pond
    for (let i = 0; i < 4; i++) {
      const rock = createRock(0.12);
      const angle = (i / 4) * Math.PI * 2;
      rock.position.set(
        Math.cos(angle) * (pw / 2 + 0.15),
        0.08,
        Math.sin(angle) * (pd / 2 + 0.1)
      );
      group.add(rock);
    }
  }

  // ── CREATE AVATAR ──────────────────────────────────────────
  private createAvatar() {
    if (!this.farm) return;
    const group = new THREE.Group();

    // Legs
    const legMat = matLP(0x2c3e50);
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), legMat);
    leftLeg.position.set(-0.08, 0.16, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), legMat);
    rightLeg.position.set(0.08, 0.16, 0);
    group.add(rightLeg);
    this.avatarLegs = [leftLeg, rightLeg];

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.2), matLP(0x3498db));
    body.position.set(0, 0.5, 0);
    group.add(body);

    // Arms
    const armMat = matLP(0x2980b9);
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.1), armMat);
    leftArm.position.set(-0.22, 0.48, 0);
    group.add(leftArm);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.1), armMat);
    rightArm.position.set(0.22, 0.48, 0);
    group.add(rightArm);
    this.avatarArms = [leftArm, rightArm];

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), matLP(0xf5cba7));
    head.position.set(0, 0.82, 0);
    group.add(head);

    // Hat
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 6), matLP(0x8b4513));
    hatBrim.position.set(0, 0.96, 0);
    group.add(hatBrim);
    const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 6), matLP(0xa0522d));
    hatTop.position.set(0, 1.04, 0);
    group.add(hatTop);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const lEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), eyeMat);
    lEye.position.set(-0.06, 0.85, 0.13);
    group.add(lEye);
    const rEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), eyeMat);
    rEye.position.set(0.06, 0.85, 0.13);
    group.add(rEye);

    // Place at house
    const house = Object.values(this.farm.buildings).find(b => b.buildingId === 'house');
    if (house) {
      const pos = hexToWorld(house.hexQ, house.hexR);
      group.position.set(pos.x, 0, pos.z);
    }

    group.userData.isAvatar = true;
    this.scene.add(group);
    this.avatarGroup = group;
  }

  // ── UI SETUP ───────────────────────────────────────────────
  private setupUI() {
    // Back button (compact, top-right area)
    const backBtn = document.createElement('button');
    backBtn.innerText = '←';
    backBtn.style.cssText = `
      position:absolute; top:60px; right:14px;
      font-family:'Press Start 2P',monospace; font-size:12px;
      color:#ecf0f1; background:rgba(10,22,40,0.85);
      border:1px solid rgba(52,152,219,0.4); padding:6px 10px;
      cursor:pointer; z-index:110; pointer-events:auto;
      clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
    `;
    backBtn.addEventListener('click', () => {
      this.sceneManager.startScene('BiomeView', { biomeId: this.profile?.currentBiomeId ?? 'rio_salado' });
    });
    this.uiContainer.appendChild(backBtn);

    // Road mode button
    const roadBtn = document.createElement('button');
    roadBtn.innerText = '🛤 Дорога';
    roadBtn.style.cssText = `
      position:absolute; bottom:70px; left:14px;
      font-family:'Rajdhani',monospace; font-size:13px; font-weight:600;
      color:#ecf0f1; background:rgba(212,172,13,0.85);
      border:1px solid rgba(212,172,13,0.6); padding:8px 14px;
      cursor:pointer; z-index:110; pointer-events:auto; border-radius:4px;
    `;
    roadBtn.addEventListener('click', () => {
      this.roadMode = !this.roadMode;
      roadBtn.style.background = this.roadMode ? 'rgba(39,174,96,0.9)' : 'rgba(212,172,13,0.85)';
      roadBtn.innerText = this.roadMode ? '✅ Дорога ВКЛ' : '🛤 Дорога';
    });
    this.uiContainer.appendChild(roadBtn);

    // Build button
    const buildBtn = document.createElement('button');
    buildBtn.innerText = '🏗 Строить';
    buildBtn.style.cssText = `
      position:absolute; bottom:70px; left:130px;
      font-family:'Rajdhani',monospace; font-size:13px; font-weight:600;
      color:#ecf0f1; background:rgba(52,152,219,0.85);
      border:1px solid rgba(52,152,219,0.6); padding:8px 14px;
      cursor:pointer; z-index:110; pointer-events:auto; border-radius:4px;
    `;
    buildBtn.addEventListener('click', () => this.showBuildMenu());
    this.uiContainer.appendChild(buildBtn);

    // Edit mode button
    const editBtn = document.createElement('button');
    editBtn.innerText = '✏ Редактировать';
    editBtn.style.cssText = `
      position:absolute; bottom:70px; left:260px;
      font-family:'Rajdhani',monospace; font-size:13px; font-weight:600;
      color:#ecf0f1; background:rgba(155,89,182,0.85);
      border:1px solid rgba(155,89,182,0.6); padding:8px 14px;
      cursor:pointer; z-index:110; pointer-events:auto; border-radius:4px;
    `;
    editBtn.addEventListener('click', () => {
      if (!this.editMode) {
        this.enterEditMode();
        editBtn.innerText = '💾 Сохранить';
        editBtn.style.background = 'rgba(39,174,96,0.9)';
        // Show cancel button
        cancelEditBtn.style.display = 'block';
      } else {
        this.exitEditMode(true);
        editBtn.innerText = '✏ Редактировать';
        editBtn.style.background = 'rgba(155,89,182,0.85)';
        cancelEditBtn.style.display = 'none';
      }
    });
    this.uiContainer.appendChild(editBtn);

    // Cancel edit button
    const cancelEditBtn = document.createElement('button');
    cancelEditBtn.innerText = '✖ Отмена';
    cancelEditBtn.style.cssText = `
      position:absolute; bottom:70px; left:405px; display:none;
      font-family:'Rajdhani',monospace; font-size:13px; font-weight:600;
      color:#ecf0f1; background:rgba(231,76,60,0.85);
      border:1px solid rgba(231,76,60,0.6); padding:8px 14px;
      cursor:pointer; z-index:110; pointer-events:auto; border-radius:4px;
    `;
    cancelEditBtn.addEventListener('click', () => {
      this.exitEditMode(false);
      editBtn.innerText = '✏ Редактировать';
      editBtn.style.background = 'rgba(155,89,182,0.85)';
      cancelEditBtn.style.display = 'none';
    });
    this.uiContainer.appendChild(cancelEditBtn);

    // Hint
    const hint = document.createElement('div');
    hint.style.cssText = `
      position:absolute; bottom:24px; width:100%; text-align:center;
      font-family:'Rajdhani',monospace; font-size:13px; font-weight:600;
      color:rgba(149,165,166,0.4); pointer-events:none; letter-spacing:1px;
    `;
    hint.innerText = 'Кликни hex для действия • Колёсико = зум • Перетаскивание = обзор';
    this.uiContainer.appendChild(hint);
  }

  // ── BUILD MENU POPUP ───────────────────────────────────────
  private showBuildMenu() {
    if (!this.profile || !this.farm) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999;
      display:flex; align-items:center; justify-content:center;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:linear-gradient(135deg,#0a1628,#1a2a45); border:1px solid rgba(52,152,219,0.3);
      padding:20px; max-width:400px; width:90%; border-radius:8px; color:#ecf0f1;
      font-family:'Rajdhani',monospace;
    `;
    panel.innerHTML = `<h3 style="font-family:'Press Start 2P',monospace;font-size:12px;margin:0 0 16px;color:#3498db;">СТРОИТЕЛЬСТВО</h3>`;

    const existingIds = new Set(Object.values(this.farm.buildings).map(b => b.buildingId));

    for (const def of BUILDING_DEFS) {
      if (existingIds.has(def.id)) continue; // Already built
      const canAfford = (this.profile?.softCoins ?? 0) >= def.buildCost;
      const card = document.createElement('div');
      card.style.cssText = `
        display:flex; justify-content:space-between; align-items:center;
        padding:10px; margin:6px 0; background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.1); border-radius:4px; cursor:${canAfford ? 'pointer' : 'not-allowed'};
        opacity:${canAfford ? '1' : '0.5'};
      `;
      card.innerHTML = `
        <div><strong>${def.name}</strong><br><span style="font-size:11px;color:#7f8c8d">${def.desc}</span></div>
        <div style="text-align:right;font-size:14px;font-weight:700;color:${canAfford ? '#f39c12' : '#e74c3c'}">
          ${def.buildCost > 0 ? '💰 ' + def.buildCost : 'Бесплатно'}
        </div>
      `;
      if (canAfford) {
        card.addEventListener('click', () => {
          document.body.removeChild(overlay);
          this.enterPlacementMode(def);
        });
      }
      panel.appendChild(card);
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✖ ЗАКРЫТЬ';
    closeBtn.style.cssText = `
      margin-top:12px; width:100%; padding:10px; font-family:'Press Start 2P',monospace;
      font-size:10px; color:#ecf0f1; background:rgba(231,76,60,0.8);
      border:none; cursor:pointer; border-radius:4px;
    `;
    closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
  }

  // ── PLACEMENT MODE ─────────────────────────────────────────
  private enterPlacementMode(def: BuildingDef) {
    const ghost = new THREE.Group();
    if (def.isPond) {
      this.buildPondMesh(ghost, def, 1);
    } else {
      this.buildBuildingMesh(ghost, def, 1);
    }
    // Make semi-transparent
    ghost.traverse(c => {
      if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
        c.material = c.material.clone();
        c.material.transparent = true;
        c.material.opacity = 0.5;
      }
    });
    ghost.position.y = 0.1;
    this.scene.add(ghost);
    this.placementMode = { buildingDef: def, ghostGroup: ghost };
    this.hud.showToast('Выбери место на карте', 'info', 3000);
  }

  // ── POINTER HANDLERS ───────────────────────────────────────
  private onPointerMove = (e: PointerEvent) => {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.groundPlane);
    if (hits.length === 0) {
      if (this.hoverHex) this.hoverHex.visible = false;
      return;
    }
    const pt = hits[0].point;
    const hex = worldToHex(pt.x, pt.z);
    if (hex.q < 0 || hex.q >= FARM_COLS || hex.r < 0 || hex.r >= FARM_ROWS) {
      if (this.hoverHex) this.hoverHex.visible = false;
      return;
    }
    const wpos = hexToWorld(hex.q, hex.r);

    // Update hover indicator
    if (this.hoverHex) {
      this.hoverHex.position.set(wpos.x, 0.05, wpos.z);
      this.hoverHex.visible = true;
    }

    // Update ghost building position in placement mode
    if (this.placementMode && this.farm) {
      const def = this.placementMode.buildingDef;
      const center = this.getBuildingCenter(hex.q, hex.r, def.hexW, def.hexH);
      this.placementMode.ghostGroup.position.set(center.x, 0.1, center.z);

      const valid = isValidPlacement(this.farm, def.hexW, def.hexH, hex.q, hex.r);
      const color = valid ? 0x27ae60 : 0xe74c3c;
      this.placementMode.ghostGroup.traverse(c => {
        if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
          c.material.color.setHex(color);
        }
      });
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.target !== document.getElementById('game-canvas')) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.groundPlane);
    if (hits.length === 0) return;

    const pt = hits[0].point;
    const hex = worldToHex(pt.x, pt.z);
    if (hex.q < 0 || hex.q >= FARM_COLS || hex.r < 0 || hex.r >= FARM_ROWS) return;
    const key = hexKey(hex.q, hex.r);

    // ── Placement mode: place building ──
    if (this.placementMode && this.farm && this.profile) {
      const def = this.placementMode.buildingDef;
      if (isValidPlacement(this.farm, def.hexW, def.hexH, hex.q, hex.r)) {
        // Deduct cost
        if (def.buildCost > 0) {
          this.profile.softCoins -= def.buildCost;
        }
        // Create building
        const instanceId = `${def.id}_${Date.now()}`;
        this.farm.buildings[instanceId] = {
          buildingId: def.id, hexQ: hex.q, hexR: hex.r,
          level: 1, upgradedAt: Date.now(), visualStage: 1,
        };
        // Clear obstacles under footprint
        const fp = buildingFootprint(hex.q, hex.r, def.hexW, def.hexH);
        fp.forEach(h => delete this.farm!.obstacles[hexKey(h.q, h.r)]);
        // Save
        this.dbService.updatePlayerStats(this.uid, {
          softCoins: this.profile.softCoins, hexFarm: this.farm,
        });
        // Exit placement mode
        this.scene.remove(this.placementMode.ghostGroup);
        this.placementMode = null;
        this.renderFarm();
        this.hud.render(this.profile, 'ФЕРМА');
        this.hud.showToast(`${def.name} построен!`, 'success');
      }
      return;
    }

    // ── Edit mode: pick building to drag ──
    if (this.editMode && this.farm && !this.editDragging) {
      for (const [instanceId, bp] of Object.entries(this.farm.buildings)) {
        const def = BUILDING_DEFS.find(d => d.id === bp.buildingId);
        if (!def) continue;
        const fp = buildingFootprint(bp.hexQ, bp.hexR, def.hexW, def.hexH);
        if (fp.some(h => hexKey(h.q, h.r) === key)) {
          this.editDragging = { instanceId, def, origQ: bp.hexQ, origR: bp.hexR };
          this.hud.showToast(`Перемещаем ${def.name}. Кликни новое место.`, 'info', 3000);
          return;
        }
      }
      return;
    }
    // ── Edit mode: place dragged building ──
    if (this.editMode && this.editDragging && this.farm) {
      const bp = this.farm.buildings[this.editDragging.instanceId];
      const def = this.editDragging.def;
      if (bp && isValidPlacement(this.farm, def.hexW, def.hexH, hex.q, hex.r, this.editDragging.instanceId)) {
        bp.hexQ = hex.q;
        bp.hexR = hex.r;
        this.editDragging = null;
        this.renderFarm();
        this.hud.showToast(`${def.name} перемещён!`, 'success');
      } else {
        this.hud.showToast('Нельзя поставить сюда!', 'error');
      }
      return;
    }

    // ── Road mode: build road ──
    if (this.roadMode && this.farm && this.profile) {
      if (!this.farm.obstacles[key] && !this.farm.roads.includes(key)) {
        // Check not occupied by building
        const isBuildingHex = Object.values(this.farm.buildings).some(b => {
          const def = BUILDING_DEFS.find(d => d.id === b.buildingId);
          if (!def) return false;
          return buildingFootprint(b.hexQ, b.hexR, def.hexW, def.hexH)
            .some(h => hexKey(h.q, h.r) === key);
        });
        if (!isBuildingHex) {
          this.farm.roads.push(key);
          this.updateHexColors();
          this.dbService.updatePlayerStats(this.uid, { hexFarm: this.farm });
        }
      }
      return;
    }

    // ── Click on avatar → show stats ──
    if (this.avatarGroup && !this.editMode) {
      const avatarHits = this.raycaster.intersectObject(this.avatarGroup, true);
      if (avatarHits.length > 0) {
        this.showAvatarStats();
        return;
      }
    }

    // ── Click on obstacle → clear it ──
    if (this.farm?.obstacles[key]) {
      this.startClearing(hex, key);
      return;
    }

    // ── Click on building → navigate avatar + show info ──
    for (const [instanceId, bp] of Object.entries(this.farm?.buildings ?? {})) {
      const def = BUILDING_DEFS.find(d => d.id === bp.buildingId);
      if (!def) continue;
      const fp = buildingFootprint(bp.hexQ, bp.hexR, def.hexW, def.hexH);
      if (fp.some(h => hexKey(h.q, h.r) === key)) {
        // Navigate avatar to building via roads
        const bldNeighbors = fp.flatMap(h => hexNeighbors(h.q, h.r));
        const roadNear = bldNeighbors.find(n => this.farm!.roads.includes(hexKey(n.q, n.r)));
        if (roadNear) {
          this.navigateAvatarTo(roadNear);
          this.avatarActivity = `Идёт к ${def.name}`;
        }
        this.showBuildingInfo(instanceId, bp, def);
        return;
      }
    }

    // ── Click on empty road/cleared hex → walk avatar there ──
    if (this.farm?.roads.includes(key)) {
      this.navigateAvatarTo(hex);
      this.avatarActivity = 'Гуляет';
    }
  };

  // ── CLEARING ───────────────────────────────────────────────
  private startClearing(hex: HexCoord, key: string) {
    if (!this.farm || !this.profile) return;
    const obs = this.farm.obstacles[key];
    if (!obs) return;

    // Check if road is adjacent
    const neighbors = hexNeighbors(hex.q, hex.r);
    const hasRoadNearby = neighbors.some(n => this.farm!.roads.includes(hexKey(n.q, n.r)));
    if (!hasRoadNearby) {
      this.hud.showToast('Постройте дорогу рядом!', 'error', 2500);
      return;
    }

    // Set clearing job
    this.farm.clearingJob = {
      hexKey: key, type: obs.type,
      startedAt: Date.now(), durationMs: 30000,
    };
    this.dbService.updatePlayerStats(this.uid, { hexFarm: this.farm });
    this.hud.showToast(`Расчистка ${obs.type === 'tree' ? 'дерева' : obs.type === 'rock' ? 'камня' : 'ветки'}... 30 сек`, 'info', 3000);

    // CSS2D timer label on obstacle
    const obsMesh = this.obstacleMeshes.get(key);
    if (obsMesh) {
      const timerDiv = document.createElement('div');
      timerDiv.id = 'clear-timer';
      timerDiv.style.cssText = `
        color:#f39c12;font-family:'Press Start 2P',monospace;font-size:9px;
        background:rgba(0,0,0,0.8);padding:3px 8px;border-radius:4px;
        border:1px solid #f39c12;
      `;
      timerDiv.textContent = '30с';
      const timer2d = new CSS2DObject(timerDiv);
      timer2d.position.set(0, 1.5, 0);
      timer2d.name = 'clearTimer';
      obsMesh.add(timer2d);
    }

    // Move avatar to adjacent road via A* path
    if (this.avatarGroup) {
      const roadNeighbor = neighbors.find(n => this.farm!.roads.includes(hexKey(n.q, n.r)));
      if (roadNeighbor) {
        this.navigateAvatarTo(roadNeighbor);
      }
    }
  }

  /** Navigate avatar to target hex using A* pathfinding */
  private navigateAvatarTo(target: HexCoord) {
    if (!this.farm || !this.avatarGroup) return;
    const currentPos = this.avatarGroup.position;
    const from = worldToHex(currentPos.x, currentPos.z);
    const path = findPath(this.farm, from, target);
    if (path && path.length > 0) {
      this.avatarPath = path;
      this.avatarPathIndex = 0;
      this.avatarTarget = target;
    } else {
      // Fallback: direct movement
      this.avatarPath = [target];
      this.avatarPathIndex = 0;
      this.avatarTarget = target;
    }
  }

  // ── BUILDING INFO POPUP ────────────────────────────────────
  private showBuildingInfo(instanceId: string, bp: FarmBuildingPlacement, def: BuildingDef) {
    if (!this.profile || !this.farm) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999;
      display:flex; align-items:center; justify-content:center;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:linear-gradient(135deg,#0a1628,#1a2a45); border:1px solid rgba(52,152,219,0.3);
      padding:20px; max-width:350px; width:90%; border-radius:8px; color:#ecf0f1;
      font-family:'Rajdhani',monospace;
    `;

    const nextLevel = bp.level + 1;
    const canUpgrade = bp.level < def.maxLevel;
    const upgradeCost = canUpgrade ? def.upgradeCost[bp.level - 1] : 0;
    const canAfford = (this.profile.softCoins ?? 0) >= upgradeCost;

    panel.innerHTML = `
      <h3 style="font-family:'Press Start 2P',monospace;font-size:11px;margin:0 0 12px;color:#3498db;">
        ${def.name} — Ур.${bp.level}
      </h3>
      <p style="margin:0 0 8px;font-size:13px;color:#95a5a6;">${def.desc}</p>
      <p style="margin:0 0 4px;font-size:14px;">Бонус: <span style="color:#f39c12">${def.bonuses[bp.level - 1] ?? '—'}</span></p>
      ${canUpgrade ? `
        <p style="margin:8px 0 4px;font-size:13px;">Следующий: <span style="color:#2ecc71">${def.bonuses[nextLevel - 1] ?? ''}</span></p>
        <p style="font-size:14px;font-weight:700;color:${canAfford ? '#f39c12' : '#e74c3c'};">Стоимость: 💰 ${upgradeCost}</p>
      ` : '<p style="color:#f39c12;font-weight:700;">МАКС УРОВЕНЬ</p>'}
    `;

    if (canUpgrade && canAfford) {
      const upgradeBtn = document.createElement('button');
      upgradeBtn.innerText = '⬆ УЛУЧШИТЬ';
      upgradeBtn.style.cssText = `
        width:100%; padding:10px; margin-top:10px; font-family:'Press Start 2P',monospace;
        font-size:10px; color:#ecf0f1; background:rgba(39,174,96,0.8);
        border:none; cursor:pointer; border-radius:4px;
      `;
      upgradeBtn.addEventListener('click', () => {
        this.profile!.softCoins -= upgradeCost;
        bp.level = nextLevel;
        bp.upgradedAt = Date.now();
        bp.visualStage = nextLevel;
        // Pond grows on upgrade
        if (def.isPond) {
          const sizeMap: Record<number, [number, number]> = { 1: [2, 1], 2: [2, 2], 3: [3, 2], 4: [3, 3] };
          const [nw, nh] = sizeMap[nextLevel] ?? [2, 1];
          // Note: footprint changes could be handled here in future
          void nw; void nh;
        }
        this.dbService.updatePlayerStats(this.uid, {
          softCoins: this.profile!.softCoins, hexFarm: this.farm ?? undefined,
        });
        document.body.removeChild(overlay);
        this.renderFarm();
        this.hud.render(this.profile, 'ФЕРМА');
        this.hud.showToast(`${def.name} улучшен до Ур.${nextLevel}!`, 'success');
      });
      panel.appendChild(upgradeBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✖ ЗАКРЫТЬ';
    closeBtn.style.cssText = `
      width:100%; padding:10px; margin-top:6px; font-family:'Press Start 2P',monospace;
      font-size:10px; color:#ecf0f1; background:rgba(231,76,60,0.7);
      border:none; cursor:pointer; border-radius:4px;
    `;
    closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
  }

  // ── AVATAR STATS POPUP ──────────────────────────────────────
  private showAvatarStats() {
    if (!this.profile) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999;
      display:flex; align-items:center; justify-content:center;
    `;
    const panel = document.createElement('div');
    panel.style.cssText = `
      background:linear-gradient(135deg,#0a1628,#1a2a45); border:1px solid rgba(52,152,219,0.3);
      padding:20px; max-width:320px; width:90%; border-radius:8px; color:#ecf0f1;
      font-family:'Rajdhani',monospace;
    `;

    // Activity
    let activity = this.avatarActivity;
    if (this.farm?.clearingJob) {
      const elapsed = Math.floor((Date.now() - this.farm.clearingJob.startedAt) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      activity = `Расчищает ${this.farm.clearingJob.type === 'tree' ? 'дерево' : 'камень'} (${remaining}с)`;
    } else if (this.avatarPath.length > 0) {
      activity = 'Идёт по дороге';
    }

    panel.innerHTML = `
      <h3 style="font-family:'Press Start 2P',monospace;font-size:11px;margin:0 0 12px;color:#3498db;">
        👤 АВАТАР
      </h3>
      <p style="margin:4px 0;font-size:14px;">Имя: <span style="color:#f39c12">${this.profile.displayName}</span></p>
      <p style="margin:4px 0;font-size:14px;">Уровень: <span style="color:#2ecc71">${this.profile.villageLevel ?? 1}</span></p>
      <p style="margin:4px 0;font-size:14px;">Занятие: <span style="color:#e67e22">${activity}</span></p>
      <hr style="border-color:rgba(52,152,219,0.2);margin:10px 0;">
      <p style="margin:4px 0;font-size:13px;">🎣 Всего поймано: <span style="color:#3498db">${this.profile.totalFishCaught}</span></p>
      <p style="margin:4px 0;font-size:13px;">💰 Заработано: <span style="color:#f39c12">${this.profile.totalRevenue}</span></p>
      <p style="margin:4px 0;font-size:13px;">🏠 Зданий: <span style="color:#2ecc71">${Object.keys(this.farm?.buildings ?? {}).length}</span></p>
      <p style="margin:4px 0;font-size:13px;">🪵 Дерево: <span style="color:#a0522d">${this.profile.resources?.wood ?? 0}</span></p>
      <p style="margin:4px 0;font-size:13px;">🪨 Камень: <span style="color:#7f8c8d">${this.profile.resources?.stone ?? 0}</span></p>
    `;
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✖ ЗАКРЫТЬ';
    closeBtn.style.cssText = `
      width:100%; padding:10px; margin-top:10px; font-family:'Press Start 2P',monospace;
      font-size:10px; color:#ecf0f1; background:rgba(231,76,60,0.7);
      border:none; cursor:pointer; border-radius:4px;
    `;
    closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
    panel.appendChild(closeBtn);
    overlay.appendChild(panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
  }

  // ── EDIT MODE (Clash of Clans drag buildings) ──────────────
  private enterEditMode() {
    this.editMode = true;
    this.roadMode = false;
    this.placementMode = null;
    // Highlight all buildings blue
    this.buildingMeshes.forEach(g => {
      g.traverse(c => {
        if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
          c.material = c.material.clone();
          c.material.emissive.setHex(0x3498db);
          c.material.emissiveIntensity = 0.3;
        }
      });
    });
    this.hud.showToast('Режим редактирования: перетащи здание', 'info', 3000);
  }

  private exitEditMode(save: boolean) {
    if (save && this.farm) {
      this.dbService.updatePlayerStats(this.uid, { hexFarm: this.farm });
      this.hud.showToast('Изменения сохранены!', 'success');
    } else if (!save && this.editDragging && this.farm) {
      // Restore original position
      const bp = this.farm.buildings[this.editDragging.instanceId];
      if (bp) {
        bp.hexQ = this.editDragging.origQ;
        bp.hexR = this.editDragging.origR;
      }
    }
    this.editMode = false;
    this.editDragging = null;
    this.renderFarm();
  }

  // ── UPDATE LOOP ────────────────────────────────────────────
  update(delta: number) {
    const time = Date.now() * 0.001;
    if (this.orbitControls) this.orbitControls.update();
    TWEEN.update();
    this.particlePool.update(delta);

    // Frustum + distance culling for obstacles and buildings
    if (this.orbitControls) {
      const camTarget = this.orbitControls.target;
      const cullDist = 35;
      const frustum = new THREE.Frustum();
      const projScreenMatrix = new THREE.Matrix4();
      projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);
      const tmpSphere = new THREE.Sphere();

      this.obstacleGroup.children.forEach(c => {
        const dx = c.position.x - camTarget.x;
        const dz = c.position.z - camTarget.z;
        if ((dx * dx + dz * dz) > cullDist * cullDist) {
          c.visible = false;
        } else {
          // Frustum check with bounding sphere
          tmpSphere.center.copy(c.position);
          tmpSphere.radius = 2.0; // conservative radius for trees/rocks/buildings
          c.visible = frustum.intersectsSphere(tmpSphere);
        }
      });
    }

    // Avatar movement along A* path
    if (this.avatarGroup && this.avatarPath.length > 0 && this.farm) {
      const waypoint = this.avatarPath[this.avatarPathIndex];
      if (waypoint) {
        const targetPos = hexToWorld(waypoint.q, waypoint.r);
        const dx = targetPos.x - this.avatarGroup.position.x;
        const dz = targetPos.z - this.avatarGroup.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.1) {
          const speed = 2.5 * delta;
          this.avatarGroup.position.x += (dx / dist) * speed;
          this.avatarGroup.position.z += (dz / dist) * speed;
          this.avatarGroup.rotation.y = Math.atan2(dx, dz);

          // Leg/arm swing
          const swing = Math.sin(time * 8) * 0.35;
          if (this.avatarLegs.length >= 2) {
            this.avatarLegs[0].rotation.x = swing;
            this.avatarLegs[1].rotation.x = -swing;
          }
          if (this.avatarArms.length >= 2) {
            this.avatarArms[0].rotation.x = -swing;
            this.avatarArms[1].rotation.x = swing;
          }
        } else {
          // Reached waypoint, move to next
          this.avatarPathIndex++;
          if (this.avatarPathIndex >= this.avatarPath.length) {
            this.avatarPath = [];
            this.avatarPathIndex = 0;
            this.avatarTarget = null;
            // Reset pose
            this.avatarLegs.forEach(l => l.rotation.x = 0);
            this.avatarArms.forEach(a => a.rotation.x = 0);
          }
        }
      }
    }

    // Update clearing timer CSS2D label
    if (this.farm?.clearingJob) {
      const job = this.farm.clearingJob;
      const elapsed = Date.now() - job.startedAt;
      const remaining = Math.max(0, Math.ceil((job.durationMs - elapsed) / 1000));
      const obsMesh = this.obstacleMeshes.get(job.hexKey);
      const timerObj = obsMesh?.getObjectByName('clearTimer');
      if (timerObj && timerObj instanceof CSS2DObject) {
        timerObj.element.textContent = `${remaining}с`;
      }
      if (elapsed >= job.durationMs) {
        // Complete clearing
        const obs = this.farm.obstacles[job.hexKey];
        if (obs) {
          const reward = obs.type === 'tree'
            ? { wood: 5 + Math.floor(Math.random() * 11) }
            : obs.type === 'rock'
            ? { stone: 3 + Math.floor(Math.random() * 8) }
            : { wood: 2 + Math.floor(Math.random() * 5) }; // branch
          // Particle effect at cleared position
          const clearedCoord = parseHexKey(job.hexKey);
          const clearedPos = hexToWorld(clearedCoord.q, clearedCoord.r);
          const pPos = new THREE.Vector3(clearedPos.x, 0.5, clearedPos.z);
          if (obs.type === 'tree') {
            this.particlePool.emitLeaves(pPos, 12);
          } else {
            this.particlePool.emitSmoke(pPos, 10);
          }
          this.particlePool.emitCoins(pPos, 5);

          delete this.farm.obstacles[job.hexKey];
          this.farm.clearedHexes.push(job.hexKey);
          delete this.farm.clearingJob;
          // Add resources to profile
          if (this.profile) {
            for (const [resId, qty] of Object.entries(reward)) {
              this.profile.resources[resId] = (this.profile.resources[resId] ?? 0) + qty;
            }
            this.dbService.updatePlayerStats(this.uid, {
              hexFarm: this.farm, resources: this.profile.resources,
            });
            const resStr = Object.entries(reward).map(([k, v]) => `+${v} ${k}`).join(', ');
            this.hud.showToast(`Расчищено! ${resStr}`, 'success');
          }
          this.renderFarm();
        }
      }
    }

    // Animate pond water waves + fish
    this.buildingGroup.children.forEach(bg => {
      if (!bg.userData.buildingId) return;
      bg.children.forEach(c => {
        // Animated water waves
        if (c.userData.isWater && c instanceof THREE.Mesh) {
          const wPos = c.geometry.attributes.position;
          for (let i = 0; i < wPos.count; i++) {
            const ox = wPos.getX(i);
            const oy = wPos.getY(i);
            wPos.setZ(i, Math.sin(ox * 3 + time * 2) * 0.02 + Math.cos(oy * 4 + time * 1.5) * 0.015);
          }
          wPos.needsUpdate = true;
          c.geometry.computeVertexNormals();
        }
        // Fish movement
        if (c.userData.fishIndex !== undefined) {
          const fi = c.userData.fishIndex as number;
          c.position.x = Math.sin(time * 0.8 + fi * 2.1) * 0.3;
          c.position.z = Math.cos(time * 0.6 + fi * 1.7) * 0.2;
          c.rotation.y = Math.atan2(
            Math.cos(time * 0.8 + fi * 2.1) * 0.8,
            -Math.sin(time * 0.6 + fi * 1.7) * 0.6
          );
        }
      });
    });

    // CSS2D renderer update
    if (this.css2dRenderer) {
      this.css2dRenderer.render(this.scene, this.camera);
    }

    // Animate obstacles — gentle sway for trees
    this.obstacleGroup.children.forEach(obj => {
      if (obj.userData.obstacleType === 'tree') {
        // Subtle wind sway
        const hash = (obj.position.x * 7 + obj.position.z * 13) | 0;
        obj.rotation.z = Math.sin(time * 0.8 + hash) * 0.03;
        obj.rotation.x = Math.cos(time * 0.6 + hash * 0.7) * 0.02;
      }
    });
  }
}
