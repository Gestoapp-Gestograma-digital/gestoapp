import { Platform } from 'react-native';

/**
 * Cómo se nombra el dispositivo en los textos. La app es solo para iPhone; en un iPad corre en modo
 * de compatibilidad, donde `isPad` es false, así que también dice «teléfono».
 */
export const DEVICE_NAME = Platform.OS === 'ios' && Platform.isPad ? 'iPad' : 'teléfono';
