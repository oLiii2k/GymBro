// GymBro — reine Logik-Funktionen, DOM-frei. Zweck: in Node (Tests) UND im Browser (app.js) nutzbar,
// ohne Build-Schritt. Browser: window.GYMBRO_LOGIC. Node: require("./logic.js").
(function (root) {
  "use strict";

  // Volumen-Multiplikator: pair = zwei Hanteln gleichzeitig, sides = Wdh. pro Seite/Arm.
  function mult(e) { return (e.pair ? 2 : 1) * (e.sides ? 2 : 1); }

  // Volumen eines Satzes. Sekunden-Übungen (z. B. Plank) zählen NIE ins Gewichtsvolumen — das ist
  // Absicht (Zeit statt Last), nicht eine zufällige Null. Deshalb expliziter unit-Check statt nur kg*reps.
  function vol(e, s) {
    if (e.unit === "s") return 0;
    return s.reps * s.kg * mult(e);
  }

  // Fortschritt je Übung: zählt DISTINKTE Trainingstage (Sessions), nicht Sätze. Nur bestätigte (✓) Sätze
  // existieren überhaupt in der DB (siehe schema.sql) — "Session" = ein Datum, an dem mindestens ein Satz
  // dieser Übung gespeichert wurde, unabhängig vom Plan (planübergreifende Historie).
  // rows: [{date, exercise, set_index, reps, weight}], aufsteigend oder beliebig sortiert.
  function sessionsFromRows(rows, exerciseId) {
    const byDate = {};
    rows.filter((r) => r.exercise === exerciseId).forEach((r) => {
      (byDate[r.date] = byDate[r.date] || []).push(r);
    });
    const dates = Object.keys(byDate).sort(); // aufsteigend: älteste zuerst
    return {
      count: dates.length,
      sessions: dates.map((d) => ({
        date: d,
        sets: byDate[d].slice().sort((a, b) => a.set_index - b.set_index)
      }))
    };
  }

  // Vorschlag für eine neue/zu bearbeitende Plan-Zeile aus dem letzten Ist der Übung (planübergreifend).
  // Ohne Historie: Bibliotheks-Standard. `last` = Sätze des letzten Trainingstags dieser Übung (ein Array).
  function suggestFromLast(e, last) {
    if (!last || !last.length) return { sets: e.sets, wMin: e.wMin, wMax: e.wMax, kg: e.kg, from: null };
    const reps = last.map((x) => x.reps);
    return { sets: last.length, wMin: Math.min(...reps), wMax: Math.max(...reps), kg: +last[0].weight, from: last[0].date };
  }

  // "Dran" = der Plan nach dem zuletzt trainierten (Rotation über ALLE Pläne, gleichberechtigt).
  // rows: Sätze mit {date, plan_id, done_at}; planIds: Reihenfolge der Pläne (Labels A..E).
  // Gelöschter/unbekannter zuletzt trainierter Plan (planIds.indexOf === -1) fällt auf Plan[0] zurück.
  function dranIndex(planIds, rows) {
    if (!planIds.length) return -1;
    if (!rows.length) return 0;
    const m = rows.reduce((a, b) => (b.date > a.date || (b.date === a.date && b.done_at > a.done_at) ? b : a));
    const i = planIds.indexOf(m.plan_id);
    return (i + 1) % planIds.length; // i === -1 → 0
  }

  const api = { mult, vol, sessionsFromRows, suggestFromLast, dranIndex };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GYMBRO_LOGIC = api;
})(typeof window !== "undefined" ? window : globalThis);
