import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { colors, fonts } from '@/theme';

type LockScreenProps = {
  /** Cómo se desbloquea, ej. «Face ID» o «tu huella». */
  method: string;
  /** Todavía se está viendo si hay que bloquear: solo se muestra el logo, sin acciones. */
  checking: boolean;
  unlocking: boolean;
  onUnlock: () => void;
};

/** Tapa la app mientras está bloqueada. La app sigue montada debajo, sin perder lo que estaba abierto. */
export function LockScreen({ method, checking, unlocking, onUnlock }: LockScreenProps) {
  const contentGutter = useContentGutter(38);
  const footerGutter = useContentGutter(20);
  return (
    <SafeAreaView style={styles.screen} accessibilityViewIsModal>
      <View style={[styles.content, { paddingHorizontal: contentGutter }]}>
        <Logo size={72} />
        {checking ? null : (
          <View style={styles.copy}>
            <Text style={styles.title} accessibilityRole="header">
              GestoApp está bloqueada
            </Text>
            <Text style={styles.text}>Para ver tus pacientes, desbloqueala con {method}.</Text>
          </View>
        )}
      </View>
      {checking ? null : (
        <View style={[styles.footer, { paddingHorizontal: footerGutter }]}>
          <Button
            label="Desbloquear"
            size="lg"
            loading={unlocking}
            loadingLabel="Esperando…"
            onPress={onUnlock}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Por encima del modal de error (30) y del toast (20).
    zIndex: 40,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 38,
    gap: 28,
  },
  copy: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
  },
  text: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
});
