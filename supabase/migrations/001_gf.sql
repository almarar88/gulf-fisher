-- Gulf Fisher (صيّاد الخليج): private owner-only tables. Spots & catch payloads are AES-GCM ciphertext encrypted on the device.
create table if not exists gf_spots (
  id uuid primary key, owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ct text not null, iv text not null, kind text not null default 'spot' check (kind in ('spot','catch')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted boolean not null default false);
create table if not exists gf_vault (
  owner uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  salt text not null, check_ct text not null, check_iv text not null, created_at timestamptz not null default now());
create index if not exists gf_spots_owner on gf_spots(owner, updated_at desc);
create or replace function public.gf_is_owner() returns boolean language sql stable as
$$ select auth.uid() = '538e2219-4801-4f4b-8d21-78ec5712433e'::uuid $$;
do $$ declare t text; begin
  foreach t in array array['gf_spots','gf_vault'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists %I on public.%I', t||'_own', t);
    execute format('create policy %I on public.%I for all to authenticated using (owner = auth.uid() and public.gf_is_owner()) with check (owner = auth.uid() and public.gf_is_owner())', t||'_own', t);
  end loop; end $$;
grant select, insert, update, delete on gf_spots, gf_vault to authenticated;
