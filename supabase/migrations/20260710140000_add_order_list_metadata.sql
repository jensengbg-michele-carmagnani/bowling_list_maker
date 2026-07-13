alter table public.orders
add column if not exists company_name text;

alter table public.orders
add column if not exists last_accessed_at timestamptz not null default timezone('utc', now());

update public.orders
set company_name = coalesce(nullif(trim(company_name), ''), nullif(trim(name), ''), 'Azienda non specificata')
where company_name is null or trim(company_name) = '';

alter table public.orders
alter column company_name set not null;

alter table public.orders
drop constraint if exists orders_status_check;

alter table public.orders
add constraint orders_status_check check (status in ('draft', 'sent', 'received'));

with ranked as (
  select
    id,
    name,
    row_number() over (
      partition by lower(trim(name))
      order by id
    ) as rn
  from public.orders
)
update public.orders as o
set name = concat(o.name, ' - dup ', ranked.rn)
from ranked
where o.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists idx_orders_name_unique on public.orders (lower(name));
create index if not exists idx_orders_company_name on public.orders (company_name);
ogFLjTeteW5Jkd^&Mkk