import { oklchToRgba, type OklchColor } from './oklch';

const palette = {
  ink: 'oklch(0.21 0.012 250)',
  inkPressed: 'oklch(0.30 0.012 250)',
  /** Texto corrido largo, como los documentos legales. */
  textBody: 'oklch(0.30 0.012 250)',
  textSecondary: 'oklch(0.38 0.012 250)',
  textMuted: 'oklch(0.47 0.012 250)',
  borderStrong: 'oklch(0.62 0.012 250)',
  border: 'oklch(0.89 0.006 250)',
  sunken: 'oklch(0.95 0.004 250)',
  background: 'oklch(0.975 0.003 250)',
  surface: 'oklch(1 0 0)',
  alertText: 'oklch(0.42 0.11 30)',
  alertBorder: 'oklch(0.80 0.06 30)',
  alertSoft: 'oklch(0.97 0.015 30)',
  alertStrong: 'oklch(0.50 0.10 30)',
  /** Confirmación: algo ya está hecho, como un documento leído. Siempre con ✓ y texto. */
  okText: 'oklch(0.40 0.10 150)',
  okSoft: 'oklch(0.96 0.03 150)',
  /** Bebé del logo; mismo tono que el ladrillo, pero sin función de alerta. */
  logoAccent: 'oklch(0.50 0.10 30)',
  transparent: 'oklch(0 0 0 / 0)',
  shadow: 'oklch(0.21 0.012 250 / 0.15)',
  scrim: 'oklch(0.21 0.012 250 / 0.5)',
  toastShadow: 'oklch(0.21 0.012 250 / 0.25)',
  toastMuted: 'oklch(0.85 0.006 250)',
} as const satisfies Record<string, OklchColor>;

type ColorName = keyof typeof palette;

export const colors = Object.fromEntries(
  Object.entries(palette).map(([name, value]) => [name, oklchToRgba(value)]),
) as Record<ColorName, string>;

/** Ancho máximo de la columna de contenido: en iPad, o con la ventana ancha, se centra. */
export const CONTENT_MAX_WIDTH = 600;

/**
 * Toda la app usa Geist. Los nombres `mono*` quedan para fechas y números, que antes iban en
 * monoespaciada; ahora son pesos de Geist.
 */
export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  mono: 'Geist_400Regular',
  monoMedium: 'Geist_500Medium',
  monoBold: 'Geist_700Bold',
} as const;
