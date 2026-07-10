alter table public.products
add column if not exists price double precision not null default 0;

update public.products
set price = 0
where price is null;
