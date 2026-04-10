// ============================================================
// PET COLLECTION SCREEN — коллекция питомцев с 3D превью
// Из Code_tz/05_NPC_PET_SCREENS.md + тз/11_GAME_CONFIGS.md секция 7
// HTML попап + inline WebGL canvas для 3D моделей
// ============================================================

import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import { PET_DATABASE } from '../data/petDatabase';
import { createPetModel } from '../utils/LowPolyStyle';
import {
  addEscHandler, getOverlayStyle, getCardStyle, getTitleStyle,
  getSectionStyle, getButtonStyle, getButtonRowStyle,
  applyButtonHover, createCloseButton,
} from '../ui/DesignSystem';

/** Map pet IDs to 3D model types (cat/dog/bird/default) */
const PET_MODEL_MAP: Record<string, string> = {
  pet_parrot: 'bird',
  pet_otter: 'cat',
  pet_armadillo: 'dog',
  pet_flamingo: 'bird',
  pet_condor: 'bird',
  pet_capybara: 'dog',
  pet_jaguar: 'cat',
  pet_anaconda: 'default',
  pet_penguin: 'bird',
};

interface PetPreview {
  renderer: THREE.WebGLRenderer;
  raf: number;
}

export class PetCollectionScreen extends BaseScene {
  private overlay: HTMLDivElement | null = null;
  private removeEsc: (() => void) | null = null;
  private previews: PetPreview[] = [];

  start(_data?: any): void {
    this.scene.background = null;
    this.showScreen();
  }

  update(_delta: number): void {}

  stop(): void {
    super.stop();
    this.removeEsc?.();
    this.removeEsc = null;
    this.disposePreviews();
    this.overlay?.remove();
    this.overlay = null;
  }

  private disposePreviews(): void {
    for (const p of this.previews) {
      cancelAnimationFrame(p.raf);
      p.renderer.dispose();
    }
    this.previews = [];
  }

  private async showScreen(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (!user) { this.goBack(); return; }

    const player = await DatabaseService.getInstance().getPlayerProfile(user.uid);
    if (!player) { this.goBack(); return; }

    const activePetId = player.activePetId;

    const rarityColors: Record<string, string> = {
      Common: '#95a5a6', Rare: '#9b59b6', Epic: '#e74c3c',
    };

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = getOverlayStyle();

    const card = document.createElement('div');
    card.style.cssText = getCardStyle(720) + 'text-align:center;max-height:85vh;overflow-y:auto;';

    // Title
    const title = document.createElement('h2');
    title.style.cssText = getTitleStyle();
    title.textContent = '\uD83D\uDC3E КОЛЛЕКЦИЯ ПИТОМЦЕВ';
    card.appendChild(title);
    card.appendChild(createCloseButton(() => this.goBack()));

    // Info
    const activePet = activePetId ? PET_DATABASE.find(p => p.id === activePetId) : null;
    const info = document.createElement('p');
    info.style.cssText = 'color:#95a5a6;font-size:13px;margin-bottom:16px;';
    info.textContent = `Активный: ${activePet?.name ?? 'нет'} | \uD83D\uDC8E ${player.gems}`;
    card.appendChild(info);

    // Grid
    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:20px;';

    for (const pet of PET_DATABASE) {
      const isActive = activePetId === pet.id;
      const color = rarityColors[pet.rarity] ?? '#95a5a6';

      const petCard = document.createElement('div');
      petCard.style.cssText = `
        background:rgba(0,0,0,0.4);border:1px solid ${color};border-radius:8px;
        padding:12px;text-align:center;min-width:130px;cursor:pointer;
        transition:transform 0.2s;
        ${isActive ? 'box-shadow:0 0 12px rgba(39,174,96,0.5);' : ''}
      `;
      petCard.addEventListener('mouseenter', () => { petCard.style.transform = 'scale(1.05)'; });
      petCard.addEventListener('mouseleave', () => { petCard.style.transform = 'scale(1)'; });

      // 3D canvas
      const canvasWrap = document.createElement('div');
      canvasWrap.style.cssText = 'width:64px;height:64px;margin:0 auto 6px;border-radius:8px;overflow:hidden;';
      petCard.appendChild(canvasWrap);

      // Name
      const nameP = document.createElement('p');
      nameP.style.cssText = 'font-weight:bold;font-size:14px;margin:0;color:#ecf0f1;';
      nameP.textContent = pet.name;
      petCard.appendChild(nameP);

      // Rarity
      const rarP = document.createElement('p');
      rarP.style.cssText = `color:${color};font-size:11px;text-transform:uppercase;margin:2px 0;`;
      rarP.textContent = pet.rarity;
      petCard.appendChild(rarP);

      // Bonus
      const bonusP = document.createElement('p');
      bonusP.style.cssText = 'font-size:12px;color:#bdc3c7;margin:2px 0;';
      bonusP.textContent = `+${pet.baseBonus}% ${pet.bonusType}`;
      petCard.appendChild(bonusP);

      // Feeding
      const feedP = document.createElement('p');
      feedP.style.cssText = 'font-size:11px;color:#95a5a6;margin:2px 0;';
      feedP.textContent = `\uD83C\uDF56 ${pet.feedingRequirement}/сут`;
      petCard.appendChild(feedP);

      // Status
      const statusP = document.createElement('p');
      statusP.style.cssText = `font-size:11px;margin-top:4px;color:${isActive ? '#27ae60' : '#95a5a6'};`;
      statusP.textContent = isActive ? '\u2705 Активен' : `\uD83D\uDC8E ${pet.basePrice}`;
      petCard.appendChild(statusP);

      // Click handler
      petCard.addEventListener('click', () => this.handlePetClick(pet.id, player, user.uid));

      grid.appendChild(petCard);

      // Create 3D preview
      const modelType = PET_MODEL_MAP[pet.id] ?? 'default';
      requestAnimationFrame(() => this.create3DPreview(canvasWrap, modelType));
    }

    card.appendChild(grid);

    // Back button
    const btnRow = document.createElement('div');
    btnRow.style.cssText = getButtonRowStyle();
    const backBtn = document.createElement('button');
    backBtn.textContent = '\u2190 НАЗАД';
    backBtn.style.cssText = getButtonStyle('back', 'md');
    applyButtonHover(backBtn);
    backBtn.addEventListener('click', () => this.goBack());
    btnRow.appendChild(backBtn);
    card.appendChild(btnRow);

    this.overlay.appendChild(card);
    document.body.appendChild(this.overlay);

    this.removeEsc = addEscHandler(() => this.goBack());
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.goBack(); });
  }

  // ── 3D Pet Preview ─────────────────────────────────────────
  private create3DPreview(container: HTMLElement, modelType: string): void {
    const size = 64;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffd700, 0.8);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
    camera.position.set(0, 0.15, 0.8);
    camera.lookAt(0, 0.1, 0);

    const model = createPetModel(modelType, 0.5);
    scene.add(model);

    const clock = new THREE.Clock();
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      // Rotate + idle bob
      model.rotation.y = t * 0.8;
      model.position.y = Math.sin(t * 2) * 0.015;
      // Tail wag for cat/dog
      const tail = model.getObjectByName('tail');
      if (tail) tail.rotation.z = Math.sin(t * 5) * 0.3;
      // Wing flap for bird
      const lw = model.getObjectByName('leftWing');
      const rw = model.getObjectByName('rightWing');
      if (lw) lw.rotation.z = Math.sin(t * 4) * 0.2;
      if (rw) rw.rotation.z = -Math.sin(t * 4) * 0.2;
      renderer.render(scene, camera);
    };
    animate();

    this.previews.push({ renderer, raf: rafId });
  }

  // ── Pet Click Handler ──────────────────────────────────────
  private async handlePetClick(petId: string, player: any, uid: string): Promise<void> {
    const pet = PET_DATABASE.find(p => p.id === petId);
    if (!pet) return;

    if (player.activePetId === petId) {
      // Снять
      player.activePetId = undefined;
      this.showToast(`\uD83D\uDC3E ${pet.name} снят`, '#95a5a6');
    } else if (player.ownedCosmetics?.includes(petId) || player.activePetId === petId) {
      // Экипировать
      player.activePetId = petId;
      this.showToast(`\u2705 ${pet.name} активирован!`, '#27ae60');
    } else if (player.gems >= pet.basePrice) {
      // Купить
      player.gems -= pet.basePrice;
      player.activePetId = petId;
      AudioManager.getInstance().playSFX('coin_earn');
      this.showToast(`\uD83C\uDF89 ${pet.name} куплен и активирован!`, '#27ae60');
    } else {
      this.showToast('\u274C Недостаточно гемов!', '#e74c3c');
      return;
    }

    await DatabaseService.getInstance().updatePlayerStats(uid, {
      gems: player.gems,
      activePetId: player.activePetId,
    });

    this.disposePreviews();
    this.overlay?.remove();
    this.showScreen();
  }

  // ── Utilities ──────────────────────────────────────────────
  private showToast(msg: string, color: string): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;top:80px;left:50%;transform:translateX(-50%);
      background:${color};color:#fff;padding:10px 24px;border-radius:6px;
      font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:bold;
      z-index:10001;animation:rlToastIn 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  private goBack(): void {
    this.sceneManager.startScene('FarmScene');
  }
}
