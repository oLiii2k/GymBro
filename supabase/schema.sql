-- GymBro v1 — Supabase-Schema. Im SQL-Editor des Projekts einmalig ausführen.
-- Datenmodell: eine Zeile pro Satz (Datum + Übung + Satz-Index), nie "nur letzter Wert".
-- Nur ✓-Sätze werden geschrieben; ein Satz ohne ✓ existiert in der DB nicht.

create table if not exists public.sets (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date        date not null,                 -- Trainingstag (lokal)
  exercise    text not null,                 -- stabile Übungs-ID aus plan.js
  set_index   smallint not null check (set_index >= 1),
  reps        smallint not null check (reps >= 0),
  weight      numeric(5,1) not null check (weight >= 0),  -- kg je Hantel/Gerät
  done_at     timestamptz not null default now(),
  -- Upsert-Ziel: erneutes ✓/Ändern desselben Satzes überschreibt, dupliziert nicht
  unique (user_id, date, exercise, set_index)
);

-- Vorbelegung: "letzter Trainingstag je Übung" muss schnell sein
create index if not exists sets_user_ex_date_idx on public.sets (user_id, exercise, date desc);

-- Row Level Security: jeder sieht und ändert nur eigene Zeilen.
-- Der Client nutzt ausschließlich den anon-Key; ein Service-Key gehört nie ins Frontend.
alter table public.sets enable row level security;

create policy "sets_select_own" on public.sets for select using (user_id = auth.uid());
create policy "sets_insert_own" on public.sets for insert with check (user_id = auth.uid());
create policy "sets_update_own" on public.sets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sets_delete_own" on public.sets for delete using (user_id = auth.uid());
