// Debug script to see Excel file structure
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const filePath = join(projectRoot, 'fiche technique entrée froide.xlsx');

const buffer = readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });

console.log('Sheet names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n=== Sheet: ${sheetName} ===\n`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Print first 50 rows
  for (let i = 0; i < Math.min(50, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0) {
      console.log(`Row ${i}: ${JSON.stringify(row)}`);
    }
  }
}
