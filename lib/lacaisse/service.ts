import * as XLSX from 'xlsx';

export interface LaCaisseConfig {
  login: string;
  password: string;
  caisseId: string;
}

export interface LaCaisseAuthResponse {
  token: string;
  licence: string; // This is the token_api
  id_account: number;
  email: string;
}

export interface SalesExportRow {
  orderId: string | null;
  orderNumber: string | null;
  salesChannel: string | null;
  cashRegister: string | null;
  cashierName: string | null;
  serverName: string | null;
  date: string | null;
  time: string | null;
  ticketNumber: string | null;
  ticketTitle: string | null;
  family: string | null;
  category: string | null;
  product: string | null;
  subProduct: string | null;
  barcode: string | null;
  itemType: string | null;
  purchasePriceHT: number;
  purchasePriceTTC: number;
  quantity: number;
  catalogPrice: number;
  sellingPrice: number;
  tva: number;
  profit: number;
  dineIn: boolean;
  clientName: string | null;
  clientFirstName: string | null;
  clientPhone: string | null;
  paymentMethod: string | null;
  saleType: string | null;
  supplier: string | null;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  insertedRows: number;
  skippedDuplicates: number;
  errors: string[];
  dateRange: { start: string | null; end: string | null };
}

const AUTH_API = 'https://apiv2.lacaisse.ma/api/v1/auth';
const EXPORT_BASE_URL = 'https://api-legacy.lacaisse.ma';

export class LaCaisseService {
  private config: LaCaisseConfig;
  private tokenApi: string | null = null;

  constructor(config: LaCaisseConfig) {
    this.config = config;
  }

  async authenticate(): Promise<string> {
    const response = await fetch(AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: this.config.login,
        password: this.config.password
      })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data: LaCaisseAuthResponse = await response.json();
    
    if (!data.licence) {
      throw new Error('No token_api (licence) in auth response');
    }

    this.tokenApi = data.licence;
    return this.tokenApi;
  }

  async fetchExport(
    startDate: Date,
    endDate: Date,
    reportType: 'detailed' | 'daily' | 'category' | 'product' | 'payment' = 'detailed'
  ): Promise<ArrayBuffer> {
    if (!this.tokenApi) {
      await this.authenticate();
    }

    const endpoints: Record<string, string> = {
      detailed: 'export_excel.php',
      daily: 'export_excel_ventejournalier.php',
      category: 'export_excel_ventecategorie.php',
      product: 'export_excel_venteproduit.php',
      payment: 'export_excel_paiement.php'
    };

    const endpoint = endpoints[reportType] || endpoints.detailed;
    
    // Format dates as MM/DD/YYYY
    const formatDate = (d: Date) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };

    const url = new URL(`${EXPORT_BASE_URL}/${endpoint}`);
    url.searchParams.set('caisse', this.config.caisseId);
    url.searchParams.set('startDate', formatDate(startDate));
    url.searchParams.set('endDate', formatDate(endDate));
    url.searchParams.set('token_api', this.tokenApi!);
    url.searchParams.set('idcaisselist', this.config.caisseId);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return response.arrayBuffer();
  }

  parseExcel(buffer: ArrayBuffer): SalesExportRow[] {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

    return rawData.map(row => this.mapRowToSalesData(row));
  }

  private mapRowToSalesData(row: Record<string, unknown>): SalesExportRow {
    const getString = (keys: string[]): string | null => {
      for (const key of keys) {
        if (row[key] != null) return String(row[key]);
        const lowerKey = key.toLowerCase();
        for (const k of Object.keys(row)) {
          if (k.toLowerCase() === lowerKey) return String(row[k]);
        }
      }
      return null;
    };

    const getNumber = (keys: string[], defaultVal = 0): number => {
      for (const key of keys) {
        if (row[key] != null) {
          const val = row[key];
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
          if (!isNaN(num)) return num;
        }
      }
      return defaultVal;
    };

    return {
      orderId: getString(['Id commande', 'IdCommande', 'id_commande']),
      orderNumber: getString(['N° commande canal', 'NumeroCommande']),
      salesChannel: getString(['Canal de vente', 'CanalVente', 'canal']),
      cashRegister: getString(['Caisse', 'caisse']),
      cashierName: getString(['Nom caissier', 'NomCaissier', 'caissier']),
      serverName: getString(['Serveur', 'serveur']),
      date: getString(['Date', 'date']),
      time: getString(['Heure', 'heure', 'Time']),
      ticketNumber: getString(['Num ticket', 'NumTicket', 'N° ticket', 'Ticket']),
      ticketTitle: getString(['Titre ticket', 'TitreTicket']),
      family: getString(['Famille', 'famille', 'Family']),
      category: getString(['Categorie', 'Catégorie', 'categorie', 'Category']),
      product: getString(['Produit', 'produit', 'Product', 'Nom']),
      subProduct: getString(['Sous produit', 'SousProduit', 'sous produit']),
      barcode: getString(['Code barre', 'CodeBarre', 'Barcode']),
      itemType: getString(['Type', 'type']),
      purchasePriceHT: getNumber(['Prix achat HT', 'PrixAchatHT']),
      purchasePriceTTC: getNumber(['Prix achat TTC', 'PrixAchatTTC']),
      quantity: getNumber(['Quantité', 'Quantite', 'Qté', 'Qty'], 1),
      catalogPrice: getNumber(['Prix catalogue', 'PrixCatalogue']),
      sellingPrice: getNumber(['Prix de vente', 'PrixVente', 'prix de vente']),
      tva: getNumber(['TVA', 'tva', 'Tax'], 10),
      profit: getNumber(['Bénéfice', 'Benefice', 'bénéfice', 'Profit']),
      dineIn: getString(['SurPlace', 'Sur Place', 'surplace']) === 'Sur place',
      clientName: getString(['NomClient', 'Nom Client']),
      clientFirstName: getString(['PrénomClient', 'Prénom Client']),
      clientPhone: getString(['TelClient', 'Tel Client']),
      paymentMethod: getString(['Moyens de paiements', 'MoyenPaiement']),
      saleType: getString(['Type de vente', 'TypeVente']),
      supplier: getString(['Fournisseur', 'fournisseur', 'Supplier'])
    };
  }

  static parseDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Handle DD-MM-YYYY or DD/MM/YYYY
    const match = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return null;
  }

  static parseTime(timeStr: string | null): string | null {
    if (!timeStr) return null;
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const h = parts[0]?.padStart(2, '0') || '00';
      const m = parts[1]?.padStart(2, '0') || '00';
      const s = parts[2]?.padStart(2, '0') || '00';
      return `${h}:${m}:${s}`;
    }
    return null;
  }
}

export function getDefaultLaCaisseConfig(): LaCaisseConfig {
  return {
    login: process.env.LACAISSE_LOGIN || '',
    password: process.env.LACAISSE_PASSWORD || '',
    caisseId: process.env.LACAISSE_CAISSE_ID || ''
  };
}
