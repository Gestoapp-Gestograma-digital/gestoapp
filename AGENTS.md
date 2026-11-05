This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Términos y Condiciones y Política de Privacidad

- **Siempre** que se agregue, cambie o quite una funcionalidad, antes de darla por terminada revisar si hay que actualizar `legal/terminos-y-condiciones.md` y `legal/politica-de-privacidad.md`: datos nuevos, proveedores o SDKs, permisos, almacenamiento, funciones que se describen en los textos. Los textos describen lo que el código hace hoy, no lo planeado. Si hay que cambiarlos, se hace en el mismo cambio; si no, se avisa que se revisó.

## Pendientes para producción

Registro de lo que ya está implementado pero solo funciona (o solo se puede probar) en un development build o en producción, y de lo que falta configurar antes de publicar. Actualizar esta sección cuando se resuelva cada punto.

### Funciones que no corren en Expo Go

Expo Go no trae SQLCipher ni Face ID. En Expo Go la app sigue funcionando, pero estas funciones quedan desactivadas o reducidas. Hay que probarlas en un development build (`eas build --profile development` o `npx expo run:ios|android`).

- **Base de datos cifrada (SQLCipher).** `app.json` activa `useSQLCipher` en el plugin de `expo-sqlite`. `src/db/encryption.ts` detecta SQLCipher con `PRAGMA cipher_version`: si está, usa `gestoapp-cifrada.db` con una clave aleatoria de 32 bytes guardada en `expo-secure-store` (`gestoapp.database-key`); si no (Expo Go), sigue con `gestoapp.db` sin cifrar. Al primer arranque con SQLCipher, copia la base sin cifrar a la cifrada (`sqlcipher_export` a un archivo temporal) y borra la vieja. Si existe la base cifrada pero falta la clave, la descarta y la app empieza vacía. Probar: instalar sobre una versión con datos y confirmar que se conservan; reiniciar la app; exportar e importar una copia.
- **Transacciones con la base cifrada.** No usar `withExclusiveTransactionAsync`: abre otra conexión sin la clave y no puede leer la base. Usar `withWriteTransaction` de `src/db/transaction.ts`, que corre en la conexión principal y encola las transacciones de la app.
- **Bloqueo con Face ID, Touch ID, huella o código.** `src/providers/app-lock-provider.tsx`, activado por defecto: bloquea al abrir la app y al volver después de 1 minuto (`RELOCK_AFTER_MS`) en segundo plano, nunca durante el onboarding ni justo al terminarlo. Se desactiva desde Configuración › Seguridad, previa autenticación. El texto de permiso de Face ID (`NSFaceIDUsageDescription`) se define en el plugin de `expo-local-authentication` en `app.json`. En Expo Go, iOS no usa Face ID (cae al código del teléfono). Probar: abrir la app, volver después de más y de menos de 1 minuto, volver de elegir un archivo o de compartir la copia (no debería bloquearse), desactivar y activar el bloqueo, y un teléfono sin bloqueo configurado.
- **Datos ocultos en el selector de apps.** `src/hooks/use-privacy-screen.ts`. iOS: desenfoque con `enableAppSwitcherProtectionAsync`, siempre activo. Android: `preventScreenCaptureAsync` (FLAG_SECURE), que además **bloquea las capturas de pantalla**; solo se activa fuera de desarrollo (`!__DEV__`), así que en un build de release no se pueden sacar capturas en Android. Las capturas para la tienda hay que sacarlas de un build de desarrollo o del simulador. Probar en un build de release de Android: vista previa en blanco en el selector y capturas bloqueadas.
- **Respaldo automático.** `android.allowBackup` está en `false`: la clave no sale del teléfono, así que una copia de Google no se podría abrir en otro equipo. En iOS, la copia de iCloud incluye la base cifrada y el llavero. La forma recomendada de recuperar datos es la copia exportada (Configuración › Exportar copia, o «Importar copia de seguridad» con la lista vacía). Probar la exportación y la importación en los dos sistemas, guardando en iCloud Drive y en Google Drive.

### Configuración que falta antes de publicar

- **`app.json`:** `ios.bundleIdentifier` y decidir `ios.supportsTablet`. Ya están el nombre visible (`GestoApp`) y `android.package` (`com.gestoapp`, no se puede cambiar una vez publicado). `versionCode` y `buildNumber` los maneja EAS (`appVersionSource: "remote"` y `autoIncrement` en `production`).
- **`eas.json`:** listo, con los perfiles `development` (usa `expo-dev-client`), `preview` (APK para instalar directo) y `production` (AAB para Play). Falta vincular el proyecto con `npx eas-cli@latest init`.
- **Cifrado y exportación (iOS):** la app usa cifrado estándar (AES-256 en la base y en la copia exportada). Responder las preguntas de cumplimiento de exportación de App Store Connect y declarar `ITSAppUsesNonExemptEncryption` en `ios.infoPlist` según corresponda. Verificar con la documentación de Apple si aplica la exención para cifrado de protección de datos.
- **Permisos de Android:** revisar el `AndroidManifest.xml` que genera el prebuild y bloquear con `android.blockedPermissions` todo lo que no se use. `READ_MEDIA_IMAGES`, que agrega `expo-screen-capture`, y los permisos de almacenamiento ya están bloqueados: la base vive en el espacio privado de la app y las copias usan los selectores del sistema. La política de privacidad dice que la app no usa la cámara, la ubicación, los contactos, el micrófono ni las fotos. `expo-local-authentication` agrega `USE_BIOMETRIC` (necesario) y `USE_FINGERPRINT` (obsoleto).
- **Manifiesto de privacidad de iOS (`PrivacyInfo.xcprivacy`):** confirmar que cubra las APIs de motivo requerido que usan las dependencias; si hace falta, completarlo con `ios.privacyManifests` en `app.json`.
- **Declaraciones en las tiendas:** URL pública de la política de privacidad; etiquetas de privacidad en App Store Connect; sección de seguridad de los datos en Play Console (los datos no salen del dispositivo y se cifran); declaración de apps de salud de Google Play. Apple revisa con cuidado las apps médicas (guía 1.4.1): presentar la app como herramienta de apoyo, sin decir que diagnostica.
- **SDK de Expo:** el proyecto está en SDK 57 (Expo 57.0.30). La nueva Expo Go solo abre SDK 58; pasar a 58 antes de publicar o al empezar a trabajar con development builds. Al subir: `File.write()` pasa a ser asíncrono (afecta a `src/app/copia/exportar.tsx`) y hay que probar a fondo la navegación de Expo Router.

### Antes de publicar, también

- **Textos legales:** la versión que se acepta se arma con la fecha de «Última actualización» de cada documento (`LEGAL_VERSION` en `src/lib/legal.ts`). Si se cambia un texto, cambiar también la fecha, o no se vuelve a pedir la aceptación.
- **Monitoreo de errores:** hoy no hay. Si se agrega un servicio externo, antes hay que actualizar la política de privacidad (cláusula 12), porque dice que no se envía nada fuera del dispositivo.
- **Velocidad del cifrado de la copia:** scrypt con N = 2^14 tarda unos 3-4 segundos en el teléfono (aceptado). Los parámetros viajan en el archivo, así que se pueden cambiar sin romper copias viejas.
