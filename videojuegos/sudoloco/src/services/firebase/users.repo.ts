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

function baseProfile(
  email: string,
  displayName: string,
): Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'> {
  return {
    displayName,
    email,
    wallet: { coins: 0 },
    unlocked: { symbolPackIds: ['numbers', 'colors'], boardSkinIds: [] },
    active: { symbolPackId: 'numbers' },
    stats: { highscore: 0, totalGames: 0 },
  };
}

export async function createUser(
  uid: string,
  email: string,
  displayName: string,
): Promise<UserProfile> {
  const profile = baseProfile(email, displayName);

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

// Canjea el resultado de una run en una sola transacción. Si el perfil no
// existe en Firestore (registro previo al cableado de createUser, o write
// fallido), lo crea aquí mismo — sin esto el canje sería un no-op silencioso.
export async function settleRun(
  uid: string,
  identity: { email: string; displayName: string },
  result: { score: number; coins: number },
): Promise<void> {
  const coins = Math.max(0, result.coins);
  const score = Math.max(0, result.score);
  await runTransaction(firestore, async (tx) => {
    const ref = userRef(uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      const profile = baseProfile(identity.email, identity.displayName);
      tx.set(ref, {
        ...profile,
        wallet: { coins },
        stats: { highscore: score, totalGames: 1 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }
    const data = snap.data();
    const highscore = (data.stats?.highscore as number | undefined) ?? 0;
    const totalGames = (data.stats?.totalGames as number | undefined) ?? 0;
    const currentCoins = (data.wallet?.coins as number | undefined) ?? 0;
    tx.update(ref, {
      'stats.highscore': Math.max(highscore, score),
      'stats.totalGames': totalGames + 1,
      'wallet.coins': currentCoins + coins,
      updatedAt: serverTimestamp(),
    });
  });
}
