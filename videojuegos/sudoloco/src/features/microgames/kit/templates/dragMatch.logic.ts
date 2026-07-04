export interface DropTargetHit {
  id: string;
  cx: number;
  cy: number;
  radius: number;
}

/** Devuelve el id del primer target cuyo círculo contiene el punto, o null. */
export function resolveDrop(
  targets: DropTargetHit[],
  dropX: number,
  dropY: number,
): string | null {
  for (const t of targets) {
    const dx = dropX - t.cx;
    const dy = dropY - t.cy;
    if (dx * dx + dy * dy <= t.radius * t.radius) return t.id;
  }
  return null;
}

export function isMatchCorrect(droppedTargetId: string | null, expectedId: string): boolean {
  return droppedTargetId === expectedId;
}
