import React from 'react';
import { render, screen } from '@testing-library/react-native';
import i18n from '@i18n/index';
import { LivesDisplay, TimerDisplay, ScoreDisplay } from '../HUD';

// El locale detectado depende del mock de expo-localization en el entorno de
// test (no del dispositivo real) — se fija explícitamente para que estas
// pruebas no dependan de qué locale reporte esa API en CI.
beforeAll(async () => {
  await i18n.changeLanguage('es');
});

function countImages(node: unknown): number {
  if (node == null || typeof node !== 'object') return 0;
  const n = node as { type?: string; children?: unknown[] };
  const self = n.type === 'Image' ? 1 : 0;
  const childCount = Array.isArray(n.children)
    ? n.children.reduce((sum: number, child) => sum + countImages(child), 0)
    : 0;
  return self + childCount;
}

describe('ScoreDisplay', () => {
  it('renders the translated level label and the raw score', async () => {
    await render(<ScoreDisplay score={12345} level={7} />);
    expect(screen.getByText('Nv 7')).toBeTruthy();
    expect(screen.getByText('12,345')).toBeTruthy();
  });
});

describe('TimerDisplay', () => {
  it('formats seconds as MM:SS', async () => {
    await render(<TimerDisplay timeRemaining={65} />);
    expect(screen.getByText('01:05')).toBeTruthy();
  });
});

describe('LivesDisplay', () => {
  it('renders one heart per life and clamps negative lives to zero', async () => {
    const { rerender, toJSON } = await render(
      <LivesDisplay lives={3} crystalHearts={0} />,
    );
    expect(countImages(toJSON())).toBe(3);

    await rerender(<LivesDisplay lives={-2} crystalHearts={1} />);
    expect(countImages(toJSON())).toBe(1);
  });
});
