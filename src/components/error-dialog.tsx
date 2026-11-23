import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertTriangle } from '@/components/alert-icons';
import { Button } from '@/components/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { colors, CONTENT_MAX_WIDTH, fonts } from '@/theme';

type ErrorDialogProps = {
  title: string;
  message: string;
  onClose: () => void;
};

/**
 * Hoja inferior que avisa que una acción no se pudo completar, con el mismo formato que la
 * confirmación de eliminar. Es una capa sobre la app y no un Modal nativo: así puede aparecer
 * mientras se cierra otro modal (en iOS no se presentan dos a la vez).
 */
export function ErrorDialog({ title, message, onClose }: ErrorDialogProps) {
  const reducedMotion = useReducedMotion();
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Keyboard.dismiss();
    AccessibilityInfo.announceForAccessibility(`${title}. ${message}`);
    Animated.timing(appear, {
      toValue: 1,
      duration: reducedMotion ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [appear, message, reducedMotion, title]);

  // En Android, el botón Atrás cierra el aviso en lugar de salir de la pantalla.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  return (
    <Animated.View style={[styles.scrim, { opacity: appear }]}>
      <Pressable
        style={styles.dismissArea}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        onPress={onClose}
      />
      <SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.warning}>
          <AlertTriangle size={12} />
          <Text style={styles.warningText}>Algo salió mal</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.body}>{message}</Text>
        <View style={styles.actions}>
          <Button label="Entendido" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Por encima del toast (20).
    zIndex: 30,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    // En iPad la hoja no ocupa todo el ancho: se centra con el de la columna de contenido.
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
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
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: 8,
  },
});
