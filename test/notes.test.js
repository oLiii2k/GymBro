// v4: persönliche Übungsnotizen — Browser-Interaktionstests (jsdom + Mock-Supabase, TEST-ONLY siehe
// test/mock-supabase.js). Mira-Design: drei Zustände ACTIVE (gelb)/REVIEW (blau)/RESOLVED (gemutete
// Historie, kein Delete). Trainingsabschluss beweist NICHT Symptomfreiheit — die App fragt nur EINMAL nach.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { bootApp, wait, settle, click, setVal, loginAs } = require("./harness.js");

function openPlanB(window, document) {
  window.__GYMBRO_TEST__.start("B"); // Builtin Plan B enthält rdl-langhantel + plank
}
function openExercise(document, id) {
  click(document.querySelector(`[data-ex="${id}"] .head`));
}

test("Notiz: ohne vorhandene Notiz zeigt '+ Notiz'; Anlegen speichert Text + sichtbares Startdatum", async () => {
  const { window, document } = await bootApp();
  await loginAs(window, "neu@test.invalid", "zweites-konto-2");
  openPlanB(window, document);
  await settle(window);
  openExercise(document, "plank");
  await settle(window);
  const row = document.querySelector('[data-ex="plank"]');
  const addBtn = row.querySelector("[data-add-note]");
  assert.ok(addBtn, "'+ Notiz' Button muss sichtbar sein, wenn keine aktive Notiz existiert");
  click(addBtn);
  await settle(window);
  const row2 = document.querySelector('[data-ex="plank"]');
  const ta = row2.querySelector("textarea.xnote-ta");
  assert.ok(ta, "Eingabefeld für neue Notiz muss erscheinen");
  setVal(ta, "Rückstufung wegen Schultergefühl");
  click(row2.querySelector("[data-save-note]"));
  await wait(() => document.querySelector(".xnote.active .xnote-text"));
  await settle(window);
  const savedRow = document.querySelector('[data-ex="plank"]');
  assert.equal(savedRow.querySelector(".xnote.active .xnote-text").textContent, "Rückstufung wegen Schultergefühl");
  assert.ok(/seit [\s\S]*\d{2}\.\d{2}\./.test(savedRow.querySelector(".xnote-meta").textContent), "sichtbares Startdatum ('seit TT.MM.') fehlt");
});

test("Notiz: ab >=2 Sessions SEIT der letzten Textänderung zeigt die blaue Rückfrage 'Gilt das noch?' (Behalten/Erledigt)", async () => {
  const seed = {
    "oliver@test.invalid": {
      userId: "user-oliver", password: "correct-horse-1", plans: [], sets: [
        { date: "2026-09-20", plan_id: "B", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5, done_at: "2026-09-20T10:00:00Z" },
        { date: "2026-09-27", plan_id: "B", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5, done_at: "2026-09-27T10:00:00Z" }
      ],
      notes: [{ exercise_id: "rdl-langhantel", note: "Rückstufung wegen Schultergefühl", text_updated_at: "2026-09-15T00:00:00Z", review_ack_at: null, resolved_at: null }]
    }
  };
  const { window, document } = await bootApp(seed);
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  openPlanB(window, document);
  await settle(window);
  openExercise(document, "rdl-langhantel");
  await settle(window);
  const row = document.querySelector('[data-ex="rdl-langhantel"]');
  const review = row.querySelector(".xnote.review");
  assert.ok(review, "Nach 2 Sessions seit Textänderung muss der Review-Zustand erscheinen");
  assert.equal(review.querySelector(".xnote-text").textContent, "Rückstufung wegen Schultergefühl", "Review zeigt weiterhin den VOLLEN Notiztext, nicht nur die Frage");
  assert.equal(review.querySelector(".xnote-q").textContent, "Gilt das noch?");
  assert.ok(row.querySelector("[data-keep]"), "Behalten-Button fehlt");
  assert.ok(row.querySelector("[data-done]"), "Erledigt-Button fehlt");
});

test("Notiz: unbeantwortete Rückfrage löst/deaktiviert NICHTS automatisch — Notiz bleibt wirksam/sichtbar", async () => {
  const seed = {
    "oliver@test.invalid": {
      userId: "user-oliver", password: "correct-horse-1", plans: [], sets: [
        { date: "2026-09-20", plan_id: "B", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5, done_at: "2026-09-20T10:00:00Z" },
        { date: "2026-09-27", plan_id: "B", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5, done_at: "2026-09-27T10:00:00Z" }
      ],
      notes: [{ exercise_id: "rdl-langhantel", note: "Rückstufung wegen Schultergefühl", text_updated_at: "2026-09-15T00:00:00Z", review_ack_at: null, resolved_at: null }]
    }
  };
  const { window, document } = await bootApp(seed);
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  openPlanB(window, document); await settle(window);
  openExercise(document, "rdl-langhantel"); await settle(window);
  // Weg navigieren ohne zu antworten, dann zurück — muss weiterhin als Review (nicht aufgelöst/verschwunden) da sein.
  window.__GYMBRO_TEST__.go("uebersicht"); await settle(window);
  openPlanB(window, document); await settle(window);
  openExercise(document, "rdl-langhantel"); await settle(window);
  const row = document.querySelector('[data-ex="rdl-langhantel"]');
  assert.ok(row.querySelector(".xnote.review"), "Ohne Antwort bleibt die Notiz im Review-Zustand sichtbar, wird nie automatisch aufgelöst");
  const stillInAccount = window.__TEST_SB__.__test.notesOf("oliver@test.invalid").find((n) => n.exercise_id === "rdl-langhantel");
  assert.equal(stillInAccount.resolved_at, null, "resolved_at darf ohne explizites 'Erledigt' nie gesetzt werden");
});

test("Notiz: 'Behalten' wird EINMALIG persistiert — fragt danach nicht erneut, obwohl weiter >=2 Sessions seit Änderung", async () => {
  const seed = {
    "oliver@test.invalid": {
      userId: "user-oliver", password: "correct-horse-1", plans: [], sets: [
        { date: "2026-09-20", plan_id: "B", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5, done_at: "2026-09-20T10:00:00Z" },
        { date: "2026-09-27", plan_id: "B", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5, done_at: "2026-09-27T10:00:00Z" }
      ],
      notes: [{ exercise_id: "rdl-langhantel", note: "Rückstufung wegen Schultergefühl", text_updated_at: "2026-09-15T00:00:00Z", review_ack_at: null, resolved_at: null }]
    }
  };
  const { window, document } = await bootApp(seed);
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  openPlanB(window, document); await settle(window);
  openExercise(document, "rdl-langhantel"); await settle(window);
  click(document.querySelector('[data-ex="rdl-langhantel"] [data-keep]'));
  await wait(() => document.querySelector('[data-ex="rdl-langhantel"] .xnote.active'));
  await settle(window);
  assert.ok(document.querySelector('[data-ex="rdl-langhantel"] .xnote.active'), "Nach 'Behalten' zeigt die Karte wieder den aktiven (gelben), nicht den Review-Zustand");
  // Neu laden/rendern simulieren (Tab wechseln + zurück): darf NICHT erneut fragen.
  window.__GYMBRO_TEST__.go("uebersicht"); await settle(window);
  openPlanB(window, document); await settle(window);
  openExercise(document, "rdl-langhantel"); await settle(window);
  assert.ok(!document.querySelector('[data-ex="rdl-langhantel"] .xnote.review'), "Nach einmaligem 'Behalten' darf die Rückfrage nicht erneut erscheinen");
});

test("Notiz: 'Erledigt' ist Soft-Resolve (resolved_at), verschwindet aus der aktiven Karte, bleibt gemutet in der Historie (Start-/Auflösungsdatum + Text)", async () => {
  const seed = {
    "oliver@test.invalid": {
      userId: "user-oliver", password: "correct-horse-1", plans: [], sets: [],
      notes: [{ exercise_id: "plank", note: "Rückstufung wegen Knie", text_updated_at: "2026-09-01T00:00:00Z", review_ack_at: null, resolved_at: null }]
    }
  };
  const { window, document } = await bootApp(seed);
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  openPlanB(window, document); await settle(window);
  openExercise(document, "plank"); await settle(window);
  click(document.querySelector('[data-ex="plank"] [data-done]'));
  await wait(() => !document.querySelector('[data-ex="plank"] .xnote.active') && !document.querySelector('[data-ex="plank"] .xnote.review'));
  await settle(window);
  const row = document.querySelector('[data-ex="plank"]');
  assert.ok(!row.querySelector(".xnote.active") && !row.querySelector(".xnote.review"), "Aufgelöste Notiz darf nicht mehr als aktiv/Review erscheinen");
  assert.ok(row.querySelector("[data-add-note]"), "Nach Auflösen muss wieder '+ Notiz' angeboten werden (kein aktiver Slot mehr belegt)");
  const histRow = row.querySelector(".xnote-hist .xnote-row");
  assert.ok(histRow, "Aufgelöste Notiz muss als Historien-Zeile erhalten bleiben (kein Hard-Delete)");
  assert.ok(histRow.textContent.includes("Rückstufung wegen Knie"), "Historien-Zeile muss den ursprünglichen Text zeigen");
  assert.ok(/\d{2}\.\d{2}\.[\s\S]*–[\s\S]*\d{2}\.\d{2}\./.test(histRow.querySelector(".xnote-row-dates").textContent), "Historien-Zeile muss Start- UND Auflösungsdatum zeigen");
  const stored = window.__TEST_SB__.__test.notesOf("oliver@test.invalid").find((n) => n.exercise_id === "plank");
  assert.ok(stored, "Soft-Resolve: die Zeile muss im Datenbestand ERHALTEN bleiben (kein DELETE)");
  assert.ok(stored.resolved_at, "resolved_at muss gesetzt sein");
});

test("Notiz: nach 'Erledigt' kann eine NEUE aktive Notiz zur selben Übung angelegt werden — alte bleibt unverändert in der Historie", async () => {
  const seed = {
    "oliver@test.invalid": {
      userId: "user-oliver", password: "correct-horse-1", plans: [], sets: [],
      notes: [{ exercise_id: "plank", note: "Rückstufung wegen Knie", text_updated_at: "2026-09-01T00:00:00Z", review_ack_at: null, resolved_at: null }]
    }
  };
  const { window, document } = await bootApp(seed);
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  openPlanB(window, document); await settle(window);
  openExercise(document, "plank"); await settle(window);
  click(document.querySelector('[data-ex="plank"] [data-done]'));
  await wait(() => document.querySelector('[data-ex="plank"] [data-add-note]'));
  await settle(window);
  click(document.querySelector('[data-ex="plank"] [data-add-note]'));
  await settle(window);
  setVal(document.querySelector('[data-ex="plank"] textarea.xnote-ta'), "Neuer Grund: Handgelenk");
  click(document.querySelector('[data-ex="plank"] [data-save-note]'));
  await wait(() => document.querySelector('[data-ex="plank"] .xnote.active'));
  await settle(window);
  const row = document.querySelector('[data-ex="plank"]');
  assert.equal(row.querySelector(".xnote.active .xnote-text").textContent, "Neuer Grund: Handgelenk");
  assert.ok(row.querySelector(".xnote-hist .xnote-row").textContent.includes("Rückstufung wegen Knie"), "Alte aufgelöste Notiz bleibt als Historie erhalten, trotz neuer aktiver Notiz");
  const all = window.__TEST_SB__.__test.notesOf("oliver@test.invalid").filter((n) => n.exercise_id === "plank");
  assert.equal(all.length, 2, "Es müssen zwei Zeilen existieren: alte (aufgelöst) + neue (aktiv) — kein Überschreiben");
});

test("Notiz: Privatsphäre — zwei Konten sehen nie die Notiz des jeweils anderen, auch nach Kontowechsel im selben Tab", async () => {
  const seed = {
    "oliver@test.invalid": {
      userId: "user-oliver", password: "correct-horse-1", plans: [], sets: [],
      notes: [{ exercise_id: "plank", note: "Olivers private Notiz", text_updated_at: "2026-09-01T00:00:00Z", review_ack_at: null, resolved_at: null }]
    },
    "neu@test.invalid": {
      userId: "user-neu", password: "zweites-konto-2", plans: [], sets: [],
      notes: [{ exercise_id: "plank", note: "Miras private Notiz", text_updated_at: "2026-09-01T00:00:00Z", review_ack_at: null, resolved_at: null }]
    }
  };
  const { window, document } = await bootApp(seed);
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  openPlanB(window, document); await settle(window);
  openExercise(document, "plank"); await settle(window);
  assert.ok(document.body.textContent.includes("Olivers private Notiz"));
  assert.ok(!document.body.textContent.includes("Miras private Notiz"), "Olivers Konto darf die Notiz des anderen Kontos nie sehen");

  await window.__TEST_SB__.auth.signOut();
  await wait(() => document.querySelector("#lf"));
  await settle(window);
  assert.ok(!document.body.textContent.includes("Olivers private Notiz"), "Nach Abmelden darf keine Notiz-Spur im DOM bleiben");

  await loginAs(window, "neu@test.invalid", "zweites-konto-2");
  openPlanB(window, document); await settle(window);
  openExercise(document, "plank"); await settle(window);
  assert.ok(document.body.textContent.includes("Miras private Notiz"));
  assert.ok(!document.body.textContent.includes("Olivers private Notiz"), "Nach Kontowechsel darf Olivers Notiz nicht auftauchen");
});

test("Notiz: fehlende Migration (exercise_notes existiert nicht) bricht Sätze/Pläne NICHT, zeigt stattdessen einen Hinweis", async () => {
  const seed = {
    accounts: {
      "oliver@test.invalid": {
        userId: "user-oliver", password: "correct-horse-1",
        plans: [{ name: "Kurz 30 min", exercises: [{ id: "plank", sets: 3, wMin: 30, wMax: 40, kg: 0 }] }],
        sets: []
      }
    },
    notesTableMissing: true
  };
  const { window, document } = await bootApp(seed);
  await loginAs(window, "oliver@test.invalid", "correct-horse-1"); // darf NICHT hängen/werfen
  assert.ok(document.body.textContent.includes("Kurz 30 min"), "Pläne müssen trotz fehlender Notiz-Tabelle laden");
  openPlanB(window, document); await settle(window);
  openExercise(document, "plank"); await settle(window);
  const row = document.querySelector('[data-ex="plank"]');
  assert.ok(!row.querySelector(".xnote.active") && !row.querySelector(".xnote.review"), "Ohne Migration darf keine Notiz-UI vorgaukeln, es gäbe Daten");
  assert.ok(/[Mm]igration/.test(row.textContent), "Muss die fehlende Migration klar benennen, statt stumm wegzulassen oder abzustürzen");
  const firstSetRow = row.querySelector(".setrow");
  assert.ok(firstSetRow, "Satz-Eingabe muss trotz fehlender Notiz-Tabelle normal funktionieren");
});

test("Notiz: Anlegen/Bearbeiten/Behalten/Erledigt verändern NIE die gespeicherte Satz-Historie (sets bleiben exakt gleich)", async () => {
  const seed = {
    "oliver@test.invalid": {
      userId: "user-oliver", password: "correct-horse-1", plans: [], sets: [
        { date: "2026-09-20", plan_id: "B", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5, done_at: "2026-09-20T10:00:00Z" },
        { date: "2026-09-27", plan_id: "B", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5, done_at: "2026-09-27T10:00:00Z" }
      ],
      notes: [{ exercise_id: "rdl-langhantel", note: "Rückstufung wegen Schultergefühl", text_updated_at: "2026-09-15T00:00:00Z", review_ack_at: null, resolved_at: null }]
    }
  };
  const { window, document } = await bootApp(seed);
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  const before = JSON.stringify(window.__TEST_SB__.__test.setsOf("oliver@test.invalid"));
  openPlanB(window, document); await settle(window);
  openExercise(document, "rdl-langhantel"); await settle(window);
  click(document.querySelector('[data-ex="rdl-langhantel"] [data-keep]'));
  await wait(() => document.querySelector('[data-ex="rdl-langhantel"] .xnote.active'));
  await settle(window);
  click(document.querySelector('[data-ex="rdl-langhantel"] [data-done]'));
  await wait(() => document.querySelector('[data-ex="rdl-langhantel"] [data-add-note]'));
  await settle(window);
  const after = JSON.stringify(window.__TEST_SB__.__test.setsOf("oliver@test.invalid"));
  assert.equal(after, before, "Satz-Historie darf durch Notiz-Aktionen nicht verändert werden");
});

// ---------- CSS: Trefferflächen + Token-Konsistenz (statische Prüfung des index.html <style>-Blocks) ----------
test("CSS: Notiz-Aktionsbuttons (Behalten/Erledigt) erreichen die Mindest-Trefferfläche --hit-min, gleich groß", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.match(style, /\.xnote-keep,\s*\.xnote-done\{[^}]*min-height:var\(--hit-min\)[^}]*flex:1/, "Behalten/Erledigt müssen gleich groß sein und min-height:var(--hit-min) nutzen");
});

test("CSS: Abstands-Literale im index.html <style>-Block, die exakt einem Token-Wert entsprechen, nutzen die Token statt rohem px", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const tokenPx = [4, 8, 12, 16, 24, 32]; // --s-1..--s-6, siehe tokens.css
  const declRe = /(padding|margin|margin-top|margin-bottom|margin-left|margin-right|gap|padding-left|padding-right|padding-top|padding-bottom)\s*:\s*([^;}{]+)[;}]/g;
  const offenders = [];
  let m;
  while ((m = declRe.exec(style))) {
    const value = m[2];
    const rawNums = value.match(/(?<!var\(--[\w-]*)\b\d+(?:\.\d+)?px\b/g) || [];
    rawNums.forEach((n) => { const num = parseFloat(n); if (tokenPx.includes(num)) offenders.push(`${m[1]}:${value.trim()} (${n})`); });
  }
  assert.deepEqual(offenders, [], "Diese Deklarationen nutzen einen rohen px-Wert, der exakt einem --s-*-Token entspricht, statt var(--s-*)");
});

test("CSS: legitime Trefferflächen/Illustrationsmaße (46/56/88/392) bleiben als literale px erhalten, keine Token-Erfindung", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /392px/, ".phone-Breite (392px, Mockup-Maß) darf nicht angetastet sein");
  assert.match(html, /88px/, ".stage-Illustrationsgröße (88px) darf nicht angetastet sein");
  assert.match(html, /56px/, ".tabs-Höhe (56px, Touch-Leiste) darf nicht angetastet sein");
});
