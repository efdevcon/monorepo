-- Fix fuzzy_search return type (real vs float)

drop function if exists fuzzy_search(text, int, float, text, text);

create or replace function fuzzy_search(
  query_text text,
  match_count int default 10,
  similarity_threshold float default 0.1,
  filter_source_type text default null,
  filter_source_repo text default null
)
returns table (
  id uuid,
  content text,
  source_type text,
  source_repo text,
  source_id text,
  metadata jsonb,
  similarity real
)
language plpgsql
as $$
begin
  return query
  select
    d.id,
    d.content,
    d.source_type,
    d.source_repo,
    d.source_id,
    d.metadata,
    similarity(d.content, query_text) as similarity
  from documents d
  where
    (filter_source_type is null or d.source_type = filter_source_type)
    and (filter_source_repo is null or d.source_repo = filter_source_repo)
    and d.content % query_text  -- Uses trigram similarity
  order by similarity(d.content, query_text) desc
  limit match_count;
end;
$$;
