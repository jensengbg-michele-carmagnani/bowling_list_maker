# bowling_list_maker

Applicazione per la gestione degli ordini di magazzino riallineata alla struttura di `bowlingverona`:

- `app/`: root Next.js App Router
- `app/api/`: API esposte da Next
- `server/`: servizi condivisi e integrazione Supabase
- `frontend/src/`: UI esistente riusata temporaneamente dalla root Next

## Sviluppo locale

```bash
npm install
npm run dev
```

## Configurazione ambiente

Crea un file `.env` a partire da `.env.example` e configura:

- `SUPABASE_URL`: URL del progetto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: chiave server-side principale
- `SUPABASE_SECRET_KEY`: alias compatibile per la chiave server-side
- `SUPABASE_ANON_KEY`: chiave anonima
- `SUPABASE_PUBLISHABLE_KEY`: alias compatibile per il client pubblico

## Build produzione

```bash
npm run build
npm run start
```

## Struttura

- `app/page.tsx`: entrypoint Next che monta l'applicazione client esistente
- `app/api/[...path]/route.ts`: route handler Next per tutti gli endpoint `/api/...`
- `server/services/`: logica business e accesso a Supabase
- `server/scripts/`: seed cataloghi e migrazione da SQLite legacy
- `supabase/migrations/20260707173000_initial_schema.sql`: schema iniziale

Il frontend continua a usare il base path `/api`, quindi non sono richieste modifiche lato UI per il passaggio a Next/Vercel.

## Script utili

```bash
npm run seed:beverages
npm run seed:kitchen
npm run migrate:legacy-sqlite
```

## Schema Supabase

- tabelle: `products`, `orders`, `order_items`, `settings`
- RLS abilitato su tutte le tabelle
- funzione SQL `reset_identity_sequences()` per riallineare le sequence dopo restore o migrazione legacy

## Backup e restore

- `GET /api/export/database`: esporta uno snapshot JSON completo di Supabase
- `POST /api/import/restore`: ripristina uno snapshot JSON completo
- l'interfaccia impostazioni usa backup/restore JSON invece del vecchio file `.sqlite`
