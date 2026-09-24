-- Data wejścia oferty do aktualnego statusu. Nie zależy od późniejszej zmiany
-- ceny, zdjęć czy opisu (które mogą aktualizować offers.updated_at).
begin;

alter table public.offers
  add column if not exists status_changed_at timestamptz;

-- Dla historycznych ręcznych decyzji znamy dokładny czas z dziennika.
-- Automatyczne odrzucenia/ukrycia często nie miały wpisu w decisions:
-- tam updated_at jest najlepszą dostępną, ale przybliżoną datą.
update public.offers o
set status_changed_at = coalesce(
  (select max(d.decided_at)
     from public.decisions d
    where d.offer_id = o.id
      and d.status = o.status),
  o.updated_at
)
where o.status_changed_at is null;

create or replace function public.set_offer_status_changed_at()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    new.status_changed_at := coalesce(new.status_changed_at, now());
  elsif new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists offers_status_changed_at_trigger on public.offers;
create trigger offers_status_changed_at_trigger
before insert or update of status on public.offers
for each row execute function public.set_offer_status_changed_at();

comment on column public.offers.status_changed_at is
  'Czas wejścia do bieżącego statusu. Dla starszych ofert bez decyzji jest przybliżony na podstawie updated_at; po migracji ustalany dokładnie przez trigger.';

commit;
