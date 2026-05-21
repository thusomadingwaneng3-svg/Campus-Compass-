import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('campuscompass.db');

export const initDB = () => {
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS campuses (
        id TEXT PRIMARY KEY,
        name TEXT,
        short TEXT,
        city TEXT,
        province TEXT,
        data TEXT
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS bursaries (
        id TEXT PRIMARY KEY,
        data TEXT,
        country TEXT
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS emergency (
        id TEXT PRIMARY KEY,
        country TEXT,
        data TEXT
      );`
    );
  });
};

export const saveCampuses = (campuses: any[]) => {
  db.transaction(tx => {
    campuses.forEach(c => {
      tx.executeSql(
        `INSERT OR REPLACE INTO campuses (id, name, short, city, province, data) VALUES (?, ?, ?)`,
        [c.id, c.name, c.short, c.city, c.province, JSON.stringify(c)]
      );
    });
  });
};

export const getCampuses = (cb: (data: any[]) => void) => {
  db.transaction(tx => {
    tx.executeSql(`SELECT data FROM campuses`, [], (_, { rows }) => {
      cb(rows._array.map(r => JSON.parse(r.data)));
    });
  });
};