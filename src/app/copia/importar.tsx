import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ConfirmSheet } from '@/components/confirm-sheet';
import { TextField } from '@/components/field';
import { ScreenHeader } from '@/components/screen-header';
import {
  countPatients,
  InvalidBackupDataError,
  parseBackupData,
  replaceWithBackup,
  type BackupData,
} from '@/db/backup';
import {
  checkBackupFile,
  decryptBackup,
  InvalidBackupFileError,
  WrongPasswordError,
} from '@/lib/backup-crypto';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { useErrorDialog } from '@/providers/error-dialog-provider';
import { useProfile } from '@/providers/profile-provider';
import { useToast } from '@/providers/toast-provider';
import { colors, fonts } from '@/theme';

type PickedFile = { name: string; content: string };

/** Copia ya abierta, esperando que se confirme el reemplazo de los datos actuales. */
type PendingImport = { data: BackupData; currentCount: number };

const INVALID_FILE = {
  title: 'Este archivo no es una copia de GestoApp',
  message: 'Elegí el archivo que creaste con «Exportar copia». Si es ese, puede estar dañado.',
};

function patientsLabel(count: number) {
  return count === 1 ? '1 paciente' : `${count} pacientes`;
}

/** Importar: abre una copia con su contraseña y reemplaza las pacientes y el perfil actuales. */
export default function ImportBackupScreen() {
  const gutter = useContentGutter(16);
  const db = useSQLiteContext();
  const { showSavedProfile } = useProfile();
  const showError = useErrorDialog();
  const showToast = useToast();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [password, setPassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);
  const [opening, setOpening] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [importing, setImporting] = useState(false);

  const pickFile = async () => {
    try {
      const picked = await File.pickFileAsync();
      if (picked.canceled) return;
      const content = await picked.result.text();
      checkBackupFile(content);
      setFile({ name: picked.result.name, content });
      setWrongPassword(false);
    } catch (error) {
      if (error instanceof InvalidBackupFileError) {
        showError({ ...INVALID_FILE, error });
      } else {
        showError({ title: 'No pudimos abrir el archivo', error });
      }
    }
  };

  const finishImport = async (data: BackupData) => {
    setPending(null);
    setImporting(true);
    try {
      await replaceWithBackup(db, data);
      if (data.profile) showSavedProfile(data.profile);
      router.back();
      showToast({ message: `Copia importada: ${patientsLabel(data.patients.length)}` });
    } catch (error) {
      setImporting(false);
      showError({
        title: 'No pudimos importar la copia',
        message: 'Tus datos actuales no se modificaron. Probá de nuevo.',
        error,
      });
    }
  };

  const openBackup = async () => {
    if (!file || !password || opening) return;
    setOpening(true);
    setWrongPassword(false);
    try {
      const data = parseBackupData(await decryptBackup(file.content, password));
      const currentCount = await countPatients(db);
      // Sin pacientes cargadas no hay nada que perder: se importa sin preguntar.
      if (currentCount === 0) {
        await finishImport(data);
      } else {
        setPending({ data, currentCount });
      }
    } catch (error) {
      if (error instanceof WrongPasswordError) {
        setWrongPassword(true);
      } else if (error instanceof InvalidBackupFileError || error instanceof InvalidBackupDataError) {
        showError({ ...INVALID_FILE, error });
      } else {
        showError({ title: 'No pudimos abrir la copia', error });
      }
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Importar copia" backLabel="Cancelar" backChevron={false} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            Elegí el archivo que guardaste con «Exportar copia» y escribí su contraseña. La copia
            reemplaza a todas las pacientes que tengas ahora en la app.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Archivo</Text>
            {file ? (
              <Text style={styles.fileName} numberOfLines={2}>
                {file.name}
              </Text>
            ) : null}
            <Button
              label={file ? 'Elegir otro archivo' : 'Elegir archivo'}
              variant="outline"
              onPress={pickFile}
            />
          </View>

          {file ? (
            <TextField
              label="Contraseña de la copia"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setWrongPassword(false);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              error={wrongPassword ? 'La contraseña no abre esta copia.' : null}
              returnKeyType="done"
              onSubmitEditing={openBackup}
            />
          ) : null}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={[styles.footer, { paddingHorizontal: gutter }]}>
          <Button
            label="Importar copia"
            size="lg"
            disabled={!file || !password}
            loading={opening || importing}
            loadingLabel={importing ? 'Importando…' : 'Abriendo…'}
            onPress={openBackup}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={pending !== null}
        warning="Esta acción no se puede deshacer"
        title="¿Reemplazar tus pacientes?"
        body={
          pending
            ? `Se borran las ${patientsLabel(pending.currentCount)} que tenés ahora y se cargan las ${patientsLabel(pending.data.patients.length)} de la copia.`
            : ''
        }
        confirmLabel="Sí, reemplazar"
        onConfirm={() => {
          if (pending) finishImport(pending.data);
        }}
        onCancel={() => setPending(null)}
      />
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
  field: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  fileName: {
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
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
