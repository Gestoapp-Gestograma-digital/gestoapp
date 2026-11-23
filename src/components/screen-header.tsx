import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { colors, fonts } from '@/theme';

type ScreenHeaderProps = {
  title?: string;
  /** Texto del botón de volver (por defecto «Atrás»). */
  backLabel?: string;
  /** Oculta la flecha del botón de volver, para «Cancelar». */
  backChevron?: boolean;
  /** Acción opcional a la derecha (ej. «Editar datos»). */
  right?: ReactNode;
  /** Línea inferior, para separar la barra de un texto largo que se desplaza. */
  divider?: boolean;
};

/** Barra superior de las pantallas secundarias: botón Atrás, título opcional centrado y una acción. */
export function ScreenHeader({ title, backLabel, backChevron, right, divider }: ScreenHeaderProps) {
  // En pantallas anchas el botón de volver y la acción se alinean con la columna de contenido.
  const gutter = useContentGutter(8);
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={[styles.bar, { paddingHorizontal: gutter }, divider && styles.divider]}>
        <View style={styles.side}>
          <BackButton label={backLabel} chevron={backChevron} />
        </View>
        {title ? (
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
  },
});
