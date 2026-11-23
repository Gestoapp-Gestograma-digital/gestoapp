import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/field';
import { ScreenHeader } from '@/components/screen-header';
import { readBackupData } from '@/db/backup';
import { MIN_PASSWORD_LENGTH, encryptBackup } from '@/lib/backup-crypto';
import { isoFromDay, todayDay } from '@/lib/dates';
import { useErrorDialog } from '@/providers/error-dialog-provider';
import { useToast } from '@/providers/toast-provider';
import { colors, fonts } from '@/theme';

/** Prefijo de los archivos de copia que se generan en la caché antes de compartirlos. */
const FILE_PREFIX = 'gestoapp-copia-';

/** Borra copias de exportaciones anteriores que hayan quedado en la caché. */
function clearOldExports() {
  for (const item of Paths.cache.list()) {
    if (item instanceof File && item.name.startsWith(FILE_PREFIX)) item.delete();
  }
}

/** Exportar: cifra las pacientes y el perfil con una contraseña y abre el menú para guardar el archivo. */
export default function ExportBackupScreen() {
  const db = useSQLiteContext();
  const showError = useErrorDialog();
  const showToast = useToast();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [exporting, setExporting] = useState(false);

  const tooShort = password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const valid = !tooShort && confirmation === password;

  const exportBackup = async () => {
    if (!valid || exporting) return;
    setExporting(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        showError({
          title: 'No podemos guardar archivos en este dispositivo',
          message: 'El menú para compartir no está disponible.',
        });
        return;
      }
      const content = await encryptBackup(await readBackupData(db), password);
      clearOldExports();
      const file = new File(Paths.cache, `${FILE_PREFIX}${isoFromDay(todayDay())}.json`);
      file.create({ overwrite: true });
      await file.write(content);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'Guardar copia de GestoApp',
      });
      router.back();
      showToast({ message: 'Copia creada' });
    } catch (error) {
      showError({ title: 'No pudimos crear la copia', error });
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Exportar copia" backLabel="Cancelar" backChevron={false} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            La copia guarda tus pacientes con sus notas y tu perfil en un archivo cifrado. Después
            elegís dónde dejarlo: iCloud Drive, Google Drive o donde prefieras. Si borrás la app, la
            importás desde Configuración para recuperar todo.
          </Text>

          <TextField
            label="Contraseña de la copia"
            hint={`al menos ${MIN_PASSWORD_LENGTH} caracteres`}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <TextField
            label="Repetí la contraseña"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            error={mismatch ? 'Las contraseñas no coinciden.' : null}
            returnKeyType="done"
            onSubmitEditing={exportBackup}
          />

          <Text style={styles.notice}>
            Guardá la contraseña en un lugar seguro, como tu gestor de contraseñas. Sin ella no hay
            forma de abrir la copia: nosotros tampoco podemos recuperarla.
          </Text>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Button
            label="Crear copia"
            size="lg"
            disabled={!valid}
            loading={exporting}
            loadingLabel="Cifrando…"
            onPress={exportBackup}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
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
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  lead: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  notice: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    backgroundColor: colors.sunken,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
