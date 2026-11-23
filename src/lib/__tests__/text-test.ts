import { HEIGHT_RANGE, parseMeasurement, WEIGHT_RANGE } from '../measurements';
import { formatDecimal, initials, normalizeForSearch, parseDecimal } from '../text';

describe('parseDecimal', () => {
  test('acepta coma o punto', () => {
    expect(parseDecimal('1,63')).toBe(1.63);
    expect(parseDecimal('1.63')).toBe(1.63);
    expect(parseDecimal('62')).toBe(62);
  });

  test('devuelve null si no hay número', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });
});

describe('formatDecimal', () => {
  test('usa coma decimal', () => {
    expect(formatDecimal(62.5)).toBe('62,5');
    expect(formatDecimal(1.5, 2)).toBe('1,50');
    expect(formatDecimal(60)).toBe('60');
  });
});

describe('normalizeForSearch', () => {
  test('ignora tildes y mayúsculas', () => {
    expect(normalizeForSearch('Lucía Álvarez')).toBe('lucia alvarez');
    expect(normalizeForSearch('MUÑOZ')).toBe('munoz');
  });
});

describe('initials', () => {
  test('toma las dos primeras palabras', () => {
    expect(initials('  maría  josé pérez ')).toBe('MJ');
    expect(initials('Ana')).toBe('A');
    expect(initials('')).toBe('');
  });
});

describe('parseMeasurement', () => {
  test('vacío es válido', () => {
    expect(parseMeasurement('', WEIGHT_RANGE)).toEqual({
      value: null,
      error: null,
    });
    expect(parseMeasurement('  ', HEIGHT_RANGE)).toEqual({
      value: null,
      error: null,
    });
  });

  test('peso de 20 a 300 kg', () => {
    expect(parseMeasurement('62,5', WEIGHT_RANGE)).toEqual({
      value: 62.5,
      error: null,
    });
    expect(parseMeasurement('20', WEIGHT_RANGE).error).toBeNull();
    expect(parseMeasurement('300', WEIGHT_RANGE).error).toBeNull();
    expect(parseMeasurement('19,9', WEIGHT_RANGE).error).toBe('El peso va de 20 a 300 kg.');
    expect(parseMeasurement('301', WEIGHT_RANGE).error).not.toBeNull();
    expect(parseMeasurement('abc', WEIGHT_RANGE).error).not.toBeNull();
  });

  test('altura de 50 a 230 cm', () => {
    expect(parseMeasurement('163', HEIGHT_RANGE)).toEqual({
      value: 163,
      error: null,
    });
    expect(parseMeasurement('49', HEIGHT_RANGE).error).toBe('La altura va de 50 a 230 cm.');
    expect(parseMeasurement('1630', HEIGHT_RANGE).error).not.toBeNull();
  });
});
