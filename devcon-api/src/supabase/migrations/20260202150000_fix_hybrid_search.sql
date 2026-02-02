-- Fix hybrid_search function: resolve DISTINCT ON / ORDER BY conflict

create or replace function hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_count int default 10,
  vector_threshold float default 0.1,
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
  similarity float,
  fts_rank float,
  match_type text
)
language plpgsql
as $$
begin
  return query
  with
    vector_results as (
      select
        d.id,
        d.content,
        d.source_type,
        d.source_repo,
        d.source_id,
        d.metadata,
        1 - (d.embedding <=> query_embedding) as similarity,
        0::float as fts_rank,
        'vector'::text as match_type
      from documents d
      where
        (filter_source_type is null or d.source_type = filter_source_type)
        and (filter_source_repo is null or d.source_repo = filter_source_repo)
        and 1 - (d.embedding <=> query_embedding) > vector_threshold
      order by d.embedding <=> query_embedding
      limit match_count
    ),
    fts_results as (
      select
        d.id,
        d.content,
        d.source_type,
        d.source_repo,
        d.source_id,
        d.metadata,
        0::float as similarity,
        ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', query_text)) as fts_rank,
        'fts'::text as match_type
      from documents d
      where
        (filter_source_type is null or d.source_type = filter_source_type)
        and (filter_source_repo is null or d.source_repo = filter_source_repo)
        and to_tsvector('english', d.content) @@ plainto_tsquery('english', query_text)
      order by fts_rank desc
      limit match_count
    ),
    combined as (
      select * from vector_results
      union all
      select * from fts_results
    ),
    aggregated as (
      select
        c.id,
        c.content,
        c.source_type,
        c.source_repo,
        c.source_id,
        c.metadata,
        max(c.similarity) as similarity,
        max(c.fts_rank) as fts_rank,
        case
          when max(c.similarity) > 0 and max(c.fts_rank) > 0 then 'both'
          when max(c.similarity) > 0 then 'vector'
          else 'fts'
        end as match_type
      from combined c
      group by c.id, c.content, c.source_type, c.source_repo, c.source_id, c.metadata
    )
  select *
  from aggregated a
  order by
    case when a.match_type = 'both' then 0 else 1 end,
    a.similarity desc,
    a.fts_rank desc
  limit match_count;
end;
$$;
