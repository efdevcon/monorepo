-- Devcon AI RAG Schema
-- Documents table for RAG knowledge base

-- ============================================
-- 1. Enable pgvector extension
-- ============================================
create extension if not exists vector;

-- ============================================
-- 2. Documents table (RAG knowledge base)
-- ============================================
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),

  -- Source tracking
  source_type text not null,           -- 'github', 'gdrive', 'fileverse', 'notion'
  source_repo text,                     -- 'devcon', 'devconnect', etc. (for github)
  source_id text not null,              -- file path, drive ID, or external ID
  source_hash text,                     -- content hash for change detection

  -- Metadata for filtering and display
  metadata jsonb default '{}',          -- title, heading, tags, file_path, etc.

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for vector similarity search (IVFFlat - good balance of speed/accuracy)
create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for source lookups (for upserts/deletes)
create unique index if not exists documents_source_idx
  on documents (source_type, source_repo, source_id);

-- Index for filtering by source
create index if not exists documents_source_type_idx on documents (source_type);
create index if not exists documents_source_repo_idx on documents (source_repo);

-- ============================================
-- 3. Vector similarity search function
-- ============================================
create or replace function match_documents(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.5,
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
  similarity float
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
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where
    (filter_source_type is null or d.source_type = filter_source_type)
    and (filter_source_repo is null or d.source_repo = filter_source_repo)
    and 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================
-- 4. Helper function: Update timestamp trigger
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists documents_updated_at on documents;
create trigger documents_updated_at
  before update on documents
  for each row execute function update_updated_at();

-- ============================================
-- 5. Row Level Security (service role bypasses, blocks everyone else)
-- ============================================
alter table documents enable row level security;

-- ============================================
-- 6. Stats view for monitoring
-- ============================================
create or replace view rag_stats as
select
  source_type,
  source_repo,
  count(*) as document_count,
  min(created_at) as oldest_document,
  max(updated_at) as latest_update
from documents
group by source_type, source_repo;
