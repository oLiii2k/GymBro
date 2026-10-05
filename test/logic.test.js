// Reine Logik-Tests (kein Browser nötig). Ausführen: node --test test/logic.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

test("mult: pair verdoppelt, sides verdoppelt, Kombination vervierfacht", () => {
  assert.equal(L.mult({}), 1);
  assert.equal(L.mult({ pair: true }), 2);
  assert.equal(L.mult({ sides: true }), 2);
  assert.equal(L.mult({ pair: true, sides: true }), 4);
});

test("vol: normale Übung = reps*kg*mult", () => {
  assert.equal(L.vol({ pair: true }, { reps: 10, kg: 12 }), 240);
});

test("vol: Sekunden-Übung (Plank) zählt NIE ins Gewichtsvolumen, auch nicht bei kg>0 aus Versehen", () => {
  assert.equal(L.vol({ unit: "s" }, { reps: 40, kg: 0 }), 0);
  assert.equal(L.vol({ unit: "s" }, { reps: 40, kg: 5 }), 0); // explizit geprüft, nicht nur zufällig 0
});

// ---- Fortschritt: 0 / 1 / 2 Sessions (vom Nutzer explizit freigegebene Regel) ----
test("sessionsFromRows: 0 Sessions -> count 0, keine erfundenen Werte", () => {
  const r = L.sessionsFromRows([], "plank");
  assert.equal(r.count, 0);
  assert.deepEqual(r.sessions, []);
});

test("sessionsFromRows: 1 Session (mehrere Sätze, ein Datum) -> count 1, exakte Istwerte abrufbar", () => {
  const rows = [
    { date: "2026-10-01", exercise: "plank", set_index: 1, reps: 30, weight: 0 },
    { date: "2026-10-01", exercise: "plank", set_index: 2, reps: 35, weight: 0 },
    { date: "2026-10-01", exercise: "plank", set_index: 3, reps: 30, weight: 0 },
    { date: "2026-10-01", exercise: "other-ex", set_index: 1, reps: 10, weight: 20 } // andere Übung zählt nicht mit
  ];
  const r = L.sessionsFromRows(rows, "plank");
  assert.equal(r.count, 1);
  assert.equal(r.sessions.length, 1);
  assert.equal(r.sessions[0].date, "2026-10-01");
  assert.deepEqual(r.sessions[0].sets.map((s) => s.reps), [30, 35, 30]);
});

test("sessionsFromRows: 2 Sessions (zwei verschiedene Tage) -> count 2, aufsteigend sortiert", () => {
  const rows = [
    { date: "2026-10-08", exercise: "plank", set_index: 1, reps: 40, weight: 0 },
    { date: "2026-10-01", exercise: "plank", set_index: 1, reps: 30, weight: 0 }
  ];
  const r = L.sessionsFromRows(rows, "plank");
  assert.equal(r.count, 2);
  assert.deepEqual(r.sessions.map((s) => s.date), ["2026-10-01", "2026-10-08"]);
});

test("sessionsFromRows: mehrere Sätze am selben Tag zaehlen als EINE Session, nicht pro Satz", () => {
  const rows = [
    { date: "2026-10-01", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5 },
    { date: "2026-10-01", exercise: "rdl-langhantel", set_index: 2, reps: 8, weight: 47.5 },
    { date: "2026-10-01", exercise: "rdl-langhantel", set_index: 3, reps: 9, weight: 47.5 }
  ];
  assert.equal(L.sessionsFromRows(rows, "rdl-langhantel").count, 1);
});

test("suggestFromLast: ohne Historie -> Bibliotheks-Standard, from=null", () => {
  const e = { sets: 3, wMin: 8, wMax: 10, kg: 47.5 };
  assert.deepEqual(L.suggestFromLast(e, null), { sets: 3, wMin: 8, wMax: 10, kg: 47.5, from: null });
});

test("suggestFromLast: mit Historie -> aus dem letzten Ist, nicht aus der Vorgabe", () => {
  const e = { sets: 3, wMin: 8, wMax: 10, kg: 47.5 };
  const last = [
    { date: "2026-10-01", reps: 9, weight: 50 },
    { date: "2026-10-01", reps: 8, weight: 50 }
  ];
  const s = L.suggestFromLast(e, last);
  assert.equal(s.sets, 2);
  assert.equal(s.wMin, 8);
  assert.equal(s.wMax, 9);
  assert.equal(s.kg, 50);
  assert.equal(s.from, "2026-10-01");
});

test("dranIndex: ohne Historie -> Plan[0]", () => {
  assert.equal(L.dranIndex(["A", "B", "C"], []), 0);
});

test("dranIndex: Rotation nach dem zuletzt trainierten Plan", () => {
  const rows = [
    { date: "2026-10-01", plan_id: "A", done_at: "2026-10-01T10:00:00Z" },
    { date: "2026-10-03", plan_id: "B", done_at: "2026-10-03T10:00:00Z" }
  ];
  assert.equal(L.dranIndex(["A", "B", "C"], rows), 2); // nach B kommt C
});

test("dranIndex: gelöschter/unbekannter Plan faellt auf Plan[0] zurueck", () => {
  const rows = [{ date: "2026-09-01", plan_id: "GELOESCHT", done_at: "2026-09-01T10:00:00Z" }];
  assert.equal(L.dranIndex(["A", "B", "C"], rows), 0);
});

test("dranIndex: keine Plaene -> -1", () => {
  assert.equal(L.dranIndex([], []), -1);
});

// ---- Session-Zählung über Pläne hinweg (schema: sets.date + sets.plan_id, Session-Begriff ist planübergreifend) ----
test("sessionsFromRows: gleicher Tag, ZWEI verschiedene Pläne (gleiche Übung) -> trotzdem genau 1 Session, nicht 2", () => {
  // Schema trägt date UND plan_id je Satz (siehe supabase/schema-v2.sql), aber die Fortschritts-Regel ist bewusst
  // planübergreifend: eine "Einheit" dieser Übung ist durch das DATUM definiert, nicht durch Datum+Plan. Würde man
  // stattdessen nach Datum+Plan gruppieren, zählte derselbe Trainingstag fälschlich als zwei separate Fortschritts-
  // Einträge, nur weil zufällig zwei Pläne am selben Tag dieselbe Übung enthielten.
  const rows = [
    { date: "2026-10-01", plan_id: "A", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5 },
    { date: "2026-10-01", plan_id: "C", exercise: "rdl-langhantel", set_index: 1, reps: 9, weight: 47.5 }
  ];
  const r = L.sessionsFromRows(rows, "rdl-langhantel");
  assert.equal(r.count, 1, "Datum+Plan sind zwei verschiedene Zeilen, aber EINE echte Trainings-Session (ein Tag)");
  assert.equal(r.sessions[0].sets.length, 2, "beide Sätze (aus beiden Plänen) müssen trotzdem in der einen Session auftauchen");
});

test("sessionsFromRows: zwei ECHTE Sessions an verschiedenen Tagen, je anderer Plan -> count 2 (Plan-Wechsel täuscht keine extra/fehlende Session vor)", () => {
  const rows = [
    { date: "2026-10-01", plan_id: "A", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5 },
    { date: "2026-10-08", plan_id: "C", exercise: "rdl-langhantel", set_index: 1, reps: 9, weight: 47.5 }
  ];
  const r = L.sessionsFromRows(rows, "rdl-langhantel");
  assert.equal(r.count, 2);
  assert.deepEqual(r.sessions.map((s) => s.date), ["2026-10-01", "2026-10-08"]);
});

// ---- v4: persönliche Übungsnotizen — Status/Zähl-Logik (reine Funktionen) ----
test("sessionsSinceDate: zählt nur Sessions NACH dem Stichtag (Textänderung der Notiz), nicht davor", () => {
  const rows = [
    { date: "2026-09-01", exercise: "kh-schulterdruecken", set_index: 1, reps: 8, weight: 10 }, // vor der Notiz-Änderung
    { date: "2026-10-01", exercise: "kh-schulterdruecken", set_index: 1, reps: 8, weight: 10 },
    { date: "2026-10-08", exercise: "kh-schulterdruecken", set_index: 1, reps: 8, weight: 10 }
  ];
  assert.equal(L.sessionsSinceDate(rows, "kh-schulterdruecken", "2026-09-15"), 2);
  assert.equal(L.sessionsSinceDate(rows, "kh-schulterdruecken", "2026-10-01"), 1, "der Stichtag selbst zählt nicht mehr mit (strikt NACH)");
});

test("sessionsSinceDate: ohne Stichtag (null) -> verhält sich wie normale Session-Zählung", () => {
  const rows = [{ date: "2026-10-01", exercise: "plank", set_index: 1, reps: 30, weight: 0 }];
  assert.equal(L.sessionsSinceDate(rows, "plank", null), 1);
});

test("noteStatus: aktive, frische Notiz (<2 Sessions seit Änderung) -> 'active'", () => {
  assert.equal(L.noteStatus({ note: "x", resolved_at: null, review_ack_at: null }, 0), "active");
  assert.equal(L.noteStatus({ note: "x", resolved_at: null, review_ack_at: null }, 1), "active");
});

test("noteStatus: >=2 Sessions seit Änderung UND noch nie bestätigt -> 'review' (einmalige Rückfrage)", () => {
  assert.equal(L.noteStatus({ note: "x", resolved_at: null, review_ack_at: null }, 2), "review");
  assert.equal(L.noteStatus({ note: "x", resolved_at: null, review_ack_at: null }, 5), "review");
});

test("noteStatus: bereits per 'Behalten' bestätigt -> bleibt 'active', fragt NICHT erneut, obwohl weiter >=2 Sessions", () => {
  assert.equal(L.noteStatus({ note: "x", resolved_at: null, review_ack_at: "2026-10-05T10:00:00Z" }, 9), "active");
});

test("noteStatus: resolved_at gesetzt -> immer 'resolved', unabhängig von Sessions/Bestätigung", () => {
  assert.equal(L.noteStatus({ note: "x", resolved_at: "2026-10-05T10:00:00Z", review_ack_at: null }, 9), "resolved");
});

test("noteTextChanged: erkennt eine inhaltliche Änderung (trim, nicht nur Whitespace) -> true, sonst false", () => {
  assert.equal(L.noteTextChanged("Rückstufung wegen Schulter", "Rückstufung wegen Schulter"), false);
  assert.equal(L.noteTextChanged("Rückstufung wegen Schulter", "  Rückstufung wegen Schulter  "), false, "nur umgebendes Leerzeichen ist KEINE inhaltliche Änderung");
  assert.equal(L.noteTextChanged("Rückstufung wegen Schulter", "Rückstufung wegen Knie"), true);
});

test("activeNoteOf: findet die eine nicht-aufgelöste Notiz je Übung, ignoriert aufgelöste und andere Übungen", () => {
  const notes = [
    { exercise_id: "plank", note: "alt, aufgelöst", resolved_at: "2026-09-01T00:00:00Z", text_updated_at: "2026-08-01T00:00:00Z" },
    { exercise_id: "plank", note: "aktuell aktiv", resolved_at: null, text_updated_at: "2026-09-10T00:00:00Z" },
    { exercise_id: "andere-uebung", note: "fremd", resolved_at: null, text_updated_at: "2026-09-10T00:00:00Z" }
  ];
  const n = L.activeNoteOf(notes, "plank");
  assert.equal(n.note, "aktuell aktiv");
});

test("activeNoteOf: keine aktive Notiz vorhanden -> null", () => {
  assert.equal(L.activeNoteOf([{ exercise_id: "plank", note: "x", resolved_at: "2026-01-01T00:00:00Z" }], "plank"), null);
  assert.equal(L.activeNoteOf([], "plank"), null);
});

test("resolvedNotesOf: liefert alle aufgelösten Notizen EINER Übung, neueste zuerst — mehrere historische Notizen je Übung bleiben erhalten", () => {
  const notes = [
    { exercise_id: "plank", note: "erste Rückstufung", resolved_at: "2026-06-01T00:00:00Z" },
    { exercise_id: "plank", note: "zweite Rückstufung", resolved_at: "2026-09-01T00:00:00Z" },
    { exercise_id: "plank", note: "aktuell aktiv", resolved_at: null },
    { exercise_id: "andere-uebung", note: "fremd, aufgelöst", resolved_at: "2026-07-01T00:00:00Z" }
  ];
  const r = L.resolvedNotesOf(notes, "plank");
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((n) => n.note), ["zweite Rückstufung", "erste Rückstufung"]);
});
