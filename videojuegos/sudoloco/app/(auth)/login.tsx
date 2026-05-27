import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@services/firebase';
import { colors } from '@theme/colors';

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'auth.errors.invalidEmail';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'auth.errors.wrongPassword';
    case 'auth/user-not-found':
      return 'auth.errors.userNotFound';
    default:
      return 'auth.errors.generic';
  }
}

export default function LoginScreen() {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      setError(`[${code}] ${t(mapAuthError(code))}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.title}>{t('auth.loginTitle')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            placeholderTextColor={colors.text.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t('auth.password')}
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{t('auth.loginBtn')}</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={styles.link}>{t('auth.createAccount')}</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.base },
  kav: { flex: 1 },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text.primary,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text.primary,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeText: {
    fontSize: 18,
  },
  errorText: {
    color: colors.state.danger,
    fontSize: 14,
  },
  btn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  footerText: { color: colors.text.secondary, fontSize: 14 },
  link: { color: colors.brand.primary, fontWeight: '600', fontSize: 14 },
});
