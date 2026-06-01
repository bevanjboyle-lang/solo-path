-- WP4 embedding-on-write. Fires embed-context-row (pg_net) when a check-in or
-- advisory summary lands, so context_embeddings stays current without editing
-- process-checkin or the ask-solo end_session path. Off critical path.
create or replace function public.trg_embed_context_row()
returns trigger language plpgsql security definer
set search_path = public as $$
declare tbl text;
begin
  tbl := TG_TABLE_NAME;
  if tbl = 'checkin_history' then
    if coalesce(NEW.narrative_addition,'') = ''
       and (NEW.exchanges is null or jsonb_typeof(NEW.exchanges) <> 'array') then
      return NEW;
    end if;
    if TG_OP = 'UPDATE' and NEW.narrative_addition is not distinct from OLD.narrative_addition then
      return NEW;
    end if;
  elsif tbl = 'advisory_conversation_summaries' then
    if coalesce(NEW.summary,'') = '' then
      return NEW;
    end if;
  end if;

  perform net.http_post(
    url := 'https://dnnxmjazillhktwttkux.supabase.co/functions/v1/embed-context-row',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('source_table', tbl, 'source_id', NEW.id::text)
  );
  return NEW;
end;
$$;

drop trigger if exists embed_checkin_history on public.checkin_history;
create trigger embed_checkin_history
  after insert or update on public.checkin_history
  for each row execute function public.trg_embed_context_row();

drop trigger if exists embed_advisory_summary on public.advisory_conversation_summaries;
create trigger embed_advisory_summary
  after insert on public.advisory_conversation_summaries
  for each row execute function public.trg_embed_context_row();
