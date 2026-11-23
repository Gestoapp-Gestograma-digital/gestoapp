import { Platform } from 'react-native';

/** Cómo se nombra el dispositivo en los textos: «iPad» en iPad y «teléfono» en el resto. */
export const DEVICE_NAME = Platform.OS === 'ios' && Platform.isPad ? 'iPad' : 'teléfono';
