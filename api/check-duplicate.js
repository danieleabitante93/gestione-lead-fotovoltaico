// POST /api/check-duplicate
// Body JSON: { email, telefono, azienda }
// Verifica in tempo reale, sulla tabella "Outreach CRM List" (15.000+ righe), se
// esiste già una trattativa con la stessa email, lo stesso numero di telefono
// (con o senza prefisso +39) o lo stesso nome azienda.
//
// LIMITE NOTO: l'API pubblica di Coda supporta solo il confronto ESATTO su una
// colonna alla volta (nessun "contains"/testo parziale, nessun OR nativo tra
// colonne). Per questo il controllo sull'INDIRIZZO (che richiede un confronto
// "sfumato": stesso indirizzo scritto in modo leggermente diverso) non viene
// fatto qui in tempo reale — resta disponibile lo strumento offline nell'app
// ("Database Trattative Esistenti"), dove puoi incollare un export più ampio e
// lasciare che il confronto testuale avvenga nel browser.
const { getRowsByExactMatch, text } = require('./_coda');

const CRM_TABLE_ID = process.env.CODA_CRM_TABLE_ID || 'grid-imzdsdJPgQ';

function normalizePhoneVariants(raw) {
  if (!raw) return [];
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return [];
  const variants = new Set([digits]);
  if (digits.startsWith('39') && digits.length > 10) variants.add(digits.slice(2));
  if (!digits.startsWith('39')) variants.add('39' + digits);
  return [...variants];
}

function rowSummary(row, matchedOn) {
  const v = row.values || {};
  return {
    matchedOn,
    azienda: text(v['Nome Business']),
    nome: text(v['Nome']),
    cognome: text(v['Cognome']),
    email: text(v['Email']),
    telefono: text(v['Numero Telefono']),
    indirizzo: text(v['Indirizzo']),
    partner: text(v['Partner']),
    status: text(v['Status']),
    aggiunto: text(v['Aggiunto'])
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Metodo non consentito' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const { email, telefono, azienda } = body;

  try {
    const foundById = new Map();

    if (email) {
      const rows = await getRowsByExactMatch(CRM_TABLE_ID, 'Email', String(email).trim());
      rows.forEach((r) => foundById.set(r.id, rowSummary(r, 'email')));
    }

    for (const phoneVariant of normalizePhoneVariants(telefono)) {
      const rows = await getRowsByExactMatch(CRM_TABLE_ID, 'Numero Telefono', phoneVariant);
      rows.forEach((r) => {
        if (!foundById.has(r.id)) foundById.set(r.id, rowSummary(r, 'telefono'));
      });
    }

    if (azienda) {
      const rows = await getRowsByExactMatch(CRM_TABLE_ID, 'Nome Business', String(azienda).trim());
      rows.forEach((r) => {
        if (!foundById.has(r.id)) foundById.set(r.id, rowSummary(r, 'azienda'));
      });
    }

    const matches = [...foundById.values()];
    res.status(200).json({ source: 'live', isDuplicate: matches.length > 0, matches });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Errore sconosciuto' });
  }
};
