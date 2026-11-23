import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorScreen } from '@/components/error-screen';
import { rethrowAsDatabaseError } from '@/db/database-error';
import { useDatabaseConfig } from '@/hooks/use-database-config';
import { usePrivacyScreen } from '@/hooks/use-privacy-screen';
import { AppLockProvider } from '@/providers/app-lock-provider';
import { ErrorDialogProvider } from '@/providers/error-dialog-provider';
import { ProfileProvider, useProfile } from '@/providers/profile-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { TodayProvider } from '@/providers/today-provider';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

/**
 * Toma cualquier error de la app, incluido el de abrir o migrar la base. Expo Router oculta el
 * splash al mostrarlo, y «Reintentar» vuelve a montar el layout: reabre la base y reintenta la migración.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorScreen error={error} retry={retry} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const database = useDatabaseConfig();
  usePrivacyScreen();

  if ((!fontsLoaded && !fontError) || !database) return null;

  return (
    <SafeAreaProvider>
      <TodayProvider>
        <SQLiteProvider
          databaseName={database.databaseName}
          onInit={database.onInit}
          onError={rethrowAsDatabaseError}>
          <ProfileProvider>
            <AppLockProvider>
              <ErrorDialogProvider>
                <ToastProvider>
                  <StatusBar style="dark" />
                  <RootStack />
                </ToastProvider>
              </ErrorDialogProvider>
            </AppLockProvider>
          </ProfileProvider>
        </SQLiteProvider>
      </TodayProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { loading, ready } = useProfile();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: styles.screen,
        animation: 'slide_from_right',
        // Deslizar para volver: en iOS desde cualquier punto de la pantalla, no solo el borde.
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="paciente/nueva" />
        <Stack.Screen name="paciente/[id]" />
        <Stack.Screen name="paciente/editar/[id]" />
        <Stack.Screen name="perfil" />
        <Stack.Screen name="configuracion" />
        <Stack.Screen name="copia/exportar" />
        <Stack.Screen name="copia/importar" />
      </Stack.Protected>
      <Stack.Protected guard={!ready}>
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="onboarding/legal" />
      </Stack.Protected>
      {/* Los documentos legales se leen tanto en el onboarding como desde Configuración. */}
      <Stack.Screen name="legal/[doc]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
});
