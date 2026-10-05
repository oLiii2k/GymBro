// Regressionstest: plan.js ist die GLOBAL GETEILTE Übungsbibliothek — wird unverändert an JEDES Konto
// (auch brandneue Einladungen) ausgeliefert. Sie darf NIE persönliche Trainingshistorie/Gesundheitsnotizen
// einer Einzelperson enthalten (konkrete Rückstufungsgewichte, Datumsangaben, Namen Dritter, private
// Dateipfade) — nur allgemeine, personenunabhängige Ausführungs-/Sicherheitshinweise.
// Prüft den ROHEN Quelltext (nicht nur das geparste Objekt), weil auch Code-Kommentare Teil der Datei sind,
// die jeder Client per HTTP lädt (Kommentare werden nicht serverseitig entfernt).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SRC = fs.readFileSync(path.join(__dirname, "..", "plan.js"), "utf8");

test("plan.js (Quelltext): keine personenbezogenen Gesundheits-/Rückstufungs-Notizen mehr (Regression des v3-Leaks)", () => {
  // Die konkreten Formulierungen, die vor dem Fix in der globalen Bibliothek standen (persönliche Historie
  // mit Datum/Gewicht/Rückstufungsgrund). Dürfen nach dem Fix nirgendwo mehr auftauchen.
  const forbidden = [
    "Rückstufung",        // persönliche Lastreduktion-Historie (Schulter)
    "Schultergefühl",     // persönliches Symptom-Tagebuch
    "Ziel 3×12 bei 10 kg" // persönlicher Zielwert, der wie eine allgemeine Vorgabe aussah, aber Olivers war
  ];
  forbidden.forEach((needle) => {
    assert.ok(!SRC.includes(needle), `plan.js darf "${needle}" nicht mehr enthalten (personenbezogene Historie)`);
  });
});

test("plan.js (Quelltext): keine privaten Dateipfade/Namen Dritter in Kommentaren (auch Kommentare sind Teil der ausgelieferten Datei)", () => {
  assert.ok(!/wiki\/privat|health\/Trainingsplan/i.test(SRC), "Kein Verweis auf private Wiki-/Gesundheits-Dateipfade in plan.js");
  assert.ok(!/\bMira\b/.test(SRC), "Kein Name einer realen Person in der global ausgelieferten plan.js");
});

test("plan.js (Quelltext): keine Datumsangaben in note-Feldern (Datum deutet auf persönliches Trainingstagebuch statt generischer Regel hin)", () => {
  const noteMatches = [...SRC.matchAll(/note:\s*"([^"]*)"/g)].map((m) => m[1]);
  assert.ok(noteMatches.length > 0, "Test-Voraussetzung: es muss weiterhin note-Felder geben (sonst testet dieser Test nichts)");
  noteMatches.forEach((note) => {
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(note), `note-Feld enthält ein Datum, sieht nach persönlichem Tagebucheintrag aus: "${note}"`);
  });
});

test("plan.js (geladen, GYMBRO_LIBRARY): verbleibende note-Felder enthalten keine persönliche Historie (kein Datum, keine individuellen Rückstufungs-/Zielwerte, keine Ich-Form)", () => {
  // Lädt die echte Datei wie der Browser (kein separates Abschreiben der Liste, damit der Test nicht an der
  // Implementierung vorbeiprüft).
  const vm = require("node:vm");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  const lib = sandbox.window.GYMBRO_LIBRARY;
  assert.ok(Array.isArray(lib) && lib.length > 0);
  const withNotes = lib.filter((e) => e.note);
  assert.ok(withNotes.length > 0, "Test-Voraussetzung: es muss weiterhin Übungen mit note geben");
  withNotes.forEach((e) => {
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(e.note), `Übung "${e.id}": note darf kein Datum enthalten`);
    assert.ok(!/Rückstufung|Schultergefühl|wegen (meiner|meines)|\bich\b|\bmein(e|er|em|en)?\b/i.test(e.note),
      `Übung "${e.id}": note liest sich wie eine persönliche Historie/Ich-Aussage statt einer allgemeinen Regel: "${e.note}"`);
    // "Ziel 3×12 bei 10 kg" o.ä. feste Zielwert-Zahlenkombination mit "bei X kg" deutet auf einen EINZELNEN
    // persönlichen Zielwert hin statt auf eine für alle Konten gültige, bedingte Regel.
    assert.ok(!/Ziel\s*\d+\s*×\s*\d+\s*bei\s*\d+/i.test(e.note), `Übung "${e.id}": note enthält einen fest hinterlegten persönlichen Zielwert: "${e.note}"`);
  });
});
