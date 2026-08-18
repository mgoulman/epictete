#!/usr/bin/env node
/**
 * Migration script to calculate and update espece_reste for existing daily_entries
 * Usage: node scripts/calculate-espece-reste.mjs
 */

import pg from 'pg';

const { Pool } = pg;

// Parse DATE columns as strings to avoid timezone issues
pg.types.setTypeParser(1082, (val) => val);

async function calculateEspeceReste() {
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

    console.log('🔄 Fetching daily_entries without espece_reste...');
    
    // Get all entries that need updating
    const { rows: entries } = await pool.query(`
      SELECT id, entry_date, revenue_cash, expense_cash, espece_reste
      FROM daily_entries
      WHERE espece_reste IS NULL OR espece_reste = 0
      ORDER BY entry_date DESC
    `);

    console.log(`📊 Found ${entries.length} entries to update`);

    if (entries.length === 0) {
      console.log('✅ No entries need updating');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const entry of entries) {
      try {
        const especeReste = (Number(entry.revenue_cash) || 0) - (Number(entry.expense_cash) || 0);
        
        await pool.query(`
          UPDATE daily_entries
          SET espece_reste = $1
          WHERE id = $2
        `, [especeReste, entry.id]);

        console.log(`✅ Updated ${entry.entry_date}: ${especeReste.toFixed(2)} DH`);
        updated++;
      } catch (err) {
        console.error(`❌ Error updating ${entry.entry_date}:`, err.message);
        errors++;
      }
    }

    console.log(`\n📈 Summary: ${updated} updated, ${errors} errors`);
    
    if (errors > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

calculateEspeceReste();
