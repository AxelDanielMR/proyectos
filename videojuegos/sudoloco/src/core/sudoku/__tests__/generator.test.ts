import { generate } from '../generator';
import { hasUniqueSolution } from '../solver';
import { isValid } from '../validator';
import { getClueRange } from '../difficulty';
import type { Difficulty } from '../types';

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'hard', 'expert'];

describe('generate', () => {
  it('is deterministic: same seed produces the same puzzle', () => {
    const a = generate('beginner', 'test-seed-1');
    const b = generate('beginner', 'test-seed-1');
    expect(a.initial).toEqual(b.initial);
    expect(a.solution).toEqual(b.solution);
  });

  it('produces different puzzles for different seeds', () => {
    const a = generate('beginner', 'seed-A');
    const b = generate('beginner', 'seed-B');
    expect(a.initial).not.toEqual(b.initial);
  });

  it('produces different puzzles for different difficulties with the same seed', () => {
    const beginner = generate('beginner', 'same-seed');
    const expert = generate('expert', 'same-seed');
    expect(beginner.initial).not.toEqual(expert.initial);
  });

  it('stores seed and difficulty in the returned puzzle', () => {
    const puzzle = generate('hard', 'my-seed');
    expect(puzzle.seed).toBe('my-seed');
    expect(puzzle.difficulty).toBe('hard');
  });

  for (const difficulty of DIFFICULTIES) {
    describe(`difficulty: ${difficulty}`, () => {
      const puzzle = generate(difficulty, `test-${difficulty}`);
      const { min, max } = getClueRange(difficulty);
      const clueCount = puzzle.initial.filter((v) => v !== 0).length;

      it(`clue count is within range [${min}, ${max}]`, () => {
        expect(clueCount).toBeGreaterThanOrEqual(min);
        expect(clueCount).toBeLessThanOrEqual(max);
      });

      it('solution is a complete board (no zeros)', () => {
        expect(puzzle.solution.every((v) => v !== 0)).toBe(true);
      });

      it('solution has no conflicts', () => {
        for (let i = 0; i < 81; i++) {
          // Temporarily clear cell and check against the value.
          const board = [...puzzle.solution] as typeof puzzle.solution;
          (board as number[])[i] = 0;
          expect(isValid(board, i, puzzle.solution[i]!)).toBe(true);
        }
      });

      it('initial board cells match the solution where given', () => {
        for (let i = 0; i < 81; i++) {
          if (puzzle.initial[i] !== 0) {
            expect(puzzle.initial[i]).toBe(puzzle.solution[i]);
          }
        }
      });

      it('puzzle has a unique solution', () => {
        expect(hasUniqueSolution(puzzle.initial)).toBe(true);
      });
    });
  }
});
