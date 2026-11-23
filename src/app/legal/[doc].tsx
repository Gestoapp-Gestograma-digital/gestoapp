import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LegalDocument } from '@/components/legal-document';
import { ScreenHeader } from '@/components/screen-header';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { isLegalDocId, LEGAL_DOCS } from '@/lib/legal';
import { colors } from '@/theme';

/**
 * Lector de un documento legal. Desde el onboarding suma «Entendido» para volver
 * a aceptar; desde Configuración es solo lectura.
 */
export default function LegalDocumentScreen() {
  const contentGutter = useContentGutter(20);
  const footerGutter = useContentGutter(16);
  const { doc, desde } = useLocalSearchParams<{ doc: string; desde?: string }>();
  const fromOnboarding = desde === 'onboarding';

  if (!isLegalDocId(doc)) return <Redirect href="/" />;

  return (
    <View style={styles.screen}>
      <ScreenHeader backLabel={fromOnboarding ? 'Atrás' : 'Configuración'} divider />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingHorizontal: contentGutter }]}>
        <LegalDocument doc={LEGAL_DOCS[doc]} />
      </ScrollView>

      {fromOnboarding ? (
        <SafeAreaView
          edges={['bottom']}
          style={[styles.footer, { paddingHorizontal: footerGutter }]}>
          <Button label="Entendido" size="lg" onPress={() => router.back()} />
        </SafeAreaView>
      ) : null}
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
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
