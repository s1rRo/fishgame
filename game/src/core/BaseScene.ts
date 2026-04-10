import * as THREE from 'three';

// Используем интерфейс для предотвращения циклической зависимости
export interface ISceneManager {
  startScene(name: string, data?: any): void;
}

export abstract class BaseScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  protected sceneManager: ISceneManager;
  protected uiContainer: HTMLElement;

  constructor(manager: ISceneManager) {
    this.sceneManager = manager;
    this.scene = new THREE.Scene();
    
    // Инициализируем камеру по умолчанию (будет переопределена в сценах если нужно)
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const ui = document.getElementById('ui-layer');
    if (!ui) throw new Error("UI Layer not found");
    this.uiContainer = ui;
  }

  public abstract start(data?: any): void;
  public abstract update(deltaTime: number): void;

  public stop(): void {
    this.uiContainer.innerHTML = '';
    this.scene.clear();
  }

  protected createHTMLButton(text: string, x: string, y: string, onClick: () => void, className: string = 'pixel-btn') {
    const btn = document.createElement('button');
    btn.className = className;
    btn.innerText = text;
    btn.style.position = 'absolute';
    btn.style.left = x;
    btn.style.top = y;
    btn.onclick = onClick;
    this.uiContainer.appendChild(btn);
    return btn;
  }
}
