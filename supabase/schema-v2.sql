-- GymBro v2 — Migration. Nach schema.sql einmalig im SQL-Editor ausführen.
-- Idempotent: mehrfaches Ausführen schadet nicht.

-- 1) Pläne: Übungs-IDs + Spannen als JSON. Die Übungs-ID bleibt der stabile Schlüssel
--    (gleiche Historie in sets, egal in welchem Plan die Übung steckt).
--    Plan "A" ist im Code fest hinterlegt und steht nicht in dieser Tabelle.
create table if not exists public.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  -- [{ "id": "kh-seitheben", "sets": 3, "wMin": 10, "wMax": 15, "kg": 4 }, ...]
  exercises   jsonb not null check (jsonb_typeof(exercises) = 'array'),
  created_at  timestamptz not null default now()
);

alter table public.plans enable row level security;

drop policy if exists "plans_select_own" on public.plans;
drop policy if exists "plans_insert_own" on public.plans;
drop policy if exists "plans_update_own" on public.plans;
drop policy if exists "plans_delete_own" on public.plans;
create policy "plans_select_own" on public.plans for select using (user_id = auth.uid());
create policy "plans_insert_own" on public.plans for insert with check (user_id = auth.uid());
create policy "plans_update_own" on public.plans for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plans_delete_own" on public.plans for delete using (user_id = auth.uid());

-- 2) Sätze merken sich, in welchem Plan sie entstanden sind ("A" = Plan A, sonst plans.id).
--    Bestehende Zeilen sind alle aus Plan A. Text statt uuid, weil "A" kein uuid ist und
--    ein gelöschter Plan seine Historie behalten soll (kein Fremdschlüssel).
alter table public.sets add column if not exists plan_id text not null default 'A';

-- 3) Eindeutigkeit je Plan: dieselbe Übung kann am selben Tag in zwei Plänen vorkommen,
--    ohne dass sich die Sätze gegenseitig überschreiben.
alter table public.sets drop constraint if exists sets_user_id_date_exercise_set_index_key;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sets_user_date_plan_exercise_set_key') then
    alter table public.sets add constraint sets_user_date_plan_exercise_set_key
      unique (user_id, date, plan_id, exercise, set_index);
  end if;
end $$;
