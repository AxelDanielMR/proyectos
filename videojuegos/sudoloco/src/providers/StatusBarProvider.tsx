import React, { createContext, useContext, useState } from 'react';

type StatusBarConfig = {
  backgroundColor: string;
  barStyle: 'light' | 'dark';
};

const StatusBarContext = createContext<{
  config: StatusBarConfig;
  setConfig: (config: StatusBarConfig) => void;
} | null>(null);

export function StatusBarProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StatusBarConfig>({
    backgroundColor: '#efe1c6',
    barStyle: 'dark',
  });

  return (
    <StatusBarContext.Provider value={{ config, setConfig }}>
      {children}
    </StatusBarContext.Provider>
  );
}

export function useStatusBarConfig() {
  const context = useContext(StatusBarContext);
  if (!context) {
    throw new Error('useStatusBarConfig must be used within StatusBarProvider');
  }
  return context;
}
