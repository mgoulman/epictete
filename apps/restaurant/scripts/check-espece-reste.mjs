#!/usr/bin/env node
import pg from 'pg';

const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'slowbob',
      password: process.env.DB_PASSWORD || 'slowbob',
      database: process.env.DB_NAME || 'epictete_db',
    });

pool.on('connect', (client) => {
  client.query('SET search_path TO public').catch(() => {});
});

try {
  const { rows } = await pool.query('SELECT entry_date, espece_reste FROM daily_entries ORDER BY entry_date DESC LIMIT 5');
  console.log('Database values:', JSON.stringify(rows, null, 2));
} finally {
  await pool.end();
}
