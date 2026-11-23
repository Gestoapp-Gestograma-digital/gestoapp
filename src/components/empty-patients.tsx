import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { colors, fonts } from '@/theme';

type EmptyPatientsProps = {
  onNew: () => void;
  /** Para recuperar los datos de una copia, por ejemplo después de reinstalar la app. */
  onImport: () => void;
  onQuickCalc: () => void;
};

/** Inicio sin pacientes: logo, qué hace la app y las tres acciones, en un solo bloque centrado. */
export function EmptyPatients({ onNew, onImport, onQuickCalc }: EmptyPatientsProps) {
  const gutter = useContentGutter(38);
  return (
    <View style={[styles.screen, { paddingHorizontal: gutter }]}>
      <View style={styles.brand}>
        <Logo size={96} />
        <Text style={styles.wordmark}>GestoApp</Text>
      </View>

      <View style={styles.copy}>
        <Text style={styles.title} accessibilityRole="header">
          Todavía no cargaste pacientes
        </Text>
        <Text style={styles.text}>
          Con la FUM o una ecografía calculamos la edad gestacional, la fecha probable de parto y
          los controles de cada trimestre.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="+ Nueva paciente" size="lg" onPress={onNew} />
        <Button label="Importar copia de seguridad" variant="outline" size="lg" onPress={onImport} />
        <Button label="Hacer un cálculo rápido" variant="link" onPress={onQuickCalc} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 38,
    paddingBottom: 24,
  },
  brand: {
    alignItems: 'center',
    gap: 12,
  },
  wordmark: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
  },
  copy: {
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
  },
  title: {
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 26,
    color: colors.ink,
  },
  text: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  actions: {
    gap: 8,
    marginTop: 32,
  },
});
