import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, useUserProfile, useUpdateSymbolPack } from '@features/auth';
import { SYMBOL_PACKS } from '@core/symbols';
import { colors } from '@theme/colors';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuthStore();
  const { data: profile, isLoading } = useUserProfile(user?.uid);
  const { mutate: updatePack, isPending: updatingPack } = useUpdateSymbolPack();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{t('profile.title')}</Text>

        {user && (
          <Text style={styles.displayName}>
            {user.displayName ?? user.email}
          </Text>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label={t('profile.highscore')} value={profile?.stats.highscore ?? 0} />
          <Stat label={t('profile.coins')} value={profile?.wallet.coins ?? 0} />
          <Stat label={t('profile.totalGames')} value={profile?.stats.totalGames ?? 0} />
        </View>

        {/* Symbol pack selector */}
        <Text style={styles.sectionLabel}>{t('profile.symbolPack')}</Text>
        <View style={styles.packRow}>
          {SYMBOL_PACKS.map((pack) => {
            const isActive = profile?.active.symbolPackId === pack.id;
            const isUnlocked = profile?.unlocked.symbolPackIds.includes(pack.id) ?? false;
            return (
              <Pressable
                key={pack.id}
                style={[
                  styles.packBtn,
                  isActive && styles.packBtnActive,
                  !isUnlocked && styles.packBtnLocked,
                ]}
                disabled={!isUnlocked || updatingPack || isActive}
                onPress={() => {
                  if (user && isUnlocked) {
                    updatePack({ uid: user.uid, packId: pack.id });
                  }
                }}
              >
                <Text style={[styles.packLabel, isActive && styles.packLabelActive]}>
                  {pack.name}
                </Text>
                {!isUnlocked && <Text style={styles.lockIcon}>🔒</Text>}
              </Pressable>
            );
          })}
        </View>

        {/* Sign out */}
        <Pressable style={styles.signOutBtn} onPress={() => signOut()}>
          <Text style={styles.signOutText}>{t('auth.signOut')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: 24, gap: 20 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
  },
  displayName: {
    fontSize: 17,
    color: colors.text.secondary,
    marginTop: -12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  packRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  packBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.bg.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packBtnActive: {
    borderColor: colors.brand.primary,
  },
  packBtnLocked: {
    opacity: 0.5,
  },
  packLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  packLabelActive: {
    color: colors.brand.primary,
  },
  lockIcon: { fontSize: 12 },
  signOutBtn: {
    marginTop: 'auto',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.state.danger,
  },
});
