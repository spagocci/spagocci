# SPAGOCCiTube per GitHub Pages / Cloudflare Pages + Supabase

Questa versione gira come sito statico e usa Supabase come backend dati.

Il frontend pubblico e l'admin ora leggono/scrivono uno stato JSON in Supabase, così il progetto può girare su hosting statico come:

- `https://github.com/spagocci/spagocci`
- `https://spagocci.pages.dev/`

## Cosa cambia

- `public/index.html` usa Supabase per leggere il contenuto del canale
- `admin.html` usa una password privata verificata lato server da Cloudflare Pages Functions
- i video normali non vengono più letti da `C:\Cloud\Video`
- ogni video deve avere un `videoUrl` pubblico, per esempio:
  - `./videos/nomefile.mp4`
  - oppure un URL CDN / storage esterno
- il contenuto completo del canale viene salvato nella tabella `public.site_content`

## 1. Crea la tabella su Supabase

Esegui lo script:

- [supabase/schema.sql](/C:/Cloud/codex/supabase/schema.sql)

Questo crea:

- tabella `site_content`
- lettura pubblica
- nessuna scrittura pubblica diretta dal browser

## 2. Configura i secret su Cloudflare Pages

Nel progetto Cloudflare Pages imposta questi secret:

1. `ADMIN_PASSWORD`
2. `ADMIN_SESSION_SECRET`
3. `SUPABASE_URL`
4. `SUPABASE_SERVICE_ROLE_KEY`

`ADMIN_PASSWORD` viene verificata lato server e non compare nel codice frontend pubblico.

## 3. Inserisci i dati iniziali

Nel record `site_content` con `slug = 'main'`, il campo `data` deve contenere il contenuto del canale.

Per ogni video normale aggiungi o correggi `videoUrl`.

Esempio:

```json
{
  "title": "bumblebee",
  "type": "video",
  "thumbnail": "/thumbs/bumblebee.jpg",
  "videoUrl": "./videos/bumblebee.mp4"
}
```

## 4. Dove mettere i file video

Se vuoi servire i video dal sito statico:

1. crea una cartella `public/videos/`
2. inserisci i file `.mp4`
3. usa URL come `./videos/nomefile.mp4`

Le thumbnail già presenti in `public/thumbs/` continuano a funzionare.

## 5. Configurazione Supabase nel frontend

La configurazione è in:

- [public/config.js](/C:/Cloud/codex/public/config.js)

Attualmente punta al progetto Supabase:

- `https://cfdtylopygsxcllviwns.supabase.co`

Nota importante: la chiave che hai incollato non è una `service_role`, ma una chiave con ruolo `anon`, quindi è adatta all'uso frontend.

## 6. File principali aggiornati

- [public/index.html](/C:/Cloud/codex/public/index.html)
- [public/app.js](/C:/Cloud/codex/public/app.js)
- [public/admin.html](/C:/Cloud/codex/public/admin.html)
- [public/admin.js](/C:/Cloud/codex/public/admin.js)
- [public/login.html](/C:/Cloud/codex/public/login.html)
- [public/supabase.js](/C:/Cloud/codex/public/supabase.js)

## Limiti attuali

- il conteggio view non viene incrementato lato server
- i video locali del vecchio server non sono più leggibili automaticamente dal filesystem Windows
- per i video X/Twitter la thumbnail è manuale
- la cattura thumbnail da frame funziona solo se il browser può leggere il video senza blocchi CORS

## Pulizia

Il vecchio runtime locale basato su Node e filesystem Windows è stato rimosso dal progetto.
