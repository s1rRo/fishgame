---
name: store-prep
description: >
  Подготовка River Lord к публикации в магазинах: App Store, Google Play, Steam.
  Активируй при: App Store, Google Play, Steam, публикация, submit, submission,
  магазин приложений, store listing, screenshots, скриншоты для магазина,
  описание игры, store description, app store connect, play console, greenlight,
  steamworks, рейтинг, rating, PEGI, ESRB, privacy policy, политика конфиденциальности,
  app icon, иконка приложения, выпустить игру, релиз, launch, release,
  age rating, ключевые слова, keywords, ASO, store optimization.
---

# Store Prep — River Lord: Pixel Fishery

Полный чеклист и шаблоны для публикации игры в App Store, Google Play и Steam.

---

## 🍎 APP STORE (iOS)

### Технические требования
```
Xcode 15+
iOS Deployment Target: 14.0+
Bundle ID: com.riverlordfishery.app
Swift/ObjC wrapper: Capacitor (см. capacitor-deploy skill)

Ориентация: Landscape Left + Landscape Right (обязательно!)
UIStatusBarHidden = YES в Info.plist
```

### Иконки (обязательные размеры)
```
1024×1024 — App Store (основная)
180×180   — iPhone @3x
120×120   — iPhone @2x
87×87     — iPad @3x (если поддерживается iPad)
```
Инструмент: https://appicon.co — загрузи `icon-1024.png`, скачай все размеры.

### Скриншоты App Store
```
iPhone 6.7" (required): 1290×2796 px — минимум 3, максимум 10
iPhone 5.5" (required): 1242×2208 px — минимум 3
iPad 12.9"  (optional): 2048×2732 px — если поддерживаешь iPad
```
Поскольку игра landscape, скриншоты нужно делать в альбомной ориентации:
```
iPhone 6.7" landscape: 2796×1290 px
iPhone 5.5" landscape: 2208×1242 px
```

### Метаданные (App Store Connect)
```
Название:           River Lord: Pixel Fishery
Подзаголовок:       3D рыбалка и ферма
Описание (4000 chr):
  Погрузись в расслабляющий мир рыбалки! River Lord — casual 3D игра
  с пиксельным стилем, где ты ловишь рыбу в 10 реальных регионах мира,
  строишь ферму и покоряешь мировые рекорды.

  🎣 10 водоёмов по всему миру
  🏡 Стройте и развивайте ферму
  🐟 36 видов рыб, включая легендарных
  🏆 Система River Lord — стань лучшим на каждом водоёме
  📅 Еженедельный Season Pass с наградами

Ключевые слова (100 chr):
  рыбалка,ферма,3D,pixel,casual,fishing,farm,idle,relaxing,рыболов

Категория:   Games > Casual
Подкатегория: Games > Simulation

Возрастной рейтинг: 4+ (нет насилия, нет покупок)
```

### Privacy Policy (обязательна для Firebase Auth)
Минимальный текст (разместить на GitHub Pages или Firebase Hosting):
```
River Lord Privacy Policy

We collect:
- Anonymous authentication data (Firebase Auth)
- Game progress data (Firestore)
- Usage analytics (Firebase Analytics)

We do not sell personal data.
Contact: [твой email]
```

### Процесс сабмита
```
1. Product → Archive в Xcode
2. Distribute App → App Store Connect
3. App Store Connect → My Apps → + New App
4. Заполнить метаданные, загрузить скриншоты
5. Submit for Review (обычно 24–48 часов)
```

---

## 🤖 GOOGLE PLAY (Android)

### Технические требования
```
Target SDK: 34 (Android 14)
Min SDK: 21 (Android 5.0)
Ориентация: screenOrientation="landscape" в AndroidManifest.xml
App Bundle: .aab (не .apk для Play Store)
```

### Иконки
```
512×512 — Store icon (обязательная)
```
Adaptive icon (рекомендуется):
```
108×108 foreground layer (с padding 18px)
108×108 background layer
```

### Скриншоты Google Play
```
Телефон (required): min 2, max 8
  Размер: 320–3840 px, соотношение 16:9 или 9:16
  Landscape 16:9: 1920×1080 рекомендуется

Feature Graphic (required): 1024×500 px
  Баннер для страницы магазина — создай в Figma/Canva
```

### Метаданные (Play Console)
```
Название:       River Lord: Pixel Fishery (50 chr max)
Краткое описание (80 chr):
  3D рыбалка и ферма в пиксельном стиле. 10 регионов мира!

Полное описание (4000 chr):
  [аналогично App Store, выше]

Категория: Games / Casual
Теги: fishing, farm, 3d, pixel art, casual, idle
```

### Рейтинг контента
```
Questionnaire в Play Console → Games:
- Violence: None
- Sexual Content: None
- Language: Mild
→ Результат: Everyone (E) / PEGI 3
```

### Data Safety (обязательно с 2022)
```
Location data: No
Personal info:
  - Name: Collected (Firebase Auth display name), optional, not shared
  - Email: Collected if Google Sign-in, optional, not shared
App activity:
  - App interactions: Collected, analytics, not shared
  - In-app purchase history: No
```

---

## 🎮 STEAM (PC)

### Стоимость публикации
```
$100 — единоразовый сбор за Steamworks
(возвращается после $1000 дохода)
```

### Технические требования (Electron)
```
Windows build: .exe (NSIS installer или portable)
macOS build:   .dmg
Linux build:   .AppImage

Минимальные системные требования:
  OS: Windows 10 / macOS 10.14 / Ubuntu 20.04
  CPU: Intel i3 2 GHz+
  RAM: 2 GB
  GPU: Intel HD 4000+ (WebGL 2.0 support)
  Storage: 150 MB

Разрешение: 1280×720 минимум, поддержка 4K
```

### Steam Store Assets (обязательные)
```
Header Image:      460×215 px
Capsule Small:     231×87 px
Capsule Large:     616×353 px
Capsule Main:      616×353 px (featured)
Library Capsule:   600×900 px (вертикальная)
Library Hero:      3840×1240 px (горизонтальная)
Screenshots:       min 5, рекомендуется 10, формат 1920×1080
Trailer:           необязателен, но увеличивает конверсию на 25%
```

### Категории и теги Steam
```
Жанры (выбрать при создании страницы):
  Casual, Simulation, Indie

Теги (пользовательские, Steam добавит сам, но ты можешь предложить):
  Fishing, Farming Sim, Casual, Pixel Art, 3D, Relaxing,
  Colorful, Single Player, Atmospheric
```

### Возрастной рейтинг Steam
```
Steam Rating: Everyone / All Ages
PEGI: 3
ESRB: E (Everyone)
→ Нет крови, нет насилия, нет азартных игр (gems — это soft premium, не gambling)
```

---

## 📋 МАСТЕР-ЧЕКЛИСТ РЕЛИЗА

### Перед сборкой
```
□ npm run build — без ошибок, dist/ создан
□ Версия обновлена в package.json (semver: 1.0.0)
□ Все console.error убраны или задизейблены в prod
□ Firebase Config — production ключи, не dev
□ Analytics включена
□ Service Worker актуален (обновлён CACHE_NAME)
□ PWA manifest.json — name, icons, theme_color проверены
```

### Визуальные ассеты
```
□ Icon 1024×1024 создан (pixel art стиль — рыбак + удочка)
□ Screenshots сделаны на реальных устройствах (не симулятор)
□ Feature Graphic 1024×500 готов
□ Trailer/preview video (желательно 30–60 сек)
```

### Магазины
```
□ Privacy Policy URL готов и доступен
□ App Store Connect — заполнены все поля
□ Google Play Console — Data Safety заполнен
□ Steam Steamworks — store page approved
□ Все Build uploaded
□ Test Flight / Internal Testing проведён
```

### После публикации
```
□ Firebase Analytics → проверить что события приходят
□ Crashlytics → проверить нет крешей в первые 24 часа
□ Ответить на первые отзывы (влияет на рейтинг)
□ ASO: отслеживать ключевые слова через AppFollow/AppTweak
```

---

## 📝 ШАБЛОН ОПИСАНИЯ ДЛЯ МАГАЗИНОВ (RU)

```
River Lord: Pixel Fishery — расслабляющая 3D рыболовная игра в пиксельном стиле.

🌍 ПУТЕШЕСТВУЙ ПО ВСЕМУ МИРУ
10 уникальных водоёмов — от озёр Европы до глубин Тихого океана.
Каждый регион — новые рыбы, новые вызовы, новые рекорды.

🎣 АКТИВНАЯ РЫБАЛКА
Удерживай удочку, чувствуй натяжение лески, не дай рыбе уйти!
36 видов рыб: от обычного окуня до легендарной китовой акулы.

🏡 СТРОЙ ФЕРМУ
Развивай своё хозяйство: дом, пруд, коптильня, пристань.
Нанимай рыбаков, получай пассивный доход.

🏆 СТАНЬ RIVER LORD
Побей рекорды на каждом водоёме.
Соревнуйся с игроками со всего мира в таблице лидеров.

📅 SEASON PASS
Еженедельные задания и эксклюзивные награды.
Бесплатный трек + премиум с бонусами.
```

---

## 🔗 ПОЛЕЗНЫЕ ИНСТРУМЕНТЫ

```
appicon.co          — генерация иконок всех размеров из одного PNG
canva.com           — Feature Graphic, Store banners
screenshotcreator.com — красивые фреймы для скриншотов
appfollow.io        — мониторинг ASO и отзывов
```
