import type { ReactElement } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View, type RefreshControlProps } from 'react-native';

import { Avatar } from '@/components/avatar';
import type { Patient } from '@/db/patients';
import { dayFromIso, seenLabel } from '@/lib/dates';
import { colors, fonts } from '@/theme';

const GROUP_TITLES = ['Hoy', 'Esta semana', 'Este mes', 'Antes'] as const;

function groupIndex(daysAgo: number) {
  if (daysAgo <= 0) return 0;
  if (daysAgo < 7) return 1;
  if (daysAgo < 31) return 2;
  return 3;
}

type PatientSection = { title: string; data: Patient[] };

type PatientListProps = {
  /** Pacientes ordenadas de la atención más reciente a la más antigua. */
  patients: Patient[];
  today: number;
  onOpen: (patient: Patient) => void;
  refreshControl?: ReactElement<RefreshControlProps>;
  /** Se muestra cuando no hay ninguna paciente para listar (ej. una búsqueda sin resultados). */
  emptyComponent?: ReactElement;
};

/**
 * Listado agrupado por la fecha en que se atendió a cada paciente. Es una SectionList: solo dibuja
 * las filas que están cerca de la pantalla, así que no se pone lento con muchas pacientes.
 */
export function PatientList({ patients, today, onOpen, refreshControl, emptyComponent }: PatientListProps) {
  const groups: Patient[][] = GROUP_TITLES.map(() => []);
  for (const patient of patients) {
    groups[groupIndex(today - (dayFromIso(patient.attendedAt) ?? today))].push(patient);
  }
  const sections: PatientSection[] = GROUP_TITLES.map((title, index) => ({
    title,
    data: groups[index],
  })).filter((section) => section.data.length > 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(patient) => String(patient.id)}
      renderSectionHeader={({ section }) => (
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle} accessibilityRole="header">
            {section.title}
          </Text>
          <Text style={styles.groupCount}>{section.data.length}</Text>
        </View>
      )}
      renderItem={({ item, index, section }) => (
        <PatientRow
          patient={item}
          seen={seenLabel(dayFromIso(item.attendedAt) ?? today, today)}
          first={index === 0}
          last={index === section.data.length - 1}
          onPress={() => onOpen(item)}
        />
      )}
      renderSectionFooter={() => <View style={styles.groupGap} />}
      stickySectionHeadersEnabled={false}
      ListEmptyComponent={emptyComponent}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={styles.list}
      contentContainerStyle={styles.content}
    />
  );
}

type PatientRowProps = {
  patient: Patient;
  seen: string;
  /** Primera y última fila del grupo: llevan los bordes redondeados de la tarjeta. */
  first: boolean;
  last: boolean;
  onPress: () => void;
};

function PatientRow({ patient, seen, first, last, onPress }: PatientRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${patient.name}, ${patient.age ? `${patient.age} años, ` : ''}vista ${seen.toLowerCase()}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        first ? styles.rowFirst : styles.rowDivider,
        last && styles.rowLast,
        pressed && styles.rowPressed,
      ]}>
      <Avatar name={patient.name} />
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {patient.name}
        </Text>
        {patient.age ? <Text style={styles.age}>{patient.age} años</Text> : null}
      </View>
      <Text style={styles.seen}>{seen}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  groupTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  groupCount: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.textMuted,
  },
  groupGap: {
    height: 16,
  },
  // Cada fila dibuja su parte de la tarjeta del grupo: los costados siempre, arriba y abajo según su lugar.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.sunken,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  rowPressed: {
    backgroundColor: colors.sunken,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  age: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  seen: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
