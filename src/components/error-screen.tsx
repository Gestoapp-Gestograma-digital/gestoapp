import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertTriangle } from '@/components/alert-icons';
import { Button } from '@/components/button';
import { DatabaseError } from '@/db/database-error';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { colors, fonts } from '@/theme';

type ErrorScreenProps = {
  error: Error;
  retry: () => Promise<void>;
};

/** Pantalla completa cuando algo falla al mostrar la app, con la opción de reintentar. */
export function ErrorScreen({ error, retry }: ErrorScreenProps) {
  const gutter = useContentGutter(20);
  const [retrying, setRetrying] = useState(false);
  const fromDatabase = error instanceof DatabaseError;

  const onRetry = async () => {
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}>
        <View style={styles.warning}>
          <AlertTriangle />
          <Text style={styles.warningText}>Algo salió mal</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {fromDatabase ? 'No pudimos abrir tus datos' : 'No pudimos mostrar esta pantalla'}
        </Text>
        <Text style={styles.body}>
          Probá de nuevo. Si el problema sigue, cerrá la app y volvé a abrirla.
        </Text>
        {/* El detalle técnico solo en desarrollo: en producción no aporta y puede confundir. */}
        {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingHorizontal: gutter }]}>
        <Button
          label="Reintentar"
          size="lg"
          loading={retrying}
          loadingLabel="Reintentando…"
          onPress={onRetry}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.alertText,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  detail: {
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
});
