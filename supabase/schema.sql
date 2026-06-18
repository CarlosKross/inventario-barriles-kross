create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  family text not null,
  format_liters numeric default 30 check (format_liters > 0),
  active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists products_active_name_unique
  on public.products (lower(name))
  where active = true;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  access_token text unique not null,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint branches_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.inventories (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  branch_name text not null,
  responsible text default '',
  status text default 'abierto' check (status in ('abierto', 'cerrado')),
  inventory_date timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventories(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  cluster text not null check (cluster in ('pinchado', 'lleno', 'vacio')),
  quantity numeric not null default 0 check (quantity >= 0),
  measurement numeric not null default 0 check (measurement >= 0 and measurement <= 1),
  liters numeric not null default 0,
  barrel_equivalents numeric not null default 0,
  observation text,
  created_at timestamp with time zone default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists branches_set_updated_at on public.branches;
create trigger branches_set_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

drop trigger if exists inventories_set_updated_at on public.inventories;
create trigger inventories_set_updated_at
before update on public.inventories
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.branches enable row level security;
alter table public.inventories enable row level security;
alter table public.inventory_items enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
to anon, authenticated
using (active = true or auth.role() = 'authenticated');

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products for all
to authenticated
using (true)
with check (true);

drop policy if exists "Admins manage branches" on public.branches;
create policy "Admins manage branches"
on public.branches for all
to authenticated
using (true)
with check (true);

drop policy if exists "Admins manage inventories" on public.inventories;
create policy "Admins manage inventories"
on public.inventories for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can create inventories" on public.inventories;
create policy "Public can create inventories"
on public.inventories for insert
to anon
with check (true);

drop policy if exists "Admins manage inventory items" on public.inventory_items;
create policy "Admins manage inventory items"
on public.inventory_items for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can create inventory items" on public.inventory_items;
create policy "Public can create inventory items"
on public.inventory_items for insert
to anon
with check (true);

create or replace function public.get_branch_by_access(p_slug text, p_token text)
returns table (
  id uuid,
  name text,
  slug text,
  access_token text,
  active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
security definer
set search_path = public
as $$
  select b.id, b.name, b.slug, b.access_token, b.active, b.created_at, b.updated_at
  from public.branches b
  where b.slug = p_slug
    and b.access_token = p_token
    and b.active = true
  limit 1;
$$ language sql stable;

grant execute on function public.get_branch_by_access(text, text) to anon, authenticated;
