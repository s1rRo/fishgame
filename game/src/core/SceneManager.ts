import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BaseScene, ISceneManager } from './BaseScene';

export class SceneManager implements ISceneManager {
  private renderer!: THREE.WebGLRenderer;
  private currentScene: BaseScene | null = null;
  private scenes: Map<string, new (manager: ISceneManager) => BaseScene> = new Map();
  private clock: THREE.Clock;
  private resizeHandler = () => this.onWindowResize();

  constructor() {
    this.clock = new THREE.Clock();
    this.initRenderer();
  }

  private initRenderer() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error("Canvas #game-canvas not found! Waiting...");
      setTimeout(() => this.initRenderer(), 100);
      return;
    }

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    window.addEventListener('resize', this.resizeHandler);
    this.animate();
    console.log("SceneManager: Renderer initialized.");
  }

  public registerScene(name: string, sceneClass: new (manager: ISceneManager) => BaseScene) {
    this.scenes.set(name, sceneClass);
    console.log(`SceneManager: Registered scene '${name}'`);
  }

  public startScene(name: string, data?: any) {
    console.log(`SceneManager: Attempting to start scene '${name}'`);
    const SceneClass = this.scenes.get(name);
    if (!SceneClass) {
      console.error(`SceneManager: Scene '${name}' not found in registry!`);
      return;
    }

    if (this.currentScene) {
      this.currentScene.stop();
    }

    try {
      const nextScene = new SceneClass(this);
      this.currentScene = nextScene;
      nextScene.start(data);
      console.log(`SceneManager: Scene '${name}' started successfully.`);
    } catch (error) {
      console.error(`SceneManager: Failed to start scene '${name}':`, error);
      this.currentScene = null;
      this.showSceneError(name);
    }
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    TWEEN.update();

    if (this.currentScene && this.renderer) {
      this.currentScene.update(delta);
      this.renderer.render(this.currentScene.scene, this.currentScene.camera);
    }
  }

  private onWindowResize() {
    if (!this.renderer) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.currentScene) {
      const camera = this.currentScene.camera;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      } else if (camera instanceof THREE.OrthographicCamera) {
        const aspect = window.innerWidth / window.innerHeight;
        const height = camera.top - camera.bottom;
        const width = height * aspect;
        camera.left = -width / 2;
        camera.right = width / 2;
        camera.updateProjectionMatrix();
      }
    }
  }

  private showSceneError(sceneName: string): void {
    const ui = document.getElementById('ui-layer');
    if (!ui) return;
    ui.innerHTML = `
      <div style="
        position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        pointer-events:auto;background:rgba(10,22,40,0.86);color:#ecf0f1;
        font-family:'Rajdhani',monospace;text-align:center;padding:24px;
      ">
        <div style="max-width:420px;border:2px solid rgba(231,76,60,0.6);padding:24px;background:#0f1e30;">
          <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:#e74c3c;margin-bottom:12px;">ОШИБКА СЦЕНЫ</div>
          <div style="font-size:18px;margin-bottom:16px;">${sceneName}</div>
          <button id="scene-error-boot" style="padding:10px 18px;background:#3498db;color:#fff;border:0;cursor:pointer;font-family:'Rajdhani',monospace;">НА СТАРТ</button>
        </div>
      </div>
    `;
    ui.querySelector('#scene-error-boot')?.addEventListener('click', () => this.startScene('BootScene'));
  }
}
