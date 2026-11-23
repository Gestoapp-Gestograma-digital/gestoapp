import { CONTENT_MAX_WIDTH } from '@/theme';

import { contentGutter } from '../use-content-gutter';

describe('contentGutter', () => {
  test('en el teléfono deja el margen de siempre', () => {
    expect(contentGutter(390, 16)).toBe(16);
    expect(contentGutter(430, 20)).toBe(20);
  });

  test('en una ventana ancha centra la columna en el ancho máximo', () => {
    // Tablet de 11" en vertical y en horizontal.
    for (const width of [820, 1180]) {
      const gutter = contentGutter(width, 16);
      expect(width - 2 * gutter).toBe(CONTENT_MAX_WIDTH);
    }
  });

  test('distintos márgenes base quedan alineados en una tablet', () => {
    expect(contentGutter(1024, 8)).toBe(contentGutter(1024, 20));
  });

  test('justo por encima del ancho máximo no achica el margen base', () => {
    expect(contentGutter(CONTENT_MAX_WIDTH + 10, 16)).toBe(16);
  });
});
