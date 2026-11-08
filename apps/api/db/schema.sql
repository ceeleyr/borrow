-- =====================================================================
-- Skema database Borrow (Supabase / PostgreSQL)
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- Aman dijalankan ulang (idempotent) dan juga menaikkan skema lama
-- (tabel profiles/items/borrow_requests versi awal) ke versi terbaru.
-- CATATAN: skrip ini belum diuji pada instance Supabase sungguhan di sesi
-- pengembangan ini; jalankan dulu di project staging/backup.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        text not null default 'user',
  avatar_url  text,
  created_at  timestamptz not null default now()
);
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin', 'superadmin'));
create unique index if not exists profiles_email_key on public.profiles (lower(email));

-- ---------- categories ----------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);
create unique index if not exists categories_name_lower_idx on public.categories (lower(trim(name)));

-- Seed default categories bila belum ada
insert into public.categories (name)
values 
  ('Elektronik'),
  ('Alat & Perkakas'),
  ('Outdoor & Camping'),
  ('Audio & Visual'),
  ('Olahraga'),
  ('Perlengkapan Acara')
on conflict do nothing;

-- ---------- items ----------
create table if not exists public.items (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  category            text,
  condition           text not null default 'good',
  quantity            integer not null default 1,
  available_quantity  integer not null default 1,
  status              text not null default 'available',
  image_url           text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Kolom baru untuk skema lama
alter table public.items add column if not exists quantity           integer not null default 1;
alter table public.items add column if not exists available_quantity integer not null default 1;
alter table public.items add column if not exists category_id        uuid references public.categories(id) on delete set null;
alter table public.items add column if not exists created_by         uuid references public.profiles(id) on delete set null;
alter table public.items add column if not exists updated_at         timestamptz not null default now();

-- Sinkronisasi kategori lama dari items ke tabel categories
insert into public.categories (name)
select distinct trim(category) from public.items
where category is not null and trim(category) <> ''
on conflict do nothing;

update public.items i
set category_id = c.id
from public.categories c
where lower(trim(i.category)) = lower(trim(c.name))
  and i.category_id is null;

-- Skema lama memakai owner_id (barang milik user) -> sekarang barang dikelola admin
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'items' and column_name = 'owner_id') then
    alter table public.items alter column owner_id drop not null;
  end if;
end $$;

-- Status lama (pending/rejected untuk moderasi) dipetakan ke status baru
update public.items set status = 'unavailable' where status in ('pending', 'rejected');
update public.items set available_quantity = quantity
  where status = 'available' and available_quantity > quantity;

alter table public.items drop constraint if exists items_status_check;
alter table public.items add constraint items_status_check check (status in ('available', 'borrowed', 'unavailable'));
alter table public.items drop constraint if exists items_condition_check;
alter table public.items add constraint items_condition_check check (condition in ('good', 'fair', 'poor'));
alter table public.items drop constraint if exists items_quantity_check;
alter table public.items add constraint items_quantity_check check (quantity >= 1);
alter table public.items drop constraint if exists items_stock_range;
alter table public.items add constraint items_stock_range check (available_quantity >= 0 and available_quantity <= quantity);

create index if not exists items_status_idx on public.items (status);

-- ---------- borrow_requests ----------
create table if not exists public.borrow_requests (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items(id) on delete restrict,
  borrower_id   uuid not null references public.profiles(id) on delete restrict,
  quantity      integer not null default 1,
  borrow_date   timestamp without time zone not null default (current_date::timestamp),
  due_date      date,
  note          text,
  admin_note    text,
  status        text not null default 'pending',
  requested_at  timestamptz not null default now(),
  approved_at   timestamptz,
  approved_by   uuid references public.profiles(id) on delete set null,
  picked_up_at  timestamptz,
  returned_at   timestamptz,
  rejected_at   timestamptz,
  cancelled_at  timestamptz
);

-- Kolom baru untuk skema lama
alter table public.borrow_requests add column if not exists quantity     integer not null default 1;
alter table public.borrow_requests add column if not exists borrow_date  timestamp without time zone not null default (current_date::timestamp);
alter table public.borrow_requests add column if not exists due_date     date;
alter table public.borrow_requests add column if not exists note         text;
alter table public.borrow_requests add column if not exists admin_note   text;
alter table public.borrow_requests add column if not exists picked_up_at timestamptz;
alter table public.borrow_requests add column if not exists rejected_at  timestamptz;
alter table public.borrow_requests add column if not exists cancelled_at timestamptz;

alter table public.borrow_requests drop constraint if exists borrow_requests_dates_check;
alter table public.borrow_requests alter column borrow_date drop default;
alter table public.borrow_requests alter column borrow_date type timestamp without time zone using borrow_date::timestamp;
alter table public.borrow_requests alter column borrow_date set default (current_date::timestamp);

update public.borrow_requests set due_date = borrow_date::date + 7 where due_date is null;
alter table public.borrow_requests alter column due_date set not null;

alter table public.borrow_requests drop constraint if exists borrow_requests_status_check;
alter table public.borrow_requests add constraint borrow_requests_status_check
  check (status in ('pending', 'approved', 'borrowed', 'returned', 'rejected', 'cancelled'));
alter table public.borrow_requests drop constraint if exists borrow_requests_quantity_check;
alter table public.borrow_requests add constraint borrow_requests_quantity_check check (quantity >= 1);
alter table public.borrow_requests add constraint borrow_requests_dates_check check (due_date >= borrow_date::date);

create index if not exists borrow_requests_borrower_idx on public.borrow_requests (borrower_id, requested_at desc);
create index if not exists borrow_requests_item_idx     on public.borrow_requests (item_id);
create index if not exists borrow_requests_status_idx   on public.borrow_requests (status);

-- ---------- Penyesuaian stok atomik ----------
-- Dipanggil API (repository Supabase). Mengembalikan 0 baris bila hasil stok di luar 0..quantity.
create or replace function public.adjust_item_stock(p_item_id uuid, p_delta integer)
returns setof public.items
language plpgsql
as $$
begin
  return query
  update public.items i
     set available_quantity = i.available_quantity + p_delta,
         status = case
                    when i.status = 'unavailable' then 'unavailable'
                    when i.available_quantity + p_delta > 0 then 'available'
                    else 'borrowed'
                  end,
         updated_at = now()
   where i.id = p_item_id
     and i.available_quantity + p_delta between 0 and i.quantity
  returning i.*;
end;
$$;

-- ---------- Keamanan ----------
-- API memakai service role (melewati RLS). Aktifkan RLS tanpa policy supaya
-- anon key tidak bisa membaca/menulis tabel secara langsung.
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.items           enable row level security;
alter table public.borrow_requests enable row level security;

-- ---------- Storage gambar barang ----------
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

-- ---------- Menjadikan akun admin / superadmin ----------
-- Cara mudah:  npm run create-admin -- email@domain.com password "Nama" superadmin
-- Atau manual:  update public.profiles set role = 'superadmin' where email = 'email@domain.com';
