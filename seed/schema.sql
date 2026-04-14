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
drop policy if exists "authenticated insert site content" on public.site_content;

insert into public.site_content (slug, data)
values ('main', '{}'::jsonb)
on conflict (slug) do nothing;
