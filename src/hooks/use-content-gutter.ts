import { useWindowDimensions } from 'react-native';

import { CONTENT_MAX_WIDTH } from '@/theme';

/** Margen lateral para un ancho de ventana: `base`, o lo necesario para centrar la columna. */
export function contentGutter(windowWidth: number, base: number) {
  return Math.max(base, Math.round((windowWidth - CONTENT_MAX_WIDTH) / 2));
}

/**
 * Margen lateral del contenido: `base` en el teléfono y, cuando la ventana es más ancha que la
 * columna (iPad, pantalla dividida, ventana redimensionada), lo necesario para centrarla en
 * CONTENT_MAX_WIDTH. Como es un padding, las barras con fondo siguen ocupando todo el ancho.
 */
export function useContentGutter(base: number) {
  const { width } = useWindowDimensions();
  return contentGutter(width, base);
}
