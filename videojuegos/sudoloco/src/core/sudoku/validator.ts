import type { Board, CellValue, MoveResult } from './types';

export interface CellInfo {
  readonly row: number;
  readonly col: number;
  readonly box: number;
}

export function cellInfo(idx: number): CellInfo {
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  return { row, col, box };
}

// Pre-compute peer sets for all 81 cells (cells sharing row, col, or box).
function buildPeers(): readonly ReadonlySet<number>[] {
  return Array.from({ length: 81 }, (_, i) => {
    const { row, col, box } = cellInfo(i);
    const s = new Set<number>();
    for (let j = 0; j < 81; j++) {
      if (j === i) continue;
      const { row: r2, col: c2, box: b2 } = cellInfo(j);
      if (r2 === row || c2 === col || b2 === box) s.add(j);
    }
    return s;
  });
}

const PEERS: readonly ReadonlySet<number>[] = buildPeers();

export function getPeers(idx: number): ReadonlySet<number> {
  return PEERS[idx]!;
}

// Pre-compute the 9 cell indices for each of the 9 boxes.
function buildBoxCells(): readonly number[][] {
  return Array.from({ length: 9 }, (_, box) => {
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    const cells: number[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        cells.push((startRow + r) * 9 + (startCol + c));
      }
    }
    return cells;
  });
}

export const BOX_CELLS: readonly number[][] = buildBoxCells();

export function isValid(board: Board, idx: number, value: CellValue): boolean {
  if (value === 0) return true;
  const peers = PEERS[idx]!;
  for (const peer of peers) {
    if (board[peer] === value) return false;
  }
  return true;
}

export function validateMove(
  board: Board,
  idx: number,
  value: CellValue,
): MoveResult {
  if (value === 0) return { valid: true, conflictsWith: [] };
  const peers = PEERS[idx]!;
  const conflictsWith: number[] = [];
  for (const peer of peers) {
    if (board[peer] === value) conflictsWith.push(peer);
  }
  return { valid: conflictsWith.length === 0, conflictsWith };
}

export function isBoardSolved(board: Board, solution: Board): boolean {
  for (let i = 0; i < 81; i++) {
    if (board[i] !== solution[i]) return false;
  }
  return true;
}
