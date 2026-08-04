create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  buyer_name text,
  service_id text,
  service_title text not null,
  title text,
  style text,
  brief text not null,
  phone text,
  reference_names jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new','in_progress','awaiting_review','revision_requested','approved','delivered','closed')),
  revision_count integer not null default 0,
  admin_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_role text not null check (sender_role in ('buyer','designer','system')),
  sender_name text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_kind text not null default 'deliverable',
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.project_messages enable row level security;
alter table public.project_files enable row level security;

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', true)
on conflict (id) do update set public = true;
