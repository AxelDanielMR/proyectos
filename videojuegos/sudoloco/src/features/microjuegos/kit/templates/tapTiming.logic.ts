export interface TimingWindow {
  start: number;
  end: number;
}

/**
 * Ventana de acierto sobre la línea de tiempo 0..1 del móvil. Más difícil = más angosta.
 * Centrada en 0.7 (el móvil "llega" al bate hacia el final del recorrido).
 */
export function windowForDifficulty(difficulty: number): TimingWindow {
  const d = Math.max(0, Math.min(1, difficulty));
  const half = 0.18 - 0.12 * d; // 0.18 (fácil) → 0.06 (difícil)
  const center = 0.7;
  return { start: center - half, end: center + half };
}

export function isWithinWindow(t: number, start: number, end: number): boolean {
  return t >= start && t <= end;
}
