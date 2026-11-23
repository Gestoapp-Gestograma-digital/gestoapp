/// <reference types="node" />

import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from '../migrations';

/** Lo mínimo de node:sqlite que usan los tests. */
type NodeDatabase = {
  exec(sql: string): void;
  prepare(sql: string): { get(): unknown; all(): unknown[] };
  close(): void;
};

// process.getBuiltinModule evita que el resolver de Jest, que no conoce node:sqlite, lo busque.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as {
  DatabaseSync: new (path: string) => NodeDatabase;
};

/** Base en memoria con la parte de la API de expo-sqlite que usan las migraciones. */
function openTestDatabase() {
  const native = new DatabaseSync(':memory:');
  const db = {
    execAsync: async (sql: string) => native.exec(sql),
    getFirstAsync: async (sql: string) => native.prepare(sql).get() ?? null,
    withTransactionAsync: async (task: () => Promise<void>) => {
      native.exec('BEGIN');
      try {
        await task();
        native.exec('COMMIT');
      } catch (error) {
        native.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
  return { db, native };
}

function userVersion(native: NodeDatabase) {
  return (native.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
}

function columns(native: NodeDatabase, table: string) {
  return (
    native.prepare(`PRAGMA table_info(${table})`).all() as {
      name: string;
      notnull: number;
    }[]
  ).map((column) => [column.name, column.notnull === 1] as const);
}

let open: NodeDatabase[] = [];

function track<T extends { native: NodeDatabase }>(value: T) {
  open.push(value.native);
  return value;
}

afterEach(() => {
  open.forEach((native) => native.close());
  open = [];
});

describe('migrateDbIfNeeded', () => {
  test('crea el esquema actual en una base vacía', async () => {
    const { db, native } = track(openTestDatabase());
    await migrateDbIfNeeded(db);

    expect(userVersion(native)).toBe(6);
    expect(columns(native, 'patients')).toEqual([
      ['id', false],
      ['name', true],
      ['age', false],
      ['weight', false],
      ['height_cm', false],
      ['fum', false],
      ['attended_at', true],
      ['created_at', true],
      ['eco_date', false],
      ['eco_ga_days', false],
      ['note', false],
      ['note_updated_at', false],
    ]);
    const indexes = native
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'patients'")
      .all();
    expect(indexes).toContainEqual({ name: 'idx_patients_attended_at' });
    expect(columns(native, 'settings').map(([name]) => name)).toEqual(['key', 'value']);
  });

  test('no hace nada si la base ya está al día', async () => {
    const { db, native } = track(openTestDatabase());
    await migrateDbIfNeeded(db);
    native.exec(`INSERT INTO patients (name, attended_at) VALUES ('Ana', '2026-11-01')`);
    await migrateDbIfNeeded(db);

    expect(userVersion(native)).toBe(6);
    expect(native.prepare('SELECT COUNT(*) AS count FROM patients').get()).toEqual({ count: 1 });
  });

  test('migra los datos de una base en la versión 1', async () => {
    const { db, native } = track(openTestDatabase());
    // Esquema publicado en la versión 1: altura en metros y edad obligatoria.
    native.exec(`
      CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        weight REAL,
        height REAL,
        fum TEXT,
        last_seen TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_patients_last_seen ON patients (last_seen);
      INSERT INTO patients (name, age, weight, height, fum, last_seen)
        VALUES ('Ana Prueba', 30, 60, 1.7, '2026-06-01', '2026-07-15');
      -- Paciente de ejemplo de las primeras versiones: la migración 4 la borra.
      INSERT INTO patients (name, age, weight, height, fum, last_seen)
        VALUES ('Lucía Fernández', 31, 64, 1.63, NULL, '2026-07-15');
      INSERT INTO settings (key, value) VALUES ('profile_name', 'Martínez');
      PRAGMA user_version = 1;
    `);

    await migrateDbIfNeeded(db);

    expect(userVersion(native)).toBe(6);
    expect(
      native.prepare('SELECT name, age, weight, height_cm, fum, attended_at FROM patients').all(),
    ).toEqual([
      {
        name: 'Ana Prueba',
        age: 30,
        weight: 60,
        height_cm: 170,
        fum: '2026-06-01',
        attended_at: '2026-07-15',
      },
    ]);
    expect(native.prepare('SELECT value FROM settings').get()).toEqual({
      value: 'Martínez',
    });
  });

  test('si un paso falla, lo deshace entero y no avanza la versión', async () => {
    const { db, native } = track(openTestDatabase());
    // El paso 1 crea settings y patients: con settings ya creada, falla a mitad de camino.
    native.exec('CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)');

    await expect(migrateDbIfNeeded(db)).rejects.toThrow();

    expect(userVersion(native)).toBe(0);
    expect(
      native.prepare("SELECT name FROM sqlite_master WHERE name = 'patients'").get(),
    ).toBeUndefined();
  });
});
