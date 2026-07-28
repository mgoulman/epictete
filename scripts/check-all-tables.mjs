#!/usr/bin/env node
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

try {
  const { rows } = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name");
  console.log('All tables:', JSON.stringify(rows, null, 2));
  if (rows.length === 0) {
    console.log('No tables found in non-system schemas');
  }
} finally {
  await pool.end();
}
