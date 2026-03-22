# Istruzioni Complete

Questa guida spiega tutti i passaggi, dall'inizio alla fine, per usare questa versione del progetto con:

- GitHub / Pages
- Supabase
- pannello admin via login email/password
- video serviti come file statici o da URL esterni

Il progetto ora e' statico.

Questo significa:

- non serve piu` `server.js`
- non serve piu` avviare Node in locale
- il sito legge i dati da Supabase
- il pannello admin salva i dati su Supabase

## 1. Cosa ti serve

Prima di iniziare ti servono:

1. un account Supabase
2. il progetto Supabase che hai gia` indicato
3. il repo dove pubblicherai il sito
4. i file video `.mp4` che vuoi mostrare
5. eventuali thumbnail

## 2. File importanti del progetto

I file principali sono:

- [public/index.html](/C:/Cloud/codex/public/index.html)
- [public/app.js](/C:/Cloud/codex/public/app.js)
- [public/admin.html](/C:/Cloud/codex/public/admin.html)
- [public/admin.js](/C:/Cloud/codex/public/admin.js)
- [public/login.html](/C:/Cloud/codex/public/login.html)
- [public/config.js](/C:/Cloud/codex/public/config.js)
- [public/supabase.js](/C:/Cloud/codex/public/supabase.js)
- [supabase/schema.sql](/C:/Cloud/codex/supabase/schema.sql)

## 3. Controlla la configurazione Supabase

Apri:

- [public/config.js](/C:/Cloud/codex/public/config.js)

Dentro trovi:

- `supabaseUrl`
- `supabaseAnonKey`
- `contentSlug`
- nome canale
- handle canale

Controlla che:

1. `supabaseUrl` sia giusto
2. `supabaseAnonKey` sia giusta
3. `contentSlug` sia `main` se vuoi usare il contenuto standard

Nota:

- la chiave che stai usando e' una chiave `anon`
- va bene nel frontend
- non devi mettere la `service_role` nel browser

## 4. Crea la tabella su Supabase

Apri Supabase.

Poi:

1. entra nel progetto giusto
2. apri `SQL Editor`
3. crea una nuova query
4. copia il contenuto del file [supabase/schema.sql](/C:/Cloud/codex/supabase/schema.sql)
5. esegui la query

Questa query crea:

- tabella `public.site_content`
- policy di lettura pubblica
- policy di scrittura per utenti autenticati
- record iniziale con `slug = 'main'`

## 5. Verifica che la tabella esista

Dopo aver eseguito lo script:

1. vai in `Table Editor`
2. apri la tabella `site_content`
3. controlla che esista una riga con:
   - `slug = main`

Se non c'e', puoi crearla manualmente con:

- `slug`: `main`
- `data`: `{}`

## 6. Crea un utente admin

Questo e' il login che userai per il pannello admin.

In Supabase:

1. vai in `Authentication`
2. vai in `Users`
3. crea un utente
4. inserisci email
5. inserisci password
6. salva

Queste credenziali serviranno per:

- [public/login.html](/C:/Cloud/codex/public/login.html)

## 7. Decidi dove mettere i video

Hai due strade.

### Opzione A: video dentro il progetto

Metti i file video in:

- [public/videos](/C:/Cloud/codex/public/videos)

Esempio:

- `public/videos/bumblebee.mp4`
- `public/videos/terenzio.mp4`

Poi nel dato del video userai:

- `./videos/bumblebee.mp4`

### Opzione B: video esterni

Puoi usare URL esterni, per esempio:

- CDN
- storage pubblico
- un altro hosting

In questo caso nel dato del video userai un URL completo:

- `https://tuodominio.com/video/bumblebee.mp4`

## 8. Dove mettere le immagini thumbnail

Le thumbnail locali possono stare in:

- [public/thumbs](/C:/Cloud/codex/public/thumbs)

Esempio:

- `/thumbs/bumblebee.jpg`

Puoi anche usare:

- immagini esterne
- immagini base64 caricate da admin

## 9. Prepara i dati del sito

Il sito legge tutto da:

- tabella `site_content`
- colonna `data`

Il campo `data` contiene un JSON con struttura simile a questa:

```json
{
  "channelName": "Davide Spagocci",
  "channelHandle": "@DavideSpagocci",
  "channelAvatar": "",
  "videos": {
    "bumblebee.mp4": {
      "title": "bumblebee",
      "description": "",
      "thumbnail": "/thumbs/bumblebee.jpg",
      "duration": "",
      "categoryId": "music",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-22T20:00:00.000Z",
      "views": 0,
      "videoUrl": "./videos/bumblebee.mp4"
    }
  },
  "categories": [
    {
      "id": "music",
      "name": "Music",
      "order": 0,
      "videoOrder": ["bumblebee.mp4"]
    }
  ],
  "playlists": [],
  "videoOrder": ["bumblebee.mp4"]
}
```

## 10. Inserisci i dati iniziali in Supabase

Hai due modi.

### Metodo semplice: da Table Editor

1. vai su `Table Editor`
2. apri `site_content`
3. apri la riga con `slug = main`
4. modifica il campo `data`
5. incolla il tuo JSON completo
6. salva

### Metodo SQL

Puoi anche fare un update SQL.

Schema:

```sql
update public.site_content
set data = 'IL_TUO_JSON'::jsonb,
    updated_at = now()
where slug = 'main';
```

## 11. Regole importanti per i video normali

Per ogni video normale devi avere:

1. una chiave video, per esempio `bumblebee.mp4`
2. `type: "video"` oppure `type: "short"`
3. `videoUrl`

Se manca `videoUrl`:

- il video non parte nel player

## 12. Regole importanti per i video X/Twitter

Per un video Twitter/X usa:

- `type: "twitter"`
- `tweetUrl`
- `tweetId`

Esempio:

```json
{
  "title": "Tweet video",
  "type": "twitter",
  "tweetUrl": "https://x.com/nome/status/1234567890",
  "tweetId": "1234567890",
  "thumbnail": "/thumbs/tweet_1234567890.jpg"
}
```

Il player:

- non usa un file mp4 locale
- incorpora il tweet

## 13. Come funziona il login admin

Il login admin e' in:

- [public/login.html](/C:/Cloud/codex/public/login.html)

Flusso:

1. apri `login.html`
2. inserisci email e password dell'utente creato su Supabase
3. entri in `admin.html`
4. il pannello salva i dati nella tabella `site_content`

## 14. Come usare l'admin

Nel pannello admin puoi:

1. vedere tutti i video
2. modificare titolo e descrizione
3. impostare `videoUrl`
4. cambiare categoria e playlist
5. creare categorie
6. creare playlist
7. riordinare la home
8. riordinare i video dentro una categoria
9. caricare avatar canale
10. aggiungere video X/Twitter
11. caricare thumbnail manuali

## 15. Primo avvio consigliato

Fai questo ordine:

1. crea tabella Supabase
2. crea utente admin
3. carica i video in `public/videos` oppure prepara URL esterni
4. carica le thumbnail in `public/thumbs` se vuoi usarle locali
5. inserisci un JSON iniziale in `site_content.data`
6. pubblica il sito
7. apri `login.html`
8. fai login
9. apri `admin.html`
10. sistema tutti i `videoUrl`
11. controlla che ogni video si apra bene

## 16. Come pubblicare il progetto

### Se usi GitHub

1. copia questi file nel repo finale
2. assicurati che la cartella pubblica del tuo hosting contenga il contenuto di `public`
3. pubblica il sito

### Se usi Cloudflare Pages o Pages-like hosting

In genere vuoi pubblicare la cartella:

- `public`

oppure configurare il build in modo che i file finali serviti siano quelli presenti in `public`.

Se il tuo repo usa una struttura diversa, devi adattare il deploy in modo che i file finali online siano:

- `index.html`
- `admin.html`
- `login.html`
- `style.css`
- `admin.css`
- `app.js`
- `admin.js`
- `config.js`
- `supabase.js`
- cartella `thumbs`
- cartella `videos`

## 17. URL da provare dopo il deploy

Dopo la pubblicazione controlla:

1. home:
   - `/`
2. login:
   - `/login.html`
3. admin:
   - `/admin.html`

Se la home non carica:

- di solito manca o e' errata la tabella `site_content`

Se il login non funziona:

- di solito manca l'utente in Supabase Auth

## 18. Come aggiungere un video nuovo

Per aggiungere un video normale:

1. carica il file video
2. crea o usa una thumbnail
3. entra in admin
4. se il video e' gia` presente nel JSON, modificalo
5. se non e' presente, aggiungilo nel JSON iniziale oppure chiedimi di prepararti un seed completo
6. imposta:
   - titolo
   - descrizione
   - categoria
   - playlist
   - `videoUrl`
7. salva

Per aggiungere un video X:

1. entra in admin
2. inserisci URL tweet
3. inserisci titolo
4. scegli categoria
5. opzionalmente carica thumbnail
6. salva

## 19. Come cambiare avatar canale

In admin:

1. vai su `Statistiche`
2. scegli immagine o GIF
3. salva

L'avatar viene memorizzato nei dati del sito.

## 20. Come aggiornare nome canale e handle

Attualmente nome e handle di default stanno in:

- [public/config.js](/C:/Cloud/codex/public/config.js)

Se vuoi che siano salvati nei dati remoti, nel JSON `data` puoi impostare:

- `channelName`
- `channelHandle`

Il frontend usa i valori del database se presenti.

## 21. Limiti attuali da sapere

Questa versione ha alcune differenze rispetto al vecchio progetto locale:

1. non scandisce automaticamente una cartella Windows
2. non genera automaticamente il database locale
3. i video normali richiedono `videoUrl`
4. il conteggio views non viene salvato automaticamente lato server
5. la cattura thumbnail da frame puo` fallire se il browser blocca il video per CORS

## 22. Errori comuni

### La home e' vuota

Cause tipiche:

1. `site_content` non esiste
2. `slug = main` manca
3. il campo `data` e' vuoto
4. la chiave Supabase e' errata

### Login non funziona

Cause tipiche:

1. utente non creato in Supabase Auth
2. email/password sbagliate
3. progetto Supabase sbagliato in `config.js`

### Il video non parte

Cause tipiche:

1. `videoUrl` mancante
2. `videoUrl` sbagliato
3. file non pubblicato
4. URL esterno bloccato

### Thumbnail da frame non funziona

Cause tipiche:

1. il video e' remoto
2. il server del video non permette CORS

Soluzione:

- carica la thumbnail manualmente

## 23. Consiglio pratico per partire bene

Il modo piu` semplice per non complicarti la vita e':

1. mettere tutti gli mp4 in `public/videos`
2. mettere tutte le jpg in `public/thumbs`
3. usare URL relativi tipo `./videos/file.mp4`
4. salvare tutto il contenuto in `site_content.data`
5. usare l'admin solo per le modifiche successive

## 24. Cosa posso prepararti io nel prossimo passo

Se vuoi posso fare io anche uno di questi lavori:

1. prepararti un JSON iniziale completo da incollare in Supabase
2. generarti la lista di tutti i video con `videoUrl` gia` compilati
3. adattare il progetto esattamente alla struttura del repo `spagocci`
4. prepararti i comandi Git per pubblicarlo
