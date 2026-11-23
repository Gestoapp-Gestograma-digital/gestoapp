/// <reference types="node" />

import {
  checkBackupFile,
  decryptBackup,
  encryptBackup,
  InvalidBackupFileError,
  WrongPasswordError,
} from '../backup-crypto';

/**
 * expo-crypto es nativo: acá se reemplaza por AES-256-GCM de Node con el mismo formato
 * (nonce de 12 bytes + texto cifrado + tag de 16; los strings se leen como base64).
 */
jest.mock('expo-crypto', () => {
  const crypto: typeof import('crypto') = jest.requireActual('crypto');
  const bytes = (input: string | Uint8Array) =>
    typeof input === 'string' ? Buffer.from(input, 'base64') : Buffer.from(input);

  class AESSealedData {
    data: Buffer;
    constructor(sealed: Buffer) {
      this.data = sealed;
    }
    static fromCombined(combined: string | Uint8Array) {
      return new AESSealedData(bytes(combined));
    }
    async combined(encoding?: 'base64') {
      return encoding === 'base64' ? this.data.toString('base64') : new Uint8Array(this.data);
    }
  }

  return {
    getRandomBytes: (count: number) => new Uint8Array(crypto.randomBytes(count)),
    AESEncryptionKey: {
      import: async (key: Uint8Array) => ({ key: Buffer.from(key) }),
    },
    AESSealedData,
    aesEncryptAsync: async (
      plaintext: Uint8Array,
      { key }: { key: Buffer },
      { additionalData }: { additionalData: string },
    ) => {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(bytes(additionalData));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      return new AESSealedData(Buffer.concat([iv, ciphertext, cipher.getAuthTag()]));
    },
    aesDecryptAsync: async (
      sealed: AESSealedData,
      { key }: { key: Buffer },
      { additionalData }: { additionalData: string },
    ) => {
      const { data } = sealed;
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
      decipher.setAAD(bytes(additionalData));
      decipher.setAuthTag(data.subarray(data.length - 16));
      return new Uint8Array(
        Buffer.concat([decipher.update(data.subarray(12, data.length - 16)), decipher.final()]),
      );
    },
  };
});

const DATA = {
  profile: { title: 'Dra.', name: 'Núñez' },
  patients: [{ id: 1, name: 'Lucía Pérez', note: 'Señal: «ñandú» ✓' }],
};

describe('encryptBackup / decryptBackup', () => {
  test('ida y vuelta conserva los datos, con acentos y símbolos', async () => {
    const file = await encryptBackup(DATA, 'clave-segura');
    expect(file).not.toContain('Lucía');
    await expect(decryptBackup(file, 'clave-segura')).resolves.toEqual(DATA);
  });

  test('la contraseña se normaliza: «é» compuesta o con tilde combinada da lo mismo', async () => {
    const file = await encryptBackup(DATA, 'café-1234');
    await expect(decryptBackup(file, 'café-1234')).resolves.toEqual(DATA);
  });

  test('una contraseña equivocada da WrongPasswordError', async () => {
    const file = await encryptBackup(DATA, 'clave-segura');
    await expect(decryptBackup(file, 'otra-clave')).rejects.toBeInstanceOf(WrongPasswordError);
  });

  test('cambiar un parámetro del encabezado rompe la autenticación', async () => {
    const envelope = JSON.parse(await encryptBackup(DATA, 'clave-segura'));
    envelope.createdAt = '2000-01-01T00:00:00.000Z'; // no está autenticado: no importa
    await expect(decryptBackup(JSON.stringify(envelope), 'clave-segura')).resolves.toEqual(DATA);

    envelope.kdf.r = 4;
    await expect(decryptBackup(JSON.stringify(envelope), 'clave-segura')).rejects.toBeInstanceOf(
      WrongPasswordError,
    );
  });
});

describe('checkBackupFile', () => {
  const valid = {
    format: 'gestoapp-copia',
    version: 1,
    createdAt: '2026-11-22T00:00:00.000Z',
    kdf: {
      name: 'scrypt',
      N: 2 ** 14,
      r: 8,
      p: 1,
      salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
    },
    cipher: 'AES-256-GCM',
    data: 'AAAA',
  };
  const withChanges = (changes: object) => JSON.stringify({ ...valid, ...changes });
  const withKdf = (changes: object) => withChanges({ kdf: { ...valid.kdf, ...changes } });

  test('acepta un encabezado válido', () => {
    expect(() => checkBackupFile(JSON.stringify(valid))).not.toThrow();
  });

  test.each([
    ['no es JSON', 'hola'],
    ['es null', 'null'],
    ['otro formato', withChanges({ format: 'otra-app' })],
    ['versión futura', withChanges({ version: 2 })],
    ['otro cifrado', withChanges({ cipher: 'AES-128-CBC' })],
    ['sin datos', withChanges({ data: undefined })],
    ['sin kdf', withChanges({ kdf: undefined })],
    ['N que no es potencia de 2', withKdf({ N: 3000 })],
    // Un archivo manipulado no puede pedir una derivación imposible de calcular.
    ['N demasiado grande', withKdf({ N: 2 ** 20 })],
    ['N demasiado chico', withKdf({ N: 2 ** 8 })],
    ['r demasiado grande', withKdf({ r: 17 })],
    ['p demasiado grande', withKdf({ p: 5 })],
    ['sin sal', withKdf({ salt: undefined })],
  ])('rechaza: %s', (_case, file) => {
    expect(() => checkBackupFile(file)).toThrow(InvalidBackupFileError);
  });
});
