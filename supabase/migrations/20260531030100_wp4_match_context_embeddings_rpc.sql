create or replace function public.match_context_embeddings(
  p_user_id uuid,
  p_query_embedding text,
  p_match_count int default 5
) returns table (source_table text, source_id text, similarity double precision)
language sql stable as $$
  select source_table, source_id, 1 - (embedding <=> p_query_embedding::vector) as similarity
  from public.context_embeddings
  where user_id = p_user_id
  order by embedding <=> p_query_embedding::vector
  limit greatest(1, p_match_count);
$$;

revoke execute on function public.match_context_embeddings(uuid, text, int) from anon, authenticated;
