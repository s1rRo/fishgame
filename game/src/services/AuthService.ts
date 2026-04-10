// ============================================================
// AUTH SERVICE — с LocalStorage fallback
// При недоступности Firebase → гостевой режим через localStorage
// ============================================================
import {
  signInAnonymously, GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, User, UserCredential
} from 'firebase/auth';
import { auth, isFirebaseAvailable } from './firebase-config';

// Мок-пользователь для offline/demo режима
const GUEST_UID_KEY = 'rl_guest_uid';
const GUEST_NAME_KEY = 'rl_guest_name';

function getOrCreateGuestUid(): string {
  let uid = localStorage.getItem(GUEST_UID_KEY);
  if (!uid) {
    uid = 'guest_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    localStorage.setItem(GUEST_UID_KEY, uid);
  }
  return uid;
}

// Минимальный мок объекта User для работы без Firebase
function createMockUser(uid: string, name?: string): User {
  return {
    uid,
    displayName: name || localStorage.getItem(GUEST_NAME_KEY) || 'Гость',
    email: null,
    emailVerified: false,
    isAnonymous: true,
    metadata: {} as any,
    providerData: [],
    providerId: 'local',
    refreshToken: '',
    tenantId: null,
    phoneNumber: null,
    photoURL: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
  } as User;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {
    if (isFirebaseAvailable) {
      onAuthStateChanged(auth, (user) => {
        this.currentUser = user;
      });
    } else {
      // В offline-режиме восстанавливаем гостя из localStorage
      const uid = localStorage.getItem(GUEST_UID_KEY);
      if (uid) this.currentUser = createMockUser(uid);
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async loginAnonymously(): Promise<User> {
    if (!isFirebaseAvailable) {
      // Offline fallback
      const user = createMockUser(getOrCreateGuestUid());
      this.currentUser = user;
      return user;
    }
    try {
      const credential = await signInAnonymously(auth);
      this.currentUser = credential.user;
      return credential.user;
    } catch (e: any) {
      // auth/operation-not-allowed — Anonymous Auth не включён в Firebase Console
      // Тихо падаем в offline гостевой режим
      console.warn('[Auth] Anonymous auth not enabled, falling back to guest mode:', e?.code);
      const user = createMockUser(getOrCreateGuestUid());
      this.currentUser = user;
      return user;
    }
  }

  public async loginWithGoogle(): Promise<User> {
    if (!isFirebaseAvailable) {
      const user = createMockUser(getOrCreateGuestUid(), 'Игрок Google');
      this.currentUser = user;
      return user;
    }
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      this.currentUser = credential.user;
      return credential.user;
    } catch (e: any) {
      console.warn('[Auth] Google auth failed, falling back to guest:', e?.code);
      const user = createMockUser(getOrCreateGuestUid());
      this.currentUser = user;
      return user;
    }
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public isGuestMode(): boolean {
    return !isFirebaseAvailable || this.currentUser?.isAnonymous === true;
  }
}
