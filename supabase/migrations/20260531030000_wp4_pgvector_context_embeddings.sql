create extension if not exists vector;

create table if not exists public.context_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create index if not exists context_embeddings_user_idx
  on public.context_embeddings (user_id);

create index if not exists context_embeddings_hnsw_idx
  on public.context_embeddings using hnsw (embedding vector_cosine_ops);

alter table public.context_embeddings enable row level security;

comment on table public.context_embeddings is
  'WP4 salience store. One row per embedded source row (checkin_history, advisory_conversation_summaries). text-embedding-3-small (1536d). Queried by lib/context_assembler.ts for Ask Solo topic_relevant_history via cosine <=>. Service-role only.';
