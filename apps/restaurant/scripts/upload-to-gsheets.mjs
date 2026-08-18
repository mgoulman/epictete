import { google } from 'googleapis';
import http from 'http';
import { exec } from 'child_process';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// OAuth2 config — uses the same GCP project, but with user login
const CLIENT_ID = ''; // We'll use service account's project
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

const EXCEL_DIR = './excel-categories';

// Read service account creds to get project info
const saCreds = JSON.parse(fs.readFileSync('./epictete-492501-b1efb2fc36ec.json', 'utf8'));

async function getOAuth2Client() {
  // Create OAuth2 client using project's OAuth credentials
  // Since we don't have OAuth client ID, we'll use a different approach:
  // Create spreadsheets via Drive API with service account, but in a shared folder

  // Actually, let's use Application Default Credentials with user login
  console.log('\n📋 Step 1: Login with your Google account\n');
  console.log('Run this command in your terminal:\n');
  console.log('  npx -y @anthropic-ai/google-auth-helper\n');
  console.log('Or use this alternative approach...\n');
}

// Alternative: Create via service account but transfer ownership
// Best approach: Use the Sheets API with the service account and share with user

async function createAndPopulate() {
  const auth = new google.auth.GoogleAuth({
    credentials: saCreds,
    scopes: SCOPES,
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const drive = google.drive({ version: 'v3', auth: client });

  const files = fs.readdirSync(EXCEL_DIR).filter(f => f.endsWith('.xlsx'));
  const results = [];

  for (const file of files) {
    const filePath = path.join(EXCEL_DIR, file);
    const wb = XLSX.readFile(filePath);
    const title = file.replace('.xlsx', '');

    console.log(`\n📄 Creating: ${title}`);

    try {
      // Create spreadsheet
      const res = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title },
          sheets: wb.SheetNames.map((name, i) => ({
            properties: { title: name, index: i }
          }))
        }
      });

      const spreadsheetId = res.data.spreadsheetId;
      console.log(`  ✅ Created: ${spreadsheetId}`);

      // Populate each sheet
      for (const sheetName of wb.SheetNames) {
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
        if (data.length > 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${sheetName}'!A1`,
            valueInputOption: 'RAW',
            requestBody: { values: data }
          });
          console.log(`  📝 Populated sheet: ${sheetName} (${data.length} rows)`);
        }
      }

      // Make publicly accessible (anyone with link can edit)
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          type: 'anyone',
          role: 'writer'
        }
      });

      results.push({ title, spreadsheetId, url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` });

    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }

  console.log('\n\n=== RESULTS ===\n');
  for (const r of results) {
    console.log(`${r.title}: ${r.url}`);
  }

  return results;
}

createAndPopulate().catch(console.error);
