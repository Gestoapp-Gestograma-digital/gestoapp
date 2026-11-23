import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/field';
import { ScreenHeader } from '@/components/screen-header';
import { TitlePicker } from '@/components/title-picker';
import { greeting, type ProfileTitle } from '@/db/profile';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { useErrorDialog } from '@/providers/error-dialog-provider';
import { useProfile } from '@/providers/profile-provider';
import { useToast } from '@/providers/toast-provider';
import { colors, fonts } from '@/theme';

/** Perfil: el título y el nombre con los que se saluda en Inicio. */
export default function ProfileScreen() {
  const gutter = useContentGutter(16);
  const { profile, save } = useProfile();
  const showToast = useToast();
  const showError = useErrorDialog();
  const [title, setTitle] = useState<ProfileTitle>(profile?.title ?? 'Dra.');
  const [name, setName] = useState(profile?.name ?? '');
  const [saving, setSaving] = useState(false);

  const trimmedName = name.trim();
  const changed = title !== profile?.title || trimmedName !== profile?.name.trim();
  const valid = changed && trimmedName.length > 0;
  const canSave = valid && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await save({ title, name: trimmedName });
      router.back();
      showToast({ message: 'Tus datos se actualizaron', placement: 'tabBar' });
    } catch (error) {
      setSaving(false);
      showError({ title: 'No pudimos guardar tus datos', error });
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Perfil" backLabel="Cancelar" backChevron={false} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
          keyboardShouldPersistTaps="handled">
          <TitlePicker value={title} onChange={setTitle} />

          <TextField
            label="Apellido o nombre"
            value={name}
            onChangeText={setName}
            placeholder="Ej.: Martínez"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submit}
            error={trimmedName ? null : 'Escribí cómo querés que te llamemos.'}
          />

          <View style={styles.preview} accessible>
            <Text style={styles.previewLabel}>Así te saludamos en Inicio</Text>
            <Text style={styles.previewGreeting}>
              {greeting({ title, name: trimmedName })}
            </Text>
          </View>

        </ScrollView>

        <SafeAreaView edges={['bottom']} style={[styles.footer, { paddingHorizontal: gutter }]}>
          <Button
            label="Guardar cambios"
            size="lg"
            disabled={!valid}
            loading={saving}
            onPress={submit}
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
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  preview: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  previewLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  previewGreeting: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.ink,
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
