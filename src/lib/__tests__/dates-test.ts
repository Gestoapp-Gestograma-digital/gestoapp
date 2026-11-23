import {
  dayFromDate,
  dayFromIso,
  formatDay,
  formatLongDay,
  formatMediumDay,
  isoFromDay,
  localDateFromDay,
  seenLabel,
  weekdayName,
} from '../dates';

describe('dayFromIso', () => {
  test('cuenta los días desde 1970-01-01', () => {
    expect(dayFromIso('1970-01-01')).toBe(0);
    expect(dayFromIso('1970-01-02')).toBe(1);
    expect(dayFromIso('2026-11-22')).toBe(20779);
  });

  test('acepta el 29 de febrero solo en años bisiestos', () => {
    expect(dayFromIso('2024-02-29')).not.toBeNull();
    expect(dayFromIso('2025-02-29')).toBeNull();
  });

  test('rechaza fechas inexistentes o mal formadas', () => {
    for (const value of [
      '2026-02-30',
      '2026-13-01',
      '2026-00-10',
      '2026-2-3',
      '03/02/2026',
      '',
      null,
      undefined,
    ]) {
      expect(dayFromIso(value)).toBeNull();
    }
  });
});

describe('isoFromDay', () => {
  test('es la inversa de dayFromIso', () => {
    for (let day = dayFromIso('2023-12-25')!; day < dayFromIso('2028-03-05')!; day += 17) {
      expect(dayFromIso(isoFromDay(day))).toBe(day);
    }
  });
});

describe('fechas locales', () => {
  test('dayFromDate toma el día local, a cualquier hora', () => {
    const day = dayFromIso('2026-10-05');
    expect(dayFromDate(new Date(2026, 9, 5, 0, 0))).toBe(day);
    expect(dayFromDate(new Date(2026, 9, 5, 23, 59))).toBe(day);
  });

  test('localDateFromDay vuelve al mismo día', () => {
    for (const iso of ['2026-03-29', '2026-10-04', '2026-12-31', '2027-01-01']) {
      const day = dayFromIso(iso)!;
      expect(dayFromDate(localDateFromDay(day))).toBe(day);
    }
  });
});

describe('formatos', () => {
  const day = dayFromIso('2026-10-05')!;

  test('corto, mediano y largo', () => {
    expect(formatDay(day)).toBe('05/10/2026');
    expect(formatMediumDay(day)).toBe('5 oct 2026');
    expect(formatLongDay(day)).toBe('Lunes 5 de octubre');
    expect(weekdayName(day)).toBe('lunes');
  });
});

describe('seenLabel', () => {
  const today = dayFromIso('2026-11-22')!;

  test('días recientes', () => {
    expect(seenLabel(today, today)).toBe('Hoy');
    expect(seenLabel(today + 1, today)).toBe('Hoy');
    expect(seenLabel(today - 1, today)).toBe('Ayer');
    expect(seenLabel(today - 6, today)).toBe('Hace 6 días');
  });

  test('desde los 7 días muestra la fecha', () => {
    expect(seenLabel(today - 7, today)).toBe('15 nov');
  });
});
