-- VeriShield schema. Every table has Row Level Security ON and NO public policies,
-- so the anon key can read nothing. Only the Express server (service_role) can access data.
-- Users live in Supabase Auth (auth.users); there is no separate users table.

-- RLS has no policies on purpose: only service_role can access tables, anon key cannot read anything.
-- demo_backup column exists only for the demo tamper and restore feature.
-- Seed data (the demo user and sample receipts) is created by `npm run seed` because
-- users must be created through the Supabase Auth admin API and receipts must be hash-chained
-- by application code.

grant usage on schema public to service_role;

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seq integer not null,
  ts text not null,
  stage text not null check (stage in ('input','output','system')),
  action text not null check (action in ('ALLOWED','REDACTED','WARNED','BLOCKED','OVERRIDDEN','OUTPUT_BLOCKED','OUTPUT_REDACTED','AI_UNAVAILABLE')),
  risk_score integer not null check (risk_score between 0 and 100),
  categories jsonb not null default '{}'::jsonb,
  matched_rules text[] not null default '{}',
  explanation text not null,
  overridden boolean not null default false,
  prev_hash text not null,
  entry_hash text not null,
  demo_backup jsonb,
  created_at timestamptz not null default now(),
  constraint receipts_user_seq_unique unique (user_id, seq)
);
create index if not exists receipts_user_seq_idx on public.receipts (user_id, seq desc);

create table if not exists public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  mode text not null,
  attack_total integer not null,
  attack_detected integer not null,
  normal_total integer not null,
  false_alarms integer not null,
  detection_rate numeric(5,2) not null,
  false_alarm_rate numeric(5,2) not null,
  pii_recall numeric(5,2),
  llm_calls_ok integer not null default 0,
  llm_calls_failed integer not null default 0,
  missed jsonb not null default '[]'::jsonb,
  false_alarm_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.receipts enable row level security;
alter table public.eval_runs enable row level security;

grant all on table public.receipts to service_role;
grant all on table public.eval_runs to service_role;

notify pgrst, 'reload schema';

