-- Fix fuzzy_search to actually use the similarity_threshold parameter
-- The threshold was being passed but never used in the query

drop function if exists fuzzy_search(text, int, real, text, text);
drop function if exists fuzzy_search(text, int, float, text, text);

create or replace function fuzzy_search(
  query_text text,
  match_count int default 10,
  similarity_threshold real default 0.3,
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
    word_similarity(query_text, d.content) as similarity
  from documents d
  where
    (filter_source_type is null or d.source_type = filter_source_type)
    and (filter_source_repo is null or d.source_repo = filter_source_repo)
    and word_similarity(query_text, d.content) >= similarity_threshold
  order by word_similarity(query_text, d.content) desc
  limit match_count;
end;
$$;
