-- WP5/WP10: admin cost-observability view over prompt_runs.
create or replace view public.prompt_runs_cost_summary as
select
  date_trunc('day', created_at) as day,
  function_name,
  prompt_id,
  model,
  count(*) as calls,
  sum(coalesce(input_token_count, 0)) as input_tokens,
  sum(coalesce(output_token_count, 0)) as output_tokens,
  round(sum(coalesce(cost_estimate_gbp, 0))::numeric, 5) as cost_gbp,
  round(avg(latency_ms)) as avg_latency_ms
from public.prompt_runs
group by 1, 2, 3, 4;

comment on view public.prompt_runs_cost_summary is
  'WP5/WP10 cost observability. Aggregates prompt_runs per day/function/prompt_id/model. Populated as functions route through lib/llm_client.ts with a supabase client passed to complete().';
