import { useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';

// Sin esto, las queries nunca se refrescan al volver del background — RN no
// tiene "window focus", así que TanStack Query no sabe cuándo revalidar salvo
// que se lo digamos vía AppState.
//
// NOTA: onlineManager (revalidar al recuperar conexión) necesitaría
// @react-native-community/netinfo, que no está instalado — no se agrega aquí
// para no meter una dependencia nueva sin pedirla explícitamente.
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
