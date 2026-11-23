import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertTriangle } from '@/components/alert-icons';
import { Button } from '@/components/button';
import { colors, CONTENT_MAX_WIDTH, fonts } from '@/theme';

type ConfirmSheetProps = {
  visible: boolean;
  /** Aviso en ladrillo arriba del título, ej. «Esta acción no se puede deshacer». */
  warning: string;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Hoja inferior que confirma una acción destructiva (eliminar una paciente, reemplazar los datos). */
export function ConfirmSheet({
  visible,
  warning,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <Pressable
          style={styles.dismissArea}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onCancel}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.warning}>
            <AlertTriangle size={12} />
            <Text style={styles.warningText}>{warning}</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            <Button label={confirmLabel} variant="dangerSolid" onPress={onConfirm} />
            <Button label="Cancelar" variant="outline" onPress={onCancel} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    // En pantallas anchas la hoja no ocupa todo el ancho: se centra con el de la columna de contenido.
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
    gap: 8,
  },
});
