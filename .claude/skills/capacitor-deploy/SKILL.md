---
name: capacitor-deploy
description: >
  Пошаговое портирование River Lord на iOS и Android через Capacitor.
  Активируй при: Capacitor, мобайл, iOS, Android, App Store, Google Play, mobile build,
  npx cap, Xcode, Android Studio, портирование игры, мобильная версия, телефон, планшет,
  touch controls, haptics, native app, .ipa, .apk, .aab, splash screen, deep link.
  Использовать при любом упоминании публикации игры в магазинах или сборке под мобайл.
---

# Capacitor Deploy — River Lord: Pixel Fishery

Портируем готовую Vite + Three.js игру в нативное iOS/Android приложение.
Никакого переписывания кода — Capacitor оборачивает web-билд в нативную оболочку.

---

## 📋 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

```
macOS        — для iOS сборки (Xcode только на Mac)
Xcode 15+    — App Store Connect Developer Account ($99/год)
Android Studio — Google Play Developer Account ($25 одноразово)
Node 18+     — уже есть в проекте
Java 17+     — для Android (brew install openjdk@17)
```

---

## 🚀 ШАГ 1 — Установка Capacitor

```bash
cd /mnt/fishgame

# Установить core + CLI
npm install @capacitor/core
npm install -D @capacitor/cli

# Инициализировать (один раз)
npx cap init "River Lord" com.riverlordfishery.app --web-dir dist

# Добавить платформы
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

---

## ⚙️ ШАГ 2 — capacitor.config.ts

Создать/обновить `capacitor.config.ts` в корне проекта:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.riverlordfishery.app',
  appName: 'River Lord',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a1628',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a1628',
    },
  },
};

export default config;
```

---

## 📦 ШАГ 3 — Нативные плагины

```bash
# Обязательные для River Lord
npm install @capacitor/haptics        # вибрация при поимке рыбы
npm install @capacitor/status-bar     # скрыть статус-бар
npm install @capacitor/splash-screen  # нативный сплэш
npm install @capacitor/app            # пауза/resume lifecycle

# Реклама (замена web AdSense)
npm install capacitor-admob-plus

# IAP — если будут платные покупки
npm install @capgo/capacitor-purchases
```

### Интеграция в код игры:

```typescript
// src/utils/NativeAdapter.ts — создать этот файл
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

export const isNative = Capacitor.isNativePlatform();

/** Вибрация при поимке рыбы */
export async function vibrateCatch() {
  if (isNative) await Haptics.impact({ style: ImpactStyle.Medium });
}

/** Вибрация при краше лески */
export async function vibrateCrash() {
  if (isNative) await Haptics.vibrate({ duration: 400 });
}

/** Скрыть статус-бар */
export async function initNativeUI() {
  if (isNative) {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.hide();
  }
}

/** Обработка паузы (сохранить прогресс) */
export function setupAppLifecycle(onPause: () => void, onResume: () => void) {
  if (isNative) {
    App.addListener('appStateChange', ({ isActive }) => {
      isActive ? onResume() : onPause();
    });
  }
}
```

### Вставить в BootScene.ts:
```typescript
import { initNativeUI } from '../utils/NativeAdapter';
// В начале start():
await initNativeUI();
```

### Вставить в FishingSessionScene.ts:
```typescript
import { vibrateCatch, vibrateCrash } from '../utils/NativeAdapter';
// При поимке рыбы:
await vibrateCatch();
// При краше лески:
await vibrateCrash();
```

---

## 🔨 ШАГ 4 — Сборка и синхронизация

```bash
# Каждый раз перед открытием Xcode/Android Studio:
npm run build          # Vite production build → dist/
npx cap copy           # копировать dist/ в ios/app/public/ и android/app/src/main/assets/
npx cap sync           # copy + установить плагины в нативный проект
```

---

## 📱 ШАГ 5 — iOS (Xcode)

```bash
npx cap open ios       # открыть в Xcode
```

В Xcode:
1. **Signing & Capabilities** → выбрать Team (Apple Developer Account)
2. **Bundle Identifier**: `com.riverlordfishery.app`
3. **Version**: `1.0.0`, Build: `1`
4. **Deployment Target**: iOS 14.0+
5. **Device Orientation**: Landscape Left + Landscape Right
6. **Info.plist** → добавить:
   - `NSCameraUsageDescription` — если нужна камера
   - `UIStatusBarHidden` = YES
7. **Product → Archive** → Distribute App → App Store Connect

### Иконки iOS (требуется):
```
1024×1024  — App Store
180×180    — iPhone @3x
120×120    — iPhone @2x
87×87      — iPad @3x
```
Использовать: [appicon.co](https://appicon.co) — загрузи `icon-1024.png`

---

## 🤖 ШАГ 6 — Android (Android Studio)

```bash
npx cap open android   # открыть в Android Studio
```

В Android Studio:
1. **Build → Generate Signed Bundle/APK**
2. Выбрать **Android App Bundle (.aab)** для Google Play
3. Создать keystore (сохрани в безопасное место!)
4. **Build Variants**: release
5. Загрузить `.aab` в Google Play Console

### `android/app/src/main/AndroidManifest.xml` — добавить:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<!-- Ориентация: landscape -->
<activity android:screenOrientation="landscape" ... >
```

---

## ✅ ЧЕКЛИСТ ПЕРЕД ПУБЛИКАЦИЕЙ

```
□ npm run build — нет ошибок
□ npx cap sync — успешно
□ Тест на реальном устройстве (не симулятор!)
□ FPS > 30 на среднем устройстве (iPhone 11 / Pixel 4)
□ Touch controls работают (OrbitControls, tap на рыбу)
□ Firebase Auth работает офлайн (localStorage fallback)
□ Нет console.error в продакшене
□ Иконки всех размеров готовы
□ Splash screen показывается и скрывается
□ Статус-бар скрыт
□ Privacy Policy URL готов
□ Screenshot'ы для магазина (5.5", 6.7" iPhone, 10" iPad)
```

---

## 🐛 ЧАСТЫЕ ПРОБЛЕМЫ

| Проблема | Решение |
|---|---|
| WebGL не работает на Android | `androidScheme: 'https'` в capacitor.config |
| Firebase CORS ошибки | Добавить домен `capacitor://localhost` в Firebase Console → Auth → Authorized domains |
| Белый экран при старте | Проверить `webDir: 'dist'` и что `npm run build` выполнен |
| OrbitControls не реагирует на touch | Добавить `touch-action: none` на canvas в CSS |
| Игра в портретном режиме | Установить orientation: landscape в AndroidManifest + Info.plist |

---

## 📐 TOUCH CONTROLS ДЛЯ THREE.JS

OrbitControls уже поддерживает touch из коробки. Дополнительно:

```css
/* index.html → добавить на #game-canvas */
#game-canvas {
  touch-action: none;  /* предотвращает scroll браузера */
}
```

```typescript
// FishingSessionScene — уже использует pointerdown/pointerup
// Они работают и на touch устройствах ✅
```
