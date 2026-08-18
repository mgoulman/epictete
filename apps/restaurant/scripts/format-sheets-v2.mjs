import { google } from 'googleapis';
import { readFileSync } from 'fs';

const creds = JSON.parse(readFileSync('./epictete-492501-b1efb2fc36ec.json', 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SSID = '1XlvaDk97ihIVmzk0Z8LyDYqgUxksslhFVHjxhBUlhFk';

// Convert hex to RGB (0-1 range)
function hex(h) {
  return {
    red: parseInt(h.slice(0, 2), 16) / 255,
    green: parseInt(h.slice(2, 4), 16) / 255,
    blue: parseInt(h.slice(4, 6), 16) / 255,
  };
}

const gr = (sid, r1, r2, c1, c2) => ({
  sheetId: sid, startRowIndex: r1, endRowIndex: r2, startColumnIndex: c1, endColumnIndex: c2
});

async function run() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SSID });
  const sm = {};
  meta.data.sheets.forEach(s => { sm[s.properties.title] = s.properties.sheetId; });

  // Row counts per sheet for alternating colors
  const rowCounts = {
    'Boissons': 15, 'Économat': 73, 'Éco Pdt Italien': 13, 'Fournisseurs': 14,
    'Fromage': 7, 'Légumes': 50, 'Poisson': 13, 'Viande': 7,
    'INV-Légumes': 50, 'INV-Économat': 89, 'INV-Fromage': 7, 'INV-Poisson': 13,
    'INV-Viande': 7, 'INV-Éco Pdt Italien': 18, 'INV-Fournisseurs': 32, 'INV-Boissons': 15,
    'SI-Légumes': 50, 'SI-Économat': 89, 'SI-Fromage': 7, 'SI-Poisson': 13,
    'SI-Viande': 7, 'SI-Éco Pdt Italien': 18, 'SI-Fournisseurs': 32, 'SI-Boissons': 15,
  };

  // Exact Excel colors per category
  const catColors = {
    'Boissons':       { title: '00897B', alt1: 'E0F2F1', alt2: 'B2DFDB' },
    'Légumes':        { title: '4CAF50', alt1: 'E8F5E9', alt2: 'C8E6C9' },
    'Économat':       { title: 'FF9800', alt1: 'FFF3E0', alt2: 'FFE0B2' },
    'Éco Pdt Italien':{ title: '9C27B0', alt1: 'F3E5F5', alt2: 'E1BEE7' },
    'Fournisseurs':   { title: '37474F', alt1: 'ECEFF1', alt2: 'CFD8DC' },
    'Fromage':        { title: 'FFC107', alt1: 'FFFDE7', alt2: 'FFF9C4' },
    'Poisson':        { title: '2196F3', alt1: 'E3F2FD', alt2: 'BBDEFB' },
    'Viande':         { title: 'F44336', alt1: 'FFEBEE', alt2: 'FFCDD2' },
  };

  // Unit dropdown values
  const unitValues = ['Bouteille', 'Boîte', 'Casier', 'Kg', 'L', 'Paquet', 'Pièce', 'Sachet'];

  const requests = [];

  // Helper: format a category sheet (individual, INV-, SI-)
  function formatCategorySheet(sheetName, catKey, cols, totalRows, hasUnitCol) {
    const sid = sm[sheetName];
    if (sid === undefined) { console.log('SKIP:', sheetName); return; }
    const c = catColors[catKey];
    if (!c) { console.log('NO COLOR:', catKey); return; }

    // Title row (row 1) - category color, white bold text
    requests.push({
      repeatCell: {
        range: gr(sid, 0, 1, 0, cols),
        cell: { userEnteredFormat: {
          backgroundColor: hex(c.title),
          textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      }
    });

    // Header row (row 2) - same category color, white bold
    requests.push({
      repeatCell: {
        range: gr(sid, 1, 2, 0, cols),
        cell: { userEnteredFormat: {
          backgroundColor: hex(c.title),
          textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      }
    });

    // Merge title row
    requests.push({ mergeCells: { range: gr(sid, 0, 1, 0, cols), mergeType: 'MERGE_ALL' } });

    // Alternating row colors for data rows (starting row 3 = index 2)
    for (let r = 2; r < totalRows; r++) {
      const color = (r % 2 === 0) ? hex(c.alt1) : hex(c.alt2);
      requests.push({
        repeatCell: {
          range: gr(sid, r, r + 1, 0, cols),
          cell: { userEnteredFormat: { backgroundColor: color } },
          fields: 'userEnteredFormat(backgroundColor)',
        }
      });
    }

    // Tab color
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: sid, tabColorStyle: { rgbColor: hex(c.title) } },
        fields: 'tabColorStyle',
      }
    });

    // Column widths: Product=180px, Prix=84px, Quantité=84px, Unité=96px
    const colWidths = [180, 84, 84, 96, 96];
    for (let i = 0; i < cols; i++) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId: sid, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
          properties: { pixelSize: colWidths[i] || 96 },
          fields: 'pixelSize',
        }
      });
    }

    // Freeze header (2 rows)
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: sid, gridProperties: { frozenRowCount: 2 } },
        fields: 'gridProperties.frozenRowCount',
      }
    });

    // Unit dropdown on the unit column (last column for most, or specific column)
    if (hasUnitCol) {
      const unitColIndex = cols - 1; // Unit is always last column
      requests.push({
        setDataValidation: {
          range: gr(sid, 2, totalRows, unitColIndex, unitColIndex + 1),
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: unitValues.map(v => ({ userEnteredValue: v })),
            },
            showCustomUi: true,
            strict: false,
          }
        }
      });
    }
  }

  // Individual category sheets (3 cols: Produit, Prix, Unité)
  for (const name of ['Boissons', 'Économat', 'Fromage', 'Légumes', 'Poisson', 'Viande']) {
    formatCategorySheet(name, name, 3, rowCounts[name], true);
  }
  formatCategorySheet('Éco Pdt Italien', 'Éco Pdt Italien', 3, rowCounts['Éco Pdt Italien'], true);
  formatCategorySheet('Fournisseurs', 'Fournisseurs', 3, rowCounts['Fournisseurs'], false);

  // INV- sheets (Inventaire Complet)
  const invColMap = {
    'INV-Légumes': { cat: 'Légumes', cols: 3 },
    'INV-Économat': { cat: 'Économat', cols: 4 },
    'INV-Fromage': { cat: 'Fromage', cols: 3 },
    'INV-Poisson': { cat: 'Poisson', cols: 3 },
    'INV-Viande': { cat: 'Viande', cols: 3 },
    'INV-Éco Pdt Italien': { cat: 'Éco Pdt Italien', cols: 4 },
    'INV-Fournisseurs': { cat: 'Fournisseurs', cols: 3 },
    'INV-Boissons': { cat: 'Boissons', cols: 3 },
  };
  for (const [name, { cat, cols }] of Object.entries(invColMap)) {
    formatCategorySheet(name, cat, cols, rowCounts[name], name !== 'INV-Fournisseurs');
  }

  // SI- sheets (Suivi Inventaire - 4 cols: Produit, Prix, Quantité, Unité)
  const siColMap = {
    'SI-Légumes': { cat: 'Légumes', cols: 4 },
    'SI-Économat': { cat: 'Économat', cols: 4 },
    'SI-Fromage': { cat: 'Fromage', cols: 4 },
    'SI-Poisson': { cat: 'Poisson', cols: 4 },
    'SI-Viande': { cat: 'Viande', cols: 4 },
    'SI-Éco Pdt Italien': { cat: 'Éco Pdt Italien', cols: 4 },
    'SI-Fournisseurs': { cat: 'Fournisseurs', cols: 5 },
    'SI-Boissons': { cat: 'Boissons', cols: 4 },
  };
  for (const [name, { cat, cols }] of Object.entries(siColMap)) {
    formatCategorySheet(name, cat, cols, rowCounts[name], name !== 'SI-Fournisseurs');
  }

  // === SUIVI JOURNALIER - exact Excel colors ===
  const sjId = sm['Suivi Journalier'];
  if (sjId !== undefined) {
    // Title row A1 (merged A1:N1) - dark navy #1A2E44
    requests.push({ mergeCells: { range: gr(sjId, 0, 1, 0, 14), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gr(sjId, 0, 1, 0, 14),
        cell: { userEnteredFormat: {
          backgroundColor: hex('1A2E44'),
          textFormat: { bold: true, fontSize: 16, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      }
    });

    // Subtitle row A2 (merged) - same navy
    requests.push({ mergeCells: { range: gr(sjId, 1, 2, 0, 14), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gr(sjId, 1, 2, 0, 14),
        cell: { userEnteredFormat: {
          backgroundColor: hex('1A2E44'),
          textFormat: { bold: true, fontSize: 12, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });

    // Category header row 4 (index 3)
    // A4: DATE - navy #1A2E44
    requests.push({
      repeatCell: {
        range: gr(sjId, 3, 4, 0, 1),
        cell: { userEnteredFormat: {
          backgroundColor: hex('1A2E44'),
          textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    // B4:E4 RECETTES - dark green #1B5E20
    requests.push({ mergeCells: { range: gr(sjId, 3, 4, 1, 5), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gr(sjId, 3, 4, 1, 5),
        cell: { userEnteredFormat: {
          backgroundColor: hex('1B5E20'),
          textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    // F4:I4 DÉPENSES - dark red #B71C1C
    requests.push({ mergeCells: { range: gr(sjId, 3, 4, 5, 9), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gr(sjId, 3, 4, 5, 9),
        cell: { userEnteredFormat: {
          backgroundColor: hex('B71C1C'),
          textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    // J4:L4 RETRAITS - deep orange #E65100
    requests.push({ mergeCells: { range: gr(sjId, 3, 4, 9, 12), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gr(sjId, 3, 4, 9, 12),
        cell: { userEnteredFormat: {
          backgroundColor: hex('E65100'),
          textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    // M4 SOLDE - indigo #1A237E
    requests.push({
      repeatCell: {
        range: gr(sjId, 3, 4, 12, 13),
        cell: { userEnteredFormat: {
          backgroundColor: hex('1A237E'),
          textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    // N4 OBSERVATIONS - blue-gray #2C4A6E
    requests.push({
      repeatCell: {
        range: gr(sjId, 3, 4, 13, 14),
        cell: { userEnteredFormat: {
          backgroundColor: hex('2C4A6E'),
          textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });

    // Sub-headers row 5 (index 4) - color-coded per section
    // A5: Date - dark green #1B5E20
    requests.push({
      repeatCell: {
        range: gr(sjId, 4, 5, 0, 1),
        cell: { userEnteredFormat: {
          backgroundColor: hex('1B5E20'),
          textFormat: { bold: true, fontSize: 9, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', wrapStrategy: 'WRAP',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
      }
    });
    // B5:D5: Recettes input - green #2E7D32
    requests.push({
      repeatCell: {
        range: gr(sjId, 4, 5, 1, 4),
        cell: { userEnteredFormat: {
          backgroundColor: hex('2E7D32'),
          textFormat: { bold: true, fontSize: 9, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', wrapStrategy: 'WRAP',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
      }
    });
    // E5: Total Recettes (auto) - darker green #1B5E20
    requests.push({
      repeatCell: {
        range: gr(sjId, 4, 5, 4, 5),
        cell: { userEnteredFormat: {
          backgroundColor: hex('1B5E20'),
          textFormat: { bold: true, fontSize: 9, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', wrapStrategy: 'WRAP',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
      }
    });
    // F5:I5: Dépenses - red #C62828
    requests.push({
      repeatCell: {
        range: gr(sjId, 4, 5, 5, 9),
        cell: { userEnteredFormat: {
          backgroundColor: hex('C62828'),
          textFormat: { bold: true, fontSize: 9, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', wrapStrategy: 'WRAP',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
      }
    });
    // J5:L5: Retraits - deep orange #BF360C
    requests.push({
      repeatCell: {
        range: gr(sjId, 4, 5, 9, 12),
        cell: { userEnteredFormat: {
          backgroundColor: hex('BF360C'),
          textFormat: { bold: true, fontSize: 9, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', wrapStrategy: 'WRAP',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
      }
    });
    // M5: Solde - indigo #283593
    requests.push({
      repeatCell: {
        range: gr(sjId, 4, 5, 12, 13),
        cell: { userEnteredFormat: {
          backgroundColor: hex('283593'),
          textFormat: { bold: true, fontSize: 9, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', wrapStrategy: 'WRAP',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
      }
    });
    // N5: Observations - blue-gray #2C4A6E
    requests.push({
      repeatCell: {
        range: gr(sjId, 4, 5, 13, 14),
        cell: { userEnteredFormat: {
          backgroundColor: hex('2C4A6E'),
          textFormat: { bold: true, fontSize: 9, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', wrapStrategy: 'WRAP',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
      }
    });

    // Data rows (6-36, index 5-35) - alternating colors per column section
    for (let r = 5; r < 36; r++) {
      const isEven = (r % 2 === 0); // even index = light, odd = lighter

      // A: Date column - light blue
      const dateColor = isEven ? 'EBF5FB' : 'FFFFFF';
      requests.push({ repeatCell: { range: gr(sjId, r, r+1, 0, 1), cell: { userEnteredFormat: { backgroundColor: hex(dateColor) } }, fields: 'userEnteredFormat(backgroundColor)' } });

      // B:D Recettes input - green tints
      const recColor = isEven ? 'C8E6C9' : 'E8F5E9';
      requests.push({ repeatCell: { range: gr(sjId, r, r+1, 1, 4), cell: { userEnteredFormat: { backgroundColor: hex(recColor) } }, fields: 'userEnteredFormat(backgroundColor)' } });

      // E: Total Recettes (auto) - slightly different green
      requests.push({ repeatCell: { range: gr(sjId, r, r+1, 4, 5), cell: { userEnteredFormat: { backgroundColor: hex(recColor), textFormat: { bold: true } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } });

      // F:H Dépenses input - red tints
      const depColor = isEven ? 'FFCDD2' : 'FFEBEE';
      requests.push({ repeatCell: { range: gr(sjId, r, r+1, 5, 8), cell: { userEnteredFormat: { backgroundColor: hex(depColor) } }, fields: 'userEnteredFormat(backgroundColor)' } });

      // I: Total Dépenses (auto)
      requests.push({ repeatCell: { range: gr(sjId, r, r+1, 8, 9), cell: { userEnteredFormat: { backgroundColor: hex('FFCDD2'), textFormat: { bold: true } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } });

      // J:K Retraits input - orange tints
      const retColor = isEven ? 'FFE0B2' : 'FFF3E0';
      requests.push({ repeatCell: { range: gr(sjId, r, r+1, 9, 11), cell: { userEnteredFormat: { backgroundColor: hex(retColor) } }, fields: 'userEnteredFormat(backgroundColor)' } });

      // L: Total Retraits (auto)
      requests.push({ repeatCell: { range: gr(sjId, r, r+1, 11, 12), cell: { userEnteredFormat: { backgroundColor: hex('FFE0B2'), textFormat: { bold: true } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } });

      // M: Solde - indigo tint
      requests.push({ repeatCell: { range: gr(sjId, r, r+1, 12, 13), cell: { userEnteredFormat: { backgroundColor: hex('C5CAE9'), textFormat: { bold: true } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } });

      // N: Observations
      requests.push({ repeatCell: { range: gr(sjId, r, r+1, 13, 14), cell: { userEnteredFormat: { backgroundColor: hex(dateColor) } }, fields: 'userEnteredFormat(backgroundColor)' } });
    }

    // Totals row 37 (index 36) - dark navy
    requests.push({
      repeatCell: {
        range: gr(sjId, 36, 37, 0, 14),
        cell: { userEnteredFormat: {
          backgroundColor: hex('1A2E44'),
          textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });

    // Number format for money columns
    requests.push({
      repeatCell: {
        range: gr(sjId, 5, 37, 1, 14),
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0.00' }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
      }
    });

    // Freeze 5 rows, set tab color
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: sjId, gridProperties: { frozenRowCount: 5 }, tabColorStyle: { rgbColor: hex('1A2E44') } },
        fields: 'gridProperties.frozenRowCount,tabColorStyle',
      }
    });

    // Column widths matching Excel
    const sjColWidths = [84, 102, 108, 102, 108, 108, 78, 90, 84, 120, 96, 120, 120, 180];
    for (let i = 0; i < 14; i++) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId: sjId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
          properties: { pixelSize: sjColWidths[i] },
          fields: 'pixelSize',
        }
      });
    }
    // Row height for header row 5
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: sjId, dimension: 'ROWS', startIndex: 4, endIndex: 5 },
        properties: { pixelSize: 50 },
        fields: 'pixelSize',
      }
    });
  }

  // === LEGENDE sheet ===
  const legId = sm['Legende'];
  if (legId !== undefined) {
    // Title - navy
    requests.push({ mergeCells: { range: gr(legId, 0, 1, 0, 2), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gr(legId, 0, 1, 0, 2),
        cell: { userEnteredFormat: { backgroundColor: hex('1A2E44'), textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    // Section headers - blue-gray #2C4A6E
    for (const row of [2, 6, 20]) {
      requests.push({ mergeCells: { range: gr(legId, row, row + 1, 0, 2), mergeType: 'MERGE_ALL' } });
      requests.push({
        repeatCell: {
          range: gr(legId, row, row + 1, 0, 2),
          cell: { userEnteredFormat: { backgroundColor: hex('2C4A6E'), textFormat: { bold: true, fontSize: 12, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        }
      });
    }
    // Row 4: blue tint (manual input example)
    requests.push({
      repeatCell: {
        range: gr(legId, 3, 4, 0, 2),
        cell: { userEnteredFormat: { backgroundColor: hex('D6E4F0') } },
        fields: 'userEnteredFormat(backgroundColor)',
      }
    });
    // Row 5: green tint (auto-calc example)
    requests.push({
      repeatCell: {
        range: gr(legId, 4, 5, 0, 2),
        cell: { userEnteredFormat: { backgroundColor: hex('E8F5E9') } },
        fields: 'userEnteredFormat(backgroundColor)',
      }
    });
    // Column widths
    requests.push({ updateDimensionProperties: { range: { sheetId: legId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 156 }, fields: 'pixelSize' } });
    requests.push({ updateDimensionProperties: { range: { sheetId: legId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 408 }, fields: 'pixelSize' } });
    requests.push({ updateSheetProperties: { properties: { sheetId: legId, tabColorStyle: { rgbColor: hex('2C4A6E') } }, fields: 'tabColorStyle' } });
  }

  // === RECAP MENSUEL ===
  const recId = sm['Recap Mensuel'];
  if (recId !== undefined) {
    // Title - navy
    requests.push({ mergeCells: { range: gr(recId, 0, 1, 0, 3), mergeType: 'MERGE_ALL' } });
    requests.push({
      repeatCell: {
        range: gr(recId, 0, 1, 0, 3),
        cell: { userEnteredFormat: { backgroundColor: hex('1A2E44'), textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    // Headers row 2
    requests.push({
      repeatCell: {
        range: gr(recId, 1, 2, 0, 3),
        cell: { userEnteredFormat: { backgroundColor: hex('2C4A6E'), textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }
    });
    // Recettes rows (2-4) - green tint
    requests.push({ repeatCell: { range: gr(recId, 2, 5, 0, 3), cell: { userEnteredFormat: { backgroundColor: hex('E8F5E9') } }, fields: 'userEnteredFormat(backgroundColor)' } });
    // TOTAL RECETTES (row 7, index 6) - dark green
    requests.push({ repeatCell: { range: gr(recId, 6, 7, 0, 3), cell: { userEnteredFormat: { backgroundColor: hex('1B5E20'), textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } });
    // Dépenses rows (7-9) - red tint
    requests.push({ repeatCell: { range: gr(recId, 7, 10, 0, 3), cell: { userEnteredFormat: { backgroundColor: hex('FFEBEE') } }, fields: 'userEnteredFormat(backgroundColor)' } });
    // TOTAL DEPENSES (row 11, index 10) - dark red
    requests.push({ repeatCell: { range: gr(recId, 10, 11, 0, 3), cell: { userEnteredFormat: { backgroundColor: hex('B71C1C'), textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } });
    // Retraits rows (11-12) - orange tint
    requests.push({ repeatCell: { range: gr(recId, 11, 13, 0, 3), cell: { userEnteredFormat: { backgroundColor: hex('FFF3E0') } }, fields: 'userEnteredFormat(backgroundColor)' } });
    // TOTAL RETRAITS (row 14, index 13) - deep orange
    requests.push({ repeatCell: { range: gr(recId, 13, 14, 0, 3), cell: { userEnteredFormat: { backgroundColor: hex('E65100'), textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } });
    // SOLDE THEORIQUE (row 15, index 14) - navy
    requests.push({ repeatCell: { range: gr(recId, 14, 15, 0, 3), cell: { userEnteredFormat: { backgroundColor: hex('1A237E'), textFormat: { bold: true, fontSize: 12, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } });
    // Number formats
    requests.push({ repeatCell: { range: gr(recId, 2, 15, 1, 2), cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0.00' } } }, fields: 'userEnteredFormat(numberFormat)' } });
    requests.push({ repeatCell: { range: gr(recId, 2, 15, 2, 3), cell: { userEnteredFormat: { numberFormat: { type: 'PERCENT', pattern: '0.0%' } } }, fields: 'userEnteredFormat(numberFormat)' } });
    // Column widths
    requests.push({ updateDimensionProperties: { range: { sheetId: recId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 250 }, fields: 'pixelSize' } });
    requests.push({ updateDimensionProperties: { range: { sheetId: recId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } });
    requests.push({ updateDimensionProperties: { range: { sheetId: recId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } });
    requests.push({ updateSheetProperties: { properties: { sheetId: recId, tabColorStyle: { rgbColor: hex('1A237E') } }, fields: 'tabColorStyle' } });
  }

  console.log('Sending', requests.length, 'format requests...');

  // Split into chunks of 500 to avoid API limits
  const chunkSize = 500;
  for (let i = 0; i < requests.length; i += chunkSize) {
    const chunk = requests.slice(i, i + chunkSize);
    console.log(`  Batch ${Math.floor(i/chunkSize)+1}: ${chunk.length} requests...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SSID,
      requestBody: { requests: chunk },
    });
  }
  console.log('All formatting applied!');
}

run().catch(console.error);
