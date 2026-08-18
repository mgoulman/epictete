import { google } from 'googleapis';
import { readFileSync } from 'fs';

const creds = JSON.parse(readFileSync('./epictete-492501-b1efb2fc36ec.json', 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SSID = '1XlvaDk97ihIVmzk0Z8LyDYqgUxksslhFVHjxhBUlhFk';

async function run() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Get sheet metadata to map names to IDs
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SSID });
  const sheetMap = {};
  meta.data.sheets.forEach(s => {
    sheetMap[s.properties.title] = s.properties.sheetId;
  });
  console.log('Sheets:', Object.keys(sheetMap));

  const requests = [];

  // Category colors
  const categoryColors = {
    'Boissons': { red: 0.2, green: 0.4, blue: 0.7 },
    'Économat': { red: 0.7, green: 0.5, blue: 0.2 },
    'Éco Pdt Italien': { red: 0.8, green: 0.3, blue: 0.2 },
    'Fournisseurs': { red: 0.4, green: 0.3, blue: 0.6 },
    'Fromage': { red: 0.9, green: 0.7, blue: 0.2 },
    'Légumes': { red: 0.2, green: 0.6, blue: 0.3 },
    'Poisson': { red: 0.2, green: 0.5, blue: 0.8 },
    'Viande': { red: 0.7, green: 0.2, blue: 0.2 },
  };

  // Helper to create a grid range
  const gridRange = (sheetId, r1, r2, c1, c2) => ({
    sheetId, startRowIndex: r1, endRowIndex: r2, startColumnIndex: c1, endColumnIndex: c2
  });

  // Format individual category sheets (title row + header row)
  for (const [name, color] of Object.entries(categoryColors)) {
    const sid = sheetMap[name];
    if (sid === undefined) { console.log('SKIP:', name); continue; }
    const cols = name === 'Fournisseurs' ? 3 : 3;

    // Title row - colored background, white bold text
    requests.push({
      repeatCell: {
        range: gridRange(sid, 0, 1, 0, cols),
        cell: {
          userEnteredFormat: {
            backgroundColor: color,
            textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: 'CENTER',
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });

    // Header row - gray background, bold
    requests.push({
      repeatCell: {
        range: gridRange(sid, 1, 2, 0, cols),
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
            textFormat: { bold: true, fontSize: 11 },
            horizontalAlignment: 'CENTER',
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });

    // Merge title row
    requests.push({
      mergeCells: {
        range: gridRange(sid, 0, 1, 0, cols),
        mergeType: 'MERGE_ALL',
      }
    });

    // Tab color
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: sid, tabColorStyle: { rgbColor: color } },
        fields: 'tabColorStyle',
      }
    });

    // Auto-resize columns
    requests.push({
      autoResizeDimensions: {
        dimensions: { sheetId: sid, dimension: 'COLUMNS', startIndex: 0, endIndex: cols }
      }
    });

    // Borders around header
    requests.push({
      updateBorders: {
        range: gridRange(sid, 1, 2, 0, cols),
        bottom: { style: 'SOLID_MEDIUM', colorStyle: { rgbColor: { red: 0.3, green: 0.3, blue: 0.3 } } },
      }
    });
  }

  // Format INV- sheets (same pattern, same colors)
  const invMap = {
    'INV-Légumes': { color: categoryColors['Légumes'], cols: 3 },
    'INV-Économat': { color: categoryColors['Économat'], cols: 4 },
    'INV-Fromage': { color: categoryColors['Fromage'], cols: 3 },
    'INV-Poisson': { color: categoryColors['Poisson'], cols: 3 },
    'INV-Viande': { color: categoryColors['Viande'], cols: 3 },
    'INV-Éco Pdt Italien': { color: categoryColors['Éco Pdt Italien'], cols: 4 },
    'INV-Fournisseurs': { color: categoryColors['Fournisseurs'], cols: 3 },
    'INV-Boissons': { color: categoryColors['Boissons'], cols: 3 },
  };

  for (const [name, { color, cols }] of Object.entries(invMap)) {
    const sid = sheetMap[name];
    if (sid === undefined) { console.log('SKIP:', name); continue; }

    requests.push({
      repeatCell: {
        range: gridRange(sid, 0, 1, 0, cols),
        cell: { userEnteredFormat: { backgroundColor: color, textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    requests.push({
      repeatCell: {
        range: gridRange(sid, 1, 2, 0, cols),
        cell: { userEnteredFormat: { backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, textFormat: { bold: true, fontSize: 11 }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    requests.push({ mergeCells: { range: gridRange(sid, 0, 1, 0, cols), mergeType: 'MERGE_ALL' } });
    requests.push({ updateSheetProperties: { properties: { sheetId: sid, tabColorStyle: { rgbColor: color } }, fields: 'tabColorStyle' } });
    requests.push({ autoResizeDimensions: { dimensions: { sheetId: sid, dimension: 'COLUMNS', startIndex: 0, endIndex: cols } } });
    requests.push({ updateBorders: { range: gridRange(sid, 1, 2, 0, cols), bottom: { style: 'SOLID_MEDIUM', colorStyle: { rgbColor: { red: 0.3, green: 0.3, blue: 0.3 } } } } });
  }

  // Format SI- sheets
  const siMap = {
    'SI-Légumes': { color: categoryColors['Légumes'], cols: 4 },
    'SI-Économat': { color: categoryColors['Économat'], cols: 4 },
    'SI-Fromage': { color: categoryColors['Fromage'], cols: 4 },
    'SI-Poisson': { color: categoryColors['Poisson'], cols: 4 },
    'SI-Viande': { color: categoryColors['Viande'], cols: 4 },
    'SI-Éco Pdt Italien': { color: categoryColors['Éco Pdt Italien'], cols: 4 },
    'SI-Fournisseurs': { color: categoryColors['Fournisseurs'], cols: 5 },
    'SI-Boissons': { color: categoryColors['Boissons'], cols: 4 },
  };

  for (const [name, { color, cols }] of Object.entries(siMap)) {
    const sid = sheetMap[name];
    if (sid === undefined) { console.log('SKIP:', name); continue; }

    requests.push({
      repeatCell: {
        range: gridRange(sid, 0, 1, 0, cols),
        cell: { userEnteredFormat: { backgroundColor: color, textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    requests.push({
      repeatCell: {
        range: gridRange(sid, 1, 2, 0, cols),
        cell: { userEnteredFormat: { backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, textFormat: { bold: true, fontSize: 11 }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    requests.push({ mergeCells: { range: gridRange(sid, 0, 1, 0, cols), mergeType: 'MERGE_ALL' } });
    requests.push({ updateSheetProperties: { properties: { sheetId: sid, tabColorStyle: { rgbColor: color } }, fields: 'tabColorStyle' } });
    requests.push({ autoResizeDimensions: { dimensions: { sheetId: sid, dimension: 'COLUMNS', startIndex: 0, endIndex: cols } } });
    requests.push({ updateBorders: { range: gridRange(sid, 1, 2, 0, cols), bottom: { style: 'SOLID_MEDIUM', colorStyle: { rgbColor: { red: 0.3, green: 0.3, blue: 0.3 } } } } });
  }

  // Format Suivi Journalier
  const sjId = sheetMap['Suivi Journalier'];
  if (sjId !== undefined) {
    const darkBlue = { red: 0.1, green: 0.2, blue: 0.4 };
    const white = { red: 1, green: 1, blue: 1 };
    const lightBlue = { red: 0.85, green: 0.92, blue: 1 };
    const lightGray = { red: 0.93, green: 0.93, blue: 0.93 };

    // Title row A1 - merge & style
    requests.push({ mergeCells: { range: gridRange(sjId, 0, 1, 0, 14), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gridRange(sjId, 0, 1, 0, 14),
        cell: { userEnteredFormat: { backgroundColor: darkBlue, textFormat: { bold: true, fontSize: 16, foregroundColor: white }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });

    // Subtitle row A2
    requests.push({ mergeCells: { range: gridRange(sjId, 1, 2, 0, 14), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gridRange(sjId, 1, 2, 0, 14),
        cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, fontSize: 12, foregroundColor: white }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });

    // Category headers row 4 (index 3) - merge groups
    requests.push({ mergeCells: { range: gridRange(sjId, 3, 4, 1, 5), mergeType: 'MERGE_ALL' } }); // RECETTES B4:E4
    requests.push({ mergeCells: { range: gridRange(sjId, 3, 4, 5, 9), mergeType: 'MERGE_ALL' } }); // DEPENSES F4:I4
    requests.push({ mergeCells: { range: gridRange(sjId, 3, 4, 9, 12), mergeType: 'MERGE_ALL' } }); // RETRAITS J4:L4
    requests.push({
      repeatCell: {
        range: gridRange(sjId, 3, 4, 0, 14),
        cell: { userEnteredFormat: { backgroundColor: { red: 0.3, green: 0.4, blue: 0.6 }, textFormat: { bold: true, fontSize: 11, foregroundColor: white }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });

    // Sub-headers row 5 (index 4)
    requests.push({
      repeatCell: {
        range: gridRange(sjId, 4, 5, 0, 14),
        cell: { userEnteredFormat: { backgroundColor: lightBlue, textFormat: { bold: true, fontSize: 9 }, horizontalAlignment: 'CENTER', wrapStrategy: 'WRAP' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
      }
    });

    // Auto-calculated columns (E, I, L, M) - light gray background for data rows
    for (const col of [4, 8, 11, 12]) {
      requests.push({
        repeatCell: {
          range: gridRange(sjId, 5, 36, col, col + 1),
          cell: { userEnteredFormat: { backgroundColor: lightGray, textFormat: { bold: true } } },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        }
      });
    }

    // Manual input columns (B,C,D, F,G,H, J,K) - blue text
    for (const col of [1, 2, 3, 5, 6, 7, 9, 10]) {
      requests.push({
        repeatCell: {
          range: gridRange(sjId, 5, 36, col, col + 1),
          cell: { userEnteredFormat: { textFormat: { foregroundColor: { red: 0.1, green: 0.2, blue: 0.7 } } } },
          fields: 'userEnteredFormat(textFormat)',
        }
      });
    }

    // Totals row 37 (index 36) - dark background
    requests.push({
      repeatCell: {
        range: gridRange(sjId, 36, 37, 0, 14),
        cell: { userEnteredFormat: { backgroundColor: darkBlue, textFormat: { bold: true, fontSize: 11, foregroundColor: white }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });

    // Number format for currency columns
    requests.push({
      repeatCell: {
        range: gridRange(sjId, 5, 37, 1, 14),
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0.00' } } },
        fields: 'userEnteredFormat(numberFormat)',
      }
    });

    // Freeze header rows
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: sjId, gridProperties: { frozenRowCount: 5 }, tabColorStyle: { rgbColor: darkBlue } },
        fields: 'gridProperties.frozenRowCount,tabColorStyle',
      }
    });

    // Auto-resize
    requests.push({
      autoResizeDimensions: {
        dimensions: { sheetId: sjId, dimension: 'COLUMNS', startIndex: 0, endIndex: 14 }
      }
    });

    // Alternating row colors for data
    requests.push({
      addBanding: {
        bandedRange: {
          range: gridRange(sjId, 5, 36, 0, 14),
          rowProperties: {
            headerColor: lightBlue,
            firstBandColor: white,
            secondBandColor: { red: 0.95, green: 0.97, blue: 1 },
          }
        }
      }
    });
  }

  // Format Legende sheet
  const legId = sheetMap['Legende'];
  if (legId !== undefined) {
    requests.push({ mergeCells: { range: gridRange(legId, 0, 1, 0, 2), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gridRange(legId, 0, 1, 0, 2),
        cell: { userEnteredFormat: { backgroundColor: { red: 0.1, green: 0.2, blue: 0.4 }, textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    // Section headers
    for (const row of [2, 6, 20]) {
      requests.push({ mergeCells: { range: gridRange(legId, row, row + 1, 0, 2), mergeType: 'MERGE_ALL' } });
      requests.push({
        repeatCell: {
          range: gridRange(legId, row, row + 1, 0, 2),
          cell: { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 }, textFormat: { bold: true, fontSize: 12 }, horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        }
      });
    }
    requests.push({ autoResizeDimensions: { dimensions: { sheetId: legId, dimension: 'COLUMNS', startIndex: 0, endIndex: 2 } } });
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: legId, tabColorStyle: { rgbColor: { red: 0.5, green: 0.5, blue: 0.5 } } },
        fields: 'tabColorStyle',
      }
    });
  }

  // Format Recap Mensuel
  const recId = sheetMap['Recap Mensuel'];
  if (recId !== undefined) {
    requests.push({ mergeCells: { range: gridRange(recId, 0, 1, 0, 3), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gridRange(recId, 0, 1, 0, 3),
        cell: { userEnteredFormat: { backgroundColor: { red: 0.1, green: 0.2, blue: 0.4 }, textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    requests.push({
      repeatCell: {
        range: gridRange(recId, 1, 2, 0, 3),
        cell: { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.92, blue: 1 }, textFormat: { bold: true, fontSize: 11 }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    // Bold total rows (TOTAL RECETTES, TOTAL DEPENSES, TOTAL RETRAITS, SOLDE)
    for (const row of [6, 10, 13, 14]) {
      requests.push({
        repeatCell: {
          range: gridRange(recId, row, row + 1, 0, 3),
          cell: { userEnteredFormat: { backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, textFormat: { bold: true, fontSize: 11 } } },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        }
      });
    }
    // Currency format
    requests.push({
      repeatCell: {
        range: gridRange(recId, 2, 15, 1, 2),
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0.00' } } },
        fields: 'userEnteredFormat(numberFormat)',
      }
    });
    // Percentage format
    requests.push({
      repeatCell: {
        range: gridRange(recId, 2, 15, 2, 3),
        cell: { userEnteredFormat: { numberFormat: { type: 'PERCENT', pattern: '0.0%' } } },
        fields: 'userEnteredFormat(numberFormat)',
      }
    });
    requests.push({ autoResizeDimensions: { dimensions: { sheetId: recId, dimension: 'COLUMNS', startIndex: 0, endIndex: 3 } } });
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: recId, tabColorStyle: { rgbColor: { red: 0.1, green: 0.2, blue: 0.4 } } },
        fields: 'tabColorStyle',
      }
    });
  }

  console.log('Sending', requests.length, 'format requests...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SSID,
    requestBody: { requests },
  });
  console.log('All formatting applied!');
}

run().catch(console.error);
