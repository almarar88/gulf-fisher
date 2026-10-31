-- v5: bird sightings, no-catch trips, encrypted personal model
alter table public.gf_spots drop constraint if exists gf_spots_kind_chk;
alter table public.gf_spots add constraint gf_spots_kind_chk check (kind in ('spot','catch','route','track','note','bird','blank','model'));
