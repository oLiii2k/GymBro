-- GymBro v3 — KEINE Schema-Änderung nötig für Plan-Editor/Login/Fortschritt/Mehrbenutzer.
-- Diese Datei ist NUR eine Verifikations-Checkliste für den SQL-Editor, kein auszuführendes DDL.
-- Nichts hier wurde in dieser Sitzung gegen Produktion ausgeführt (keine Produktionsschreibzugriffe).
--
-- Warum keine Migration nötig ist:
-- 1) Pläne B/C (und beliebige weitere Buchstaben A–E) sind in sets.plan_id als freier `text` gespeichert
--    (siehe schema-v2.sql Zeile 30) — keine CHECK-Constraint auf eine feste Werteliste. 'B'/'C' sind also
--    bereits gültige Werte, ohne etwas zu ändern.
-- 2) RLS für `sets` UND `plans` war von Anfang an korrekt auf user_id = auth.uid() für alle vier
--    Operationen (select/insert/update/delete inkl. with check) — siehe schema.sql Zeilen 25-27 und
--    schema-v2.sql Zeilen 22-25. Mehrbenutzer-Isolation ist bereits Teil des bestehenden Schemas.
--
-- Zum Verifizieren im SQL-Editor des Projekts (read-only, nichts davon verändert etwas):

-- a) Policies tatsächlich vorhanden und korrekt?
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('sets', 'plans')
order by tablename, cmd;

-- b) RLS tatsächlich aktiv (nicht nur Policies vorhanden, sondern enable row level security auch gesetzt)?
select relname, relrowsecurity
from pg_class
where relname in ('sets', 'plans');

-- c) Keine verwaisten Zeilen ohne user_id (sollte 0 sein, da NOT NULL + default auth.uid()):
select count(*) as sets_without_user from public.sets where user_id is null;
select count(*) as plans_without_user from public.plans where user_id is null;

-- Rollback-Hinweis (nur falls jemand künftig doch eine echte Migration hier anhängt):
-- jede additive Änderung in dieser Datei müsste mit einem passenden "drop/alter ... if exists" Gegenstück
-- versehen werden, z. B. `drop policy if exists "<name>" on public.<table>;` vor einem erneuten `create
-- policy`. Aktuell gibt es nichts zurückzurollen, weil nichts verändert wurde.
