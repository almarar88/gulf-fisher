-- allow encrypted routes, trip tracks and personal species notes (still ciphertext only)
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.gf_spots'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%';
  if c is not null then execute format('alter table public.gf_spots drop constraint %I', c); end if;
end $$;
alter table public.gf_spots add constraint gf_spots_kind_chk check (kind in ('spot','catch','route','track','note'));
