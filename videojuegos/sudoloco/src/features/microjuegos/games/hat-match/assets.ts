import type { Visual } from '../../types';

export interface CharacterAsset {
  id: string;
  character: Visual; // el personaje sin sombrero
  hat: Visual; // el sombrero que le pertenece
}

/** Pool de 5 profesionistas + su sombrero. Placeholder emoji hasta tener arte. */
export const CHARACTERS: CharacterAsset[] = [
  { id: 'ingeniero', character: { emoji: '👷', label: 'Ingeniero' }, hat: { emoji: '⛑️' } },
  { id: 'bombero', character: { emoji: '🧑‍🚒', label: 'Bombero' }, hat: { emoji: '🎩' } },
  { id: 'vaquero', character: { emoji: '🤠', label: 'Vaquero' }, hat: { emoji: '👒' } },
  { id: 'pirata', character: { emoji: '🏴‍☠️', label: 'Pirata' }, hat: { emoji: '🎓' } },
  { id: 'alcalde', character: { emoji: '🧑‍💼', label: 'Alcalde' }, hat: { emoji: '👑' } },
];
