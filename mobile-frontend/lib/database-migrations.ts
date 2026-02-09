import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  let { user_version: currentDbVersion } = (await db.getFirstAsync<{
    user_version: number;
  }>('PRAGMA user_version')) ?? { user_version: 0 };

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    // Migration 1: Add unread_count column to student table
    try {
      console.log('[Migration] Adding unread_count column to student table');
      await db.execAsync(`
        ALTER TABLE student ADD COLUMN unread_count INTEGER DEFAULT 0;
      `);
      currentDbVersion = 1;
      console.log('[Migration] Successfully added unread_count column');
    } catch (error) {
      // Column might already exist, check if it's a "duplicate column" error
      if (
        error instanceof Error &&
        error.message.includes('duplicate column')
      ) {
        console.log('[Migration] unread_count column already exists, skipping');
        currentDbVersion = 1;
      } else {
        console.error('[Migration] Failed to add unread_count column:', error);
        throw error;
      }
    }
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  console.log(`[Migration] Database migrated to version ${DATABASE_VERSION}`);
}
