// Übungsbibliothek + fest hinterlegter Plan A. `id` ist der stabile Schlüssel in der DB — nie umbenennen,
// sonst reißt die Vorbelegungs-Historie ab. Neue Übungen nur hier anlegen (Pläne wählen nur aus dieser Liste).
//   sets/wMin/wMax/kg = Standardvorgabe (Plan A nutzt sie 1:1, eigene Pläne überschreiben sie)
//   pair  = zwei Hanteln gleichzeitig (Anzeige "2×12", Volumen ×2)
//   sides = Wdh. gelten pro Seite/Arm (Volumen ×2)
window.GYMBRO_LIBRARY = [
  { id: "kh-bankdruecken", name: "KH-Bankdrücken flach", sets: 3, wMin: 6, wMax: 10, kg: 17, pair: true, muscle: "Brust" },
  { id: "kh-rudern-einarmig", name: "Einarmiges KH-Rudern", sets: 3, wMin: 6, wMax: 10, kg: 17, sides: true, muscle: "Rücken" },
  { id: "kh-schulterdruecken", name: "KH-Schulterdrücken sitzend", sets: 3, wMin: 8, wMax: 10, kg: 12, pair: true,
    muscle: "Schulter", flag: { kind: "hold", text: "halten" },
    tempo: "2-1-2", tempoText: "Hoch 2 s, oben 1 s, runter 2 s. Tippen = groß.",
    figure: "shoulder-press",
    hints: ["Aufrecht sitzen, Lehne im Rücken, Füße fest am Boden.",
            "Neutraler Griff, Hanteln auf Schulterhöhe starten.",
            "Drücken, ohne die Schulter hochzuziehen.",
            "Ziehen oder Einklemmen beendet den Satz — nicht die Wiederholung."],
    note: "<b>Nicht steigern.</b> Rückstufung von 2×14 kg wegen Schultergefühl. Erst nach zwei vollständigen Einheiten ohne Auffälligkeit wieder hoch." },
  { id: "kh-seitheben", name: "KH-Seitheben sitzend", sets: 3, wMin: 10, wMax: 15, kg: 4, pair: true,
    muscle: "Schulter seitlich", flag: { kind: "hold", text: "halten" } },
  { id: "preacher-curl", name: "Preacher-Curl einarmig", sets: 3, wMin: 8, wMax: 10, kg: 8, sides: true, muscle: "Bizeps" },
  { id: "ueberkopf-trizeps", name: "Überkopf-Trizepsstrecken", sets: 3, wMin: 8, wMax: 10, kg: 12,
    muscle: "Trizeps", flag: { kind: "up", text: "+2" } },
  { id: "kh-schraegbankdruecken", name: "KH-Schrägbankdrücken, niedrige Neigung", sets: 3, wMin: 6, wMax: 10, kg: 15,
    pair: true, muscle: "Brust oben", note: "Ist die Bank nicht sicher niedrig einstellbar: flaches KH-Bankdrücken." },
  { id: "aufstehen-bank", name: "Kontrolliertes Aufstehen zur Bank", sets: 3, wMin: 8, wMax: 12, kg: 10,
    muscle: "Beine · Knie", note: "<b>Ziel 3×12 bei 10 kg</b>, Last steigt nur, wenn das Knie im Training <i>und</i> am Folgetag ruhig war. Nur so tief, wie beide Knie ruhig bleiben." },
  { id: "rdl-langhantel", name: "Rumänisches Kreuzheben (Langhantel)", sets: 3, wMin: 8, wMax: 10, kg: 47.5,
    muscle: "Hüfte · Rückseite", flag: { kind: "up", text: "+2,5" } },
  { id: "dead-bug", name: "Dead Bug", sets: 3, wMin: 6, wMax: 10, kg: 0, sides: true,
    muscle: "Core", note: "Körpergewicht. Sauber vor schnell — Lendenwirbelsäule bleibt am Boden." },
  { id: "glute-bridge", name: "Glute Bridge beidbeinig am Boden", sets: 3, wMin: 8, wMax: 12, kg: 14,
    muscle: "Gesäß", flag: { kind: "up", text: "+4" }, note: "KH gepolstert über der Hüfte." },
  { id: "wadenheben", name: "Wadenheben beidbeinig mit Handstütze", sets: 3, wMin: 10, wMax: 15, kg: 14,
    muscle: "Waden", flag: { kind: "up", text: "+4" }, note: "KH in der freien Hand." }
  // "plank" (Unterarmstütz) bewusst NICHT hier: wird in Sekunden gemessen, nicht Wdh. Braucht
  // erst ein `unit:"s"`-Feld in app.js (Stepper + Volumen), siehe README v2-Scope. Bis dahin
  // fehlt Plank in Plan B — besser fehlend als falsch als "30 Wdh @ 0 kg".
];

// Plan A: im Code fest (id "A" in sets.plan_id). Weitere Pläne liegen in der Tabelle `plans`.
window.GYMBRO_PLAN_A = {
  name: "Oberkörper",
  ids: ["kh-bankdruecken", "kh-rudern-einarmig", "kh-schulterdruecken", "kh-seitheben", "preacher-curl", "ueberkopf-trizeps"]
};

// Statische Strichzeichnungen der Endposition (kein Animations-Asset). Weitere Übungen: hier ergänzen.
window.GYMBRO_FIGURES = {
  "shoulder-press": `<g class="body"><circle cx="52" cy="26" r="8"/><path d="M52 34 V60"/><path d="M52 60 L42 86 M52 60 L62 86"/></g>
    <g><path class="fig" d="M52 46 L36 38 L36 22"/><rect class="wt" x="28" y="16" width="16" height="7" rx="3"/></g>
    <g><path class="fig" d="M52 46 L68 38 L68 22"/><rect class="wt" x="60" y="16" width="16" height="7" rx="3"/></g>`
};
