import path from "path";
import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";

let dbPromise: Promise<Database> | null = null;

/**
 * Opens the root-level shop.db using sqlite + sqlite3 (singleton per process).
 */
export async function openDb(): Promise<Database> {
  if (!dbPromise) {
    const filename = path.join(process.cwd(), "shop.db");
    dbPromise = open({
      filename,
      driver: sqlite3.Database,
    });
  }
  return dbPromise;
}
