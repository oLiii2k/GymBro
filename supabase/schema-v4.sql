-- GymBro v4 — Migration. Nach schema.sql/schema-v2.sql einmalig im SQL-Editor ausführen.
-- Additiv: erzeugt NUR die neue Tabelle exercise_notes, rührt plans/sets nicht an.
-- Idempotent: mehrfaches Ausführen schadet nicht (create/drop ... if exists).
--
-- Zweck: private, pro Nutzer UND pro Übung geführte Notizen (z. B. "Rückstufung wegen X"),
-- NIE serverseitig erzeugt oder aus Trainingsdaten abgeleitet — ausschließlich das, was die
-- Person selbst einträgt. Drei Zustände werden clientseitig (logic.js) aus den Spalten
-- abgeleitet, nicht in der DB gespeichert: active / review / resolved.
--
-- WICHTIG zur Statusableitung: "resolved_at gesetzt" ist die einzige serverseitig harte Aussage
-- (Soft-Resolve durch den Menschen, "Erledigt"-Klick). Ob eine Notiz in "review" angezeigt wird,
-- hängt zusätzlich von den geloggten Trainingsdaten ab (>=2 Sessions seit text_updated_at) UND
-- davon, ob review_ack_at bereits gesetzt ist. Trainingsabschluss ist NIE ein Beweis für
-- Symptomfreiheit — die App löst nie automatisch auf, sie fragt höchstens einmal nach.

create table if not exists public.exercise_notes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Gleiche Übungs-ID wie in plans.exercises / sets.exercise (siehe plan.js GYMBRO_LIBRARY) — kein
  -- Fremdschlüssel, die Übungsbibliothek ist Code, keine Tabelle.
  exercise_id      text not null check (char_length(exercise_id) between 1 and 80),
  note             text not null check (char_length(note) between 1 and 2000),
  created_at       timestamptz not null default now(),
  -- Nur bei einer INHALTLICHEN Textänderung neu gesetzt (nicht bei Behalten/Erledigt) — Basis für den
  -- "seit <Datum>"-Text und für die Sessions-seit-Änderung-Zählung (logic.js: sessionsSinceDate).
  text_updated_at  timestamptz not null default now(),
  -- Persistiert die EINMALIGE "Gilt das noch?"-Bestätigung ("Behalten"). Solange gesetzt, fragt die App
  -- nicht erneut — auch wenn weiterhin >=2 Sessions seit text_updated_at geloggt sind. Eine inhaltliche
  -- Textänderung setzt dieses Feld (clientseitig) wieder auf NULL zurück.
  review_ack_at    timestamptz,
  -- Soft-Resolve ("Erledigt"). NIE ein DELETE: die Zeile bleibt als private Historie dieser Übung
  -- erhalten (Start-/Auflösungsdatum + Text), verschwindet nur aus der aktiven Kartenansicht.
  resolved_at      timestamptz
);

-- Eine aktive (nicht aufgelöste) Notiz je Nutzer+Übung — mehrere HISTORISCHE (aufgelöste) Notizen je
-- Übung bleiben ausdrücklich erlaubt, nur der aktive Slot ist eindeutig.
create unique index if not exists exercise_notes_one_active_per_ex
  on public.exercise_notes (user_id, exercise_id) where resolved_at is null;

create index if not exists exercise_notes_user_ex_idx
  on public.exercise_notes (user_id, exercise_id, resolved_at);

alter table public.exercise_notes enable row level security;

drop policy if exists "exercise_notes_select_own" on public.exercise_notes;
drop policy if exists "exercise_notes_insert_own" on public.exercise_notes;
drop policy if exists "exercise_notes_update_own" on public.exercise_notes;
drop policy if exists "exercise_notes_delete_own" on public.exercise_notes;
-- Owner-only in beide Richtungen (USING = welche Zeilen sichtbar/änderbar sind, WITH CHECK = welche
-- user_id ein INSERT/UPDATE schreiben darf) — identisch zum Muster von plans in schema-v2.sql.
create policy "exercise_notes_select_own" on public.exercise_notes
  for select using (user_id = auth.uid());
create policy "exercise_notes_insert_own" on public.exercise_notes
  for insert with check (user_id = auth.uid());
create policy "exercise_notes_update_own" on public.exercise_notes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exercise_notes_delete_own" on public.exercise_notes
  for delete using (user_id = auth.uid());
-- Kein Hard-Delete-Button existiert aktuell in der App (app.js) — die delete-Policy steht nur bereit,
-- falls künftig eine EXPLIZIT getrennte "endgültig löschen"-Funktion gebaut wird. "Erledigt" in der UI
-- ruft ausschließlich UPDATE … SET resolved_at, NIE DELETE.
