// Übungsbibliothek + fest hinterlegte Pläne A/B/C. `id` ist der stabile Schlüssel in der DB — nie umbenennen,
// sonst reißt die Vorbelegungs-Historie ab. Neue Übungen nur hier anlegen (Pläne wählen nur aus dieser Liste).
//   sets/wMin/wMax/kg = Standardvorgabe (eigene Pläne/Builtin-Pläne überschreiben sie pro Plan)
//   pair  = zwei Hanteln gleichzeitig (Anzeige "2×12", Volumen ×2)
//   sides = Wdh. gelten pro Seite/Arm (Volumen ×2)
//   unit  = "s" → Sekunden statt Wiederholungen, kein Gewicht/Volumen (z. B. Plank). Nie weglassen, nie
//           stillschweigend als "Wdh @ 0 kg" behandeln — siehe app.js vol()/Stepper (5er-Schritte).
//   explain = Deep-Link zur ausführlichen Erklärung (MODUSX-Übersicht; kein fremdes Grafik-Asset übernommen)
//   note    = NUR allgemeine, personenunabhängige Ausführungs-/Sicherheitshinweise (z. B. "bei Schulterbeschwerden …").
//             Niemals persönliche Trainingshistorie, Datum oder einen Lastreduktions-/Zielgewichtswert einer
//             Einzelperson hinterlegen — diese Datei wird unverändert an JEDES Konto ausgeliefert (siehe README Mehrbenutzer).
window.GYMBRO_LIBRARY = [
  { id: "kh-bankdruecken", name: "KH-Bankdrücken flach", sets: 3, wMin: 6, wMax: 10, kg: 17, pair: true, muscle: "Brust",
    figure: "bankdruecken", tempo: "2-1-2", tempoText: "Hoch 2 s, oben 1 s, runter 2 s. Tippen = groß.",
    hints: ["Rücken und Po bleiben auf der Bank.", "Hanteln starten auf Brusthöhe, Ellenbogen ~75°.", "Drücken bis die Arme fast gestreckt sind, nicht einrasten."],
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "kh-rudern-einarmig", name: "Einarmiges KH-Rudern", sets: 3, wMin: 6, wMax: 10, kg: 17, sides: true, muscle: "Rücken",
    figure: "rudern", tempo: "1-1-2", tempoText: "Ziehen 1 s, oben 1 s, ablassen 2 s.",
    hints: ["Knie und Hand stützen auf der Bank, Rücken flach.", "Ellenbogen am Körper entlang nach oben ziehen.", "Rumpf bleibt ruhig, kein Schwung aus der Hüfte."],
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "kh-schulterdruecken", name: "KH-Schulterdrücken sitzend", sets: 3, wMin: 8, wMax: 10, kg: 12, pair: true,
    muscle: "Schulter", flag: { kind: "hold", text: "halten" },
    tempo: "2-1-2", tempoText: "Hoch 2 s, oben 1 s, runter 2 s. Tippen = groß.",
    figure: "shoulder-press",
    hints: ["Aufrecht sitzen, Lehne im Rücken, Füße fest am Boden.",
            "Neutraler Griff, Hanteln auf Schulterhöhe starten.",
            "Drücken, ohne die Schulter hochzuziehen.",
            "Ziehen oder Einklemmen beendet den Satz — nicht die Wiederholung."],
    note: "Bei Schulterbeschwerden: Gewicht nicht steigern, bis zwei vollständige Einheiten ohne Auffälligkeit möglich waren.",
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "kh-seitheben", name: "KH-Seitheben sitzend", sets: 3, wMin: 10, wMax: 15, kg: 4, pair: true,
    muscle: "Schulter seitlich", flag: { kind: "hold", text: "halten" },
    figure: "seitheben", tempo: "2-1-2", tempoText: "Heben 2 s, oben 1 s, ablassen 2 s.",
    hints: ["Leichte Beugung im Ellenbogen, bis Schulterhöhe heben.", "Kein Schwung, keine Rumpfrotation."],
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "preacher-curl", name: "Preacher-Curl einarmig", sets: 3, wMin: 8, wMax: 10, kg: 8, sides: true, muscle: "Bizeps",
    figure: "curl", tempo: "1-1-2", tempoText: "Hoch 1 s, oben 1 s, runter 2 s.",
    hints: ["Oberarm liegt fest auf der Schrägbank.", "Volle Streckung unten, kein Abknallen."],
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "ueberkopf-trizeps", name: "Überkopf-Trizepsstrecken", sets: 3, wMin: 8, wMax: 10, kg: 12,
    muscle: "Trizeps", flag: { kind: "up", text: "+2" },
    figure: "trizeps", tempo: "2-1-2", tempoText: "Strecken 2 s, oben 1 s, beugen 2 s.",
    hints: ["Oberarme bleiben nah am Kopf, nur Unterarm bewegt sich.", "Volle Beugung, dann strecken ohne Schwung."],
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "kh-schraegbankdruecken", name: "KH-Schrägbankdrücken, niedrige Neigung", sets: 3, wMin: 6, wMax: 10, kg: 15,
    pair: true, muscle: "Brust oben", note: "Ist die Bank nicht sicher niedrig einstellbar: flaches KH-Bankdrücken.",
    figure: "schraegbank", tempo: "2-1-2", tempoText: "Hoch 2 s, oben 1 s, runter 2 s.",
    hints: ["Bank niedrig geneigt (15–30°).", "Hanteln auf Höhe der oberen Brust starten."],
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "aufstehen-bank", name: "Kontrolliertes Aufstehen zur Bank", sets: 3, wMin: 8, wMax: 12, kg: 10,
    muscle: "Beine · Knie", note: "Bei Knie-Empfindlichkeit: Last nur steigern, wenn das Knie während des Trainings <i>und</i> am Folgetag beschwerdefrei war. Nur so tief gehen, wie beide Knie ruhig bleiben.",
    figure: "aufstehen", tempo: "2-0-2", tempoText: "Hoch 2 s, kontrolliert absetzen 2 s.",
    hints: ["Höhere Sitzfläche oder Handstütze erlaubt.", "Nicht fallen lassen — kontrolliert absetzen."],
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "rdl-langhantel", name: "Rumänisches Kreuzheben (Langhantel)", sets: 3, wMin: 8, wMax: 10, kg: 47.5,
    muscle: "Hüfte · Rückseite", flag: { kind: "up", text: "+2,5" },
    figure: "rdl", tempo: "2-1-2", tempoText: "Absenken 2 s, unten 1 s, aufrichten 2 s.",
    hints: ["Knie nur leicht gebeugt, Bewegung kommt aus der Hüfte.", "Stange nah am Körper entlangführen.", "Rücken neutral, kein Rundrücken."],
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "dead-bug", name: "Dead Bug", sets: 3, wMin: 6, wMax: 10, kg: 0, sides: true,
    muscle: "Core", note: "Körpergewicht. Sauber vor schnell — Lendenwirbelsäule bleibt am Boden.",
    figure: "deadbug", tempo: "2-0-2", tempoText: "Strecken 2 s, zurück 2 s, Seite wechseln.",
    hints: ["Lendenwirbelsäule bleibt die ganze Zeit am Boden.", "Gegenüberliegender Arm und Bein strecken, dann Seite wechseln."],
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "glute-bridge", name: "Glute Bridge beidbeinig am Boden", sets: 3, wMin: 8, wMax: 12, kg: 14,
    muscle: "Gesäß", flag: { kind: "up", text: "+4" }, note: "KH gepolstert über der Hüfte.",
    figure: "bridge", tempo: "2-1-2", tempoText: "Heben 2 s, oben 1 s, ablassen 2 s.",
    hints: ["Füße hüftbreit, Fersen nah am Gesäß.", "Oben Gesäß anspannen, kein Hohlkreuz."],
    explain: "https://modusx.de/fitness-uebungen/" },
  { id: "wadenheben", name: "Wadenheben beidbeinig mit Handstütze", sets: 3, wMin: 10, wMax: 15, kg: 14,
    muscle: "Waden", flag: { kind: "up", text: "+4" }, note: "KH in der freien Hand.",
    figure: "wadenheben", tempo: "1-1-2", tempoText: "Heben 1 s, oben 1 s, ablassen 2 s.",
    hints: ["Volle Strecke: Ferse ganz unten bis ganz oben.", "Handstütze nur zum Gleichgewicht, nicht zum Abstützen von Last."],
    explain: "https://modusx.de/fitness-uebungen/" },
  // Plank: Sekunden statt Wdh., kein Gewicht. `unit:"s"` steuert Stepper (5er-Schritte) + Anzeige in app.js —
  // nicht weglassen, sonst wird daraus stillschweigend "30 Wdh @ 0 kg" (formal möglich, inhaltlich falsch).
  { id: "plank", name: "Unterarmstütz / Plank", sets: 3, wMin: 30, wMax: 40, kg: 0, unit: "s",
    muscle: "Core", note: "Stört er Ellenbogen oder Knie: Dead Bug 3 × 6–10 / Seite.",
    figure: "plank", tempo: "halten", tempoText: "Position halten, ruhig weiteratmen.",
    hints: ["Ellenbogen unter den Schultern.", "Körper bildet eine gerade Linie, kein Durchhängen im Becken.", "Bauch und Gesäß angespannt."],
    explain: "https://modusx.de/fitness-uebungen/" }
];

// Builtin-Pläne A/B/C: im Code fest (sets.plan_id = "A"/"B"/"C"), ohne Anlegen sofort startbar.
// Weitere Pläne (max. A–E) liegen in der Tabelle `plans`. Struktur identisch zu plans.exercises
// (id + optionale sets/wMin/wMax/kg-Overrides je Übung), damit app.js Builtin- und DB-Pläne gleich behandelt.
// Quelle B/C: extern bereitgestellter Trainingsplan (Stand 2026-10-03), ohne personenbezogene Angaben übernommen.
// Geteilt mit A: kh-rudern-einarmig, kh-seitheben. Geteilt B↔C: aufstehen-bank, rdl-langhantel.
window.GYMBRO_BUILTIN_PLANS = [
  { // A — Oberkörper
    name: "Oberkörper",
    exercises: ["kh-bankdruecken", "kh-rudern-einarmig", "kh-schulterdruecken", "kh-seitheben", "preacher-curl", "ueberkopf-trizeps"]
      .map((id) => ({ id })) // keine Overrides: nutzt Bibliotheks-Standard 1:1
  },
  { // B — Unterkörper + Core
    name: "Unterkörper + Core",
    exercises: [{ id: "aufstehen-bank" }, { id: "rdl-langhantel" }, { id: "plank" }, { id: "glute-bridge" }, { id: "wadenheben" }]
  },
  { // C — Ganzkörper
    name: "Ganzkörper",
    exercises: [
      { id: "kh-schraegbankdruecken" },
      { id: "kh-rudern-einarmig", sets: 3, wMin: 6, wMax: 10, kg: 16 }, // abweichend von A: 16 statt 17 kg
      { id: "aufstehen-bank" },
      { id: "rdl-langhantel" },
      { id: "kh-seitheben" },
      { id: "dead-bug" }
    ]
  }
];

// Strichzeichnungen der Endposition (eigene, schematische SVGs — kein MODUSX-Bildmaterial übernommen).
// index.html animiert sie per CSS zwischen Start-/Endpose im Tempo der Übung (siehe .stage.anim).
window.GYMBRO_FIGURES = {
  "shoulder-press": `<g class="body"><circle cx="52" cy="26" r="8"/><path d="M52 34 V60"/><path d="M52 60 L42 86 M52 60 L62 86"/></g>
    <g class="armL"><path class="fig" d="M52 46 L36 38 L36 22"/><rect class="wt" x="28" y="16" width="16" height="7" rx="3"/></g>
    <g class="armR"><path class="fig" d="M52 46 L68 38 L68 22"/><rect class="wt" x="60" y="16" width="16" height="7" rx="3"/></g>`,
  "bankdruecken": `<g class="body"><circle cx="52" cy="78" r="8"/><path d="M30 86 H82" class="floor"/><path d="M52 86 V70"/></g>
    <g class="armL"><path class="fig" d="M52 70 L34 64 L30 44"/><rect class="wt" x="22" y="38" width="16" height="7" rx="3"/></g>
    <g class="armR"><path class="fig" d="M52 70 L70 64 L74 44"/><rect class="wt" x="66" y="38" width="16" height="7" rx="3"/></g>`,
  "rudern": `<g class="body"><circle cx="30" cy="34" r="7"/><path d="M30 41 L70 70"/><path d="M70 70 L66 90 M70 70 L82 84"/></g>
    <g class="armR"><path class="fig" d="M50 56 L64 48 L78 56"/><rect class="wt" x="78" y="50" width="7" height="14" rx="3"/></g>`,
  "seitheben": `<g class="body"><circle cx="52" cy="26" r="8"/><path d="M52 34 V60"/><path d="M52 60 L42 86 M52 60 L62 86"/></g>
    <g class="armL"><path class="fig" d="M52 42 L30 46"/><rect class="wt" x="18" y="40" width="14" height="7" rx="3"/></g>
    <g class="armR"><path class="fig" d="M52 42 L74 46"/><rect class="wt" x="72" y="40" width="14" height="7" rx="3"/></g>`,
  "curl": `<g class="body"><circle cx="52" cy="30" r="8"/><path d="M52 38 V72"/><path d="M52 72 L42 90 M52 72 L62 90"/></g>
    <g class="armR"><path class="fig" d="M52 50 L68 60 L62 76"/><rect class="wt" x="54" y="72" width="16" height="7" rx="3" transform="rotate(-30 62 76)"/></g>`,
  "trizeps": `<g class="body"><circle cx="52" cy="24" r="8"/><path d="M52 32 V58"/><path d="M52 58 L42 86 M52 58 L62 86"/></g>
    <g class="armR"><path class="fig" d="M52 40 L66 28 L70 46"/><rect class="wt" x="62" y="46" width="16" height="7" rx="3" transform="rotate(70 70 50)"/></g>`,
  "schraegbank": `<g class="body"><circle cx="40" cy="70" r="8"/><path d="M20 90 L60 78" class="floor"/><path d="M40 78 V62"/></g>
    <g class="armL"><path class="fig" d="M40 62 L26 50 L24 32"/><rect class="wt" x="16" y="26" width="16" height="7" rx="3"/></g>
    <g class="armR"><path class="fig" d="M40 62 L56 52 L60 34"/><rect class="wt" x="52" y="28" width="16" height="7" rx="3"/></g>`,
  "aufstehen": `<g class="body"><circle cx="46" cy="22" r="8"/><path d="M46 30 V54"/><path d="M46 54 L36 72 L34 92 M46 54 L58 70 L60 92"/>
    <path class="fig" d="M46 38 L30 48"/><path class="fig" d="M46 38 L64 30"/></g>`,
  "rdl": `<g class="body"><circle cx="52" cy="30" r="8"/><path d="M52 38 L70 62"/><path d="M70 62 L66 84 M70 62 L82 80"/>
    <path class="fig" d="M58 46 L50 70"/><rect class="wt" x="40" y="68" width="24" height="7" rx="3"/></g>`,
  "deadbug": `<g class="body"><circle cx="30" cy="70" r="8"/><path d="M30 78 H70" class="floor"/><path d="M30 78 L52 78"/>
    <path class="fig armR" d="M52 78 L70 56"/><path class="fig legR" d="M52 78 L74 92 L86 86"/>
    <path class="fig armL" d="M30 78 L14 58"/></g>`,
  "bridge": `<g class="body"><path d="M18 86 H86" class="floor"/><path d="M26 86 L26 70 L50 58 L74 70 L74 86"/><circle cx="26" cy="62" r="8"/></g>`,
  "wadenheben": `<g class="body"><circle cx="52" cy="22" r="8"/><path d="M52 30 V58"/><path d="M52 58 L44 90 M52 58 L60 90"/></g>`,
  "plank": `<g class="body"><circle cx="24" cy="48" r="8"/><path d="M24 56 L82 70" class="floor"/><path d="M30 60 L26 78 M78 68 L82 84"/></g>`
};
