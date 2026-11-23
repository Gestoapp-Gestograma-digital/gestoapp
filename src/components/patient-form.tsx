import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { EcoFields, EMPTY_ECO, type EcoInput } from '@/components/eco-fields';
import { FieldError, TextArea, TextField } from '@/components/field';
import { KeyDatesCard } from '@/components/key-dates-card';
import { ScreenHeader } from '@/components/screen-header';
import { NOTE_MAX_LENGTH, type NewPatient } from '@/db/patients';
import {
  datingReference,
  ecoGaDaysFrom,
  fumError,
  keyDates,
  MAX_GESTATION_LABEL,
} from '@/lib/gestation';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { HEIGHT_RANGE, parseMeasurement, WEIGHT_RANGE } from '@/lib/measurements';
import { useErrorDialog } from '@/providers/error-dialog-provider';
import { colors, fonts } from '@/theme';
import { useToday } from '@/providers/today-provider';

export type PatientFormValues = {
  name: string;
  age: string;
  weight: string;
  heightCm: string;
  fum: string | null;
  eco: EcoInput;
  note: string;
};

export const EMPTY_PATIENT_FORM: PatientFormValues = {
  name: '',
  age: '',
  weight: '',
  heightCm: '',
  fum: null,
  eco: EMPTY_ECO,
  note: '',
};

type PatientFormProps = {
  mode: 'new' | 'edit';
  initialValues: PatientFormValues;
  /** Recibe los datos validados. La nota solo se envía al crear. */
  onSubmit: (patient: NewPatient) => Promise<void>;
};

/** Alta y edición de una paciente, en pantalla completa con el botón de guardar fijo abajo. */
export function PatientForm({ mode, initialValues, onSubmit }: PatientFormProps) {
  const gutter = useContentGutter(16);
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const showError = useErrorDialog();
  const isNew = mode === 'new';

  const set = <K extends keyof PatientFormValues>(key: K) =>
    (value: PatientFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const today = useToday();
  // La edad es opcional; si se escribe, tiene que ser mayor a 0.
  const parsedAge = values.age.trim() ? parseInt(values.age, 10) : null;
  const weight = parseMeasurement(values.weight, WEIGHT_RANGE);
  const height = parseMeasurement(values.heightCm, HEIGHT_RANGE);
  const eco = values.eco.on
    ? ecoGaDaysFrom(values.eco.date, values.eco.weeks, values.eco.days, today)
    : null;
  const ecoDate = eco?.gaDays ? values.eco.date : null;
  const reference = datingReference(
    { fum: values.fum, ecoDate, ecoGaDays: eco?.gaDays ?? null },
    today,
  );
  // Al editar, la FUM que ya estaba guardada no se vuelve a validar: con el tiempo supera las
  // 42 s 6 d y eso no debe impedir corregir el resto de la ficha. El límite vale al cargarla o cambiarla.
  const keepsStoredFum = !isNew && values.fum !== null && values.fum === initialValues.fum;
  const storedFumOutOfRange = keepsStoredFum && fumError(values.fum, today) !== null;
  // Con ecografía la FUM no se usa para datar: se guarda, pero no se valida ni bloquea el guardado.
  const fumMessage =
    reference?.source === 'eco' || keepsStoredFum ? null : fumError(values.fum, today);
  // Para guardar alcanza con el nombre y una referencia para datar: la FUM o la ecografía.
  const valid =
    values.name.trim().length > 1 &&
    (parsedAge === null || parsedAge > 0) &&
    !weight.error &&
    !height.error &&
    (reference !== null || keepsStoredFum) &&
    !fumMessage &&
    !eco?.message;
  const canSave = valid && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit({
        name: values.name.trim(),
        age: parsedAge,
        weight: weight.value,
        heightCm: height.value,
        fum: values.fum,
        ecoDate,
        ecoGaDays: eco?.gaDays ?? null,
        note: isNew ? values.note.trim() || null : null,
      });
    } catch (error) {
      setSaving(false);
      showError({
        title: isNew ? 'No pudimos guardar la paciente' : 'No pudimos guardar los cambios',
        message: 'Lo que cargaste sigue en el formulario. Probá de nuevo.',
        error,
      });
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={isNew ? 'Nueva paciente' : 'Editar paciente'}
        backLabel="Cancelar"
        backChevron={false}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
          keyboardShouldPersistTaps="handled">
          <TextField
            label="Nombre y apellido"
            value={values.name}
            onChangeText={set('name')}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <View style={styles.measurements}>
            <View style={styles.row}>
              <View style={styles.cell}>
                <TextField
                  label="Edad"
                  unit="años"
                  mono
                  value={values.age}
                  onChangeText={set('age')}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.cell}>
                <TextField
                  label="Peso"
                  unit="kg"
                  mono
                  value={values.weight}
                  onChangeText={set('weight')}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  invalid={weight.error !== null}
                />
              </View>
              <View style={styles.cell}>
                <TextField
                  label="Altura"
                  unit="cm"
                  mono
                  value={values.heightCm}
                  onChangeText={set('heightCm')}
                  keyboardType="number-pad"
                  maxLength={3}
                  invalid={height.error !== null}
                />
              </View>
            </View>
            {/* Las celdas son angostas: el mensaje va debajo de la fila, a todo el ancho. */}
            {weight.error ? <FieldError message={weight.error} /> : null}
            {height.error ? <FieldError message={height.error} /> : null}
          </View>

          <DateField
            label="FUM"
            help={
              storedFumOutOfRange && reference?.source !== 'eco'
                ? `Esta FUM ya supera las ${MAX_GESTATION_LABEL}: se mantiene, pero la gestación queda fuera de rango.`
                : 'Fecha de última menstruación. Se usa para calcular la edad gestacional si no hay ecografía cargada.'
            }
            error={fumMessage}
            value={values.fum}
            onChange={set('fum')}
            clearable
          />

          <EcoFields
            label="Ecografía como referencia"
            value={values.eco}
            onChange={set('eco')}
            message={eco?.message}
          />

          {reference ? <KeyDatesCard dates={keyDates(reference)} /> : null}

          {isNew ? (
            <TextArea
              label="Nota"
              hint="opcional"
              placeholder="Antecedentes, indicaciones, recordatorios"
              value={values.note}
              onChangeText={set('note')}
              maxLength={NOTE_MAX_LENGTH}
            />
          ) : null}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={[styles.footer, { paddingHorizontal: gutter }]}>
          {reference || keepsStoredFum ? null : (
            <Text style={styles.requirement}>Cargá la FUM o una ecografía para guardar.</Text>
          )}
          <Button
            label={isNew ? 'Guardar paciente' : 'Guardar cambios'}
            size="lg"
            disabled={!valid}
            loading={saving}
            onPress={save}
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
  measurements: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  requirement: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
