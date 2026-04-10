// ============================================================
// FIREBASE CONFIG — с защитой от ошибок инициализации
// Если Firebase недоступен → isFirebaseAvailable = false
// Все сервисы обязаны проверять этот флаг.
// ============================================================
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCTB0GGE9mj_muS27eU9RjSFvtXgf8Mo1I",
  authDomain: "riverlords-1fb8d.firebaseapp.com",
  projectId: "riverlords-1fb8d",
  storageBucket: "riverlords-1fb8d.firebasestorage.app",
  messagingSenderId: "961065612969",
  appId: "1:961065612969:web:6d9f7e7f071c6a5a971bb8",
  measurementId: "G-H7BT3PMFD6"
};

// Флаг: Firebase доступен
export let isFirebaseAvailable = false;

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

try {
  _app  = initializeApp(firebaseConfig);
  _auth = getAuth(_app);

  // Новый API вместо deprecated getFirestore + enableIndexedDbPersistence
  try {
    _db = initializeFirestore(_app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Fallback если persistentLocalCache не поддерживается (старый браузер)
    _db = initializeFirestore(_app, {});
  }

  isFirebaseAvailable = true;
  console.log('[Firebase] ✅ Firestore initialized with persistent cache');
} catch (e) {
  console.warn('[Firebase] ⚠️ Failed to initialize — using localStorage fallback', e);
  isFirebaseAvailable = false;
}

// Безопасные геттеры — никогда не возвращают null в рабочем коде
export const auth: Auth = _auth!;
export const db: Firestore = _db!;
