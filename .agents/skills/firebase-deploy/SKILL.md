---
name: firebase-deploy
description: >
  Деплой River Lord на Firebase Hosting + настройка Analytics, Performance Monitoring,
  Remote Config. Активируй при: deploy, firebase, хостинг, опубликовать игру, выкатить,
  firebase hosting, firebase deploy, production, prod, CDN, домен, SSL, HTTPS,
  firebase analytics, remote config, A/B testing, performance monitoring,
  сделать игру доступной, публичная ссылка, поделиться игрой.
---

# Firebase Deploy — River Lord: Pixel Fishery

Деплой PWA-игры на Firebase Hosting с CDN, SSL, аналитикой и мониторингом.

---

## 🚀 ШАГ 1 — Подготовка Firebase проекта

```bash
# Установить Firebase CLI (если нет)
npm install -g firebase-tools

# Авторизация
firebase login

# В папке проекта
cd /mnt/fishgame
firebase use --add    # выбрать существующий проект или создать новый
```

### Firebase Console → включить сервисы:
1. **Authentication** → Sign-in methods → Анонимный + Google
2. **Firestore** → Создать базу → Production mode
3. **Hosting** → Get started
4. **Analytics** → Enable
5. **Performance Monitoring** → Enable

---

## ⚙️ ШАГ 2 — firebase.json

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [{ "key": "Cache-Control", "value": "max-age=31536000" }]
      },
      {
        "source": "**",
        "headers": [
          { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
          { "key": "X-Content-Type-Options", "value": "nosniff" }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

---

## 🔒 ШАГ 3 — Firestore правила безопасности

Создать `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Профиль игрока — только сам игрок
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Глобальный лидерборд — читать всем, писать только авторизованным
    match /leaderboard/{levelId}/scores/{scoreId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // River Lord рекорды
    match /riverLords/{levelId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 📊 ШАГ 4 — Analytics события

В `src/services/analytics.ts` уже реализованы события. Убедиться что все ключевые события логируются:

```typescript
// Уже есть ✅:
analytics.logEvent('session_start')
analytics.logEvent('fish_caught', { fishId, level, value })
analytics.logEvent('session_end', { levelId, attempts, fishCaught, isCrash })
analytics.logEvent('farm_upgrade', { buildingId, newLevel })
analytics.logEvent('fish_sold', { count, value })
analytics.logEvent('sell_all', { total })
analytics.logEvent('login', { method })
analytics.logEvent('water_body_selected', { waterId, levelId })

// Добавить (TODO):
analytics.logEvent('level_completed', { levelId, firstTime: boolean })
analytics.logEvent('season_pass_purchased', { price: 150 })
analytics.logEvent('cosmetic_purchased', { itemId, price })
analytics.logEvent('ad_watched', { type, reward })
analytics.logEvent('building_built', { buildingId, cost })
```

---

## 🎛️ ШАГ 5 — Remote Config (A/B тесты баланса)

Позволяет менять баланс игры без нового деплоя:

```typescript
// src/services/RemoteConfig.ts — создать
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
import { app } from './firebase-config';

const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 час

// Дефолтные значения (fallback если Firebase недоступен)
remoteConfig.defaultConfig = {
  tension_crash_threshold: 80,     // порог краша лески
  fish_flee_probability:   0.70,   // вероятность убегания
  ad_daily_limit:          3,      // лимит рекламы в день
  season_pass_price_gems:  150,    // цена Season Pass
  bonus_xp_multiplier:     1.0,    // множитель XP
};

export async function fetchConfig() {
  try {
    await fetchAndActivate(remoteConfig);
  } catch (e) {
    console.warn('[RemoteConfig] Using defaults');
  }
}

export function getConfig(key: string): string {
  return getValue(remoteConfig, key).asString();
}
export function getConfigNum(key: string): number {
  return getValue(remoteConfig, key).asNumber();
}
```

---

## 🏗️ ШАГ 6 — Production сборка и деплой

```bash
# Полный цикл деплоя
npm run build                    # Vite production build
firebase deploy --only hosting   # деплой только хостинг

# Или всё сразу
firebase deploy                  # hosting + firestore rules

# Только rules (без пересборки)
firebase deploy --only firestore:rules

# Preview channel (тест перед продом)
firebase hosting:channel:deploy preview --expires 7d
```

### package.json — добавить scripts:
```json
{
  "scripts": {
    "deploy": "npm run build && firebase deploy --only hosting",
    "deploy:preview": "npm run build && firebase hosting:channel:deploy preview",
    "deploy:all": "npm run build && firebase deploy"
  }
}
```

---

## 📈 ШАГ 7 — Performance Monitoring

```typescript
// src/services/firebase-config.ts — добавить
import { getPerformance } from 'firebase/performance';

// После initializeApp:
if (isFirebaseAvailable) {
  getPerformance(app);  // автоматически трекает FCP, TTI, etc.
}
```

### Кастомные трейсы для игры:
```typescript
import { trace } from 'firebase/performance';
import { perf } from './firebase-config';

// Замерить время загрузки Three.js сцены
const sceneTrace = trace(perf, 'scene_load_fishing');
sceneTrace.start();
// ... setup3D() ...
sceneTrace.stop();
```

---

## 🔗 Кастомный домен

1. Firebase Console → Hosting → Add custom domain
2. Добавить DNS записи у регистратора:
   ```
   A    @    151.101.1.195
   A    @    151.101.65.195
   ```
3. SSL выдаётся автоматически (~24 часа)

---

## ✅ ЧЕКЛИСТ ДЕПЛОЯ

```
□ npm run build — без ошибок, dist/ создан
□ firebase.json настроен
□ firestore.rules — правила безопасности
□ Firebase Auth — Anonymous + Google включены
□ Analytics — включён в Firebase Console
□ firebase deploy — без ошибок
□ Открыть https://[project-id].web.app — игра работает
□ Firebase Auth работает (логин через Google)
□ Firestore сохраняет профиль
□ PWA устанавливается (Add to Home Screen)
□ Service Worker кэширует ассеты (offline mode)
```

---

## 🐛 ЧАСТЫЕ ПРОБЛЕМЫ

| Проблема | Решение |
|---|---|
| `firebase: command not found` | `npm install -g firebase-tools` |
| CORS ошибки при логине | Firebase Console → Auth → Authorized domains → добавить свой домен |
| Firestore permission denied | Проверить `firestore.rules` — правила слишком строгие |
| Белый экран после деплоя | Проверить `"public": "dist"` в firebase.json |
| SW кэширует старую версию | Обновить `CACHE_NAME` в `public/sw.js` → `'river-lord-v1.0.1'` |
| Analytics не работает | Добавить домен в Firebase Analytics → Data Streams |
