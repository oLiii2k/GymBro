// Trainingsplan (statisch, 1 Nutzer). `id` ist der stabile Schlüssel in der DB — nie umbenennen,
// sonst reißt die Vorbelegungs-Historie ab.
//   pair  = zwei Hanteln gleichzeitig (Anzeige "2×12", Volumen ×2)
//   sides = Wdh. gelten pro Seite/Arm (Volumen ×2)
window.GYMBRO_PLAN = {
  id: "A", title: "Training A — Oberkörper",
  exercises: [
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
      muscle: "Trizeps", flag: { kind: "up", text: "+2" } }
  ]
};

// Statische Strichzeichnungen der Endposition (kein Animations-Asset). Weitere Übungen: hier ergänzen.
window.GYMBRO_FIGURES = {
  "shoulder-press": `<g class="body"><circle cx="52" cy="26" r="8"/><path d="M52 34 V60"/><path d="M52 60 L42 86 M52 60 L62 86"/></g>
    <g><path class="fig" d="M52 46 L36 38 L36 22"/><rect class="wt" x="28" y="16" width="16" height="7" rx="3"/></g>
    <g><path class="fig" d="M52 46 L68 38 L68 22"/><rect class="wt" x="60" y="16" width="16" height="7" rx="3"/></g>`
};
