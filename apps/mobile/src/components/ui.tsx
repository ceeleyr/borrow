import type { ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { colors, MAX_WIDTH, radius, space, toneColors } from '../constants/theme';
import type { Tone } from '../lib/status';

/** Wadah layar: latar abu, konten dipusatkan & dibatasi lebarnya (nyaman di web/tablet). */
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={styles.screen}>
      <View style={[styles.screenInner, style]}>{children}</View>
    </View>
  );
}

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, small, testID, style }: ButtonProps) {
  const off = disabled || loading;
  const v = buttonVariants[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && { opacity: 0.85 },
        off && { opacity: 0.5 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={v.fg} /> : <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text>}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  secondary: { bg: '#fff', fg: colors.primary, border: colors.primary },
  danger: { bg: '#fff', fg: colors.danger, border: colors.danger },
  ghost: { bg: 'transparent', fg: colors.muted, border: 'transparent' },
} as const;

export function Card({ children, onPress, style, testID }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; testID?: string }) {
  if (onPress) {
    return (
      <Pressable testID={testID} onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }, style]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Badge({ label, tone = 'neutral', testID }: { label: string; tone?: Tone; testID?: string }) {
  const c = toneColors[tone];
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string; testID?: string };
export function Field({ label, error, style, ...props }: FieldProps) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.faint}
        {...props}
        style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, error ? { borderColor: colors.danger } : null, style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, active, onPress, testID }: { label: string; active?: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function ErrorBanner({ message, testID }: { message?: string | null; testID?: string }) {
  if (!message) return null;
  return (
    <View testID={testID ?? 'error-banner'} style={styles.errorBanner} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function InfoBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View testID="info-banner" style={styles.infoBanner}>
      <Text style={styles.infoText}>{message}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center} testID="loading">
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.center} testID="empty-state">
      <Text style={{ fontSize: 40 }}>📭</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      {typeof value === 'string' ? <Text style={styles.kvValue}>{value}</Text> : value}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable testID="qty-minus" accessibilityLabel="Kurangi jumlah" style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text testID="qty-value" style={styles.stepValue}>
        {value}
      </Text>
      <Pressable testID="qty-plus" accessibilityLabel="Tambah jumlah" style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + 1))}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

export function Thumb({ uri, size = 72 }: { uri?: string | null; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: colors.border }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size / 2.4 }}>📦</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenInner: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.md, gap: space.md },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  button: { borderRadius: radius.md, borderWidth: 1, paddingVertical: 12, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: space.md },
  buttonText: { fontWeight: '600', fontSize: 15 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.md, borderWidth: 1, borderColor: colors.border },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, fontSize: 15, color: colors.text },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 4 },
  chip: { borderRadius: radius.pill, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  errorBanner: { backgroundColor: '#fee2e2', borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  errorText: { color: '#b91c1c', fontSize: 14 },
  infoBanner: { backgroundColor: '#dcfce7', borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  infoText: { color: '#15803d', fontSize: 14 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 8, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: colors.muted, marginTop: 4, textAlign: 'center' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: space.md },
  kvLabel: { fontSize: 13, color: colors.muted },
  kvValue: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'right' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: space.lg, marginBottom: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 20, fontWeight: '600', color: colors.text },
  stepValue: { minWidth: 32, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
});
