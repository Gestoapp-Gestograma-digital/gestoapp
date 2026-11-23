import type { SQLiteDatabase } from 'expo-sqlite';

let queue: Promise<unknown> = Promise.resolve();

/**
 * Transacción de escritura en la conexión principal. No se usa withExclusiveTransactionAsync porque
 * abre otra conexión, y con la base cifrada esa conexión no tiene la clave. Para que dos
 * transacciones de la app no se mezclen, se ejecutan de a una, en orden.
 *
 * Toda escritura de la app pasa por acá, aunque sea una sola sentencia: una escritura suelta que
 * corriera en la conexión mientras hay una transacción abierta (por ejemplo, al importar una copia)
 * quedaría adentro de esa transacción y se perdería si se deshace.
 */
export function withWriteTransaction<T>(db: SQLiteDatabase, task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    let result: T | undefined;
    await db.withTransactionAsync(async () => {
      result = await task();
    });
    return result as T;
  });
  queue = run.catch(() => undefined);
  return run;
}
