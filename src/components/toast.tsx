import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useContentGutter } from '@/hooks/use-content-gutter';
import { colors, fonts } from '@/theme';

export type ToastPlacement = 'bottom' | 'tabBar';

/** Alto de la barra de pestañas de Inicio sin el área segura (6 + 52 + 6). */
const TAB_BAR_HEIGHT = 64;
const GAP = 16;
/** Distancia desde la que entra y hacia la que sale, por debajo de su posición final. */
const SLIDE_DISTANCE = 120;

type ToastProps = {
  message: string;
  placement: ToastPlacement;
  /** Cuando pasa a true, sale hacia abajo y llama a onExited. */
  leaving: boolean;
  onUndo?: () => void;
  onClose: () => void;
  onExited: () => void;
};

/** Aviso oscuro abajo de la pantalla con ✓, mensaje, «Deshacer» opcional y cierre. Entra y sale desde abajo. */
export function Toast({ message, placement, leaving, onUndo, onClose, onExited }: ToastProps) {
  const insets = useSafeAreaInsets();
  const gutter = useContentGutter(12);
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(appear, {
      toValue: 1,
      damping: 18,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
    // Se anuncia solo acá, que funciona en iOS y Android. Sumar accessibilityLiveRegion lo duplicaba en Android.
    AccessibilityInfo.announceForAccessibility(message);
  }, [appear, message]);

  useEffect(() => {
    if (!leaving) return;
    Animated.timing(appear, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onExited();
    });
  }, [appear, leaving, onExited]);

  const bottom = insets.bottom + GAP + (placement === 'tabBar' ? TAB_BAR_HEIGHT : 0);

  return (
    <Animated.View
      style={[
        styles.toast,
        leaving && styles.leaving,
        { bottom, left: gutter, right: gutter },
        {
          opacity: appear.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [
            {
              translateY: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [SLIDE_DISTANCE, 0],
              }),
            },
          ],
        },
      ]}>
      <View style={styles.icon}>
        <View style={styles.check} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {onUndo ? (
        <Pressable
          accessibilityRole="button"
          onPress={onUndo}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <Text style={styles.undo}>Deshacer</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        onPress={onClose}
        style={({ pressed }) => [styles.close, pressed && styles.actionPressed]}>
        <Text style={styles.closeLabel}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    // left y right salen de useContentGutter: 12 en el teléfono, centrado en iPad.
    position: 'absolute',
    zIndex: 20,
    // 44 de los botones + 6 arriba y abajo.
    minHeight: 56,
    paddingVertical: 6,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 14,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.toastShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  leaving: {
    pointerEvents: 'none',
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 9,
    height: 5,
    marginTop: -2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.ink,
    transform: [{ rotate: '-45deg' }],
  },
  message: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.surface,
  },
  action: {
    // 44 pt: el área táctil mínima recomendada.
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  actionPressed: {
    backgroundColor: colors.inkPressed,
  },
  undo: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.surface,
    textDecorationLine: 'underline',
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontFamily: fonts.regular,
    fontSize: 20,
    lineHeight: 22,
    color: colors.toastMuted,
  },
});
