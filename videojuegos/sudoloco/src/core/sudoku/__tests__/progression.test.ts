import { levelConfig, INITIAL_TIME_S } from '../progression';

describe('levelConfig', () => {
  it('nivel 1-3 son beginner', () => {
    expect(levelConfig(1).difficulty).toBe('beginner');
    expect(levelConfig(2).difficulty).toBe('beginner');
    expect(levelConfig(3).difficulty).toBe('beginner');
  });

  it('nivel 4-7 son intermediate', () => {
    expect(levelConfig(4).difficulty).toBe('intermediate');
    expect(levelConfig(7).difficulty).toBe('intermediate');
  });

  it('nivel 8-12 son hard', () => {
    expect(levelConfig(8).difficulty).toBe('hard');
    expect(levelConfig(12).difficulty).toBe('hard');
  });

  it('nivel 13+ son expert', () => {
    expect(levelConfig(13).difficulty).toBe('expert');
    expect(levelConfig(50).difficulty).toBe('expert');
  });

  it('beginner suma 4s por celda correcta', () => {
    expect(levelConfig(1).secsPerCell).toBe(4);
  });

  it('intermediate suma 3s por celda correcta', () => {
    expect(levelConfig(4).secsPerCell).toBe(3);
  });

  it('hard suma 2s por celda correcta', () => {
    expect(levelConfig(8).secsPerCell).toBe(2);
  });

  it('expert suma 2s por celda correcta', () => {
    expect(levelConfig(13).secsPerCell).toBe(2);
  });

  it('INITIAL_TIME_S = 180', () => {
    expect(INITIAL_TIME_S).toBe(180);
  });
});
