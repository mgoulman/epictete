#!/usr/bin/env node
import pg from 'pg';

const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    })
  : new Pool({
      host: 'ep-curly-fire-abtz0jag-pooler.eu-west-2.aws.neon.tech',
      database: 'neondb',
      user: 'neondb_owner',
      password: 'npg_Ja6uKNmApf5D',
      port: 5432,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

async function checkCashSheets() {
  console.log('🔄 Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('✅ Connected to database');
    
    // Check all cash_sheets
    console.log('\n📋 Checking cash_sheets table...');
    const result = await client.query(`
      SELECT entry_date, total_ca, total_cb, total_especes, total_depense, reste_especes, created_at
      FROM cash_sheets
      ORDER BY entry_date DESC
      LIMIT 10
    `);
    
    console.log(`\nFound ${result.rows.length} recent cash sheets:\n`);
    result.rows.forEach(row => {
      console.log(`Date: ${row.entry_date}`);
      console.log(`  Total CA: ${row.total_ca}`);
      console.log(`  Total CB: ${row.total_cb}`);
      console.log(`  Total Espèces: ${row.total_especes}`);
      console.log(`  Total Dépense: ${row.total_depense}`);
      console.log(`  Reste Espèces: ${row.reste_especes}`);
      console.log(`  Created at: ${row.created_at}`);
      console.log('');
    });
    
    // Check for specific dates (23 and 24 of current month)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    console.log(`\n🔍 Checking for dates 23 and 24 of ${currentMonth}...`);
    const specificDates = await client.query(`
      SELECT entry_date, total_ca, total_cb, total_especes
      FROM cash_sheets
      WHERE entry_date LIKE '${currentMonth}-23%' OR entry_date LIKE '${currentMonth}-24%'
      ORDER BY entry_date
    `);
    
    if (specificDates.rows.length === 0) {
      console.log('❌ No cash sheets found for dates 23 and 24');
    } else {
      console.log(`✅ Found ${specificDates.rows.length} cash sheets for dates 23 and 24:`);
      specificDates.rows.forEach(row => {
        console.log(`  ${row.entry_date}: CA=${row.total_ca}, CB=${row.total_cb}, Espèces=${row.total_especes}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
    console.log('\n🔌 Connection closed');
  }
}

checkCashSheets();
