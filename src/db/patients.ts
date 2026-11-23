import type { SQLiteDatabase } from 'expo-sqlite';

import { isoFromDay, todayDay } from '@/lib/dates';

import { withWriteTransaction } from './transaction';

export type Patient = {
  id: number;
  name: string;
  /** Edad en años; opcional. */
  age: number | null;
  /** Peso en kg. */
  weight: number | null;
  /** Altura en centímetros. */
  heightCm: number | null;
  /** Fecha de última menstruación (YYYY-MM-DD). */
  fum: string | null;
  /** Fecha de la ecografía de referencia (YYYY-MM-DD). */
  ecoDate: string | null;
  /** Edad gestacional medida en esa ecografía, en días. */
  ecoGaDays: number | null;
  /** Nota única de la paciente. */
  note: string | null;
  /** Última edición de la nota (YYYY-MM-DD). */
  noteUpdatedAt: string | null;
  /** Fecha en que se atendió a la paciente (YYYY-MM-DD): la del alta de la ficha, no cambia al editarla. */
  attendedAt: string;
};

export type PatientData = Omit<Patient, 'id' | 'attendedAt' | 'note' | 'noteUpdatedAt'>;

export type NewPatient = PatientData & {
  note: string | null;
};

/** Largo máximo de la nota de una paciente. */
export const NOTE_MAX_LENGTH = 250;

const listeners = new Set<() => void>();

/** Avisa cuando cambian las pacientes, para recargar pantallas que siguen montadas (ej. Inicio). */
export function onPatientsChanged(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyPatientsChanged() {
  listeners.forEach((listener) => listener());
}

const PATIENT_COLUMNS = `id, name, age, weight, height_cm AS heightCm, fum,
  eco_date AS ecoDate, eco_ga_days AS ecoGaDays,
  note, note_updated_at AS noteUpdatedAt, attended_at AS attendedAt`;

export function listPatients(db: SQLiteDatabase) {
  return db.getAllAsync<Patient>(
    `SELECT ${PATIENT_COLUMNS} FROM patients ORDER BY attended_at DESC, id DESC`,
  );
}

export function getPatient(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Patient>(`SELECT ${PATIENT_COLUMNS} FROM patients WHERE id = ?`, id);
}

export async function insertPatient(db: SQLiteDatabase, patient: NewPatient): Promise<number> {
  const today = isoFromDay(todayDay());
  const result = await withWriteTransaction(db, () =>
    db.runAsync(
      `INSERT INTO patients
       (name, age, weight, height_cm, fum, eco_date, eco_ga_days, note, note_updated_at, attended_at)
     VALUES
       ($name, $age, $weight, $heightCm, $fum, $ecoDate, $ecoGaDays, $note, $noteUpdatedAt, $attendedAt)`,
      {
        $name: patient.name,
        $age: patient.age,
        $weight: patient.weight,
        $heightCm: patient.heightCm,
        $fum: patient.fum,
        $ecoDate: patient.ecoDate,
        $ecoGaDays: patient.ecoGaDays,
        $note: patient.note,
        $noteUpdatedAt: patient.note ? today : null,
        $attendedAt: today,
      },
    ),
  );
  notifyPatientsChanged();
  return result.lastInsertRowId;
}

export async function updatePatient(db: SQLiteDatabase, id: number, patient: PatientData) {
  await withWriteTransaction(db, () =>
    db.runAsync(
      `UPDATE patients
     SET name = $name, age = $age, weight = $weight, height_cm = $heightCm, fum = $fum,
         eco_date = $ecoDate, eco_ga_days = $ecoGaDays
     WHERE id = $id`,
      {
        $id: id,
        $name: patient.name,
        $age: patient.age,
        $weight: patient.weight,
        $heightCm: patient.heightCm,
        $fum: patient.fum,
        $ecoDate: patient.ecoDate,
        $ecoGaDays: patient.ecoGaDays,
      },
    ),
  );
  notifyPatientsChanged();
}

/** Reemplaza la nota de la paciente y registra la fecha de hoy. */
export async function updatePatientNote(db: SQLiteDatabase, id: number, note: string) {
  await withWriteTransaction(db, () =>
    db.runAsync(
      'UPDATE patients SET note = ?, note_updated_at = ? WHERE id = ?',
      note,
      isoFromDay(todayDay()),
      id,
    ),
  );
  notifyPatientsChanged();
}

export async function deletePatient(db: SQLiteDatabase, id: number) {
  await withWriteTransaction(db, () => db.runAsync('DELETE FROM patients WHERE id = ?', id));
  notifyPatientsChanged();
}

/** Vuelve a insertar una paciente eliminada con el mismo id y todos sus datos («Deshacer»). */
export async function restorePatient(db: SQLiteDatabase, patient: Patient) {
  await withWriteTransaction(db, () =>
    db.runAsync(
      `INSERT INTO patients
       (id, name, age, weight, height_cm, fum, eco_date, eco_ga_days, note, note_updated_at, attended_at)
     VALUES
       ($id, $name, $age, $weight, $heightCm, $fum, $ecoDate, $ecoGaDays, $note, $noteUpdatedAt, $attendedAt)`,
      {
        $id: patient.id,
        $name: patient.name,
        $age: patient.age,
        $weight: patient.weight,
        $heightCm: patient.heightCm,
        $fum: patient.fum,
        $ecoDate: patient.ecoDate,
        $ecoGaDays: patient.ecoGaDays,
        $note: patient.note,
        $noteUpdatedAt: patient.noteUpdatedAt,
        $attendedAt: patient.attendedAt,
      },
    ),
  );
  notifyPatientsChanged();
}
