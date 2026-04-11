---
name: game-balance
description: >
  Игровой баланс River Lord: Pixel Fishery — рыбы, здания фермы, натяжение лески,
  Season Pass, валюты, пассивный доход. Активируй при: баланс, balance, рыба дорого,
  рыба дёшево, цена рыбы, стоимость апгрейда, farm upgrade cost, здания фермы,
  tension threshold, краш лески, CRASH_THRESHOLD, season pass rewards, season pass цены,
  XP, прогресс пасс, пассивный доход, passive income, softCoins, gems, валюта,
  слишком легко, слишком сложно, дисбаланс, nerf, buff, нёрф, бафф, твикнуть,
  изменить цифры, подправить баланс, скучно, grinding, гринд.
---

# Game Balance — River Lord: Pixel Fishery

Справочник по всем числам баланса игры: где лежат, что они делают, как их менять безопасно.

---

## 📍 КАРТА ФАЙЛОВ БАЛАНСА

```
src/data/fishDatabase.ts        ← цены рыб, веса, редкость, уровни разблокировки
src/scenes/FishingSessionScene.ts ← CRASH_THRESHOLD, tension рост/падение, fish AI
src/scenes/FarmScene.ts         ← DEFS (стоимость зданий, апгрейды, пассивный доход)
src/models/Player.ts            ← calcPassiveIncome(), calcUpgradeCost(), DEFAULT_PROFILE
src/services/SeasonPassManager.ts ← SEASON_REWARDS, milestone, amount
src/services/AdManager.ts       ← лимит рекламы в день, награды
src/services/LevelBalanceManager.ts ← targetValue по уровням, entry cost
src/data/fishDatabase.ts        ← levelBalance[] — цели улова, награды gems
```

---

## 🐟 РЫБЫ (fishDatabase.ts)

### Редкости и множители стоимости
| Rarity    | Ценность (×base) | Шанс (FishingSession) |
|-----------|------------------|-----------------------|
| common    | ×1.0             | ~60% спавна           |
| rare      | ×1.3             | ~25% спавна           |
| epic      | ×1.8             | ~12% спавна           |
| legendary | ×2.5–4.0         | ~3% спавна            |

### Диапазон цен (baseValuePerKg)
```
Уровень 1:   6–18 монет/кг   (окунь, карп, плотва, ёрш)
Уровень 2:   22–45 монет/кг  (щука, форель, лещ)
Уровень 3:   30–120 монет/кг (кои, амур, мандаринка)
Уровень 4:   50–200 монет/кг (сом, угорь, фугу)
Уровень 5:   25–90 монет/кг  (тилапия, нильский окунь, двоякодышащая)
Уровень 6:   42–80 монет/кг  (тигер, вунду, желтобрюхий)
Уровень 7:   60–110 монет/кг (бас, луциан, тарпон, парусник)
Уровень 8:   85–120 монет/кг (тунец, махи-махи, групер)
Уровень 9:   95–150 монет/кг (баррамунди, мюррей, золотой окунь)
Уровень 10:  150–500 монет/кг (марлин, рыба-меч, кальмар, акула, рыба-весло, удильщик)
```

### Как считается итоговая ценность улова
```typescript
// FishingSessionScene.ts — при поимке рыбы:
const weight = random(fish.minWeight, fish.maxWeight);
const value  = Math.round(weight * fish.baseValuePerKg * rarityMult);
// rarityMult: common=1, uncommon=1.3, rare=1.8, epic=2.5, legendary=4
```

### Цели улова по уровням (levelBalance в fishDatabase.ts)
```
Уровень 1:  targetValue=120,  rewardGems=30
Уровень 2:  targetValue=250,  rewardGems=50
Уровень 3:  targetValue=400,  rewardGems=70
Уровень 4:  targetValue=600,  rewardGems=90
Уровень 5:  targetValue=900,  rewardGems=120
Уровень 6:  targetValue=1200, rewardGems=150
Уровень 7:  targetValue=1800, rewardGems=200
Уровень 8:  targetValue=2500, rewardGems=250
Уровень 9:  targetValue=3500, rewardGems=300
Уровень 10: targetValue=5000, rewardGems=500
```

---

## 🎣 МЕХАНИКА НАТЯЖЕНИЯ ЛЕСКИ (FishingSessionScene.ts)

```typescript
private readonly CRASH_THRESHOLD = 80;  // ← ГЛАВНЫЙ ПАРАМЕТР

// Рост tension при удержании лески в глубине:
this.tension += depthFactor * 22 * delta;  // depthFactor = глубина / MAX_DEPTH (0..1)

// Восстановление при отпускании:
this.tension -= 30 * delta;

// Рыба тянет леску (attracts):
this.tension += 8 * delta;

// Пересечение лесок (несколько рыб):
this.tension += 18;  // резкий скачок

// Краш происходит при tension >= 100 (не при CRASH_THRESHOLD)
// CRASH_THRESHOLD (80) = визуальное предупреждение (красная подсветка бара)
```

### Руководство по твикингу
| Хочешь | Что менять |
|--------|-----------|
| Легче   | `CRASH_THRESHOLD` ↑ (например 90) ИЛИ рост tension `22` → `15` |
| Сложнее | `CRASH_THRESHOLD` ↓ (например 70) ИЛИ рост tension `22` → `30` |
| Рыба сильнее тянет | `8 * delta` → `12 * delta` |
| Меньше штраф за пересечение | `18` → `10` |

---

## 🏡 ЗДАНИЯ ФЕРМЫ (FarmScene.ts → DEFS)

### Стоимость постройки и апгрейдов
```typescript
// DEFS[]: buildCost → upgradeCost[L1→L2, L2→L3, L3→L4]
house:      buildCost=0,    upgradeCost=[300,  800,  2000]
pond:       buildCost=0,    upgradeCost=[200,  600,  1500]
storage:    buildCost=500,  upgradeCost=[400,  1000, 2500]
smokehouse: buildCost=800,  upgradeCost=[600,  1500, 3500]
dock:       buildCost=1200, upgradeCost=[800,  2000, 4500]
npcFisher1: buildCost=2000, upgradeCost=[1200, 3000, 6000]
```

### Цепочка разблокировки
```
house(L2) → storage разблокируется
storage(L2) → smokehouse разблокируется
smokehouse(L2) → dock разблокируется
dock(L2) → npcFisher1 разблокируется
```

### Пассивный доход (calcPassiveIncome в Player.ts)
```typescript
house.level      × 2  монет/мин
pond.level       × 4  монет/мин  ← выгодный
storage.level    × 1  монет/мин
smokehouse.level × 3  монет/мин
dock.level       × 4  монет/мин  ← выгодный
npcFisher1.level × 8  монет/мин  ← самый прибыльный (если active)
```

### Максимальный пассивный доход (все здания макс уровень)
```
house(4)×2 + pond(4)×4 + storage(4)×1 + smokehouse(4)×3 + dock(4)×4 + npc(4)×8
= 8 + 16 + 4 + 12 + 16 + 32 = 88 монет/мин = 5280 монет/час
```

---

## 💰 ВАЛЮТЫ

| Валюта | Символ | Получение | Трата |
|--------|--------|-----------|-------|
| softCoins | 💰 | Рыбалка, пассивный доход, Season Pass | Апгрейды фермы |
| gems | 💎 | Season Pass, реклама, покупка | Season Pass Premium (150💎), косметика |

### Стартовый баланс (DEFAULT_PLAYER_PROFILE)
```typescript
softCoins: 0,
gems: 30,   // бонус при старте
```

---

## 🏆 SEASON PASS (SeasonPassManager.ts)

### Бесплатный трек (SEASON_REWARDS)
```
10%  → +20 💎
25%  → +500 💰
50%  → +50 💎
75%  → +1500 💰
100% → +150 💎 (финал)
```

### Премиум трек (требует 150 💎)
```
10%  → +50 💎
25%  → +100 💎
50%  → +3000 💰
75%  → +200 💎
100% → +500 💎 GRAND PRIZE
```

### Начисление прогресса
```typescript
// addProgress() в SeasonPassManager.ts:
freeTrack    += points × 1.0
premiumTrack += points × 1.5  (бонус 50% если куплен)
// Сезон сбрасывается через checkSeasonReset() если прошло > 7 дней
```

### Как менять баланс Season Pass
- Награды: `SEASON_REWARDS[]` в SeasonPassManager.ts — менять `amount`
- Цену Premium: `150 💎` — ищи в CosmeticShopScene.ts или SeasonPassScene.ts
- Длительность сезона: `checkSeasonReset()` — найти `7 * 24 * 60 * 60 * 1000`
- Множитель прогресса премиум: `× 1.5` → изменить в `addProgress()`

---

## 📺 РЕКЛАМА (AdManager.ts)

По умолчанию:
- Тип: rewarded (показывается добровольно)
- Лимит: проверять в `AdManager.watchAd()` — обычно 3 рекламы/день
- Платформы: web (заглушка) → AdMob при Capacitor

Для Remote Config (firebase-deploy skill): параметр `ad_daily_limit` меняет лимит без редеплоя.

---

## ⚡ ЧЕКЛИСТ БЕЗОПАСНОГО ТВИКИНГА

```
□ Сделай резервную копию файла перед правкой
□ Меняй ОДНУ переменную за раз
□ Запусти ./node_modules/.bin/tsc --noEmit после изменений
□ Проверь в браузере: npm run dev
□ Для CRASH_THRESHOLD — проверь оба пути: визуал (≥80) и краш (≥100)
□ Для цен рыб — пересчитай, влезает ли в targetValue уровня за сессию
□ Для пассивного дохода — проверь время окупаемости постройки
```

### Формула окупаемости здания
```
время_окупаемости_минуты = buildCost / passiveIncome_per_min
// Пример: storage buildCost=500, income=1/мин → 500 минут ≈ 8 часов
// Норма для casual: 1–4 часа реального времени
```

---

## 🔮 REMOTE CONFIG (без редеплоя)

Через Firebase Remote Config (см. firebase-deploy skill) можно менять на лету:
```
tension_crash_threshold  ← порог краша (default 80)
fish_flee_probability    ← вероятность убегания (default 0.70)
ad_daily_limit           ← лимит рекламы (default 3)
season_pass_price_gems   ← цена сезон-пасса (default 150)
bonus_xp_multiplier      ← множитель прогресса (default 1.0)
```
