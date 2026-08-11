# Gestione Lead Fotovoltaico

App per incollare righe di lead fotovoltaico da CSV/Excel, qualificarle, suggerire il partner a cui assegnarle e verificare in tempo reale se sono già presenti nel CRM (per evitare di ridare la stessa trattativa a più partner).

## Struttura del progetto

- `index.html` / `gestione-lead-fotovoltaico.html` — l'app (identiche, `index.html` è quella servita come pagina principale)
- `api/partners.js` — funzione serverless: legge la tabella "Lista Partner" dal CRM Coda e restituisce solo i partner con Lead Da Generare > 0
- `api/check-duplicate.js` — funzione serverless: verifica su "Outreach CRM List" se email, telefono o nome azienda esistono già
- `api/_coda.js` — utility condivisa per parlare con l'API di Coda
- `package.json` — metadati minimi del progetto

Senza configurazione, l'app funziona comunque in **modalità offline**: incolla i lead, ottieni qualificazione ed export Excel, e — se vuoi controllare i duplicati senza connessione live — incolla anche un export delle trattative esistenti nel riquadro "Database Trattative Esistenti". La connessione live (partner aggiornati in automatico + controllo duplicati contro tutto il CRM) richiede invece il deploy su Vercel descritto sotto.

## Deploy su Vercel (accesso live e sola lettura al CRM)

1. **Crea un token API Coda** (lo fai tu, io non lo vedo mai):
   - vai su [coda.io/account](https://coda.io/account) → sezione "API Settings"
   - genera un nuovo token e copialo (tienilo da parte, non sarà più visibile dopo)

2. **Collega questo repository GitHub a Vercel**:
   - vai su [vercel.com](https://vercel.com) → "Add New" → "Project"
   - seleziona il repository `danieleabitante93/gestione-lead-fotovoltaico` (lo stesso già usato per GitHub Pages — non serve crearne uno nuovo)
   - Vercel rileva automaticamente la cartella `api/` come funzioni serverless e serve `index.html` come pagina statica: non serve nessuna configurazione di build

3. **Imposta la variabile d'ambiente** in Project Settings → Environment Variables:
   - `CODA_API_TOKEN` = il token generato al punto 1 (obbligatoria)

   Variabili opzionali (da impostare solo se il doc o le tabelle cambiano id in futuro — quelli attuali sono già hardcoded come default):
   - `CODA_DOC_ID` (default: `-vXAig9jAW`, doc "Fotovoltaico B2B - Delivery CRM")
   - `CODA_PARTNER_TABLE_ID` (default: `grid-rz7MyVZWTB`, tabella "Lista Partner")
   - `CODA_CRM_TABLE_ID` (default: `grid-imzdsdJPgQ`, tabella "Outreach CRM List")

4. **Fai il deploy** (Vercel lo avvia automaticamente dopo aver salvato le variabili, oppure premi "Redeploy").

5. Apri l'URL assegnato da Vercel (es. `gestione-lead-fotovoltaico.vercel.app`): in alto a destra vedrai l'indicatore di stato CRM passare da "⏳ Verifica connessione…" a "🟢 CRM live connesso" quando tutto funziona.

## Cosa fa la connessione live (sola lettura)

- **Suggerimento partner**: legge sempre l'elenco aggiornato di "Lista Partner" con Lead Da Generare > 0, invece dell'elenco statico congelato nell'app.
- **Controllo duplicati**: per ogni lead incollato, verifica su "Outreach CRM List" (15.000+ righe) se esiste già una trattativa con la stessa email, lo stesso telefono o lo stesso nome azienda — usando query esatte per non dover scaricare l'intera tabella.
- **Non scrive nulla** nel CRM: nessuna trattativa viene creata o modificata automaticamente. È solo lettura, per ora.
- Il controllo per **indirizzo simile** (non uguale carattere per carattere) resta disponibile solo nella modalità offline (riquadro "Database Trattative Esistenti"), perché l'API pubblica di Coda non supporta ricerche "contiene" su questo tipo di confronto.

## Limiti noti

- Se `CODA_API_TOKEN` non è impostato (o Vercel non è ancora configurato), l'app torna automaticamente in modalità offline: badge "⚪ Modalità offline", partner statici, nessun controllo duplicati live (ma resta disponibile quello offline via paste).
- Il token Coda deve avere accesso in lettura al doc "Fotovoltaico B2B - Delivery CRM".
# gestione-lead-fotovoltaico
App per gestione lead fotovoltaico con import da copia/incolla CSV
