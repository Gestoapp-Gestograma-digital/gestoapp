import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { DeletePatientSheet } from '@/components/delete-patient-sheet';
import { DiscordanceCard } from '@/components/discordance-card';
import { GestationCard } from '@/components/gestation-card';
import { LoadingState } from '@/components/heartbeat';
import { KeyDatesCard } from '@/components/key-dates-card';
import { LoadError } from '@/components/load-error';
import { NoteCard } from '@/components/note-card';
import { ScreenHeader } from '@/components/screen-header';
import {
  deletePatient,
  getPatient,
  restorePatient,
  updatePatientNote,
  type Patient,
} from '@/db/patients';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { dayFromIso, seenLabel } from '@/lib/dates';
import {
  datingReference,
  discordance,
  fumError,
  gestationFromReference,
  keyDates,
  MAX_GESTATION_LABEL,
} from '@/lib/gestation';
import { logError } from '@/lib/log';
import { formatDecimal } from '@/lib/text';
import { useErrorDialog } from '@/providers/error-dialog-provider';
import { useToast } from '@/providers/toast-provider';
import { colors, fonts } from '@/theme';
import { useToday } from '@/providers/today-provider';

export default function PatientScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const showLoading = useDelayedFlag(patient === undefined && !loadFailed);
  const showToast = useToast();
  const showError = useErrorDialog();

  // Número de la última carga pedida: si una respuesta llega después de otra más nueva, se descarta.
  const latestLoad = useRef(0);

  // Si una recarga falla con la ficha ya en pantalla, se deja la que estaba.
  const load = useCallback(() => {
    const request = ++latestLoad.current;
    getPatient(db, Number(id)).then(
      (loaded) => {
        if (request !== latestLoad.current) return;
        setPatient(loaded);
        setLoadFailed(false);
      },
      (error: unknown) => {
        if (request !== latestLoad.current) return;
        logError('Cargar paciente', error);
        setLoadFailed(true);
      },
    );
  }, [db, id]);

  // Recarga al volver de «Editar datos».
  useFocusEffect(load);

  const retryLoad = () => {
    setLoadFailed(false);
    load();
  };

  /** Devuelve si se guardó: si falla, la nota sigue en el editor. */
  const saveNote = async (note: string) => {
    if (!patient) return false;
    try {
      await updatePatientNote(db, patient.id, note);
    } catch (error) {
      showError({
        title: 'No pudimos guardar la nota',
        message: 'Tu texto sigue en el editor. Probá de nuevo.',
        error,
      });
      return false;
    }
    load();
    showToast({ message: patient.note ? 'Nota actualizada' : 'Nota guardada' });
    return true;
  };

  const restore = (deleted: Patient) => {
    restorePatient(db, deleted).catch((error: unknown) => {
      showError({
        title: `No pudimos restaurar a ${deleted.name}`,
        message: 'La ficha quedó eliminada. Si la necesitás, cargala de nuevo desde «Nueva paciente».',
        error,
      });
    });
  };

  const remove = async () => {
    if (!patient) return;
    setConfirmDelete(false);
    try {
      await deletePatient(db, patient.id);
    } catch (error) {
      showError({
        title: `No pudimos eliminar a ${patient.name}`,
        message: 'La ficha sigue guardada. Probá de nuevo.',
        error,
      });
      return;
    }
    router.back();
    showToast({
      message: `${patient.name} eliminada`,
      placement: 'tabBar',
      onUndo: () => restore(patient),
    });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        backLabel="Inicio"
        right={
          patient ? (
            <Button
              label="Editar datos"
              variant="outline"
              size="sm"
              onPress={() =>
                router.push({
                  pathname: '/paciente/editar/[id]',
                  params: { id: String(patient.id) },
                })
              }
            />
          ) : null
        }
      />
      {patient === null ? (
        <Text style={[styles.empty, styles.notFound]}>No encontramos esta paciente.</Text>
      ) : patient ? (
        <>
          <PatientDetail
            patient={patient}
            onSaveNote={saveNote}
            onDelete={() => setConfirmDelete(true)}
          />
          <DeletePatientSheet
            visible={confirmDelete}
            name={patient.name}
            onConfirm={remove}
            onCancel={() => setConfirmDelete(false)}
          />
        </>
      ) : loadFailed ? (
        <LoadError title="No pudimos cargar la paciente" onRetry={retryLoad} />
      ) : showLoading ? (
        <LoadingState label="Cargando paciente…" />
      ) : null}
    </View>
  );
}

type PatientDetailProps = {
  patient: Patient;
  onSaveNote: (note: string) => Promise<boolean>;
  onDelete: () => void;
};

function PatientDetail({ patient, onSaveNote, onDelete }: PatientDetailProps) {
  const gutter = useContentGutter(16);
  const today = useToday();
  const reference = datingReference(patient, today);
  const gestation = reference ? gestationFromReference(reference.day, today) : null;
  const comparison = discordance(patient, today);
  const { weight, heightCm } = patient;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
      contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
      keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.identity}>
            <Avatar name={patient.name} size="lg" />
            <View style={styles.identityText}>
              <Text style={styles.name} accessibilityRole="header">
                {patient.name}
              </Text>
              <Text style={styles.meta}>
                Vista {seenLabel(dayFromIso(patient.attendedAt) ?? today, today).toLowerCase()}
              </Text>
            </View>
          </View>
          <View style={styles.stats}>
            <Stat label="Peso" value={weight ? `${formatDecimal(weight)} kg` : '—'} />
            <Stat label="Altura" value={heightCm ? `${Math.round(heightCm)} cm` : '—'} />
            <Stat label="Edad" value={patient.age ? `${patient.age} años` : '—'} />
          </View>
        </View>

        {gestation && reference ? (
          <>
            <GestationCard gestation={gestation} title="Edad gestacional hoy" />
            {comparison ? <DiscordanceCard discordance={comparison} /> : null}
            <KeyDatesCard dates={keyDates(reference)} />
          </>
        ) : (
          <Text style={styles.empty}>
            {reference?.source === 'eco'
              ? `La edad gestacional por ecografía supera las ${MAX_GESTATION_LABEL}.`
              : (fumError(patient.fum, today) ??
                'Sin FUM ni ecografía cargadas. Podés cargarlas desde «Editar datos».')}
          </Text>
        )}

        <NoteCard note={patient.note} updatedAt={patient.noteUpdatedAt} onSave={onSaveNote} />

        <View style={styles.deleteAction}>
          <Button label="Eliminar paciente" variant="danger" onPress={onDelete} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identityText: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  statValue: {
    fontFamily: fonts.monoMedium,
    fontSize: 16,
    color: colors.ink,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    backgroundColor: colors.sunken,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  notFound: {
    marginHorizontal: 16,
  },
  deleteAction: {
    marginTop: 8,
  },
});
