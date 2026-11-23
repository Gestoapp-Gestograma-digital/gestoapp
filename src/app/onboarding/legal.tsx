import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LegalConsentCard } from '@/components/legal-consent-card';
import { ScreenHeader } from '@/components/screen-header';
import { isProfileTitle } from '@/db/profile';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { LEGAL_DOC_IDS, LEGAL_DOCS, type LegalDocId } from '@/lib/legal';
import { useErrorDialog } from '@/providers/error-dialog-provider';
import { useProfile } from '@/providers/profile-provider';
import { colors, fonts } from '@/theme';

type DocFlags = Record<LegalDocId, boolean>;

const NONE: DocFlags = { terminos: false, privacidad: false };

/** Paso 2 del onboarding: abrir y aceptar los Términos y la Política de Privacidad. */
export default function OnboardingLegalScreen() {
  const gutter = useContentGutter(20);
  const params = useLocalSearchParams<{ title?: string; name?: string }>();
  const { completeOnboarding } = useProfile();
  const showError = useErrorDialog();
  const [read, setRead] = useState<DocFlags>(NONE);
  const [saving, setSaving] = useState(false);

  const title = isProfileTitle(params.title) ? params.title : null;
  const name = params.name?.trim() ?? '';
  const valid = title !== null && name.length > 0;
  const allRead = LEGAL_DOC_IDS.every((id) => read[id]);

  // Abrir un documento solo lo marca como leído: la aceptación es el botón «Aceptar y continuar».
  const open = (id: LegalDocId) => {
    setRead((current) => ({ ...current, [id]: true }));
    router.push({ pathname: '/legal/[doc]', params: { doc: id, desde: 'onboarding' } });
  };

  const finish = async () => {
    if (!valid || !allRead || saving) return;
    setSaving(true);
    try {
      // Al guardar, el layout raíz habilita Inicio y redirige solo.
      await completeOnboarding({ title, name });
    } catch (error) {
      setSaving(false);
      showError({ title: 'No pudimos terminar la configuración', error });
    }
  };

  // Sin los datos del paso 1 (por ejemplo, al abrir un enlace directo) se vuelve a empezar.
  if (!valid) return <Redirect href="/" />;

  return (
    <View style={styles.screen}>
      <ScreenHeader />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}>
        <View style={styles.intro}>
          <Text style={styles.brand}>GESTOAPP · PASO 2 DE 2</Text>
          <Text style={styles.heading} accessibilityRole="header">
            Antes de empezar
          </Text>
          <Text style={styles.lead}>
            Abrí los dos documentos y, cuando los hayas leído, aceptalos con el botón de abajo.
            Podés volver a leerlos cuando quieras desde Configuración.
          </Text>
        </View>

        {LEGAL_DOC_IDS.map((id) => (
          <LegalConsentCard
            key={id}
            doc={LEGAL_DOCS[id]}
            read={read[id]}
            onOpen={() => open(id)}
          />
        ))}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.footer, { paddingHorizontal: gutter }]}>
        <Text style={styles.consent}>
          {allRead
            ? 'Al tocar «Aceptar y continuar», aceptás los Términos y Condiciones y la Política de Privacidad.'
            : 'Abrí los dos documentos para poder aceptarlos.'}
        </Text>
        <Button
          label="Aceptar y continuar"
          size="lg"
          disabled={!allRead}
          loading={saving}
          onPress={finish}
        />
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 20,
  },
  intro: {
    gap: 10,
  },
  brand: {
    fontFamily: fonts.monoMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.56,
    color: colors.ink,
  },
  lead: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  consent: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
