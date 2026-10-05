# v4-Rollback: persönliche Übungsnotizen (`exercise_notes`)

**Standard-Rollback = Feature deaktivieren, NICHT Daten löschen.** Notizen sind private,
selbst eingegebene Gesundheits-/Trainingsangaben — ein Default-Rollback darf sie nicht
destruktiv vernichten.

## 1) Empfohlen: Feature im Client deaktivieren (keine SQL nötig)

Wenn `exercise_notes` (noch) nicht existiert oder abgeschaltet werden soll, braucht es
keinen DB-Eingriff: `app.js` fängt ein fehlendes/fehlerhaftes `exercise_notes` bereits
ab (`loadNotes()` separates try/catch) und zeigt im Übungs-Kärtchen nur einen Hinweis
("Migration fehlt") statt der Notiz-UI — Sätze, Pläne und Login laufen unverändert weiter.
Um die Notiz-UI ganz auszublenden, reicht es, `schema-v4.sql` nicht auszuführen bzw. die
Tabelle (siehe unten) umzubenennen statt zu löschen.

```sql
-- Tabelle "stilllegen" ohne Datenverlust: App behandelt eine fehlende Tabelle bereits
-- wie "Migration fehlt" (42P01), ein umbenannter Name erzeugt denselben Effekt.
alter table if exists public.exercise_notes rename to exercise_notes_disabled_backup;
```

Reaktivieren: `alter table public.exercise_notes_disabled_backup rename to exercise_notes;`

## 2) Nur falls ausdrücklich eine vollständige Entfernung gewünscht ist

Destruktiv, vernichtet alle privaten Notizen aller Nutzer unwiderruflich. NICHT der
Standard-Pfad — nur nach expliziter Bestätigung durch den/die Produktverantwortliche(n)
ausführen, idealerweise erst nach einem Backup/Export:

```sql
-- ACHTUNG: destruktiv, nicht umkehrbar. Erst nach explizitem Go, nicht automatisiert.
drop table if exists public.exercise_notes;
```

## Prüfen, ob die Migration überhaupt angewendet wurde

```sql
select to_regclass('public.exercise_notes');
-- NULL  -> Migration nicht angewendet (App zeigt automatisch den "Migration fehlt"-Hinweis)
-- Name  -> Migration angewendet
```
