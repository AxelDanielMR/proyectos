export const colors = {
  bg: {
    base: '#0f172a',
    surface: '#1e293b',
    elevated: '#334155',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    muted: '#94a3b8',
  },
  brand: {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    accent: '#f59e0b',
  },
  state: {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  board: {
    cellBg: '#ffffff',
    cellBgFixed: '#f1f5f9',
    cellBgSelected: '#dbeafe',
    cellBgError: '#fee2e2',
    line: '#cbd5e1',
    thickLine: '#0f172a',
  },
} as const;

export type Colors = typeof colors;
