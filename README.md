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
- `index.html` — v1-Mockup/Grundgerüst (statisch, lädt tokens.css)
- `tokens.css` — Farb-/Abstand-/Schrift-Tokens als Rollen (`--accent`, `--ok`, `--warn`, ...), Dark+Light

## Nächste Schritte (Bau, nicht Design)
1. Supabase-Projekt anlegen, Tabelle `sets` (date, exercise, set_index, reps, weight, done_at), RLS aktivieren
2. Auth (Magic Link oder simples Email/Passwort) einbauen, kein Service-Key im Client
3. `index.html` an echte Daten anschließen: Scan-Liste aus Supabase laden, Stepper schreiben auf ✓
4. Vorbelegung aus letztem Datensatz pro Übung ziehen, Spannenvergleich + Orange-Markierung verdrahten
5. Auf dem eigenen Handy im Browser testen — drei echte Trainingstage, bevor irgendwas Neues reinkommt
