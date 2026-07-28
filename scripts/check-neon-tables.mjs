#!/usr/bin/env node
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

try {
  const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Tables in database:', rows.map(r => r.table_name).join(', '));
} finally {
  await pool.end();
}
