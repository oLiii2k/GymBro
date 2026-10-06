---
version: alpha
name: GymBro
description: Trainingslog fürs Smartphone — bedienbar mit einer Hand, schwitzig, zwischen zwei Sätzen.
colors:
  primary: "#5B9BFF"
  secondary: "#94A3B0"
  tertiary: "#35C26E"
  neutral: "#0F1419"
  surface: "#171C22"
  surface-2: "#1E242B"
  fg: "#E8EDF2"
  line: "#2A323B"
  line-strong: "#38424D"
  warn: "#E6A552"
  on-primary: "#06121F"
  on-tertiary: "#06240F"
typography:
  h1:
    fontFamily: system-ui
    fontSize: 19px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  item:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: 650
    lineHeight: 1.25
  num:
    fontFamily: system-ui
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.2
  body-md:
    fontFamily: system-ui
    fontSize: 14.5px
    fontWeight: 400
    lineHeight: 1.45
  meta:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: system-ui
    fontSize: 11.5px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: 10px
  md: 14px
  lg: 24px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: 50px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    height: 46px
  stepper-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.sm}"
    height: 46px
  stepper-field-deviating:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.warn}"
    rounded: "{rounded.sm}"
    height: 46px
  set-confirm:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    size: 46px
  row-exercise:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    height: 52px
  tabbar-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    height: 56px
  tabbar-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    height: 56px
  note-active:
    backgroundColor: "#2E2314"
    textColor: "{colors.warn}"
    rounded: "{rounded.sm}"
    padding: 12px
  note-review:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 12px
---

## Overview

GymBro wird im Stehen benutzt, mit einer Hand, zwischen zwei Sätzen, oft mit
feuchten Fingern. Daraus folgt alles Weitere: große Trefferflächen, wenige
Zahlen, keine Tastatur, kein Dialog, der den Weg versperrt.

**Zweck schlägt Schönheit.** Ein Screen ist gut, wenn der nächste Satz in unter
zwei Sekunden eingetragen ist — nicht, wenn er interessant aussieht.

Die normativen Werte stehen in `tokens.css` als CSS-Custom-Properties. Diese
Datei erklärt, warum sie so sind und wie sie anzuwenden sind. **Bei Widerspruch
gewinnt `tokens.css`.** Niemals Hexwerte oder freie Pixelzahlen in Markup oder
JavaScript schreiben — ausschließlich `var(--token)`.

## Colors

Farbe ist hier Information, nicht Dekoration. Drei Rollen, drei Bedeutungen,
keine Ausnahmen:

- **Primary `#5B9BFF` (`--accent`)** — ausschließlich das, was man anfassen
  soll: Primäraktion, aktiver Tab, Fokusring, offene Rückfrage. Nie als
  Dekoration, nie als Textauszeichnung.
- **Tertiary `#35C26E` (`--ok`)** — bestätigt. Ein Satz mit ✓, eine erledigte
  Übung, ein Wert innerhalb der Plan-Spanne. Grün heißt nie „schön“, es heißt
  „gespeichert“.
- **Warn `#E6A552` (`--warn`)** — weicht von der Vorgabe ab. **Nie „Fehler“.**
  Ein Satz außerhalb der Spanne, eine abgebrochene Einheit, eine aktive
  Rückstufungs-Notiz. Die App bewertet nicht, sie markiert.
- **Secondary `#94A3B0` (`--fg-muted`)** — Vorgaben, Einheiten, Label,
  archivierte Inhalte.
- `--line` trennt, `--line-strong` umrandet alles, was man treffen muss.

Light-Theme ist vollwertig (Sonne aufs Display im Garten/Gym), nicht
nachrangig. Beide Themes sind in `tokens.css` definiert; jede Textfarbe liegt
über 4,5:1 auf ihrer Fläche.

## Typography

Fünf Grade, kein sechster: `h1` (Einheitstitel), `item` (Übungsname), `num`
(Lastwerte, immer `font-variant-numeric: tabular-nums`), `body-md`
(Ausführungshinweise), `meta` (Vorgabe, Datum) plus `label` für
Versalien-Überschriften.

Systemschrift, bewusst keine Webfont-Ladezeit für eine App, die offline im
Keller aufgeht. Zahlen immer tabellarisch, damit Werte untereinander
vergleichbar bleiben.

**Lastnotation:** Kurzhanteln immer als `2×12 kg` (Gesamt und pro Hantel
ablesbar), Langhantel als Gesamtgewicht. Keine Ausnahmeregel pro Screen.

## Layout

Abstände sind eine Skala mit **sechs** Werten: 4 · 8 · 12 · 16 · 24 · 32.
Es gibt keinen siebten. Wer `20px` oder `34px` schreibt, hat eine Entscheidung
umgangen, die schon getroffen ist.

Legitime Ausnahmen sind nur physische Maße: Trefferflächen (46, 50, 56),
Zeichnungsgröße (88, 104), Gerätebreite (392), reservierte Slots (28).

| Maß | Wert | Gilt für |
|---|---|---|
| `--hit-min` | 46px | alles, was im Training angefasst wird: Stepper, ✓, Auswahl |
| `--hit-row` | 52px | Listenzeile |
| `--hit-gap` | 8px | Mindestabstand zweier Ziele |
| `--slot-flag` | 28px | reservierter Platz rechts in der Scan-Zeile (Gelenk-Flag) |
| Tab-Leiste | 56px | drei Slots: Heute · Übersicht · Fortschritt |

Die Tab-Leiste ist ein Rahmen um den Inhalt, kein Umbau des Inhalts.

## Elevation & Depth

Im Dark-Theme trennt **Fläche**, nicht Schatten (`--shadow: none`): `--bg` →
`--surface` → `--surface-2`. Im Light-Theme ein einziger weicher Schatten für
Karten. Keine weiteren Ebenen erfinden.

## Shapes

`sm 10px` für Felder, Buttons, Chips · `md 14px` für Karten · `lg 24px` für den
App-Rahmen. Radius transportiert keine Bedeutung, er ist reine Konsistenz.

## Components

- **`button-primary`** — pro Screen existiert **genau eine** Primäraktion.
  Zwei gefüllte Knöpfe nebeneinander sind zwei Entscheidungen, die niemand
  treffen will. Rückfallwege sind umrandet (`button-secondary`), seltene Wege
  sind Textlinks.
- **`stepper-field`** — die zentrale Eingabe. `− Wert Einheit +`, nie ein
  Textfeld: **im Training tippt niemand.** Gewicht springt in 2er-Schritten,
  Wiederholungen in 1er, Zeitübungen (Plank) in 5er-Sekundenschritten.
- **`stepper-field-deviating`** — derselbe Stepper, oranger Rahmen und Wert,
  sobald der Wert außerhalb der Plan-Spanne liegt. Markierung, keine Sperre.
- **`set-confirm`** — das ✓. Der **einzige** Mechanismus, der einen Satz ins
  Ist, ins Volumen und in die Datenbank übernimmt.
- **`row-exercise`** — Scan-Zeile: Name · Vorgabe · Last rechts; erledigt zeigt
  das Ist-Ergebnis in Grün statt der Vorgabe. Immer nur **eine** Zeile offen.
- **`note-active` / `note-review`** — persönliche Übungsnotiz. Aktiv gelb mit
  Datum („seit 30.09.“); zur Prüfung erscheint die blaue Frage *unter* der
  weiterhin sichtbaren Warnung mit zwei **gleich großen** Knöpfen
  *Behalten* / *Erledigt*; erledigt wandert sie als graue Zeile in den
  Übungsverlauf, sie wird nicht gelöscht.

## Do's and Don'ts

**Do**

- **Vorschlagen statt leer lassen.** Wo die App einen Wert kennt, setzt sie ihn
  ein: Satz-Vorbelegung = letztes tatsächliches Ist, Zielspanne im neuen Plan =
  letzte Spanne der Übung, „Dran“ = nächster Plan der Rotation.
- **Vorschlag ≠ Ergebnis.** Gespeichert wird ausschließlich, was bestätigt
  wurde. „Synchronisiert“ erst nach erfolgreicher Antwort des Servers.
- **Gemessen wird gegen den Plan.** Die Vorbelegung kommt aus der Historie, die
  orange Markierung vergleicht mit der Plan-Spanne — sonst kaschiert die App
  genau den Einbruch, den sie sichtbar machen soll. Die Spanne steht sichtbar
  in der Abschnittsüberschrift.
- **Pfeiltasten vor Ziehen.** Reihenfolge ändern geht über ↑↓ pro Zeile. Drag
  and drop darf dazukommen, aber nie der einzige Weg sein: langes Drücken plus
  zielgenaues Schieben ist auf dem Handy der unzuverlässigste Weg — und genau
  dann in Benutzung, wenn die Hände feucht sind.
- **Ein Formular für Anlegen und Bearbeiten.** Unterschied sind nur Titel,
  Vorbelegung und das Löschen am Ende. Zwei getrennte Formulare laufen über die
  Zeit garantiert auseinander.
- **Kontokennung sichtbar**, sobald mehrere Konten möglich sind: E-Mail im Kopf
  der Übersicht mit „Abmelden“ dahinter.
- **Fokus-Zustand** für jedes bedienbare Element: 2px `--accent`, Offset 2px.
  Eine Regel, global, nicht pro Komponente.

**Don't**

- **Keine Hexwerte, keine freien Pixel** in Markup oder JS. Nur Tokens.
- **Keine Rückfrage beim Abweichen von der Empfehlung.** „Bist du sicher, A ist
  dran?“ erzieht dazu, die Empfehlung zu umgehen.
- **Keine Kurve mit einem Punkt.** Unter zwei Einheiten pro Übung zeigt die
  Fortschrittsseite den vorhandenen Wert als Zeile plus „Ab der zweiten Einheit
  siehst du hier den Verlauf.“
- **Kein Vollbild-Pausentimer.** Der Timer ist eine Zeile unter dem bestätigten
  Satz; in der Pause will man die nächste Vorgabe sehen, nicht eine Uhr, die
  sie verdeckt.
- **Keine Auskunft im Login-Fehler**, welches von beidem falsch war.
- **Keine fremden Grafik-Assets** aus Übungsdatenbanken einbetten: eigene
  Strichzeichnung der Endposition plus Deep-Link zur ausführlichen Erklärung.
- **Nichts verschwinden lassen, was passiert ist.** Übersprungene Übungen
  bleiben ausgegraut stehen, abgebrochene Einheiten bleiben im Verlauf,
  erledigte Notizen werden archiviert.
