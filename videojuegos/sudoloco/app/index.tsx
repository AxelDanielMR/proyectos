import { Redirect } from 'expo-router';
import { useAuthStore } from '@features/auth';

export default function Index() {
  const status = useAuthStore((s) => s.status);

  // Sin esto, el árbol de tabs (protegido) se monta y dispara queries a
  // Firestore antes de que resuelva onAuthStateChanged — AuthGuard corrige
  // el rumbo después, pero de por medio ya hubo un round-trip con
  // auth.currentUser === null (posibles permission-denied).
  if (status === 'loading') return null;

  return (
    <Redirect
      href={status === 'authenticated' ? '/(tabs)/home' : '/(auth)/login'}
    />
  );
}
