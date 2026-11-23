import { dayFromIso, formatDay } from '../dates';
import {
  datingReference,
  discordance,
  ecoGaDaysFrom,
  formatWeeksDays,
  fumError,
  gestationFromReference,
  keyDates,
  MAX_GESTATION_LABEL,
} from '../gestation';

const TODAY = dayFromIso('2026-11-22')!;

/** Fecha ISO de hace `days` días. */
function daysAgo(days: number) {
  const date = new Date((TODAY - days) * 864e5);
  return date.toISOString().slice(0, 10);
}

describe('formatWeeksDays', () => {
  test('separa semanas y días', () => {
    expect(formatWeeksDays(0)).toBe('0 s 0 d');
    expect(formatWeeksDays(66)).toBe('9 s 3 d');
    expect(formatWeeksDays(280)).toBe('40 s 0 d');
  });

  test('el tope es 42 s 6 d', () => {
    expect(MAX_GESTATION_LABEL).toBe('42 s 6 d');
  });
});

describe('fumError', () => {
  test('vacía o inválida no es un error', () => {
    expect(fumError(null, TODAY)).toBeNull();
    expect(fumError('2026-02-30', TODAY)).toBeNull();
  });

  test('rechaza una FUM futura', () => {
    expect(fumError(daysAgo(-1), TODAY)).toBe('La FUM no puede ser posterior a hoy.');
  });

  test('acepta hasta 300 días y rechaza desde 301', () => {
    expect(fumError(daysAgo(0), TODAY)).toBeNull();
    expect(fumError(daysAgo(300), TODAY)).toBeNull();
    expect(fumError(daysAgo(301), TODAY)).toContain('42 s 6 d');
  });
});

describe('datingReference', () => {
  test('sin datos no hay referencia', () => {
    expect(datingReference({ fum: null, ecoDate: null, ecoGaDays: null }, TODAY)).toBeNull();
  });

  test('con solo FUM usa la FUM', () => {
    const fum = daysAgo(70);
    expect(datingReference({ fum, ecoDate: null, ecoGaDays: null }, TODAY)).toEqual({
      day: TODAY - 70,
      source: 'fum',
      sourceDay: TODAY - 70,
    });
  });

  test('la ecografía reemplaza a la FUM', () => {
    const reference = datingReference(
      { fum: daysAgo(70), ecoDate: daysAgo(10), ecoGaDays: 63 },
      TODAY,
    );
    expect(reference).toEqual({
      day: TODAY - 10 - 63,
      source: 'eco',
      sourceDay: TODAY - 10,
    });
  });

  test('una ecografía futura o sin EG no cuenta y vuelve a la FUM', () => {
    const fum = daysAgo(70);
    expect(datingReference({ fum, ecoDate: daysAgo(-1), ecoGaDays: 63 }, TODAY)?.source).toBe(
      'fum',
    );
    expect(datingReference({ fum, ecoDate: daysAgo(10), ecoGaDays: 0 }, TODAY)?.source).toBe('fum');
    expect(datingReference({ fum, ecoDate: daysAgo(10), ecoGaDays: null }, TODAY)?.source).toBe(
      'fum',
    );
  });

  test('una FUM fuera de rango no da referencia', () => {
    expect(
      datingReference({ fum: daysAgo(301), ecoDate: null, ecoGaDays: null }, TODAY),
    ).toBeNull();
    expect(datingReference({ fum: daysAgo(-3), ecoDate: null, ecoGaDays: null }, TODAY)).toBeNull();
  });
});

describe('gestationFromReference', () => {
  const at = (days: number) => gestationFromReference(TODAY - days, TODAY);

  test('día 0', () => {
    expect(at(0)).toMatchObject({
      age: '0 s 0 d',
      weeksLabel: '0 semanas',
      daysLabel: null,
      trimester: 1,
      month: '≈ 1° mes',
    });
  });

  test('singular y plural', () => {
    expect(at(7)?.weeksLabel).toBe('1 semana');
    expect(at(8)?.daysLabel).toBe('1 día');
    expect(at(10)?.daysLabel).toBe('3 días');
  });

  test('límites de los trimestres: 98 y 196 días', () => {
    expect(at(97)?.trimester).toBe(1);
    expect(at(98)?.trimester).toBe(2);
    expect(at(195)?.trimester).toBe(2);
    expect(at(196)?.trimester).toBe(3);
    expect(at(196)?.trimesterLabel).toBe('T3 · 3° trimestre');
  });

  test('FPP a los 280 días de la referencia', () => {
    expect(at(100)?.dueDate).toBe(formatDay(TODAY - 100 + 280));
  });

  test('fuera de rango devuelve null', () => {
    expect(at(300)).not.toBeNull();
    expect(at(301)).toBeNull();
    expect(at(-1)).toBeNull();
  });
});

describe('discordance', () => {
  /** FUM y eco cargadas con una diferencia de `diff` días, con la eco a `gaDays`. */
  function compare(gaDays: number, diff: number) {
    const ecoAgo = 10;
    return discordance(
      {
        fum: daysAgo(ecoAgo + gaDays + diff),
        ecoDate: daysAgo(ecoAgo),
        ecoGaDays: gaDays,
      },
      TODAY,
    );
  }

  test('necesita FUM y ecografía válidas', () => {
    expect(discordance({ fum: daysAgo(70), ecoDate: null, ecoGaDays: null }, TODAY)).toBeNull();
    expect(discordance({ fum: null, ecoDate: daysAgo(10), ecoGaDays: 63 }, TODAY)).toBeNull();
  });

  test.each([
    // [EG de la eco en días, umbral ACOG en días]
    [62, 5],
    [63, 7],
    [111, 7],
    [112, 10],
    [153, 10],
    [154, 14],
    [195, 14],
    [196, 21],
  ])('eco a %i días: concordante hasta %i días de diferencia', (gaDays, threshold) => {
    expect(compare(gaDays, threshold)?.over).toBe(false);
    expect(compare(gaDays, threshold + 1)?.over).toBe(true);
  });

  test('la diferencia cuenta en los dos sentidos', () => {
    expect(compare(62, -6)?.over).toBe(true);
    expect(compare(62, -5)?.over).toBe(false);
  });

  test('títulos', () => {
    expect(compare(62, 1)?.title).toBe('Concordante · diferencia de 1 día');
    expect(compare(62, 0)?.title).toBe('Concordante · diferencia de 0 días');
    expect(compare(62, 6)?.title).toBe('Discordancia de 6 días');
  });
});

describe('keyDates', () => {
  test('fechas desde la FUM', () => {
    const reference = { day: 1000, source: 'fum' as const, sourceDay: 1000 };
    expect(keyDates(reference).map((item) => [item.label, item.day - 1000])).toEqual([
      ['FUM', 0],
      ['Concepción', 14],
      ['2° trimestre', 98],
      ['3° trimestre', 196],
      ['FPP', 280],
    ]);
  });

  test('desde la ecografía aclara de qué eco sale la FUM', () => {
    const [fum] = keyDates({ day: 1000, source: 'eco', sourceDay: 1063 });
    expect(fum.label).toBe('FUM por ecografía');
    expect(fum.sub).toBe(`Calculada desde la eco del ${formatDay(1063)}`);
  });
});

describe('ecoGaDaysFrom', () => {
  const ecoDate = daysAgo(10);

  test('calcula la EG en días', () => {
    expect(ecoGaDaysFrom(ecoDate, '12', '3', TODAY)).toEqual({
      gaDays: 87,
      message: null,
    });
    expect(ecoGaDaysFrom(ecoDate, '12', '', TODAY)).toEqual({
      gaDays: 84,
      message: null,
    });
  });

  test('pide la fecha y las semanas', () => {
    expect(ecoGaDaysFrom(null, '12', '3', TODAY).gaDays).toBeNull();
    expect(ecoGaDaysFrom(ecoDate, '', '3', TODAY).gaDays).toBeNull();
  });

  test('rechaza una eco futura', () => {
    expect(ecoGaDaysFrom(daysAgo(-1), '12', '3', TODAY).message).toBe(
      'La ecografía no puede ser posterior a hoy.',
    );
  });

  test('rechaza semanas y días fuera de rango', () => {
    expect(ecoGaDaysFrom(ecoDate, '42', '6', TODAY).gaDays).toBe(300);
    expect(ecoGaDaysFrom(ecoDate, '43', '0', TODAY).gaDays).toBeNull();
    expect(ecoGaDaysFrom(ecoDate, '12', '7', TODAY).gaDays).toBeNull();
    expect(ecoGaDaysFrom(ecoDate, '0', '0', TODAY).message).toBe(
      'La EG por ecografía tiene que ser mayor a 0.',
    );
  });
});
