import { initDb, pgPool } from './index';

async function runMigration() {
  console.log('[Migration] Starting PostgreSQL schema migration & index creation...');
  try {
    await initDb();
    console.log('[Migration] ✅ Schema migration successfully applied.');
    console.log('[Migration] • Table "trades" initialized with temporal deduplication columns.');
    console.log('[Migration] • Indexes on symbol, trade_timestamp, client_id, and updated_at confirmed.');
  } catch (err) {
    console.error('[Migration] ❌ Error during database migration:', err);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

runMigration();
