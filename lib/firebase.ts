import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp({
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
}) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, config.firestoreDatabaseId);
