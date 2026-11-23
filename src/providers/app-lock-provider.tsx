import * as LocalAuthentication from 'expo-local-authentication';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { LockScreen } from '@/components/lock-screen';
import { getSettings, setSettings } from '@/db/settings';
import { DEVICE_NAME } from '@/lib/device';
import { logError } from '@/lib/log';
import { useProfile } from '@/providers/profile-provider';

const LOCK_SETTING = 'app_lock';
/** Si la app vuelve antes de este tiempo (ej. después de elegir un archivo), no se vuelve a bloquear. */
export const RELOCK_AFTER_MS = 60_000;

/** Errores que indican que el teléfono no tiene cómo autenticar: no se puede exigir el bloqueo. */
const UNENFORCEABLE = new Set(['not_enrolled', 'not_available', 'passcode_not_set']);

type AppLockContextValue = {
  /** El teléfono tiene un bloqueo configurado (código, huella o rostro). */
  available: boolean;
  enabled: boolean;
  /** Cómo se desbloquea, para los textos: «Face ID», «tu huella», «el código del teléfono». */
  method: string;
  /** Desactivar pide autenticarse antes. Devuelve si se aplicó el cambio. */
  setEnabled: (enabled: boolean) => Promise<boolean>;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

function methodName(types: LocalAuthentication.AuthenticationType[]) {
  const { FACIAL_RECOGNITION, FINGERPRINT } = LocalAuthentication.AuthenticationType;
  if (types.includes(FACIAL_RECOGNITION)) return Platform.OS === 'ios' ? 'Face ID' : 'tu rostro';
  if (types.includes(FINGERPRINT)) return Platform.OS === 'ios' ? 'Touch ID' : 'tu huella';
  return `el código del ${DEVICE_NAME}`;
}

/**
 * Bloquea la app con Face ID, huella o el código del teléfono: al abrirla y al volver después de un
 * minuto en segundo plano. Solo aplica después del onboarding, y si el teléfono tiene un bloqueo.
 */
export function AppLockProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const { loading, ready } = useProfile();
  const [enabled, setEnabledState] = useState<boolean | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [method, setMethod] = useState(`el código del ${DEVICE_NAME}`);
  const [locked, setLocked] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const unlockingRef = useRef(false);
  const backgroundAt = useRef<number | null>(null);
  // Si al abrir la app ya estaba configurada; recién terminado el onboarding no se bloquea.
  const [startedReady, setStartedReady] = useState<boolean | null>(null);
  if (startedReady === null && !loading) {
    setStartedReady(ready);
    setLocked(ready);
  }

  useEffect(() => {
    Promise.all([
      getSettings(db, [LOCK_SETTING]),
      LocalAuthentication.getEnrolledLevelAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ])
      .then(([values, level, types]) => {
        // Activado por defecto: solo se apaga si se desactivó en Configuración.
        setEnabledState(values[LOCK_SETTING] !== '0');
        setAvailable(level !== LocalAuthentication.SecurityLevel.NONE);
        setMethod(methodName(types));
      })
      .catch((error: unknown) => {
        logError('Bloqueo de la app', error);
        setEnabledState(false);
        setAvailable(false);
      });
  }, [db]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt.current = Date.now();
      } else if (state === 'active' && backgroundAt.current !== null) {
        if (Date.now() - backgroundAt.current >= RELOCK_AFTER_MS) setLocked(true);
        backgroundAt.current = null;
      }
    });
    return () => subscription.remove();
  }, []);

  const authenticate = useCallback(async (promptMessage: string) => {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancelar' });
    return result.success || UNENFORCEABLE.has(result.error);
  }, []);

  const unlock = useCallback(async () => {
    if (unlockingRef.current) return;
    unlockingRef.current = true;
    setUnlocking(true);
    try {
      if (await authenticate('Desbloqueá GestoApp')) setLocked(false);
    } catch (error) {
      logError('Desbloquear la app', error);
    } finally {
      unlockingRef.current = false;
      setUnlocking(false);
    }
  }, [authenticate]);

  const active = ready && enabled === true && available === true;
  const checking = ready && (enabled === null || available === null);
  const showLock = checking || (active && locked);

  // Pide el desbloqueo apenas se bloquea; si se cancela, queda el botón «Desbloquear».
  // El timeout deja que se dibuje la pantalla de bloqueo antes del diálogo del sistema.
  useEffect(() => {
    if (!active || !locked) return;
    const timer = setTimeout(unlock, 0);
    return () => clearTimeout(timer);
  }, [active, locked, unlock]);

  const setEnabled = useCallback(
    async (next: boolean) => {
      if (!next && !(await authenticate('Confirmá para desactivar el bloqueo'))) return false;
      await setSettings(db, { [LOCK_SETTING]: next ? '1' : '0' });
      setEnabledState(next);
      if (next) setLocked(false);
      return true;
    },
    [authenticate, db],
  );

  return (
    <AppLockContext
      value={{ available: available === true, enabled: enabled === true, method, setEnabled }}>
      <View style={styles.root}>
        <View
          style={styles.root}
          accessibilityElementsHidden={showLock}
          importantForAccessibility={showLock ? 'no-hide-descendants' : 'auto'}>
          {children}
        </View>
        {showLock ? (
          <LockScreen method={method} checking={checking} unlocking={unlocking} onUnlock={unlock} />
        ) : null}
      </View>
    </AppLockContext>
  );
}

export function useAppLock() {
  const context = use(AppLockContext);
  if (!context) throw new Error('useAppLock debe usarse dentro de AppLockProvider');
  return context;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
