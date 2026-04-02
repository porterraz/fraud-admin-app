import path from "path";
import { open, type Database } from "sqlite";

let dbPromise: Promise<Database> | null = null;

/** Opens shop.db via sqlite + sqlite3 (singleton per process). */
export async function openDb(): Promise<Database> {
  if (!dbPromise) {
    const sqlite3 = (await import("sqlite3")).default;
    const filename = path.join(process.cwd(), "shop.db");
    dbPromise = open({
      filename,
      driver: sqlite3.Database,
    });
  }
  return dbPromise;
}
