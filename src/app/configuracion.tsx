import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { SwitchRow } from '@/components/switch-row';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { dayFromIso, formatDay } from '@/lib/dates';
import { DEVICE_NAME } from '@/lib/device';
import { LEGAL_DOC_IDS, LEGAL_DOCS } from '@/lib/legal';
import { RELOCK_AFTER_MS, useAppLock } from '@/providers/app-lock-provider';
import { useErrorDialog } from '@/providers/error-dialog-provider';
import { useProfile } from '@/providers/profile-provider';
import { colors, fonts } from '@/theme';

const BACKUP_ACTIONS = [
  {
    href: '/copia/exportar',
    name: 'Exportar copia',
    description: 'Tus pacientes y tu perfil, cifrados con una contraseña',
  },
  {
    href: '/copia/importar',
    name: 'Importar copia',
    description: 'Reemplaza los datos actuales por los de la copia',
  },
] as const;

/** Configuración: bloqueo, copia de seguridad y la sección Legal para volver a leer los documentos. */
export default function SettingsScreen() {
  const gutter = useContentGutter(16);
  const { legal } = useProfile();
  const lock = useAppLock();
  const showError = useErrorDialog();
  const acceptedDay = dayFromIso(legal?.acceptedAt);
  const relockMinutes = RELOCK_AFTER_MS / 60_000;

  const toggleLock = async (next: boolean) => {
    try {
      await lock.setEnabled(next);
    } catch (error) {
      showError({ title: 'No pudimos cambiar el bloqueo', error });
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Configuración" backLabel="Inicio" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Seguridad
          </Text>
          <View style={[styles.list, styles.switchCard]}>
            {lock.available ? (
              <SwitchRow
                label="Bloquear GestoApp"
                description={`Pide ${lock.method} al abrirla y al volver después de ${relockMinutes} minuto.`}
                value={lock.enabled}
                onValueChange={toggleLock}
              />
            ) : (
              <Text style={styles.unavailable}>
                Para bloquear GestoApp, configurá un código, tu huella o tu rostro en el {DEVICE_NAME}.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Copia de seguridad
          </Text>
          <View style={styles.list}>
            {BACKUP_ACTIONS.map((action, index) => (
              <Pressable
                key={action.href}
                accessibilityRole="button"
                accessibilityLabel={`${action.name}. ${action.description}`}
                onPress={() => router.push(action.href)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{action.name}</Text>
                  <Text style={styles.rowUpdated}>{action.description}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionNote}>
            Guardala en iCloud Drive, Google Drive o donde prefieras. Si borrás la app, la importás
            para recuperar tus pacientes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Legal
          </Text>
          <View style={styles.list}>
            {LEGAL_DOC_IDS.map((id, index) => {
              const doc = LEGAL_DOCS[id];
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`${doc.name}. Actualizado el ${doc.updated}`}
                  onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: id } })}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>{doc.name}</Text>
                    <Text style={styles.rowUpdated}>Actualizado el {doc.updated}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}
          </View>
          {acceptedDay !== null ? (
            <Text style={styles.accepted}>
              Aceptaste ambos documentos el {formatDay(acceptedDay)}.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textMuted,
  },
  list: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.sunken,
  },
  rowPressed: {
    backgroundColor: colors.sunken,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  rowUpdated: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  chevron: {
    fontFamily: fonts.regular,
    fontSize: 20,
    color: colors.textMuted,
  },
  switchCard: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  unavailable: {
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  sectionNote: {
    paddingHorizontal: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.textMuted,
  },
  accepted: {
    paddingHorizontal: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
