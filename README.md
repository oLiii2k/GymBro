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

## Dateien
- `index.html` — Shell + Styles, lädt tokens.css, config.js, plan.js, app.js
- `tokens.css` — Farb-/Abstand-/Schrift-Tokens als Rollen (`--accent`, `--ok`, `--warn`, ...), Dark+Light
- `plan.js` — Trainingsplan (Übungen, Spannen, Hinweise, Strichzeichnung). `id` je Übung nie umbenennen
- `app.js` — Scan-Liste, Stepper, ✓ → Supabase, Vorbelegung, Tages-/Wochenvolumen, Magic-Link-Login
- `config.js` — Supabase-URL + anon-Key (nur anon, nie service_role)
- `supabase/schema.sql` — Tabelle `sets` + Row Level Security

## Stand Bau
1. ~~Schema/RLS~~ — `supabase/schema.sql` liegt bereit, **muss noch im Supabase-Projekt ausgeführt werden**
2. ~~Auth~~ — Magic Link im Client; im Supabase-Dashboard unter Auth → URL Configuration die Seiten-URL als Redirect eintragen
3. ~~Daten anschließen~~ — Laden, Schreiben auf ✓, Rollback bei Fehler
4. ~~Vorbelegung + Spannenvergleich~~ — letzter Trainingstag je Übung; orange außerhalb der Plan-Spanne
5. **Offen (manuell):** Supabase-Projekt anlegen, `config.js` füllen, Seite hosten (z. B. GitHub Pages), drei echte Trainingstage auf dem Handy testen

Volumen = Wdh × kg × Multiplikator (`pair` ×2 für zwei Hanteln, `sides` ×2 für beide Seiten).
Lokal testen: `config.js` füllen, dann `npx serve .` (Magic Link braucht http(s), nicht file://).
