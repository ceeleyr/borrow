import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { validateLoginForm } from '@/lib/validation';
import { getErrorMessage } from '@/lib/errors';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const found = validateLoginForm({ email, password });
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      await login(email, password); // Stack.Protected otomatis mengarahkan ke beranda
    } catch (e) {
      setServerError(getErrorMessage(e, 'Gagal masuk'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>📦</Text>
          <Text style={styles.title}>Borrow</Text>
          <Text style={styles.subtitle}>Pinjam barang komunitas dengan mudah</Text>

          <ErrorBanner message={serverError} />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="nama@email.com" error={errors.email} testID="login-email" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" error={errors.password} onSubmitEditing={submit} testID="login-password" />
          <Button title="Masuk" onPress={submit} loading={loading} testID="login-submit" />

          <Link href="/register" style={styles.link}>
            Belum punya akun? <Text style={{ fontWeight: '700' }}>Daftar</Text>
          </Link>

        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.xl, paddingTop: 64, flexGrow: 1 },
  logo: { fontSize: 48, textAlign: 'center' },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', color: colors.text },
  subtitle: { color: colors.muted, textAlign: 'center', marginBottom: space.xl, marginTop: 4 },
  link: { textAlign: 'center', marginTop: space.lg, color: colors.primary },
  demo: { marginTop: 32, padding: space.md, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, gap: space.sm },
  demoTitle: { fontSize: 12, color: colors.muted },
});
