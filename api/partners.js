// GET /api/partners
// Restituisce, in tempo reale, i partner della tabella "Lista Partner" con
// "Lead da Generare" > 0 — stessa logica dell'elenco statico incorporato
// nell'app, ma sempre aggiornata dal CRM invece che congelata a una data.
const { getAllRows, text, num, bool } = require('./_coda');

const PARTNER_TABLE_ID = process.env.CODA_PARTNER_TABLE_ID || 'grid-rz7MyVZWTB';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300'); // cache 2 min sulla CDN Vercel

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Metodo non consentito' });
    return;
  }

  try {
    const rows = await getAllRows(PARTNER_TABLE_ID);
    const partners = rows
      .map((row) => {
        const v = row.values || {};
        const leadDaGenerare = num(v['Lead Da Generare']) || 0;
        return {
          nome: text(v['Nome Partner']),
          zona: text(v['Zone di Lavoro']),
          sede: text(v['Sede']),
          regione: text(v['Regione Principale']),
          attivo: bool(v['Status']) || text(v['Status']).toLowerCase() === 'attivo',
          status: text(v['Status']),
          contratto: num(v['Lead Da Contratto']) || 0,
          valide: num(v['Lead Valide']) || 0,
          leadDaGenerare,
          priorita: bool(v['Priorità']),
          statusVip: text(v['Status VIP']),
          email: text(v['Email Notifiche']),
          telefono: text(v['Telefono']),
          closer: text(v['Closer']),
          pm: text(v['PM'])
        };
      })
      .filter((p) => p.leadDaGenerare > 0 && p.nome);

    res.status(200).json({ source: 'live', updatedAt: new Date().toISOString(), count: partners.length, partners });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Errore sconosciuto' });
  }
};
