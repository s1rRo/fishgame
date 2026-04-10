---
name: multiplayer-arch
description: >
  Архитектура мультиплеера для River Lord v2.0: Firebase Realtime Database,
  co-op рыбалка, клановая система, PvP арена.
  Активируй при: multiplayer, мультиплеер, co-op, кооп, совместная рыбалка,
  кланы, clan, guild, PvP, арена, real-time, realtime, Firebase Realtime Database,
  синхронизация, sync, онлайн режим, друзья, friends, room, комната,
  v2.0, v2.1, v2.2, roadmap multiplayer, когда будем делать мультиплеер,
  Firebase listeners, presence, онлайн игроки, leaderboard realtime.
---

# Multiplayer Architecture — River Lord v2.0

> ⚠️ СНАЧАЛА СПРОСИТЬ: «Это для текущего релиза или roadmap v2?»
> Single-player MVP (v1.0) полностью готов. Мультиплеер = v2.0.

---

## 🗺️ ROADMAP МУЛЬТИПЛЕЕРА

```
v2.0 — Co-op рыбалка + Real-time ферма (Firebase Realtime DB)
v2.1 — Clan System (гильдии, общий склад, clan wars)
v2.2 — PvP Arena (River Lord Arena — 1v1/2v2 соревновательные сессии)
```

---

## 🛠️ СТЕК МУЛЬТИПЛЕЕРА

```
Firebase Realtime Database  ← основная шина событий (presence, live actions)
Firestore                   ← постоянные данные (профили, история, кланы)
Firebase Auth               ← уже реализован ✅
Cloud Functions             ← серверная валидация (анти-чит, матчмейкинг)

НЕ ИСПОЛЬЗОВАТЬ: WebSocket, Socket.io, Colyseus, Nakama
ПРИЧИНА: Firebase уже интегрирован в проект, Auth и Firestore готовы
```

---

## 📐 СХЕМА FIREBASE REALTIME DATABASE (v2.0)

```
/rooms/
  {roomId}/
    state:       'waiting' | 'fishing' | 'finished'
    levelId:     string                    // какой водоём
    host:        uid
    createdAt:   timestamp
    players/
      {uid}/
        displayName: string
        gems:        number
        ready:       boolean
        connected:   boolean               // presence
        lastSeen:    timestamp
    fishing/
      lineLength:  number                  // глубина лески (0–1)
      tension:     number                  // натяжение (0–100)
      caught/
        {fishId}/
          weight:    number
          value:     number
          timestamp: timestamp
    chat/
      {msgId}/
        uid:     string
        text:    string
        ts:      timestamp

/presence/
  {uid}/
    connected:   boolean
    roomId:      string | null
    lastSeen:    timestamp

/leaderboard_live/
  {levelId}/
    {uid}/
      score:       number
      displayName: string
      updatedAt:   timestamp
```

---

## 🎣 CO-OP РЫБАЛКА (v2.0)

### Принципы синхронизации
```
Optimistic updates — каждый игрок ведёт свою физику локально
Server reconciliation — Cloud Function проверяет улов при завершении
Shared events — поимка рыбы отправляется в /rooms/{roomId}/fishing/caught/
```

### FishingSessionScene — точки интеграции

В коде уже расставлены метки `// FUTURE: multiplayer sync point`. Вот что нужно там сделать:

```typescript
// FUTURE: multiplayer sync point — старт сессии
// При start() → создать или присоединиться к room в Realtime DB

// FUTURE: multiplayer sync point — поимка рыбы
// При успешной поимке → push в /rooms/{roomId}/fishing/caught/
const fishRef = ref(rtdb, `rooms/${roomId}/fishing/caught`);
push(fishRef, { fishId, weight, value, uid, timestamp: serverTimestamp() });

// FUTURE: multiplayer sync point — изменение tension
// Раз в 100ms → set(ref(rtdb, `rooms/${roomId}/fishing/tension`), tension)

// FUTURE: multiplayer sync point — краш лески
// При краше → set(ref(rtdb, `rooms/${roomId}/state`), 'finished')
```

### Отображение co-op партнёра
```typescript
// Добавить в FishingSessionScene: слушать /rooms/{roomId}/fishing/
// Показывать вторую удочку и рыб партнёра как полупрозрачные объекты
// Показывать индикатор tension партнёра в HUD
```

---

## 🏠 CLAN SYSTEM (v2.1)

### Firestore схема кланов
```typescript
// /clans/{clanId}
interface Clan {
  id:          string;
  name:        string;       // max 24 chars
  tag:         string;       // max 5 chars, напр. [FISH]
  description: string;
  ownerId:     string;
  members:     Record<string, ClanMember>;
  treasury:    number;       // softCoins клана
  level:       number;       // 1–10
  createdAt:   Timestamp;
  weeklyXP:    number;       // сбрасывается в понедельник
}

interface ClanMember {
  uid:          string;
  displayName:  string;
  role:         'owner' | 'officer' | 'member';
  contribution: number;      // монеты внесённые за всё время
  joinedAt:     Timestamp;
}
```

### Клановые бонусы
```
Clan Level 1: +5% к стоимости улова
Clan Level 2: +10% + общий склад рыбы
Clan Level 3: +15% + клановые задания
Clan Level 5: +25% + клановые войны (Clan Wars)
```

### ClanScene.ts — что нужно реализовать
```typescript
// FUTURE: clan data sync
// 1. ClanSearchScene — поиск кланов по имени/тегу (Firestore query)
// 2. ClanHomeScene  — состав клана, treasury, недельный прогресс
// 3. ClanChatScene  — чат через Firestore subcollection /clans/{id}/messages
// 4. ClanWarsScene  — соревнование кланов за недельный улов
```

---

## ⚔️ PVP ARENA (v2.2)

### Режимы
```
1v1 Quick Match    — 3 минуты, кто наловит больше по стоимости
2v2 Team Fishing   — команды, shared улов
River Lord Challenge — 1v1 за титул River Lord на конкретном водоёме
```

### Matchmaking (Cloud Functions)
```typescript
// Cloud Function: onMatchRequest
// Хранить очередь в Realtime DB /matchmaking/{levelId}/queue/
// При 2+ игроках → создать room, уведомить обоих

/matchmaking/
  {levelId}/
    queue/
      {uid}/
        displayName: string
        rating:      number
        timestamp:   number
    active_rooms/
      {roomId}: true
```

### Анти-чит принципы
```
1. Сервер (Cloud Function) валидирует улов:
   - maxWeight не может превышать fish.maxWeight из fishDatabase
   - Время поимки должно быть в рамках сессии
   - Не более X рыб в минуту (лимит спавна)

2. Client-side prediction + server correction:
   - Локально показываем улов немедленно
   - Если сервер отклонил → откатить и показать ошибку

3. Presence cheating prevention:
   - Если игрок disconnected > 5 сек → автоматическая сдача матча
```

---

## 🔌 ИНТЕГРАЦИЯ В СУЩЕСТВУЮЩИЙ КОД

### DatabaseService.ts — расширение для Realtime DB
```typescript
// src/services/DatabaseService.ts — добавить после существующего кода
import { getDatabase, ref, set, onValue, push } from 'firebase/database';

// FUTURE: multiplayer sync point — инициализация Realtime DB
// const rtdb = getDatabase(app);
// export { rtdb };
```

### SceneManager.ts — новые сцены
```typescript
// FUTURE: multiplayer sync point — регистрация новых сцен в v2.0
// this.registerScene('RoomLobbyScene', new RoomLobbyScene(...));
// this.registerScene('ClanHomeScene',  new ClanHomeScene(...));
// this.registerScene('PvPArenaScene',  new PvPArenaScene(...));
```

### TopHUD.ts — онлайн индикатор
```typescript
// FUTURE: multiplayer sync point — показывать онлайн статус
// this.hud.showOnlineCount(playersOnline);
// this.hud.showRoommates(players); // маленькие аватарки партнёров
```

---

## 📡 PRESENCE СИСТЕМА

```typescript
// src/services/PresenceService.ts — создать в v2.0
import { ref, onDisconnect, set, serverTimestamp } from 'firebase/database';

export class PresenceService {
  static init(uid: string) {
    const presenceRef = ref(rtdb, `/presence/${uid}`);
    const connRef = ref(rtdb, '.info/connected');

    onValue(connRef, (snap) => {
      if (snap.val() === false) return;

      onDisconnect(presenceRef).set({
        connected: false,
        lastSeen:  serverTimestamp()
      });

      set(presenceRef, {
        connected: true,
        roomId:    null,
        lastSeen:  serverTimestamp()
      });
    });
  }
}
// FUTURE: multiplayer sync point — вызвать PresenceService.init(uid) после логина
```

---

## 🔒 ПРАВИЛА БЕЗОПАСНОСТИ (Realtime DB)

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read":  "auth != null",
        ".write": "auth != null && (
          !data.exists() ||
          data.child('host').val() === auth.uid ||
          data.child('players').child(auth.uid).exists()
        )",
        "fishing": {
          "caught": {
            "$fishId": {
              ".write": "auth != null && newData.child('uid').val() === auth.uid"
            }
          }
        }
      }
    },
    "presence": {
      "$uid": {
        ".read":  "auth != null",
        ".write": "auth.uid === $uid"
      }
    },
    "leaderboard_live": {
      ".read": true,
      "$levelId": {
        "$uid": {
          ".write": "auth.uid === $uid"
        }
      }
    }
  }
}
```

---

## ✅ ЧЕКЛИСТ СТАРТА v2.0

```
□ Firebase Realtime Database включён в Console
□ Правила безопасности настроены (выше)
□ Cloud Functions инициализированы (firebase init functions)
□ PresenceService.ts создан и подключён
□ RoomLobbyScene реализована (ждать 2+ игрока)
□ FishingSessionScene — FUTURE точки раскомментированы и реализованы
□ Co-op тест: 2 браузера, один водоём, проверить синхронизацию улова
□ Disconnect handling: закрыть вкладку → партнёру показать "игрок отключился"
□ Анти-чит Cloud Function написана и задеплоена
□ Leaderboard_live → реальный счёт во время матча
```

---

## 📝 МЕТКИ В КОДЕ (уже расставлены в v1.0)

При поиске точек интеграции:
```bash
grep -rn "FUTURE: multiplayer" src/
```

Найдёшь метки:
- `// FUTURE: multiplayer sync point`
- `// FUTURE: realtime listener для co-op рыбалки`
- `// FUTURE: clan data sync`

Именно в этих местах подключать Realtime DB слушателей и эмиттеров.
