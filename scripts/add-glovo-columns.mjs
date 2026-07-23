#!/usr/bin/env node
import pg from 'pg';

const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Neon requires SSL
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

async function addGlovoColumns() {
  console.log('🔄 Connecting to database...');
  try {
    await pool.connect();
    console.log('✅ Connected to database');

    console.log('🔄 Adding glovo_ttc_espece column to daily_entries...');
    await pool.query(`
      ALTER TABLE daily_entries
      ADD COLUMN IF NOT EXISTS glovo_ttc_espece NUMERIC(12,2) DEFAULT 0
    `);
    console.log('✅ glovo_ttc_espece column added successfully');

    console.log('🔄 Adding glovo_ttc_online column to daily_entries...');
    await pool.query(`
      ALTER TABLE daily_entries
      ADD COLUMN IF NOT EXISTS glovo_ttc_online NUMERIC(12,2) DEFAULT 0
    `);
    console.log('✅ glovo_ttc_online column added successfully');

    console.log('🔄 Adding glovo_ttc_espece column to cash_sheets...');
    await pool.query(`
      ALTER TABLE cash_sheets
      ADD COLUMN IF NOT EXISTS glovo_ttc_espece NUMERIC(12,2) DEFAULT 0
    `);
    console.log('✅ glovo_ttc_espece column added to cash_sheets successfully');

    console.log('🔄 Adding glovo_ttc_online column to cash_sheets...');
    await pool.query(`
      ALTER TABLE cash_sheets
      ADD COLUMN IF NOT EXISTS glovo_ttc_online NUMERIC(12,2) DEFAULT 0
    `);
    console.log('✅ glovo_ttc_online column added to cash_sheets successfully');

  } catch (error) {
    console.error('❌ Error adding glovo columns:', error);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed.');
  }
}

addGlovoColumns();
