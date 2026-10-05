# GymBro — v1 Scope

Trainings-Log fürs Smartphone (Browser, kein Install). Design: Variante C (Hybrid), entschieden 2026-10-03.

## Was v1 enthält (eingefroren)
- Scan-Liste je Einheit: Name · Vorgabe · letztes Ist (grün wenn erledigt)
- Aufklappen EINER Übung: Satz-Eingabe per Stepper (− Wdh +, − kg +, ✓), Trefferfläche ≥ 46px
- Vorbelegung = letztes tatsächliches Ist (nicht die Plan-Vorgabe) — Vergleich läuft gegen die Plan-Spanne, Abweichung wird orange markiert
- Vorbelegte Werte sind Vorschläge, kein Satz zählt ohne ✓ (erst dann Übernahme ins Ist/Volumen)
- Statische Strichzeichnung der Bewegungs-Endposition + Tempo-Text (z. B. "2-1-2"), kein Animations-Asset
- Deep-Link zu MODUSX für ausführliche Erklärung (kein fremdes Grafik-Asset übernommen)
- Fußzeile: Tagesvolumen + Wochensumme
- Rechts in der Scan-Zeile: 28px reserviert für Gelenk-Flag (Platz frei, Feature kommt Post-MVP)
- Datenhaltung: Supabase (Auth + Postgres, Row Level Security), geräteübergreifend, 1 Nutzer
- Datenmodell von Anfang an: Datum + Übung + alle Sätze (keine "nur letzter Wert"-Verkürzung), sonst bricht der Vorbelegungs-Mechanismus über mehrere Einheiten

## Explizit NICHT in v1 (Post-MVP)
- Gelenk-Flag-Icon (Slot ist reserviert, Funktion nicht)
- CSS/SVG-Bewegungsanimation (Mockup hatte sie, rausgenommen für v1)
- Multi-User / Teilen / Coach-Ansicht
- Eigenes Backend (bewusst gegen eigene API entschieden — Supabase reicht für 1 Tabelle)
- Native App (Browser-first)

## v2-Scope (freigegeben nach Tag 1, Reihenfolge fest)
Status: Oliver hat nach dem ersten echten Trainingstag explizit entschieden, v2 jetzt zu starten statt auf 3 Tage zu warten — bewusste Abweichung von der ursprünglichen Regel, kein Versehen.

1. **Übersicht + Tab-Leiste** — **gebaut** (nach Beschreibung, Mockup war nicht im Repo; Mockup `v2-uebersicht.html`): "Als Nächstes"-Karte mit einem Start-Knopf, Pläne A/B/C mit "Dran"-Markierung, letzte Einheiten als Historie (orange bei abgebrochen, z. B. `14/18 Sätze`). Tab-Leiste (56px, Icon+Wort) als Wrapper um `index.html` — "Heute" ist der bestehende Screen, kein Umbau.
2. **Zusätzliche Pläne (gleichberechtigt zu A/B/C)** — **gebaut** (nach Beschreibung; Mockup `v2-plaene.html`): A–E in einer Liste, gleicher Starten-Knopf, `+ Neuer Plan` gestrichelt darunter. Anlegen-Formular: Name + Auswahl aus bestehender Übungsbibliothek (keine neuen Übungen anlegen), Zielspanne vorbelegt aus letzter Historie der Übung. Braucht neue Tabelle `plans` (Übungs-IDs + Spannen) — Übungs-ID bleibt stabiler Schlüssel, damit Progression planübergreifend eine Historie bleibt.
3. **Animationen für alle Übungen** (statt statischer Strichzeichnung) inkl. Link zur ausführlichen Erklärung — noch offen.
4. **Fortschrittsseite** — bewusst zuletzt, weil sie von echten Mehrfach-Daten lebt (Gewicht/Wdh je Übung über die Zeit, Basis = bestätigte ✓-Sätze).

Explizit nicht in diesem v2-Schnitt: freie/spontane Einheiten ohne Planvorlage, Überspringen/Ersetzen einzelner Übungen innerhalb eines Trainings (war Vorarbeit für eine Option, die Oliver nicht gewählt hat — "zusätzliche Pläne" statt "freie Einheit").
System-Regel über alle Screens: wo ein Wert aus Historie bekannt ist, wird er vorgeschlagen statt leer gestartet — gespeichert wird ein Vorschlag erst nach Bestätigung (gilt für Satz-Vorbelegung, Zielspanne im neuen Plan, "Dran"-Empfehlung). Farbcode fix: Orange = weicht von Vorgabe ab, Grün = bestätigt, Blau = anfassbare Aktion.

## Dateien
- `index.html` — Shell + Styles, lädt tokens.css, config.js, plan.js, app.js
- `tokens.css` — Farb-/Abstand-/Schrift-Tokens als Rollen (`--accent`, `--ok`, `--warn`, ...), Dark+Light
- `plan.js` — Übungsbibliothek + fest hinterlegter Plan A + Strichzeichnungen. `id` je Übung nie umbenennen
- `app.js` — Tabs (Übersicht/Heute/Pläne), Scan-Liste, Stepper, ✓ → Supabase, Vorbelegung, Pläne anlegen/löschen, Volumen, Magic-Link-Login
- `config.js` — Supabase-URL + anon-Key (nur anon, nie service_role)
- `supabase/schema.sql` — Tabelle `sets` + Row Level Security
- `supabase/schema-v2.sql` — Migration v2: Tabelle `plans`, `sets.plan_id`, Eindeutigkeit je Plan (**nach schema.sql im SQL-Editor ausführen**)

## Stand Bau
1. ~~Schema/RLS~~ — `supabase/schema.sql` liegt bereit, **muss noch im Supabase-Projekt ausgeführt werden**
2. ~~Auth~~ — Magic Link im Client; im Supabase-Dashboard unter Auth → URL Configuration die Seiten-URL als Redirect eintragen
3. ~~Daten anschließen~~ — Laden, Schreiben auf ✓, Rollback bei Fehler
4. ~~Vorbelegung + Spannenvergleich~~ — letzter Trainingstag je Übung; orange außerhalb der Plan-Spanne
5. **Offen (manuell):** Supabase-Projekt anlegen, `config.js` füllen, Seite hosten (z. B. GitHub Pages), drei echte Trainingstage auf dem Handy testen

Volumen = Wdh × kg × Multiplikator (`pair` ×2 für zwei Hanteln, `sides` ×2 für beide Seiten).
Lokal testen: `config.js` füllen, dann `npx serve .` (Magic Link braucht http(s), nicht file://).

## v2-Bau: Entscheidungen
- Plan A ist im Code fest (`sets.plan_id = 'A'`), weitere Pläne (max. A–E) liegen in `plans`; der Buchstabe ergibt sich aus der Reihenfolge.
- "Dran" = Plan nach dem zuletzt trainierten (Rotation). Einheit = Datum + Plan; "abgebrochen" (orange) = vergangene Einheit mit weniger ✓-Sätzen als geplant, heutige unvollständige zeigt "läuft".
- Vorbelegung und Plan-Vorschlag hängen an der Übungs-ID, nicht am Plan (planübergreifende Historie).
- Plan anlegen: Zielspanne/Sätze/kg aus dem letzten Ist der Übung vorgeschlagen, erst mit "Plan speichern" gespeichert. Pläne lassen sich löschen; gespeicherte Sätze bleiben.
- Offen: Punkt 3 (Animationen) und 4 (Fortschrittsseite).

## v3-Scope (Entscheidung 2026-10-03)
1. **Plan-Editor** — EIN Formular für Anlegen und Bearbeiten (nicht zwei getrennte Screens, sonst laufen sie auseinander). Angehakte Übungen wandern in einen eigenen Block "Deine Reihenfolge 1–6" mit ↑↓ pro Zeile (Pfeiltasten, kein Drag-and-drop als Hauptweg — auf dem Handy mit schwitzigen Fingern unzuverlässig); darunter die restliche Bibliothek zum Hinzufügen. Bearbeitbar: Name, Übungsauswahl, Reihenfolge, Sätze, Wdh-Spanne/Sekunden, Zielgewicht. Änderungen gelten nur für künftige Einheiten, bereits absolvierte Trainings bleiben unverändert.
2. **E-Mail + Passwort-Login** (zusätzlich zu Magic Link, gleiches Konto, keine neue Registrierung, keine Historie verloren), inkl. "Passwort vergessen". Oliver nutzt weiter seine bestehende E-Mail als Login, kein freier Benutzername.

Zurückgestellt (bewusst nicht in v3): Punkt 3 (Animationen) und 4 (Fortschrittsseite) aus v2 sind noch offen und haben Vorrang vor v3, falls Zeit knapp wird.
