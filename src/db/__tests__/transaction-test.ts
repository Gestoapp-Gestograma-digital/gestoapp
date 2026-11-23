import type { SQLiteDatabase } from 'expo-sqlite';

import { withWriteTransaction } from '../transaction';

/** Registra en qué orden empiezan y terminan las transacciones. */
function fakeDatabase(log: string[]) {
  return {
    withTransactionAsync: async (task: () => Promise<void>) => {
      log.push('BEGIN');
      try {
        await task();
        log.push('COMMIT');
      } catch (error) {
        log.push('ROLLBACK');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('withWriteTransaction', () => {
  test('devuelve lo que devuelve la tarea', async () => {
    const db = fakeDatabase([]);
    await expect(withWriteTransaction(db, async () => 42)).resolves.toBe(42);
  });

  test('corre las transacciones de a una, en el orden en que se pidieron', async () => {
    const log: string[] = [];
    const db = fakeDatabase(log);
    const slow = withWriteTransaction(db, async () => {
      log.push('lenta');
      await wait(20);
    });
    const fast = withWriteTransaction(db, async () => {
      log.push('rápida');
    });
    await Promise.all([slow, fast]);
    expect(log).toEqual(['BEGIN', 'lenta', 'COMMIT', 'BEGIN', 'rápida', 'COMMIT']);
  });

  test('una transacción que falla no traba las siguientes', async () => {
    const log: string[] = [];
    const db = fakeDatabase(log);
    const failing = withWriteTransaction(db, async () => {
      throw new Error('falla');
    });
    const next = withWriteTransaction(db, async () => 'ok');
    await expect(failing).rejects.toThrow('falla');
    await expect(next).resolves.toBe('ok');
    expect(log).toEqual(['BEGIN', 'ROLLBACK', 'BEGIN', 'COMMIT']);
  });
});
