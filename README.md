# bowling_list_maker

Applicazione per la gestione degli ordini di magazzino, composta da:

- `frontend`: React 19 + Vite + Tailwind + PWA
- `api`: modulo API centralizzato con Express + TypeScript + Supabase

## Sviluppo locale

```bash
npm install
npm run dev
```

## Configurazione ambiente

Crea un file `.env` a partire da `.env.example` e configura:

- `FRONTEND_ORIGIN`: origine consentita dal CORS
- `SUPABASE_URL`: URL del progetto Supabase
- `SUPABASE_ANON_KEY`: chiave anonima del progetto
- `SUPABASE_SERVICE_ROLE_KEY`: chiave server-side usata dal backend per CRUD, seed, backup e migrazione legacy

## Build produzione

```bash
npm run build
npm run start
```

## Deploy su Vercel

Il repository include una configurazione `vercel.json` che pubblica:

- il frontend statico da `dist`
- il modulo API centralizzato direttamente dalla cartella root `api/`
- le API Express come function Vercel tramite `api/[...path].js`

## Struttura cartelle

Le API sono centralizzate nella cartella root `api/`:

- `api/[...path].js`: entrypoint Vercel serverless
- `api/app.ts`: registrazione middleware ed endpoint
- `api/server.ts`: avvio locale del modulo API unificato
- `api/routes/`: endpoint HTTP
- `api/services/`: logica di business e accesso a Supabase
- `api/scripts/`: seed e migrazione dati legacy
- `api/utils/`: utility condivise

Il frontend comunica sempre con il modulo centralizzato tramite il base path `/api`, definito in `frontend/src/services/api.ts`.

## Flusso di deployment

Lo startup e il deploy usano ora un unico modulo API:

```bash
npm run dev
npm run build
npm run start
```

Script utili:

```bash
npm run seed:beverages --workspace api
npm run seed:kitchen --workspace api
npm run migrate:legacy-sqlite --workspace api
```

## Schema Supabase

- migrazione iniziale: `supabase/migrations/20260707173000_initial_schema.sql`
- tabelle: `products`, `orders`, `order_items`, `settings`
- RLS abilitato su tutte le tabelle
- funzione SQL `reset_identity_sequences()` per riallineare le sequence dopo restore o migrazione legacy

## Migrazione dati legacy

Se esiste ancora il file locale `database/data/warehouse.sqlite`, puoi migrare i dati reali con:

```bash
npm run migrate:legacy-sqlite --workspace api
```

Lo script legge SQLite tramite il binario di sistema `sqlite3`, carica prodotti, ordini, righe ordine e impostazioni su Supabase e riallinea le sequence.

## Backup e restore

- `GET /api/export/database`: esporta uno snapshot JSON completo di Supabase
- `POST /api/import/restore`: ripristina uno snapshot JSON completo
- l'interfaccia impostazioni usa ora backup/restore JSON e non piu file `.sqlite`
