# LabPM — handoff per la nuova sessione (sviluppo opzione C: server multiutente)

## Prompt da incollare nella nuova sessione

> Repository: https://github.com/penfla/LabPM (branch di lavoro: crea `claude/labpm-v2-server` da `claude/eager-gates-7mzcnh`). Leggi `docs/HANDOFF-v2-server.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` e `index.html`. Obiettivo: LabPM v2.0 con **server centrale multiutente** (opzione C): più PC leggono/scrivono lo stesso database, le modifiche sono visibili a tutte le sessioni in tempo quasi reale, login reale e ruoli applicati lato server. Prima di scrivere codice proponi l'architettura e fammi le domande aperte (sezione 6). Mantieni: UI in inglese, header di licenza PolyForm NC + box informativo + footer © su ogni file, disclosure AI "deterministic", URL di riferimento nelle risposte, risposte tecniche dirette in italiano. Non aprire PR senza richiesta.

## 1. Stato attuale (v1.3.0, branch `claude/eager-gates-7mzcnh`)

Web app **single-file** `index.html` (~135 kB, vanilla JS, nessun backend, nessun build). Autore: Flavio Pendolino. Licenza PolyForm Noncommercial 1.0.0 (uso commerciale: penfla@me.com). Documenti di testo: CC BY-NC 4.0.

Repo (penfla/LabPM): `index.html`, `README.md`, `LICENSE`, `NOTICE.md`, `CITATION.cff`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `package.json`, `docs/{USER_GUIDE,ARCHITECTURE,DATA_MODEL}.md`, `docs/img/*.png`, `empty-database/labpm-empty.json`, `tests/smoke.test.js` (12 test Playwright, `npm test`), `.github/workflows/{ci,pages}.yml`, template issue/PR.

Funzioni v1.3: dashboard a widget; task in 5 viste (lista, board drag&drop, timeline con dipendenze, calendario, carico); dipendenze finish-to-start con cascata su giorni lavorativi; timer e ore; richieste (intake → triage); automazioni (trigger/condizione/azione, profondità 3); 5 template (DSC, estrusione, film PE/EVOH/PE, taratura, validazione metodo); campi personalizzati con formule (parser sicuro, no eval); portfolio/obiettivi; documenti markdown-lite; ruoli Admin/Project manager/Researcher/Viewer (solo UI); sessioni (snapshot browser, file JSON); **cartella di backup** (File System Access API, autosave a ogni modifica, copia iniziale); **export Excel** dei task filtrati (OOXML scritto in-page, zip store-only); **allegati** (pagina Files + sezione nel task, copiati in `<cartella DB>/attachments/…`); database vuoto + "Clear all project data".

Stato in memoria: oggetto `S` → `localStorage['labpm_v1']`. Schema sessione `v:1`: `users, projects, tasks, fields, rules, goals, docs, files, activity, ui, me, demo`. Ogni input esterno passa da `normSession()`. Vedi `docs/DATA_MODEL.md`.

Convenzioni di codice: ES5-style, helper `$ esc opt uid`, azioni in `A` (data-act) e `H` (data-ch), `save()` poi `render*()`, banner sezione `/* ---------- nome ---------- */`.

## 2. Perché serve la C

Oggi ogni browser ha il proprio stato; la cartella di backup è solo in scrittura (mai riletta). Due PC sulla stessa cartella → ognuno sovrascrive `labpm-autosave.json` con il proprio stato intero (last-writer-wins, perdita silenziosa). I ruoli sono simulati nell'UI e non sono una misura di sicurezza.

Opzioni valutate (richiesta utente: lettura/scrittura simultanea da più PC con modifiche visibili a tutte le sessioni):
- A. file unico con polling + merge: corse sulle scritture, copie in conflitto dei sync cloud → scartata.
- B. log di modifiche per ogni PC in cartella condivisa (single-writer per file): fattibile senza server, latenza 5–10 s in rete locale/minuti su cloud, gruppo 2–5 persone, ruoli ancora solo UI.
- **C. server centrale (scelta dell'utente)**: multiutente vero, login, ruoli enforced, aggiornamenti immediati; rompe il vincolo "single file senza backend" → **v2.0**.

## 3. Requisiti per la v2.0

Funzionali
- Database condiviso unico; ogni modifica visibile alle altre sessioni entro ~1–2 s (push SSE/WebSocket), senza ricaricare.
- Login (utenti reali, password hash, sessione/token); ruoli Admin / Project manager / Researcher / Viewer **applicati lato server** (stessa matrice permessi della `docs/USER_GUIDE.md` §10).
- Gestione conflitti: versione per record (ETag/`rev`) con rifiuto 409 e merge per campo; indicatore "modificato da X".
- Allegati salvati sul server (storage su disco o S3-compatibile), con limite dimensione, nome sanificato, download autenticato; sostituisce la cartella locale.
- Audit trail (chi/cosa/quando) sostituisce l'`activity` locale; export Excel dei task filtrati invariato (può restare client-side).
- Automazioni, cascata date, workload, conflitti strumento: decidere se restano nel client (come ora) o si spostano nel server (consigliato per coerenza: cascata/automazioni server-side in transazione).
- Migrazione: import di una sessione JSON v1 (anche `empty-database/labpm-empty.json`) nel server; export JSON completo.
- Backup server (dump SQLite pianificato) e ripristino.

Non funzionali
- Deploy semplice per un laboratorio: un solo servizio + volume dati (Docker Compose), HTTPS dietro reverse proxy; nessun servizio cloud obbligatorio.
- Dati confidenziali/NDA: nessuna chiamata a terzi; CSP stretta; rate-limit login; log senza dati sensibili.
- Test: unit/integration API + Playwright multi-sessione (due browser, modifica in uno visibile nell'altro). CI GitHub Actions.
- Il client resta in inglese; documentazione in inglese (README/docs) con licenza e box informativo; versione 2.0.0, CHANGELOG, migrazione descritta.

## 4. Proposta di architettura (da confermare)

| Livello | Proposta | Alternativa |
|---|---|---|
| Server | Node.js 20 + Fastify, REST JSON + SSE per eventi | WebSocket (`ws`) |
| DB | SQLite (WAL) via `better-sqlite3`; tabelle per entità, `rev` e `updated_at` per record, tabella `events` (audit + feed realtime) | PostgreSQL se > ~20 utenti |
| Auth | Cookie di sessione HttpOnly + SameSite, password `argon2id`, primo avvio crea Admin | OIDC/SSO (Azure AD, Google) |
| Client | Riuso di `index.html` come SPA statica servita dal server; `S` diventa cache locale, `save()` → chiamate API; `render()` invariato | Riscrittura modulare (ESM) |
| Allegati | `data/attachments/<owner>/…` + record DB, streaming upload/download autenticato | S3/MinIO |
| Deploy | `docker-compose.yml` (app + volume), reverse proxy Caddy/nginx per TLS | Single binary (pkg) |

Passi suggeriti: (1) definire schema SQL e API (OpenAPI) a partire da `DATA_MODEL.md`; (2) server con auth, CRUD, permessi, eventi SSE, migrazione import/export; (3) adattare il client (sync layer: fetch iniziale, mutazioni ottimistiche, gestione 409, stream eventi, riconnessione); (4) allegati; (5) cascata/automazioni server-side; (6) test multi-sessione + CI + Docker; (7) documentazione, CHANGELOG 2.0.0, guida migrazione da v1.x. Mantenere la v1.3 single-file come "modalità offline/standalone" (branch/tag `v1.3.0`) se l'utente lo vuole.

## 5. Vincoli e preferenze dell'utente (da rispettare)

- Utente esperto di materiali polimerici (PP, PE, PET, EVOH, film multistrato, DSC, reologia, estrusione): risposte dirette, tecniche, tabelle per i confronti, niente preamboli né hype; stage pre-seed.
- Italiano per documenti interni, **inglese per l'app e il materiale investor-facing**.
- Inserire URL per riferimenti, app, repo.
- Ogni file di codice: header `License-Identifier: PolyForm-Noncommercial-1.0.0 / Copyright (c) 2026 Flavio Pendolino / https://polyformproject.org/licenses/noncommercial/1.0.0`; UI con footer `© 2026 Flavio Pendolino | PolyForm Noncommercial 1.0.0`; box informativo (Author, Version, License, Commercial use, Purpose, Method, Disclaimer "validate the results against your own reference samples…", Third-party components, Scientific references); AI disclosure: se nessuna chiamata a modelli generativi → "this tool performs deterministic calculations; it does not generate content through generative AI (Art. 50 AI Act not applicable)".
- Commit con trailer `Co-Authored-By` / `Claude-Session` della sessione; push solo sul branch designato; **nessuna PR** senza richiesta esplicita.

## 6. Domande aperte da porre all'utente all'inizio

1. Utenti contemporanei previsti e numero di sedi/PC? (SQLite vs PostgreSQL)
2. Dove gira il server: PC/NAS in laboratorio, VM aziendale, cloud (quale)? Serve accesso da fuori rete?
3. Autenticazione: utenti locali con password o SSO aziendale (Microsoft/Google)?
4. Dati NDA/confidenziali o requisiti di tracciabilità (audit, GxP/ISO 17025)? Retention e backup richiesti?
5. Allegati: dimensione tipica/massima e volume totale atteso?
6. Mantenere anche la modalità standalone v1.3 (offline, single-file)?
7. Automazioni e cascata date: spostarle lato server (consigliato) o lasciare nel client?
8. Licenza: il server resta PolyForm Noncommercial, con la stessa email per l'uso commerciale?

## 7. Comandi utili

```bash
git clone https://github.com/penfla/LabPM.git && cd LabPM
git checkout claude/eager-gates-7mzcnh
npm install && npx playwright install chromium
npm test            # 12 test smoke (client v1.3)
npm start           # http://localhost:8080 (serve index.html)
```

---
© Flavio Pendolino, 2026. Questo documento è distribuito con licenza CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0).
