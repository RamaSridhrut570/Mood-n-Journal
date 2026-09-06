'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  accessToken: null,
  signIn: async () => {},
  logOut: async () => {},
});

let cachedAccessToken: string | null = null;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenState, setTokenState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('google_access_token');
      if (storedToken) {
        cachedAccessToken = storedToken;
        return storedToken;
      }
    }
    return null;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        cachedAccessToken = null;
        setTokenState(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('google_access_token');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        setTokenState(credential.accessToken);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('google_access_token', credential.accessToken);
        }
      }
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      cachedAccessToken = null;
      setTokenState(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('google_access_token');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken: tokenState || cachedAccessToken, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
