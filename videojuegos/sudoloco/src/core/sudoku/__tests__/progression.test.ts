import { levelConfig, INITIAL_TIME_S } from '../progression';

describe('INITIAL_TIME_S', () => {
  it('is 180 seconds', () => {
    expect(INITIAL_TIME_S).toBe(180);
  });
});

describe('levelConfig', () => {
  it('returns beginner for levels 1–3', () => {
    expect(levelConfig(1)).toEqual({ difficulty: 'beginner', secsPerCell: 4 });
    expect(levelConfig(2)).toEqual({ difficulty: 'beginner', secsPerCell: 4 });
    expect(levelConfig(3)).toEqual({ difficulty: 'beginner', secsPerCell: 4 });
  });

  it('returns intermediate for levels 4–7', () => {
    expect(levelConfig(4)).toEqual({ difficulty: 'intermediate', secsPerCell: 3 });
    expect(levelConfig(7)).toEqual({ difficulty: 'intermediate', secsPerCell: 3 });
  });

  it('returns hard for levels 8–12', () => {
    expect(levelConfig(8)).toEqual({ difficulty: 'hard', secsPerCell: 2 });
    expect(levelConfig(12)).toEqual({ difficulty: 'hard', secsPerCell: 2 });
  });

  it('returns expert for level 13 and beyond', () => {
    expect(levelConfig(13)).toEqual({ difficulty: 'expert', secsPerCell: 2 });
    expect(levelConfig(20)).toEqual({ difficulty: 'expert', secsPerCell: 2 });
    expect(levelConfig(100)).toEqual({ difficulty: 'expert', secsPerCell: 2 });
  });

  it('covers every boundary correctly', () => {
    expect(levelConfig(3).difficulty).toBe('beginner');
    expect(levelConfig(4).difficulty).toBe('intermediate');
    expect(levelConfig(7).difficulty).toBe('intermediate');
    expect(levelConfig(8).difficulty).toBe('hard');
    expect(levelConfig(12).difficulty).toBe('hard');
    expect(levelConfig(13).difficulty).toBe('expert');
  });
});
