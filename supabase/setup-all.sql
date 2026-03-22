create table if not exists public.site_content (
  slug text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "public read site content" on public.site_content;
create policy "public read site content"
on public.site_content
for select
using (true);

drop policy if exists "authenticated write site content" on public.site_content;
create policy "authenticated write site content"
on public.site_content
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated insert site content" on public.site_content;
create policy "authenticated insert site content"
on public.site_content
for insert
with check (auth.role() = 'authenticated');

insert into public.site_content (slug, data)
values ('main', '{}'::jsonb)
on conflict (slug) do nothing;


update public.site_content
set data = $$﻿{
  "channelName": "Davide Spagocci",
  "channelHandle": "@DavideSpagocci",
  "channelAvatar": "/channel-avatar.gif",
  "videos": {
    "tweet_2035509326668788055": {
      "title": "Spagocci Ninja Engine CeLebration Video",
      "description": "Adesso siamo VeLoci!",
      "thumbnail": "/thumbs/tweet_2035509326668788055.jpg",
      "duration": "",
      "categoryId": "mn0epixu009w",
      "playlistId": null,
      "type": "twitter",
      "tweetUrl": "https://x.com/DavideSpagocci/status/2035509326668788055",
      "tweetId": "2035509326668788055",
      "addedAt": "2026-03-22T00:11:47.811Z",
      "views": 2,
      "videoUrl": ""
    },
    "Dedicata a te.mp4": {
      "title": "Dedicata a te",
      "description": "",
      "thumbnail": "/thumbs/Dedicata a te.jpg",
      "duration": "",
      "categoryId": "mn0epixu009w",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T21:39:36.048Z",
      "views": 2,
      "videoUrl": "./videos/Dedicata%20a%20te.mp4"
    },
    "FeeL the Fire.mp4": {
      "title": "FeeL the Fire",
      "description": "",
      "thumbnail": "/thumbs/FeeL the Fire.jpg",
      "duration": "",
      "categoryId": "mn0epixu009w",
      "playlistId": "mn0y575rw6ea",
      "type": "video",
      "addedAt": "2026-03-21T14:27:00.855Z",
      "views": 1,
      "videoUrl": "./videos/FeeL%20the%20Fire.mp4"
    },
    "ritmo_boleano.mp4": {
      "title": "ritmo_boleano",
      "description": "",
      "thumbnail": "/thumbs/ritmo_boleano.jpg",
      "duration": "",
      "categoryId": "mn0epixu009w",
      "playlistId": "mn0y575rw6ea",
      "type": "video",
      "addedAt": "2026-03-21T17:26:43.900Z",
      "views": 0,
      "videoUrl": "./videos/ritmo_boleano.mp4"
    },
    "Via UmiLTà.mp4": {
      "title": "Via UmiLTà",
      "description": "",
      "thumbnail": "/thumbs/Via UmiLTà.jpg",
      "duration": "",
      "categoryId": "mn0epixu009w",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T14:27:00.855Z",
      "views": 2,
      "videoUrl": "./videos/Via%20UmiLT%C3%A0.mp4"
    },
    "Train Station.mp4": {
      "title": "Train Station",
      "description": "",
      "thumbnail": "/thumbs/Train Station.jpg",
      "duration": "",
      "categoryId": null,
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T14:27:00.855Z",
      "views": 0,
      "videoUrl": "./videos/Train%20Station.mp4"
    },
    "bumblebee.mp4": {
      "title": "bumblebee",
      "description": "",
      "thumbnail": "/thumbs/bumblebee.jpg",
      "duration": "",
      "categoryId": "mn0epixu009w",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T14:11:37.139Z",
      "views": 10,
      "videoUrl": "./videos/bumblebee.mp4"
    },
    "F1 Spagocci.mp4": {
      "title": "F1 Spagocci",
      "description": "",
      "thumbnail": "/thumbs/F1 Spagocci.jpg",
      "duration": "",
      "categoryId": "mn0gqk1xurjk",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T14:27:00.855Z",
      "views": 2,
      "videoUrl": "./videos/F1%20Spagocci.mp4"
    },
    "A ManoveLLa.mp4": {
      "title": "A ManoveLLa",
      "description": "",
      "thumbnail": "/thumbs/A ManoveLLa.jpg",
      "duration": "",
      "categoryId": "mn0epixu009w",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T14:27:00.855Z",
      "views": 2,
      "videoUrl": "./videos/A%20ManoveLLa.mp4"
    },
    "Eros.mp4": {
      "title": "Eros",
      "description": "",
      "thumbnail": "/thumbs/Eros.jpg",
      "duration": "",
      "categoryId": "mn0epixu009w",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T14:27:00.855Z",
      "views": 2,
      "videoUrl": "./videos/Eros.mp4"
    },
    "Jones Dance.mp4": {
      "title": "Jones Dance",
      "description": "",
      "thumbnail": "/thumbs/Jones Dance.jpg",
      "duration": "",
      "categoryId": "mn0gqk1xurjk",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T14:27:00.855Z",
      "views": 3,
      "videoUrl": "./videos/Jones%20Dance.mp4"
    },
    "qui si piscia Controvento.mp4": {
      "title": "qui si piscia Controvento",
      "description": "",
      "thumbnail": "/thumbs/qui si piscia Controvento.jpg",
      "duration": "",
      "categoryId": null,
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T14:27:00.855Z",
      "views": 0,
      "videoUrl": "./videos/qui%20si%20piscia%20Controvento.mp4"
    },
    "The Jump.mp4": {
      "title": "The Jump",
      "description": "",
      "thumbnail": "/thumbs/The Jump.jpg",
      "duration": "",
      "categoryId": "mn0gqk1xurjk",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T14:27:00.855Z",
      "views": 2,
      "videoUrl": "./videos/The%20Jump.mp4"
    },
    "The ReaL Xbox Game Pass Gamer .mp4": {
      "title": "The ReaL Xbox Game Pass Gamer",
      "description": "",
      "thumbnail": "/thumbs/The ReaL Xbox Game Pass Gamer .jpg",
      "duration": "",
      "categoryId": "mn0epixu009w",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T14:27:00.855Z",
      "views": 0,
      "videoUrl": "./videos/The%20ReaL%20Xbox%20Game%20Pass%20Gamer%20.mp4"
    },
    "blockgig.mp4": {
      "title": "blockgig",
      "description": "",
      "thumbnail": "/thumbs/blockgig.jpg",
      "duration": "",
      "categoryId": null,
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T15:39:27.188Z",
      "views": 11,
      "videoUrl": "./videos/blockgig.mp4"
    },
    "terenzio.mp4": {
      "title": "terenzio",
      "description": "",
      "thumbnail": "/thumbs/terenzio.jpg",
      "duration": "",
      "categoryId": "mn0ur6q1495x",
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T21:09:45.308Z",
      "views": 5,
      "videoUrl": "./videos/terenzio.mp4"
    },
    "enjoy little park nature Davide Spagocci.mp4": {
      "title": "enjoy little park nature",
      "description": "",
      "thumbnail": "/thumbs/enjoy little park nature Davide Spagocci.jpg",
      "duration": "",
      "categoryId": null,
      "playlistId": null,
      "type": "video",
      "addedAt": "2026-03-21T22:07:30.882Z",
      "views": 0,
      "videoUrl": "./videos/enjoy%20little%20park%20nature%20Davide%20Spagocci.mp4"
    }
  },
  "categories": [
    {
      "id": "mn0epixu009w",
      "name": "Music",
      "order": 0,
      "videoOrder": [
        "FeeL the Fire.mp4",
        "ritmo_boleano.mp4",
        "bumblebee.mp4",
        "Via UmiLTà.mp4",
        "A ManoveLLa.mp4",
        "Eros.mp4",
        "The ReaL Xbox Game Pass Gamer .mp4",
        "Dedicata a te.mp4",
        "tweet_2035509326668788055"
      ]
    },
    {
      "id": "mn0gqk1xurjk",
      "name": "ARTE",
      "order": 1,
      "videoOrder": [
        "F1 Spagocci.mp4",
        "Jones Dance.mp4",
        "The Jump.mp4"
      ]
    },
    {
      "id": "mn0ur6q1495x",
      "name": "Divertenti",
      "order": 2,
      "videoOrder": [
        "terenzio.mp4"
      ]
    },
    {
      "id": "mn0yx5ygq3d5",
      "name": "X",
      "order": 3,
      "videoOrder": []
    }
  ],
  "playlists": [
    {
      "id": "mn0y575rw6ea",
      "name": "Musica",
      "description": "",
      "order": 0
    }
  ],
  "videoOrder": [
    "tweet_2035509326668788055",
    "Dedicata a te.mp4",
    "FeeL the Fire.mp4",
    "ritmo_boleano.mp4",
    "Via UmiLTà.mp4",
    "Train Station.mp4",
    "bumblebee.mp4",
    "F1 Spagocci.mp4",
    "A ManoveLLa.mp4",
    "Eros.mp4",
    "Jones Dance.mp4",
    "qui si piscia Controvento.mp4",
    "The Jump.mp4",
    "The ReaL Xbox Game Pass Gamer .mp4",
    "blockgig.mp4",
    "terenzio.mp4",
    "enjoy little park nature Davide Spagocci.mp4"
  ]
}
$$::jsonb,
    updated_at = now()
where slug = 'main';
