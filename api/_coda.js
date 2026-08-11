// Utility condivisa per parlare con l'API ufficiale di Coda (coda.io/developers/apis/v1).
// Il token NON è mai scritto qui: viene letto dalla variabile d'ambiente CODA_API_TOKEN,
// impostata direttamente nel pannello di Vercel (Project Settings -> Environment Variables).

const CODA_BASE = 'https://coda.io/apis/v1';
const DOC_ID = process.env.CODA_DOC_ID || '-vXAig9jAW'; // doc "Fotovoltaico B2B - Delivery CRM"

function getToken() {
  const token = process.env.CODA_API_TOKEN;
  if (!token) {
    const err = new Error('CODA_API_TOKEN non configurato su Vercel');
    err.statusCode = 500;
    throw err;
  }
  return token;
}

async function codaFetch(path, params) {
  const token = getToken();
  const url = new URL(CODA_BASE + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Coda API ${res.status}: ${text.slice(0, 300)}`);
    err.statusCode = res.status;
    throw err;
  }
  return res.json();
}

// Scarica TUTTE le righe di una tabella (gestisce la paginazione automaticamente).
// Da usare solo su tabelle piccole (es. Lista Partner, poche centinaia di righe).
// NON usare su Outreach CRM (15.000+ righe): per quella si usa il parametro "query"
// per cercare un valore esatto in UNA colonna alla volta (vedi getRowsByExactMatch).
async function getAllRows(tableId, extraParams) {
  let rows = [];
  let pageToken;
  do {
    const data = await codaFetch(`/docs/${DOC_ID}/tables/${tableId}/rows`, {
      useColumnNames: 'true',
      valueFormat: 'simple',
      limit: '200',
      pageToken,
      ...extraParams
    });
    rows = rows.concat(data.items || []);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return rows;
}

// Cerca righe dove una colonna corrisponde ESATTAMENTE a un valore (l'API pubblica di
// Coda supporta solo questo tipo di filtro, non testo parziale/contains e non OR tra
// colonne diverse: per quello serve leggere più righe e filtrare lato server, cosa che
// non facciamo su Outreach CRM per non scaricare tutta la tabella).
async function getRowsByExactMatch(tableId, columnName, value) {
  if (value === undefined || value === null || value === '') return [];
  const query = `"${columnName}":"${String(value).replace(/"/g, '\\"')}"`;
  const data = await codaFetch(`/docs/${DOC_ID}/tables/${tableId}/rows`, {
    useColumnNames: 'true',
    valueFormat: 'simple',
    query,
    limit: '25'
  });
  return data.items || [];
}

// Estrae un testo semplice da un valore di cella Coda, qualunque sia la forma
// restituita (stringa, {name}, array di riferimenti, ecc.).
function text(val) {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return val.map(text).filter(Boolean).join(', ');
  if (typeof val === 'object') {
    if (val.name) return String(val.name);
    if (val.url && !val.name) return String(val.url);
  }
  return '';
}
function num(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'object' && val.value !== undefined) val = val.value;
  const n = Number(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
}
function bool(val) {
  if (typeof val === 'boolean') return val;
  const t = text(val).trim().toLowerCase();
  return t === 'true' || t === 'sì' || t === 'si' || t === 'attivo';
}

module.exports = { DOC_ID, codaFetch, getAllRows, getRowsByExactMatch, text, num, bool };
