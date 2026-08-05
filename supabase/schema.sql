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

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_email text not null,
  buyer_name text,
  total numeric(12,2) not null default 0,
  currency text not null default 'USD' check (currency in ('USD','INR')),
  status text not null default 'received' check (status in ('received','in_progress','ready','delivered','closed')),
  payment_method text not null default 'cashfree',
  payment_status text not null default 'pending' check (payment_status in ('pending','submitted','paid','failed')),
  payment_reference text,
  payment_proof_url text,
  payment_submitted_at timestamptz,
  payment_verified_at timestamptz,
  admin_note text,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text not null default 'buyer' check (role in ('buyer','creator')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists projects_buyer_email_idx on public.projects (buyer_email);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists orders_buyer_email_idx on public.orders (buyer_email);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.projects enable row level security;
alter table public.project_messages enable row level security;
alter table public.project_files enable row level security;
alter table public.orders enable row level security;
alter table public.accounts enable row level security;

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', true)
on conflict (id) do update set public = true;

-- Safe migration for an existing database.
alter table public.orders add column if not exists payment_method text not null default 'cashfree';
alter table public.orders add column if not exists payment_status text not null default 'pending';
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_proof_url text;
alter table public.orders add column if not exists payment_submitted_at timestamptz;
alter table public.orders add column if not exists payment_verified_at timestamptz;
alter table public.orders add column if not exists admin_note text;
