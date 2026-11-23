/// <reference types="node" />

import { readFileSync } from 'fs';
import { join } from 'path';

import { parseMarkdown } from '../markdown';

describe('parseMarkdown', () => {
  test('lee título, fecha, subtítulos, listas, negritas y tablas', () => {
    const doc = parseMarkdown(
      [
        '# Título',
        '',
        '**Última actualización:** 5 de noviembre de 2026',
        '',
        '## 1. Sección',
        '',
        'Texto con **negrita** y *cursiva*.',
        '- un ítem',
        '',
        '| Dato | Uso |',
        '| --- | --- |',
        '| **Nombre** | Saludar |',
      ].join('\n'),
    );

    expect(doc.title).toBe('Título');
    expect(doc.updated).toBe('5 de noviembre de 2026');
    expect(doc.blocks).toEqual([
      { type: 'heading', text: '1. Sección' },
      {
        type: 'paragraph',
        segments: [
          { text: 'Texto con ', bold: false },
          { text: 'negrita', bold: true },
          { text: ' y cursiva.', bold: false },
        ],
      },
      { type: 'item', segments: [{ text: 'un ítem', bold: false }] },
      { type: 'row', label: 'Nombre', value: 'Saludar' },
    ]);
  });

  // LEGAL_VERSION se arma con estas fechas: si una no se lee, la aceptación no se vuelve a pedir.
  test.each(['terminos-y-condiciones.md', 'politica-de-privacidad.md'])(
    '%s tiene título y fecha de actualización',
    (file) => {
      const doc = parseMarkdown(readFileSync(join(__dirname, '../../../legal', file), 'utf8'));
      expect(doc.title).not.toBe('');
      expect(doc.updated).toMatch(/^\d{1,2} de [a-z]+ de \d{4}$/);
      expect(doc.blocks.length).toBeGreaterThan(10);
    },
  );
});
