import { InvalidBackupDataError, parseBackupData, type PatientRow } from '../backup';

const PATIENT: PatientRow = {
  id: 3,
  name: 'Ana Prueba',
  age: 30,
  weight: 60.5,
  height_cm: 165,
  fum: '2026-06-01',
  attended_at: '2026-07-15',
  created_at: '2026-07-15 14:30:00',
  eco_date: '2026-07-10',
  eco_ga_days: 63,
  note: 'Control en 4 semanas',
  note_updated_at: '2026-07-15',
};

function withPatient(changes: Record<string, unknown>) {
  return { profile: null, patients: [{ ...PATIENT, ...changes }] };
}

describe('parseBackupData', () => {
  test('acepta una copia válida tal como se exportó', () => {
    const data = {
      profile: { title: 'Dra.', name: 'Martínez' },
      patients: [PATIENT],
    };
    expect(parseBackupData(data)).toEqual(data);
  });

  test('acepta una copia sin perfil y sin pacientes', () => {
    expect(parseBackupData({ profile: null, patients: [] })).toEqual({
      profile: null,
      patients: [],
    });
    expect(parseBackupData({ patients: [] })).toEqual({
      profile: null,
      patients: [],
    });
  });

  test('completa con null los campos opcionales que faltan', () => {
    const { id, name, attended_at, created_at } = PATIENT;
    expect(
      parseBackupData({ patients: [{ id, name, attended_at, created_at }] }).patients[0],
    ).toEqual({
      id,
      name,
      age: null,
      weight: null,
      height_cm: null,
      fum: null,
      attended_at,
      created_at,
      eco_date: null,
      eco_ga_days: null,
      note: null,
      note_updated_at: null,
    });
  });

  test('acepta las copias viejas que traen last_seen', () => {
    const { attended_at, ...old } = PATIENT;
    const parsed = parseBackupData({
      patients: [{ ...old, last_seen: attended_at }],
    });
    expect(parsed.patients[0].attended_at).toBe(attended_at);
  });

  test.each([
    ['no es un objeto', 'texto'],
    ['sin lista de pacientes', { profile: null }],
    ['paciente que no es objeto', { patients: [1] }],
    ['id repetido', { patients: [PATIENT, PATIENT] }],
    ['id 0', withPatient({ id: 0 })],
    ['id con decimales', withPatient({ id: 1.5 })],
    ['nombre vacío', withPatient({ name: '  ' })],
    ['edad con decimales', withPatient({ age: 30.5 })],
    ['peso que no es número', withPatient({ weight: '60' })],
    ['FUM con otro formato', withPatient({ fum: '01/06/2026' })],
    ['sin fecha de atención', withPatient({ attended_at: undefined })],
    ['created_at con otro formato', withPatient({ created_at: '2026-07-15' })],
    ['perfil con título desconocido', { profile: { title: 'Lic.', name: 'X' }, patients: [] }],
    ['perfil sin nombre', { profile: { title: 'Dr.', name: '' }, patients: [] }],
  ])('rechaza: %s', (_case, value) => {
    expect(() => parseBackupData(value)).toThrow(InvalidBackupDataError);
  });
});
