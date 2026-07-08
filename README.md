# bowling_list_maker

Applicazione per la gestione degli ordini di magazzino, composta da:

- `frontend`: React 19 + Vite + Tailwind + PWA
- `backend`: Express + TypeScript + Supabase

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
- le API Express come function Vercel tramite `api/[...path].js`

## Schema Supabase

- migrazione iniziale: `supabase/migrations/20260707173000_initial_schema.sql`
- tabelle: `products`, `orders`, `order_items`, `settings`
- RLS abilitato su tutte le tabelle
- funzione SQL `reset_identity_sequences()` per riallineare le sequence dopo restore o migrazione legacy

## Migrazione dati legacy

Se esiste ancora il file locale `database/data/warehouse.sqlite`, puoi migrare i dati reali con:

```bash
npm run migrate:legacy-sqlite --workspace backend
```

Lo script legge SQLite tramite il binario di sistema `sqlite3`, carica prodotti, ordini, righe ordine e impostazioni su Supabase e riallinea le sequence.

## Backup e restore

- `GET /api/export/database`: esporta uno snapshot JSON completo di Supabase
- `POST /api/import/restore`: ripristina uno snapshot JSON completo
- l'interfaccia impostazioni usa ora backup/restore JSON e non piu file `.sqlite`
