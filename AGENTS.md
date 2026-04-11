# 🎮 River Lord: Pixel Fishery — AGENTS.md
> Читай этот файл ПЕРВЫМ при каждом запуске Codex в этой папке

## ⚡ ЛИМИТ ТОКЕНОВ
**Никогда не превышать 32 000 токенов за ответ.**
Код > 150 строк → разбить на подзадачи. После каждого шага: "✅ Шаг X готов."

---

## 📁 РАБОЧАЯ ПАПКА
```
/mnt/fishgame/   ← ВСЯ работа только здесь
```

## 📚 ЧИТАТЬ ПЕРЕД ЛЮБОЙ ЗАДАЧЕЙ
| Приоритет | Файл | Зачем |
|---|---|---|
| 1 | `/документы/ARCHITECTURE_V2.md` | Полная архитектура + куда класть ассеты |
| 2 | `/тз/11_GAME_CONFIGS.md` | Все конфиги: рыбы, биомы, NPC, здания |
| 3 | `/тз/09_SCENARIO.md` | Сценарий A→Z, все экраны |
| 4 | `/тз/08_SCENES_SUPPLEMENT.md` | Дизайн каждой сцены (геометрия, камера) |
| 5 | `/.Codex/skills/river-lord/SKILL.md` | Правила кода |

---

## 🚫 ЖЁСТКИЕ ПРАВИЛА (нарушать нельзя)

1. **ТОЛЬКО Three.js r168+** — никакого Phaser, Babylon.js, PlayCanvas, чистого 2D
2. **Canvas API текстуры** — внешние URL заблокированы CORS → `EarthTextures.ts`
3. **Попапы на `document.body`** — НЕ на `uiContainer` (у него `pointer-events:none`)
4. **`updatePlayerStats()`** — метод называется ТАК. Не `updatePlayerProfile()`!
5. **`NearestFilter`** — для всех pixel art текстур обязательно
6. **TS check** — после каждого файла: `./node_modules/.bin/tsc --noEmit`
7. **Автосохранение** — каждые 30 сек + после ключевых действий (поимка, постройка)
8. **Мультиплеер** — только Firebase Realtime Database (roadmap v2, не в MVP v1.0)
9. **Язык ответов** — только русский

---

## 🎨 ВИЗУАЛЬНЫЙ СТИЛЬ

**Low-poly voxel 3D pixel art:**
- Текстуры: 64×64, crisp pixel art, `NearestFilter`
- Цвета: `--bg:#0a1628` `--accent:#3498db` `--green:#27ae60` `--gold:#f39c12`
- Шрифты: `Press Start 2P` (заголовки H1-H2) + `Rajdhani` (UI текст)
- Кнопки: `clip-path: polygon(0 0, calc(100%-8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100%-8px))`
- Освещение: `AmbientLight(0xffffff, 0.6)` + `DirectionalLight(0xffd700, 0.8)`

**Master-prompt для генерации изображений:**
```
Cozy volumetric blocky voxel 3D pixel art in River Lord: Pixel Fishery style.
Classic Warm Voxel base. All objects from visible crisp square voxel blocks,
strong volumetric lighting, soft warm golden glow (#FFEEB3, 0.4),
flat shading, pure black background (#0a1628), vibrant saturated colors.
No realistic textures, no high-poly. Isometric 2.5D, 64×64 pixel art canvas.
```

---

## 📂 АССЕТЫ — КУДА ДОБАВЛЯТЬ

```
public/assets/
├── images/
│   ├── baits/         ← 5 иконок приманок (64×64 PNG)
│   ├── fish/          ← 40 иконок рыб (64×64 PNG)
│   ├── buildings/     ← 5 зданий × 5 уровней (PNG)
│   ├── npc/           ← 12 портретов NPC (128×128 PNG)
│   ├── pets/          ← 10 питомцев (64×64 PNG)
│   ├── avatars/       ← 5 аватаров игрока (96×96 PNG)
│   └── textures/      ← pixel art текстуры для Three.js (64×64)
│       ├── water_tile.png
│       ├── grass_tile.png
│       └── earth_diffuse.png (опционально к Canvas API)
└── audio/
    ├── music/         ← .mp3 треки (looped)
    └── sfx/           ← .mp3 звуки эффектов
```

Полный список: `/тз/10_ASSETS_NEEDED.md`

---

## 🇦🇷 ARGENTINA SYSTEM

```typescript
// Только 3 игровых биома
PLAYABLE_BIOMES = [
  { id: 'rio_salado',     level: 1, lat: -35.5, lon: -63.2 }, // старт
  { id: 'nahuel_huapi',   level: 2, lat: -41.1, lon: -71.4 }, // дер.5 + 1500 рес
  { id: 'lago_argentino', level: 3, lat: -50.3, lon: -72.3 }  // дер.12 + 8000 рес
]
// Граница: lat -55..-21, lon -73..-53
// territoryRadius = 2.5 + village.level * 0.8 (в градусах)
```

---

## 🎣 FISHING SCENE — КЛЮЧЕВЫЕ КОНСТАНТЫ

```typescript
const TENSION_RATE = 15;        // ед/сек при удержании
const CRASH_THRESHOLD = 80;     // обрыв лески при > 80
const RELEASE_RATE = 20;        // спад при отпускании
// catchChance: common=0.7, uncommon=0.5, rare=0.3, epic=0.15
// Duolingo checkpoints: 5-8, stars: 1★(≥1рыба), 2★(≥5), 3★(≥8)
```

---

## ✅ ПОСЛЕ КАЖДОЙ ЗАДАЧИ
```
1. ./node_modules/.bin/tsc --noEmit → должно быть 0 ошибок
2. Вывести: "ЗАДАЧА #X ВЫПОЛНЕНА ✅"
3. Чек-лист изменений
4. "Готов к следующей задаче. Жду команду."
```

---

## 📋 ЗАДАЧИ ДЛЯ Codex

Смотри папку `/Code_tz/`:
- `00_MASTER_PROMPT.md` — читать первым
- `01_FOUNDATION.md` — фундамент (данные, сервисы, Argentina)
- `02_PLANET_VILLAGE.md` — PlanetScene + VillagePlacement
- `03_BIOME_FARM.md` — BiomeView + FarmScene улучшение
- `04_FISHING_SCENE.md` — полная Duolingo-fishing механика
- `05_NPC_PET_SCREENS.md` — NPC + питомцы + профиль
- `06_DATA_SERVICES.md` — все data-файлы + BiomeManager
- `07_ONBOARDING_SEASON.md` — туториал + Season Pass
- `08_FINAL_VERIFICATION.md` — финальная проверка % точности

---

## 🔗 NOTION СТРАНИЦА
https://www.notion.so/33b43ca708a08021823cc1732a65bb34
(Полная презентация проекта, добавлять картинки когда будут готовы)
