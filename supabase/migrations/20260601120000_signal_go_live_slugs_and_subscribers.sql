-- Signal go-live (2026-06-01): per-edition slugs for SEO permalinks + subscriber capture.
-- Already applied to production via MCP on 2026-06-01; this file commits it to the repo for parity.

-- 1. Slug column for stable, indexable permalinks (/signal/<slug>)
alter table public.signal_editions add column if not exists slug text;

update public.signal_editions
set slug = trim(both '-' from regexp_replace(lower(coalesce(nullif(lead_headline,''), theme_title, id::text)), '[^a-z0-9]+', '-', 'g'))
where slug is null;

-- de-dupe any colliding slugs by appending a short id suffix
update public.signal_editions s
set slug = s.slug || '-' || left(s.id::text, 6)
where exists (select 1 from public.signal_editions t where t.slug = s.slug and t.id <> s.id);

create unique index if not exists signal_editions_slug_uniq on public.signal_editions(slug);

-- 2. Subscriber capture (The Signal weekly). Service-role writes only (RLS, no anon/authed policies).
create table if not exists public.signal_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists signal_subscribers_email_uniq on public.signal_subscribers (lower(email));
alter table public.signal_subscribers enable row level security;
