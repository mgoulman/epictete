// Import Suivi Journalier historical data from epictete.xlsx
import XLSX from 'xlsx';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'localhost', user: 'slowbob', password: 'slowbob', database: 'epictete_db',
});

// Excel date serial to ISO date
function excelDateToISO(serial) {
  if (typeof serial !== 'number') return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date = new Date(utc_value * 1000);
  return date.toISOString().split('T')[0];
}

const num = (v) => (v === '' || v === null || v === undefined) ? 0 : Number(v) || 0;

await client.connect();
console.log('Connected to local DB');

const wb = XLSX.readFile('/Users/macbook/Desktop/epictelerestaurant/epictete.xlsx');
const ws = wb.Sheets['Suivi Journalier'];
const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

let imported = 0, skipped = 0;

// Data starts at row 5 (index 5)
for (let i = 5; i < json.length; i++) {
  const row = json[i];
  const dateSerial = row[0];
  if (typeof dateSerial !== 'number') { skipped++; continue; }

  const entry_date = excelDateToISO(dateSerial);
  if (!entry_date) { skipped++; continue; }

  const data = {
    entry_date,
    revenue_card: num(row[1]),
    revenue_cash: num(row[2]),
    revenue_transfer: num(row[3]),
    // skip row[4] = total auto
    expense_cash: num(row[5]),
    expense_cash_desc: row[6] || null,
    expense_card_pro: num(row[7]),
    expense_card_pro_desc: row[8] || null,
    expense_tpe: num(row[9]),
    expense_tpe_desc: row[10] || null,
    // skip row[11] = total auto
    withdrawal_pro: num(row[12]),
    withdrawal_pro_desc: row[13] || null,
    withdrawal_perso: num(row[14]),
    withdrawal_perso_desc: row[15] || null,
    // skip row[16] = total auto, row[17] = solde auto
    observations: row[18] || null,
    status: 'validated',
  };

  try {
    await client.query(
      `INSERT INTO daily_entries (entry_date, revenue_card, revenue_cash, revenue_transfer,
        expense_cash, expense_cash_desc, expense_card_pro, expense_card_pro_desc, expense_tpe, expense_tpe_desc,
        withdrawal_pro, withdrawal_pro_desc, withdrawal_perso, withdrawal_perso_desc, observations, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (entry_date) DO UPDATE SET
         revenue_card = EXCLUDED.revenue_card,
         revenue_cash = EXCLUDED.revenue_cash,
         revenue_transfer = EXCLUDED.revenue_transfer,
         expense_cash = EXCLUDED.expense_cash,
         expense_cash_desc = EXCLUDED.expense_cash_desc,
         expense_card_pro = EXCLUDED.expense_card_pro,
         expense_card_pro_desc = EXCLUDED.expense_card_pro_desc,
         expense_tpe = EXCLUDED.expense_tpe,
         expense_tpe_desc = EXCLUDED.expense_tpe_desc,
         withdrawal_pro = EXCLUDED.withdrawal_pro,
         withdrawal_pro_desc = EXCLUDED.withdrawal_pro_desc,
         withdrawal_perso = EXCLUDED.withdrawal_perso,
         withdrawal_perso_desc = EXCLUDED.withdrawal_perso_desc,
         observations = EXCLUDED.observations,
         updated_at = NOW();`,
      [data.entry_date, data.revenue_card, data.revenue_cash, data.revenue_transfer,
       data.expense_cash, data.expense_cash_desc, data.expense_card_pro, data.expense_card_pro_desc,
       data.expense_tpe, data.expense_tpe_desc, data.withdrawal_pro, data.withdrawal_pro_desc,
       data.withdrawal_perso, data.withdrawal_perso_desc, data.observations, data.status]
    );
    imported++;
  } catch (e) {
    console.error(`Row ${i} (${entry_date}):`, e.message);
    skipped++;
  }
}

console.log(`\nImported: ${imported}, Skipped: ${skipped}`);
await client.end();
