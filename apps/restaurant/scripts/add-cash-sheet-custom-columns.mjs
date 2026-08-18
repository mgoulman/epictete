#!/usr/bin/env node
/**
 * Migration: add custom_columns JSONB to cash_sheets (user-defined print columns).
 * Local:  node scripts/add-cash-sheet-custom-columns.mjs
 * Neon:   DATABASE_URL="postgres://…" node scripts/add-cash-sheet-custom-columns.mjs
 */

import pg from 'pg';

const { Pool } = pg;

async function addColumn() {
  const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
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
    console.log('🔄 Connecting to database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected');

    console.log('🔄 Adding custom_columns column to cash_sheets...');
    await pool.query(`
      ALTER TABLE cash_sheets
      ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '[]'::jsonb
    `);
    console.log('✅ Column added successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addColumn();
