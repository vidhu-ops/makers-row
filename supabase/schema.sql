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
  file_path text,
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
  payment_proof_path text,
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

create table if not exists public.creator_payout_profiles (
  id uuid primary key default gen_random_uuid(),
  creator_email text not null unique,
  account_name text not null,
  bank_name text,
  account_number text,
  ifsc_code text,
  upi_id text,
  terms_accepted_at timestamptz not null default now(),
  terms_version text not null default 'creator-70-2026-08',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.creator_listings (
  id uuid primary key default gen_random_uuid(),
  creator_email text not null,
  title text not null,
  category text not null,
  description text,
  price numeric(12,2) not null check (price >= 150),
  currency text not null default 'INR' check (currency in ('INR','USD')),
  preview_path text,
  asset_manifest jsonb not null default '[]'::jsonb,
  status text not null default 'Live' check (status in ('Draft','Live','Paused')),
  sales integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_admin_messages (
  id uuid primary key default gen_random_uuid(),
  creator_email text not null,
  sender_role text not null check (sender_role in ('creator','admin')),
  sender_email text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id text,
  is_read boolean not null default false,
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
alter table public.creator_payout_profiles enable row level security;
alter table public.creator_listings enable row level security;
alter table public.creator_admin_messages enable row level security;
alter table public.admin_notifications enable row level security;

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do update set public = false;
insert into storage.buckets (id, name, public)
values ('creator-assets', 'creator-assets', false)
on conflict (id) do update set public = false;

-- Safe migration for an existing database.
alter table public.orders add column if not exists payment_method text not null default 'cashfree';
alter table public.orders add column if not exists payment_status text not null default 'pending';
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_proof_url text;
alter table public.orders add column if not exists payment_proof_path text;
alter table public.orders add column if not exists payment_submitted_at timestamptz;
alter table public.orders add column if not exists payment_verified_at timestamptz;
alter table public.orders add column if not exists admin_note text;
alter table public.project_files add column if not exists file_path text;
update storage.buckets set public = false where id = 'project-files';
update storage.buckets set public = false where id = 'creator-assets';
