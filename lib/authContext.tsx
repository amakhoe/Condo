'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, UserProfile } from './firebase';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string, name: string, role?: 'admin' | 'tenant', unitNumber?: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  signOutUser: () => Promise<void>;
  switchUserRole: (role: 'admin' | 'tenant') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapAuthError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Ocorreu um erro inesperado na autenticação.';
  const code = (err as { code?: string }).code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'O endereço de email introduzido não é válido.';
    case 'auth/user-disabled':
      return 'Esta conta de utilizador foi desativada.';
    case 'auth/user-not-found':
      return 'Não existe nenhuma conta associada a este endereço de email.';
    case 'auth/wrong-password':
      return 'Palavra-passe incorreta. Verifique os dados ou utilize a recuperação de palavra-passe.';
    case 'auth/invalid-credential':
      return 'Email ou palavra-passe inválidos. Verifique os seus dados de acesso.';
    case 'auth/email-already-in-use':
      return 'Este endereço de email já se encontra registado. Tente iniciar sessão.';
    case 'auth/weak-password':
      return 'A palavra-passe deve conter pelo menos 6 caracteres.';
    case 'auth/missing-email':
      return 'Por favor, introduza o seu endereço de email.';
    case 'auth/missing-password':
      return 'Por favor, introduza a sua palavra-passe.';
    case 'auth/too-many-requests':
      return 'Demasiadas tentativas consecutivas. Aguarde alguns minutos e tente novamente.';
    case 'auth/network-request-failed':
      return 'Falha de comunicação com a rede. Verifique a sua ligação à internet.';
    default:
      return (err as Error).message || 'Falha ao processar a autenticação no Firebase.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  // Fetch or create user profile in Firestore
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      } else {
        // Create initial default profile
        const emailLower = (firebaseUser.email || '').toLowerCase();
        const isAdmin = emailLower.includes('admin') || emailLower.includes('sindico');
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || (isAdmin ? 'Administrador / Síndico' : 'Morador do Condomínio'),
          role: isAdmin ? 'admin' : 'tenant',
          unitNumber: isAdmin ? undefined : 'Q-101',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.warn('Não foi possível carregar perfil do Firestore:', err);
      // Fallback in-memory profile
      const emailLower = (firebaseUser.email || '').toLowerCase();
      const isAdmin = emailLower.includes('admin') || emailLower.includes('sindico');
      setUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || (isAdmin ? 'Administrador' : 'Morador'),
        role: isAdmin ? 'admin' : 'tenant',
        unitNumber: isAdmin ? undefined : 'Q-101',
        createdAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await syncUserProfile(cred.user);
      return true;
    } catch (err) {
      const msg = mapAuthError(err);
      setAuthError(msg);
      return false;
    }
  };

  const signUp = async (
    email: string, 
    pass: string, 
    name: string, 
    role: 'admin' | 'tenant' = 'admin',
    unitNumber?: string
  ): Promise<boolean> => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }

      const profile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || email.trim(),
        displayName: name.trim() || (role === 'admin' ? 'Administrador' : 'Morador'),
        role,
        unitNumber: role === 'tenant' ? (unitNumber || 'Q-101') : undefined,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', cred.user.uid), profile);
      } catch (e) {
        console.warn('Erro ao salvar utilizador no Firestore:', e);
      }

      setUserProfile(profile);
      return true;
    } catch (err) {
      const msg = mapAuthError(err);
      setAuthError(msg);
      return false;
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    setAuthError(null);
    if (!email || !email.trim()) {
      setAuthError('Por favor, introduza o seu endereço de email para receber o link de recuperação.');
      return false;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (err) {
      const msg = mapAuthError(err);
      setAuthError(msg);
      return false;
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const switchUserRole = (newRole: 'admin' | 'tenant') => {
    if (userProfile) {
      const updated = { ...userProfile, role: newRole };
      setUserProfile(updated);
      try {
        setDoc(doc(db, 'users', userProfile.uid), updated, { merge: true });
      } catch {
        // Silent local fallback
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        authError,
        clearAuthError,
        signIn,
        signUp,
        sendPasswordReset,
        signOutUser,
        switchUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
