import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { z } from 'zod';
import { firestore } from './client';

// --- Schema ---

export const UserProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  wallet: z.object({ coins: z.number().int().min(0) }),
  unlocked: z.object({
    symbolPackIds: z.array(z.string()),
    boardSkinIds: z.array(z.string()),
  }),
  active: z.object({
    symbolPackId: z.string(),
    boardSkinId: z.string().optional(),
  }),
  stats: z.object({
    highscore: z.number().int().min(0),
    totalGames: z.number().int().min(0),
  }),
  createdAt: z.unknown(),
  updatedAt: z.unknown(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// --- Helpers ---

function userRef(uid: string) {
  return doc(firestore, 'users', uid);
}

// --- Repo ---

export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return null;
  const result = UserProfileSchema.safeParse({ uid, ...snap.data() });
  if (!result.success) {
    console.warn('[users.repo] Firestore data invalid:', result.error.issues);
    return null;
  }
  return result.data;
}

export async function createUser(
  uid: string,
  email: string,
  displayName: string,
): Promise<UserProfile> {
  const profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'> = {
    displayName,
    email,
    wallet: { coins: 0 },
    unlocked: { symbolPackIds: ['numbers', 'colors'], boardSkinIds: [] },
    active: { symbolPackId: 'numbers' },
    stats: { highscore: 0, totalGames: 0 },
  };

  await setDoc(userRef(uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { uid, ...profile, createdAt: null, updatedAt: null };
}

export async function updateActiveSymbolPack(
  uid: string,
  packId: string,
): Promise<void> {
  await updateDoc(userRef(uid), {
    'active.symbolPackId': packId,
    updatedAt: serverTimestamp(),
  });
}

export async function updateHighscoreIfBetter(
  uid: string,
  score: number,
): Promise<void> {
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(userRef(uid));
    if (!snap.exists()) return;
    const current = (snap.data().stats?.highscore as number | undefined) ?? 0;
    if (score <= current) return;
    tx.update(userRef(uid), {
      'stats.highscore': score,
      'stats.totalGames': ((snap.data().stats?.totalGames as number | undefined) ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function addCoins(uid: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(userRef(uid));
    if (!snap.exists()) return;
    const current = (snap.data().wallet?.coins as number | undefined) ?? 0;
    tx.update(userRef(uid), {
      'wallet.coins': current + amount,
      updatedAt: serverTimestamp(),
    });
  });
}
