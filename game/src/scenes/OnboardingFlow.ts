// ============================================================
// ONBOARDING FLOW — 4 шага туториала
// Из Code_tz/07_ONBOARDING_SEASON.md
// Welcome → Биом → Рыбалка → Ферма → tutorialCompleted=true
// ============================================================

import * as THREE from 'three';
import { BaseScene } from '../core/BaseScene';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AudioManager } from '../services/AudioManager';
import { LootboxService } from '../services/LootboxService';
import type { PlayerProfile } from '../models/Player';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  bgColor: number;
  action?: 'lootbox1' | 'lootbox2';  // специальное действие
}

const STEPS: TutorialStep[] = [
  {
    title: 'Добро пожаловать!',
    description: 'Вы — начинающий рыбак в Аргентине. Исследуйте биомы, ловите рыбу, стройте деревню!',
    icon: '🎣',
    bgColor: 0x0a1628,
  },
  {
    title: 'Первый лутбокс!',
    description: 'У вас уже есть подарок! Откройте лутбокс и получите стартового NPC + ресурсы.',
    icon: '🎁',
    bgColor: 0x1a2a1a,
    action: 'lootbox1',
  },
  {
    title: 'Второй лутбокс!',
    description: 'Откройте второй лутбокс — получите ещё одного NPC и питомца!',
    icon: '🎁',
    bgColor: 0x2a1a2a,
    action: 'lootbox2',
  },
  {
    title: 'Биомы Аргентины',
    description: 'Начните с Río Salado (L1). Открывайте новые биомы, повышая уровень деревни и собирая ресурсы.',
    icon: '🌍',
    bgColor: 0x1a3a2a,
  },
  {
    title: 'Рыбалка',
    description: 'Выберите NPC и приманку, пройдите карту чекпоинтов. Удерживайте леску, но следите за натяжением!',
    icon: '🐟',
    bgColor: 0x0d2a4a,
  },
  {
    title: 'Ваша ферма',
    description: 'Стройте здания, тренируйте NPC, выращивайте рыбу в пруду. Удачи, River Lord!',
    icon: '🏠',
    bgColor: 0x2a1a0a,
  },
];

export class OnboardingFlow extends BaseScene {
  private currentStep = 0;
  private overlay: HTMLDivElement | null = null;
  private bgMesh: THREE.Mesh | null = null;

  start(data?: { resumeStep?: number }): void {
    if (data?.resumeStep) {
      this.currentStep = data.resumeStep;
    }

    // Простой 3D фон
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    this.scene.background = new THREE.Color(0x0a1628);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Фоновая сфера с анимацией
    this.bgMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2, 1),
      new THREE.MeshPhongMaterial({ color: 0x3498db, wireframe: true, transparent: true, opacity: 0.3 }),
    );
    this.scene.add(this.bgMesh);

    AudioManager.getInstance().playMusic('main_theme');

    this.showStep();
  }

  update(delta: number): void {
    if (this.bgMesh) {
      this.bgMesh.rotation.y += delta * 0.3;
      this.bgMesh.rotation.x += delta * 0.1;
    }
  }

  stop(): void {
    super.stop();
    this.overlay?.remove();
    this.overlay = null;
  }

  private showStep(): void {
    this.overlay?.remove();

    const step = STEPS[this.currentStep];
    const isLast = this.currentStep === STEPS.length - 1;

    // Обновить фон 3D
    this.scene.background = new THREE.Color(step.bgColor);

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      display:flex;align-items:center;justify-content:center;
      z-index:1000;pointer-events:all;
    `;

    this.overlay.innerHTML = `
      <div style="
        background:rgba(10,22,40,0.95);border:2px solid #3498db;
        border-radius:16px;padding:40px;max-width:450px;width:90%;
        text-align:center;font-family:'Rajdhani',sans-serif;color:white;
        box-shadow:0 0 60px rgba(52,152,219,0.2);
      ">
        <div style="font-size:64px;margin-bottom:16px;">${step.icon}</div>
        <h2 style="font-family:'Press Start 2P',monospace;font-size:14px;color:#f39c12;margin-bottom:16px;">
          ${step.title}
        </h2>
        <p style="font-size:16px;line-height:1.6;color:#bdc3c7;margin-bottom:24px;">
          ${step.description}
        </p>

        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:20px;">
          ${STEPS.map((_, i) => `<div style="width:10px;height:10px;border-radius:50%;background:${i === this.currentStep ? '#3498db' : '#2c3e50'};"></div>`).join('')}
        </div>

        <div style="display:flex;gap:12px;justify-content:center;">
          ${this.currentStep > 0 ? '<button id="onb-prev" class="pixel-btn" style="padding:10px 20px;font-size:14px;">← Назад</button>' : ''}
          <button id="onb-next" style="
            padding:12px 28px;background:${isLast ? '#27ae60' : '#3498db'};color:white;border:none;
            border-radius:8px;font-size:16px;font-family:'Rajdhani',sans-serif;cursor:pointer;font-weight:bold;
            clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px));
          ">${isLast ? 'Начать игру!' : 'Далее →'}</button>
        </div>

        <p style="font-size:12px;color:#566573;margin-top:16px;">Шаг ${this.currentStep + 1} из ${STEPS.length}</p>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.overlay.querySelector('#onb-next')?.addEventListener('click', () => {
      AudioManager.getInstance().playSFX('button_click');
      if (isLast) {
        this.completeTutorial();
      } else if (step.action) {
        this.handleLootboxAction(step.action);
      } else {
        this.currentStep++;
        this.showStep();
      }
    });

    this.overlay.querySelector('#onb-prev')?.addEventListener('click', () => {
      if (this.currentStep > 0) {
        this.currentStep--;
        this.showStep();
      }
    });
  }

  private async handleLootboxAction(action: 'lootbox1' | 'lootbox2'): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (!user) { this.currentStep++; this.showStep(); return; }

    const profile = await DatabaseService.getInstance().getPlayerProfile(user.uid);
    if (!profile) { this.currentStep++; this.showStep(); return; }

    const lootboxService = LootboxService.getInstance();
    const lootType = 'starter' as const;

    // Выдать стартовый лутбокс если ещё нет
    if (profile.lootboxInventory[lootType] <= 0) {
      profile.lootboxInventory[lootType] += 1;
      await DatabaseService.getInstance().updatePlayerStats(user.uid, {
        lootboxInventory: profile.lootboxInventory,
      });
    }

    // Открыть сцену лутбокса
    this.sceneManager.startScene('LootboxOpenScene', {
      type: lootType,
      player: profile,
      returnScene: 'OnboardingFlow',
      onComplete: async (reward: any) => {
        // Сохранить обновлённый профиль
        if (reward) {
          lootboxService.applyReward(profile, reward);
          await DatabaseService.getInstance().updatePlayerStats(user.uid, {
            activeNPCIds: profile.activeNPCIds,
            ownedPetIds: profile.ownedPetIds,
            softCoins: profile.softCoins,
            gems: profile.gems,
            resources: profile.resources,
            lootboxInventory: profile.lootboxInventory,
          });
        }
        // Вернуться в онбординг на следующий шаг
        this.currentStep++;
        this.sceneManager.startScene('OnboardingFlow', { resumeStep: this.currentStep });
      },
    });
  }

  private async completeTutorial(): Promise<void> {
    const user = AuthService.getInstance().getCurrentUser();
    if (user) {
      await DatabaseService.getInstance().updatePlayerStats(user.uid, {
        tutorialCompleted: true,
      });
    }
    AudioManager.getInstance().playSFX('level_up');
    this.sceneManager.startScene('PlanetScene');
  }
}
