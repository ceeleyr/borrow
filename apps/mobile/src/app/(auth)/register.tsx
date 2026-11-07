import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { validateRegisterForm } from '@/lib/validation';
import { getErrorMessage } from '@/lib/errors';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const found = validateRegisterForm({ fullName, email, password });
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      await register(email, password, fullName);
    } catch (e) {
      setServerError(getErrorMessage(e, 'Gagal mendaftar'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Buat Akun</Text>
          <Text style={styles.subtitle}>Daftar untuk mulai meminjam barang</Text>
          <ErrorBanner message={serverError} />
          <Field label="Nama lengkap" value={fullName} onChangeText={setFullName} placeholder="Nama lengkap" error={errors.fullName} testID="reg-name" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="nama@email.com" error={errors.email} testID="reg-email" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimal 6 karakter" error={errors.password} onSubmitEditing={submit} testID="reg-password" />
          <Button title="Daftar" onPress={submit} loading={loading} testID="reg-submit" />
          <Link href="/login" style={styles.link}>
            Sudah punya akun? <Text style={{ fontWeight: '700' }}>Masuk</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.xl, paddingTop: 64, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', color: colors.text },
  subtitle: { color: colors.muted, textAlign: 'center', marginBottom: space.xl, marginTop: 4 },
  link: { textAlign: 'center', marginTop: space.lg, color: colors.primary },
});
