#!/usr/bin/env node
/**
 * Migration script to add espece_reste column to daily_entries table
 * Usage: node scripts/add-espece-reste-column.mjs
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
    console.log('✅ Connected to database');

    console.log('🔄 Adding espece_reste column to daily_entries...');
    
    await pool.query(`
      ALTER TABLE daily_entries
      ADD COLUMN IF NOT EXISTS espece_reste NUMERIC(12,2) DEFAULT 0
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
