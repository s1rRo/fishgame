import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BaseScene, ISceneManager } from './BaseScene';

export class SceneManager implements ISceneManager {
  private renderer!: THREE.WebGLRenderer;
  private currentScene: BaseScene | null = null;
  private scenes: Map<string, any> = new Map();
  private clock: THREE.Clock;

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

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.animate();
    console.log("SceneManager: Renderer initialized.");
  }

  public registerScene(name: string, sceneClass: any) {
    this.scenes.set(name, sceneClass);
    console.log(`SceneManager: Registered scene '${name}'`);
  }

  public startScene(name: string, data?: any) {
    console.log(`SceneManager: Attempting to start scene '${name}'`);
    if (this.currentScene) {
      this.currentScene.stop();
    }

    const SceneClass = this.scenes.get(name);
    if (!SceneClass) {
      console.error(`SceneManager: Scene '${name}' not found in registry!`);
      return;
    }

    try {
      this.currentScene = new SceneClass(this);
      this.currentScene!.start(data);
      console.log(`SceneManager: Scene '${name}' started successfully.`);
    } catch (error) {
      console.error(`SceneManager: Failed to start scene '${name}':`, error);
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
      }
    }
  }
}
