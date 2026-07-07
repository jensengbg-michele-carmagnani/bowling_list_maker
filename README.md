# bowling_list_maker

Applicazione per la gestione degli ordini di magazzino, composta da:

- `frontend`: React 19 + Vite + Tailwind + PWA
- `backend`: Express + TypeScript + SQLite (`better-sqlite3`)

## Sviluppo locale

```bash
npm install
npm run dev
```

## Build produzione

```bash
npm run build
npm run start
```

## Deploy su Vercel

Il repository include una configurazione `vercel.json` che pubblica:

- il frontend statico da `frontend/dist`
- le API Express come function Vercel tramite `api/[...path].js`

Variabili ambiente supportate:

- `FRONTEND_ORIGIN`: origine consentita dal CORS
- `DB_PATH`: percorso del database SQLite

Note operative:

- in ambiente Vercel, se `DB_PATH` non e' impostato, il database viene creato in `/tmp/bowling-list-maker/warehouse.sqlite`
- questa modalita' e' adatta a preview e staging tecnico, ma non garantisce persistenza dati tra invocazioni o deploy
- per un uso produttivo stabile e' consigliato migrare il database verso uno storage esterno persistente
