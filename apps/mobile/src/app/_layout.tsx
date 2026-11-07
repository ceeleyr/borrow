import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { Loading } from '@/components/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);

  if (isLoading) return <Loading />;

  // Stack.Protected: rute hanya bisa dibuka bila guard true; selain itu otomatis dialihkan.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/[id]" options={{ headerShown: true, title: 'Detail Barang' }} />
        <Stack.Screen name="request/[id]" options={{ headerShown: true, title: 'Detail Peminjaman' }} />
        <Stack.Screen name="admin/item-form" options={{ headerShown: true, title: 'Barang' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
