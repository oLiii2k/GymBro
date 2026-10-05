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

## v3-Umsetzung (2026-10-05) — Status: implementiert, lokal getestet, NICHT deployed

Alle zu diesem Zeitpunkt freigegebenen Punkte sind umgesetzt: Plan-Editor (Anlegen/Bearbeiten in einem
Formular), E-Mail+Passwort-Login (gleiches Konto, Magic-Link-Rückfall, Passwort-Reset), Animationen für
jede Bibliotheksübung (eigene schematische SVGs, siehe `plan.js` → `GYMBRO_FIGURES`, kein MODUSX-Bildmaterial
übernommen) und die Fortschrittsseite inkl. der unten dokumentierten Sichtbarkeitsregel.

### Dateien (neu/geändert)
- `logic.js` — reine, DOM-freie Kernlogik (Volumen, Sekunden-Handling, Fortschritt-Sessionszählung,
  Plan-Rotation, Satzvorschlag). Läuft identisch in Node (Tests) und Browser (`window.GYMBRO_LOGIC`).
- `app.js` — komplett überarbeitet: Übersicht/Heute/Pläne/Editor/Fortschritt/Login, Mehrbenutzer-Härtung.
- `plan.js` — Bibliothek um `figure`/`explain`/`hints` ergänzt, Builtin-Pläne A/B/C generalisiert (Plan B
  „Unterkörper + Core“ und Plan C „Ganzkörper“ aus Miras Vorlage ergänzt, geteilte Übungs-IDs mit Plan A).
- `index.html` — Styles für Editor, Login, Fortschritt, Tab-Leiste, Kontoanzeige, Bewegungsanimation.
- `test/` — `logic.test.js` (13 reine Logiktests), `dom.test.js` (12 Browser-Interaktionstests via jsdom
  gegen die echte `app.js`), `mock-supabase.js` + `test-config.js` (als Test-Fixture gekennzeichnet, keine
  echten Daten/Netzwerkaufrufe), `harness.js` (jsdom-Bootstrap). `npm test` → 25/25 grün.

### Plan-Editor
Ein Formular für Neu/Bearbeiten (`openEditor(id|null)`). Oben nummerierte, per ↑/↓ sortierbare Auswahl
(Trefferfläche ≥ 46 px, `--hit-min` Token), darunter die restliche Bibliothek zum Hinzufügen (Entfernen
gibt die Übung zurück in die Bibliothek). Editierbar je Übung: Sätze, Wdh-/Sekundenspanne, Gewicht —
Sekunden-Übungen (z. B. Plank) zeigen bewusst KEIN Gewichtsfeld, sondern einen expliziten Hinweis
„Körpergewicht — kein Gewichtsfeld“ (nie stillschweigend als 0 kg geführt). Bearbeiten ändert nur
künftige Einheiten; bestehende `sets`-Zeilen bleiben unverändert (siehe Test „Editor: Bearbeiten … ändert
NICHT die bereits gespeicherte Satz-Historie“).

### Login (E-Mail + Passwort, gleiches Konto)
Primäraktion ist Passwort (`signInWithPassword`), Magic Link ist umrandeter Rückfallweg, „Passwort
vergessen“ ein Textlink. Fehlermeldungen sind generisch („E-Mail oder Passwort stimmt nicht.“) — verraten
nie, welches Feld falsch war. Passwort setzen aus angemeldeter Session läuft über den
`PASSWORD_RECOVERY`-Event (`supabase.auth.onAuthStateChange`) → `updateUser({ password })`, ausgelöst durch
`resetPasswordForEmail`. Es gibt **kein** `signUp()` — nur das bestehende Konto, keine neue Registrierung,
keine Historie geht verloren. SDK-Methoden gegen die offizielle Supabase-Doku geprüft (`signInWithPassword`,
`resetPasswordForEmail`, `updateUser`, `onAuthStateChange`/`PASSWORD_RECOVERY`, `signInWithOtp` mit
`shouldCreateUser`).

### Fortschrittsseite — Sichtbarkeitsregel (vom Nutzer ausdrücklich freigegeben, verbindlich)
Zählt **distinkte Trainingstage (Sessions) je Übung**, nicht die Anzahl Sätze:
- **0 Sessions:** ehrliche „Noch keine bestätigten Sätze …“-Meldung. Kein erfundener Wert, kein Platzhalter-Chart.
- **1 Session:** die tatsächlich erfassten Istwerte dieser einen Einheit als Textzeile, plus exakt:
  „Ab der zweiten Einheit siehst du hier den Verlauf.“ (wortgleich, nicht paraphrasiert)
- **≥ 2 Sessions:** Verlaufsliste (chronologisch), ein „Chart“ im Sinn der App ist diese Textliste, kein
  separates Grafik-Widget.
Implementiert in `logic.js::sessionsFromRows()` (reine Funktion, 5 dedizierte Tests) und
`app.js::renderExProgress()`. Regressionstests für 0/1/2 Sessions: `test/logic.test.js` (Funktionsebene)
und `test/dom.test.js` → „Fortschritt: 0/1/2 Sessions …“ (echtes DOM, bestätigt alle drei Zustände inkl.
des exakten Hinweistexts).

## Mehrbenutzer (2026-10-05) — Status: implementiert & getestet (Client), Policies verifiziert, Produktionsauth PENDING

Umstieg von "1 Nutzer" auf echte, getrennte Konten. **Keine Freigabe-/Coaching-/Social-Features** — jedes
Konto sieht ausschließlich seine eigenen Pläne/Sätze/Historie. Die gemeinsamen Builtin-Vorlagen A/B/C sind
Code (siehe `plan.js`), keine personenbezogenen Daten — sie sind für jedes Konto identisch sichtbar, aber
die *Historie* dazu ist pro Konto komplett getrennt.

### Was bereits vor dieser Änderung richtig war (verifiziert, nicht neu gebaut)
`supabase/schema.sql` und `schema-v2.sql` hatten für `sets` UND `plans` von Anfang an korrekte RLS-Policies
(`using (user_id = auth.uid())` für select/update/delete, `with check (user_id = auth.uid())` für
insert/update) — das Datenmodell war technisch nie Single-User, nur die Nutzung war es. **Keine
Schema-Migration nötig**, nur durch Lesen der SQL-Dateien verifiziert (nicht gegen eine echte lokale
Postgres-Instanz; siehe „Offene Verifikation“ unten).

### Client-seitige Härtung (neu, `app.js`)
- **Zustand wird bei Abmelden UND bei Kontowechsel vollständig geleert** (`resetState()`): Pläne, Sätze,
  aktiver Plan, Editor-Formular, Fortschrittsdaten — nichts überlebt einen Accountwechsel im selben Tab.
- **Generation-Zähler (`gen`)** schützt vor noch laufenden Netzwerkantworten eines VORHERIGEN Kontos: wird
  währenddessen abgemeldet/gewechselt, wird das Ergebnis beim Zurückkommen verworfen statt ins neue Konto
  geschrieben (`load()`/`loadProgress()` prüfen `myGen !== gen`).
- **Übersicht zeigt die angemeldete E-Mail + „Abmelden“** direkt im Header (kein separater Profil-Screen
  nötig, Mira-Vorgabe). Nach Abmelden ist diese Anzeige sofort geleert.
- **Magic Link ohne Auto-Signup:** `signInWithOtp` wird mit `options.shouldCreateUser:false` aufgerufen
  (offizielle Supabase-Doku „Passwordless email logins“) — eine unbekannte E-Mail bekommt dieselbe
  generische Antwort wie eine bekannte (kein User-Enumeration-Leak) und KEIN neues Konto.
- **Kein Signup-UI** irgendwo in der App (Test prüft das explizit gegen den gerenderten Login-DOM).

### Tests (`test/mock-supabase.js`, `test/dom.test.js`)
Der Mock bildet jetzt **mehrere Konten** ab und filtert `plans`/`sets` serverseitig-analog auf das jeweils
eingeloggte Konto (`accountForSession()`) — bewusst als RLS-Simulation benannt, NICHT als Ersatz für echte
Postgres-Policy-Tests. Deterministische Zwei-Konten-Tests (alle grün, siehe „Mehrbenutzer: …“ in
`test/dom.test.js`):
1. Frisches zweites Konto sieht keinen Plan/keine Historie des ersten Kontos, aber die gemeinsamen
   Builtin-Vorlagen A/B/C bleiben sichtbar.
2. Abmelden + Anmelden als anderes Konto im selben Tab hinterlässt keine Reste des vorherigen Kontos im DOM
   oder im In-Memory-Zustand.
3. Ein `insert` (neuer Plan) landet nachweislich nur im Datensatz des anfragenden Kontos, nie beim anderen.

**Wichtig — ehrlich benannte Grenze:** Diese drei Tests beweisen die Isolation GEGEN DEN MOCK, der die
RLS-Policies *nachbildet*. Sie sind kein Beweis, dass die echten Postgres-Policies im Supabase-Projekt so
funktionieren wie gelesen — dafür wäre ein Lauf gegen eine echte/lokale Postgres-Instanz nötig (siehe
„Offene Verifikation“). Die Browser-Automatisierung für einen Live-Vertrauens-Check gegen das echte
Supabase-Projekt war in dieser Sitzung nicht verfügbar (Tool-Timeout, siehe „Blocker“ in der Zusammenfassung).

### Offene Verifikation (nicht ausgeführt, kein Produktionszugriff in dieser Sitzung)
- Echte RLS-Policy-Tests gegen eine lokale/Staging-Postgres (z. B. `supabase start` + `pgTAP` oder zwei
  echte Testnutzer + zwei anon-Clients, die gegenseitig `select`/`update` auf fremde Zeilen versuchen und
  leer/verweigert zurückbekommen müssen) — als nächster Schritt empfohlen, nicht in dieser Sitzung
  durchgeführt (kein Docker/lokaler Supabase-Stack geprüft, kein Zugriff auf das Produktionsprojekt).
- Dashboard-Policy-Export (`supabase db dump` oder SQL-Editor `select * from pg_policies`) gegen das
  tatsächliche Projekt, um schema.sql/schema-v2.sql als aktuell angewendet zu bestätigen — nicht ausgeführt.

### Production-Konfiguration: NICHT gesetzt, NICHT automatisch gesetzt (Nutzerentscheidung: nur Einladung)
`shouldCreateUser:false` ist nur die CLIENT-Bremse. Die eigentliche Absicherung gehört serverseitig ins
Supabase-Dashboard und wurde in dieser Sitzung bewusst NICHT verändert (keine Produktionsschreibzugriffe):
1. **Authentication → Providers → Email → „Allow new users to sign up“ deaktivieren.** Ohne diesen Schalter
   könnte `signInWithPassword`/ein direkter REST-Call theoretisch weiter Konten anlegen, unabhängig vom
   Client-Code — die UI-seitige Sperre reicht nicht.
2. **Konten ausschließlich serveradmin-seitig per Einladung anlegen** (Supabase Admin API
   `auth.admin.inviteUserByEmail` / Dashboard „Invite user“) — NIEMALS mit dem `service_role`-Key im
   Browser (steht nicht in `config.js`, darf dort nie stehen).
3. **Invite-Flow für Passwort-Setzen:** Der bestehende `PASSWORD_RECOVERY`-Screen (`showSetPassword()`)
   funktioniert unverändert auch für eingeladene Konten, weil Supabase Einladungs- und Recovery-Links über
   denselben `PASSWORD_RECOVERY`-Auth-Event ausliefert — kein zusätzlicher Code-Pfad nötig, aber nicht gegen
   ein echtes Invite durchgespielt (keine Produktions-E-Mails in dieser Sitzung verschickt).
Diese drei Punkte sind **dokumentiert als ausstehend**, nicht stillschweigend vorausgesetzt. Umsetzung
liegt bei der Eltern-Instanz/Deployment-Verantwortlichen, nicht bei diesem Client-Code.

### Architektur-Vorschlag (NICHT umgesetzt — braucht Entscheidung, bevor er gebaut wird)
`plan.js` enthielt bei einigen Bibliotheksübungen ein `note`-Feld mit persönlichem Trainingskontext
(Rückstufungsgrund + konkretes Gewicht bei der Schulterübung, persönlicher Zielwert + Knie-Historie bei der
Aufstehen-Übung) sowie ein Kommentar mit Namen und privatem Dateipfad einer Drittperson. Diese Notizen waren
Teil der GETEILTEN, globalen Bibliothek — jedes neue Konto hätte sie standardmäßig mitgesehen, obwohl sie
persönliche Historie einer Einzelperson waren, keine allgemeine Übungsvorgabe. **Behoben (2026-10-05, dieser
Durchgang):** Die betroffenen `note`-Felder wurden auf generische, personenunabhängige Ausführungshinweise
reduziert (z. B. „Bei Schulterbeschwerden: Gewicht nicht steigern, bis zwei vollständige Einheiten ohne
Auffälligkeit möglich waren.“ statt des konkreten Rückstufungsgewichts), der Name-/Pfad-Kommentar wurde
anonymisiert. **Keine neue Tabelle/Schema-Änderung nötig** — die Lösung ist rein redaktionell (Text in
`plan.js` geändert), keine private Notiz wurde in ein anderes, weiterhin global sichtbares Asset verschoben.
Regressionstests: `test/privacy.test.js` (prüft sowohl den rohen Quelltext als auch das geladene
`GYMBRO_LIBRARY`-Objekt auf die konkreten vorher geleakten Formulierungen, auf Datumsangaben und auf
Ich-Form/persönliche Zielwert-Muster in `note`-Feldern — damit ein künftiger Note-Text mit ähnlichem Leck
den Test wieder rot macht). Plank behält seinen bereits-generischen Alternativ-Hinweis („Stört er Ellenbogen
oder Knie: Dead Bug 3 × 6–10 / Seite.“) unverändert — das ist eine für jedes Konto gültige Ausführungsregel,
keine persönliche Historie.

Falls künftig doch EINZELNE Konten eigene, wirklich private Trainingsnotizen brauchen sollen (nicht nur
generische Hinweise für alle), bleibt der ursprüngliche Vorschlag gültig: eine neue, additive,
RLS-geschützte Tabelle `exercise_notes (user_id, exercise_id, note, updated_at)` — das ist aber ein
Feature-Wunsch für die Zukunft, keine Voraussetzung für diesen Privacy-Fix.

## v3 — Zweiter Review-Durchgang (2026-10-05, derselbe Tag): Auth-/Mehrbenutzer-Härtung + Fehlerbehandlung

Unabhängige Überprüfung des bei 56cc68d committeten Stands (NICHT identisch mit dem Audit-Text weiter oben,
der vor 56cc68d entstand und daher nicht mehr der tatsächliche Code war). Ergebnis: Auth-Screens
(Login/Magic-Link/Passwort-vergessen/Passwort-setzen über `PASSWORD_RECOVERY`), Plan-Editor-Erhalt
bestehender `sets`-Historie und die Mehrbenutzer-Zustandstrennung (`resetState()`/`gen`) waren bereits
korrekt und sind unverändert geblieben. Zwei zusätzliche Härtungen wurden ergänzt:

1. **Generation-Guard auch für Satz-Schreibantworten (`mutate()`):** `load()`/`loadProgress()` prüften schon
   vor dieser Änderung `myGen !== gen`, um veraltete Lese-Antworten nach einem Kontowechsel zu verwerfen —
   `mutate()` (der Pfad für ✓/Satz-Änderungen) tat das nicht. Eine Schreibantwort, die über einen
   Kontowechsel hinweg unterwegs war, konnte danach noch einen Rollback-Render + Fehler-Toast auslösen, der
   sich auf das NEUE (dann aktive) Konto bezog, obwohl der Fehler zum vorherigen Konto gehörte. Der
   eigentliche Schreibzugriff selbst war nie fehlerhaft auf ein falsches Konto gerichtet (serverseitig an den
   zum Aufrufzeitpunkt gültigen Auth-Token gebunden, RLS bleibt die harte Grenze) — betroffen war nur die
   client-seitige Nachbehandlung. Jetzt verwirft `mutate()` ebenfalls still, wenn sich `gen` geändert hat.
   Regressionstest: `test/dom.test.js` → „verzögerte Satz-Schreibantwort … Generation-Guard“ (nutzt ein neues
   Test-only-Gate in `mock-supabase.js`, `__test.gateWrites()`/`forceNextWriteError()`, um eine Schreibantwort
   gezielt bis nach einem Kontowechsel anzuhalten).
2. **Unbekannte/kaputte Plan-Daten crashen die App nicht mehr:** `load()` ging bisher davon aus, dass
   `plans.exercises` immer ein Array ist; eine kaputte/fremde DB-Zeile (`exercises: null` oder fehlendes
   Feld) ließ `.map()` werfen und riss den gesamten Ladevorgang (und damit Login/Übersicht) mit. Jetzt fällt
   ein fehlendes/kein-Array-`exercises`-Feld auf einen leeren Übungs-Array zurück (Plan erscheint mit „0
   Übungen“ statt die App zum Absturz zu bringen); `resolve()` ist zusätzlich gegen `null`/kaputte
   Einzeleinträge abgesichert. Bereits vorher robust: unbekannte einzelne Übungs-IDs wurden schon still
   gefiltert (jetzt mit explizitem Regressionstest). Regressionstests: `test/dom.test.js` → „Plan-Daten: …“
   (zwei Fälle: unbekannte Übungs-ID innerhalb eines sonst gültigen Plans; `exercises` komplett fehlt/kein
   Array).
3. **Fortschritt-Session-Zählung gegen Plan-Wechsel am selben Tag abgesichert (bestätigtes Verhalten, kein
   Bugfix):** Zusätzlicher Regressionstest bestätigt, dass zwei Sätze derselben Übung am selben Kalendertag,
   aber unter zwei VERSCHIEDENEN Plänen gespeichert, weiterhin als genau EINE Session zählen (nicht zwei) —
   das Schema trägt zwar `date` UND `plan_id` je Satz, aber der Session-Begriff ist bewusst planübergreifend
   nach `date` allein definiert (siehe `logic.js::sessionsFromRows()`). Ein zweiter Test bestätigt das
   Gegenstück: zwei echte Sessions an unterschiedlichen Tagen mit unterschiedlichem Plan zählen weiterhin
   korrekt als 2, der Plan-Wechsel täuscht also weder eine zusätzliche noch eine fehlende Session vor.
   (`test/logic.test.js`)

**Nicht erneut geändert (bewusst, siehe Scope):** keine neue Datenbank-Tabelle/-Migration, keine Änderung an
Auth-Konfiguration/Invite-Flow (serverseitig weiterhin PENDING, siehe oben), kein Zugriff auf eine echte
Postgres-Instanz oder das Produktions-Supabase-Projekt, kein Push.

### Live-Verifikation gegen das echte Supabase-Projekt — weiterhin NICHT ausgeführt (Blocker)
Der Browser-Automatisierungs-Pfad für einen Live-Vertrauens-Check gegen das echte Supabase-Projekt ist in
dieser Umgebung zweimal mit Timeout fehlgeschlagen. Auf ausdrückliche Vorgabe wurde dieser blockierte Weg
NICHT erneut versucht, ohne vorher Rücksprache zu halten. Eine lokal installierte Playwright-Instanz wäre für
einen reinen Fixture-Smoke-Test (gegen Mock/jsdom, kein echtes Backend) eine mögliche Alternative gewesen,
wurde in diesem Durchgang aber nicht zusätzlich eingesetzt, weil die bestehende jsdom-Testsuite (`npm test`,
34/34 grün) denselben Code bereits über echte DOM-Interaktion gegen `app.js` abdeckt. **Nicht verwechseln:**
„34/34 grün“ heißt ausschließlich „gegen den Mock, der RLS *nachbildet*, bestanden“ — es ist weiterhin KEIN
Beweis für die echten Postgres-RLS-Policies im Supabase-Projekt. Diese Grenze war schon vorher dokumentiert
(siehe „Offene Verifikation“ oben) und bleibt unverändert offen.

### Unresolved / verbleibende Blocker nach diesem Durchgang
1. Echte Postgres-RLS-Verifikation (lokale/Staging-Instanz oder zwei echte Testnutzer) — weiterhin nicht
   ausgeführt, siehe „Offene Verifikation“ oben.
2. Produktions-Auth-Konfiguration für Invite-only (Supabase-Dashboard „Allow new users to sign up“
   deaktivieren, Konten nur per Admin-Invite anlegen) — weiterhin PENDING, liegt bei der
   Eltern-Instanz/Deployment-Verantwortlichen.
3. Kein echter End-to-End-Durchlauf eines Invite-Links gegen das Produktionsprojekt (kein Produktions-Mailversand
   in dieser Sitzung).
4. Lokaler Commit in diesem Durchgang NICHT gepusht (Weisung: kein Push, keine Produktionsschreibzugriffe).
