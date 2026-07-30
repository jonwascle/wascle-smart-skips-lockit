-- Wascle Smart Skips — initial database schema
-- Run this in the NEW Supabase project: SQL Editor -> New query -> paste -> Run

create table if not exists skips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  igloohome_device_id text,
  created_at timestamptz default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  housing_association text not null,
  name text not null,
  department_id uuid references departments(id),
  created_at timestamptz default now()
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  skip_id uuid references skips(id) not null,
  employee_id uuid references employees(id),
  employee_name text,
  department text,
  volume_yd3 numeric,
  distance_m numeric,
  code text,
  code_pin_id text,
  photo_waste_path text,
  photo_opened_path text,
  photo_after_path text,
  ts_opened timestamptz,
  ts_after timestamptz,
  duration_ms bigint,
  status text default 'in_progress',
  created_at timestamptz default now()
);

-- Photos and any other assets for a visit
insert into storage.buckets (id, name, public)
  values ('visit-photos', 'visit-photos', false)
  on conflict (id) do nothing;

alter table skips enable row level security;
alter table departments enable row level security;
alter table employees enable row level security;
alter table visits enable row level security;

-- The employee-facing app has no login of its own (deliberately kept
-- simple for now) — anything reading/writing here uses the publishable
-- key directly, so these policies are open. Tighten these later if a
-- proper login is added for the app itself.
create policy "public read skips" on skips for select using (true);
create policy "public read departments" on departments for select using (true);
create policy "public insert employees" on employees for insert with check (true);
create policy "public read employees" on employees for select using (true);
create policy "public insert visits" on visits for insert with check (true);
create policy "public update visits" on visits for update using (true);
create policy "public read visits" on visits for select using (true);

create policy "public upload visit photos" on storage.objects for insert
  with check (bucket_id = 'visit-photos');
create policy "public read visit photos" on storage.objects for select
  using (bucket_id = 'visit-photos');
