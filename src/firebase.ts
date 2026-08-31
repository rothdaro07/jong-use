import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

const firebaseConfig = {
  projectId: firebaseConfigJson.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0555011935',
  authDomain: firebaseConfigJson.authDomain || `${firebaseConfigJson.projectId}.firebaseapp.com`,
  storageBucket: firebaseConfigJson.storageBucket || `${firebaseConfigJson.projectId}.firebasestorage.app`,
  apiKey: firebaseConfigJson.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  appId: firebaseConfigJson.appId,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  if (firebaseConfigJson.firestoreDatabaseId) {
    db = getFirestore(app, firebaseConfigJson.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch (e) {
  console.warn('Firebase initialization note:', e);
}

export { app, auth, db };

// Save user profile to Firestore
async function syncUserProfile(user: User) {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.isAnonymous ? 'Guest User' : 'Creator'),
        photoURL: user.photoURL || '',
        isAnonymous: user.isAnonymous,
        lastActiveAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync user document to Firestore:', err);
  }
}

export async function loginWithGoogle(): Promise<User | null> {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await syncUserProfile(result.user);
      return result.user;
    }
    return null;
  } catch (err: any) {
    console.error('Google Sign-In error:', err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      syncUserProfile(user);
    }
    callback(user);
  });
}

export async function ensureAnonymousAuth(): Promise<User | null> {
  if (!auth) return null;
  try {
    if (auth.currentUser) {
      return auth.currentUser;
    }
    const cred = await signInAnonymously(auth);
    if (cred.user) {
      await syncUserProfile(cred.user);
    }
    return cred.user;
  } catch (err) {
    console.warn('Anonymous auth fallback:', err);
    return null;
  }
}


