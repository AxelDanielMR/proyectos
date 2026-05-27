import { create } from 'zustand';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '@services/firebase';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: Pick<User, 'uid' | 'email' | 'displayName'> | null;
}

interface AuthActions {
  signOut(): Promise<void>;
  _startListener(): () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  status: 'loading',
  user: null,

  async signOut() {
    await firebaseSignOut(auth);
  },

  _startListener() {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        set({
          status: 'authenticated',
          user: { uid: user.uid, email: user.email, displayName: user.displayName },
        });
      } else {
        set({ status: 'unauthenticated', user: null });
      }
    });
  },
}));
