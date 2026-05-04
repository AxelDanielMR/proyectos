import { z } from 'zod';

const EnvSchema = z.object({
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_DATABASE_URL: z.string().url().optional(),
  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
});

const parsed = EnvSchema.safeParse({
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  EXPO_PUBLIC_FIREBASE_DATABASE_URL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
});

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')}`,
  );
}

export const env = parsed.data;
