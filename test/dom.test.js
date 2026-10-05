// Browser-Interaktionstests gegen die ECHTE app.js (nicht nur Funktionsaufrufe) via jsdom + Mock-Supabase.
// TEST-ONLY: siehe test/mock-supabase.js, test/test-config.js — keine echten Daten, kein echtes Netzwerk.
const test = require("node:test");
const assert = require("node:assert/strict");
const { bootApp, wait, settle, click, setVal, submit, loginAs } = require("./harness.js");

test("Login: Passwort ist Primäraktion; Magic-Link-Rückfall + Passwort-vergessen vorhanden; KEIN Signup-UI", async () => {
  const { document } = await bootApp();
  assert.ok(document.querySelector("#lf"), "Login-Formular fehlt");
  assert.ok(document.querySelector(".primary[type=submit]"), "Primärer Anmelden-Button fehlt");
  assert.ok(document.querySelector(".ghost#magic"), "Magic-Link-Rückfallbutton fehlt");
  assert.ok(document.querySelector("#forgot"), "'Passwort vergessen' fehlt");
  const bodyText = document.body.textContent;
  assert.ok(!/registrieren|sign ?up|konto erstellen/i.test(bodyText), "Es darf keine Registrierungs-/Signup-UI geben (invite-only)");
});

test("Login: falsches Passwort zeigt GENERISCHEN Fehler (verrät nicht, welches Feld falsch war)", async () => {
  const { document } = await bootApp();
  setVal(document.querySelector("#em"), "oliver@test.invalid");
  setVal(document.querySelector("#pw"), "falsches-passwort");
  submit(document.querySelector("#lf"));
  await wait(() => document.querySelector(".err"));
  assert.equal(document.querySelector(".err").textContent, "E-Mail oder Passwort stimmt nicht.");
});

test("Magic Link: unbekannte E-Mail -> shouldCreateUser:false tatsächlich gesendet, generische Antwort (kein Enumeration-Leak)", async () => {
  const { document, window } = await bootApp();
  click(document.querySelector("#magic"));
  setVal(document.querySelector("#em"), "unbekannt@nirgendwo.invalid");
  submit(document.querySelector("#lf"));
  await wait(() => document.body.textContent.includes("Falls ein Konto"));
  const calls = window.__TEST_SB__.__test.otpCalls;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].email, "unbekannt@nirgendwo.invalid");
  assert.equal(calls[0].shouldCreateUser, false, "App muss shouldCreateUser:false senden — sonst legt Supabase bei unbekannter E-Mail automatisch ein Konto an");
});

test("Magic Link: bekannte E-Mail bekommt dieselbe generische Antwort (kein Unterschied sichtbar)", async () => {
  const { document } = await bootApp();
  click(document.querySelector("#magic"));
  setVal(document.querySelector("#em"), "oliver@test.invalid");
  submit(document.querySelector("#lf"));
  await wait(() => document.body.textContent.includes("Falls ein Konto"));
  const infoLine = [...document.querySelectorAll(".hintline")].find((e) => e.textContent.includes("Falls ein Konto"));
  assert.equal(infoLine.textContent, "Falls ein Konto zu dieser E-Mail existiert, ist der Link unterwegs.");
});

test("Login erfolgreich -> Übersicht zeigt Konto-E-Mail + Abmelden; A/B/C sofort startbar ohne Anlegen", async () => {
  const { window, document } = await bootApp();
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  const acct = document.querySelector(".acct");
  assert.ok(acct && acct.textContent.includes("oliver@test.invalid"), "Übersicht-Header muss die angemeldete E-Mail zeigen");
  assert.ok(document.querySelector("#out0"), "Abmelden-Aktion muss in der Übersicht erreichbar sein");

  window.__GYMBRO_TEST__.go("plaene");
  await settle(window);
  const letters = [...document.querySelectorAll(".plet")].map((e) => e.textContent);
  assert.deepEqual(letters.slice(0, 3), ["A", "B", "C"], "Alle drei Standardpläne A/B/C müssen ohne Neuanlegen vorhanden sein");
  const starts = document.querySelectorAll("[data-start]");
  assert.ok(starts.length >= 3, "A/B/C müssen direkt startbar sein (Starten-Button)");
});

test("Plan B (Unterkörper+Core): Plank zeigt Sekunden, KEIN Gewichtsfeld/-wert wird stillschweigend als 0 kg geführt", async () => {
  const { window, document } = await bootApp();
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  window.__GYMBRO_TEST__.start("B");
  await settle(window);
  const plankRow = document.querySelector('[data-ex="plank"]');
  assert.ok(plankRow, "Plank muss in Plan B enthalten sein");
  assert.ok(!/KG/.test(plankRow.querySelector(".rload").textContent), "Plank-Lastanzeige darf nicht 'KG' zeigen");
  assert.ok(/SEK/.test(plankRow.querySelector(".rload").textContent), "Plank-Lastanzeige muss Sekunden zeigen");
  click(plankRow.querySelector(".head"));
  await settle(window);
  const openRow = document.querySelector('[data-ex="plank"]'); // nach dem Klick neu gerendert -> frisch abfragen
  const detail = openRow.querySelector(".detail");
  assert.ok(/Körpergewicht/.test(detail.textContent), "Zielzeile muss 'Körpergewicht' explizit nennen, nie stillschweigend weglassen");
  const firstSetRow = detail.querySelector(".setrow");
  const repsVal = firstSetRow.querySelectorAll(".field .val")[0];
  const before = +repsVal.textContent;
  click(firstSetRow.querySelectorAll('.field button[data-d="1"]')[0]);
  await settle(window);
  const after = +document.querySelector('[data-ex="plank"] .setrow .field .val').textContent;
  assert.equal(after - before, 5, "Sekunden-Stepper muss in 5er-Schritten erhöhen, nicht 1er");
});

test("Fortschritt: 0/1/2 Sessions — ehrliche Leer-/Text-/Verlaufsdarstellung (bestätigte Nutzerregel)", async () => {
  const { window, document } = await bootApp();
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  window.__GYMBRO_TEST__.go("fortschritt");
  await wait(() => document.querySelector("[data-pex]"));
  await settle(window);

  const rdl = document.querySelector('[data-pex="rdl-langhantel"]');
  assert.ok(rdl, "rdl-langhantel muss im Fortschritt erscheinen (hat Historie)");
  assert.equal(rdl.querySelectorAll(".progrow").length, 2, "2 Sessions -> 2 Verlaufszeilen (Chart-Ersatz)");

  const plank = document.querySelector('[data-pex="plank"]');
  assert.ok(plank, "plank muss im Fortschritt erscheinen (hat genau 1 Session)");
  assert.equal(plank.querySelectorAll(".progrow").length, 1, "1 Session -> genau eine Textzeile mit Istwerten, kein Chart");
  assert.ok(plank.textContent.includes("Ab der zweiten Einheit siehst du hier den Verlauf."), "Exakter freigegebener Hinweistext fehlt bei 1 Session");

  const bank = document.querySelector('[data-pex="kh-bankdruecken"]');
  assert.ok(bank, "kh-bankdruecken ist Teil von Olivers Plan, aber 0 Sessions -> muss trotzdem (ehrlich leer) erscheinen");
  assert.ok(!bank.querySelector(".progrow"), "0 Sessions -> keine erfundenen Werte, keine Verlaufszeile");
  assert.ok(/[Nn]och keine bestätigten Sätze/.test(bank.textContent), "0 Sessions -> ehrliche Leer-Meldung");
});

test("Editor: neuer Plan — Reihenfolge per ↑/↓, Entfernen/Hinzufügen, Speichern; erscheint danach in der Liste", async () => {
  const { window, document } = await bootApp();
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  window.__GYMBRO_TEST__.openEditor(null);
  await settle(window);
  setVal(document.querySelector("#pn"), "Testplan Reihenfolge");
  click(document.querySelector('[data-add="dead-bug"]'));
  await settle(window);
  click(document.querySelector('[data-add="glute-bridge"]'));
  await settle(window);
  let order = [...document.querySelectorAll(".ord .oname")].map((e) => e.textContent);
  assert.deepEqual(order, ["Dead Bug", "Glute Bridge beidbeinig am Boden"]);
  click(document.querySelector('[data-down="dead-bug"]')); // nach unten -> Reihenfolge tauscht
  await settle(window);
  order = [...document.querySelectorAll(".ord .oname")].map((e) => e.textContent);
  assert.deepEqual(order, ["Glute Bridge beidbeinig am Boden", "Dead Bug"], "↓ muss die Reihenfolge wirklich tauschen");
  click(document.querySelector('[data-rm="glute-bridge"]'));
  await settle(window);
  assert.equal(document.querySelectorAll(".ord .oname").length, 1, "Entfernen muss die Übung aus der Reihenfolge nehmen");
  assert.ok(document.querySelector('[data-add="glute-bridge"]'), "Entfernte Übung muss wieder in der Bibliothek erscheinen");
  click(document.querySelector("#saveplan"));
  await wait(() => document.querySelector(".plet"));
  await settle(window);
  const names = [...document.querySelectorAll(".prow .rname")].map((e) => e.textContent);
  assert.ok(names.some((n) => n.includes("Testplan Reihenfolge")), "Neuer Plan muss nach dem Speichern in der Planliste erscheinen");
});

test("Editor: Bearbeiten eines bestehenden Plans ändert NICHT die bereits gespeicherte Satz-Historie", async () => {
  const { window, document } = await bootApp();
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  const before = window.__TEST_SB__.__test.setsOf("oliver@test.invalid").length;
  const ownPlanId = window.__TEST_SB__.__test.plansOf("oliver@test.invalid")[0].id;
  window.__GYMBRO_TEST__.openEditor(ownPlanId);
  await settle(window);
  click(document.querySelector('[data-rm="plank"]')); // Plank aus dem Plan entfernen
  await settle(window);
  click(document.querySelector("#saveplan"));
  await wait(() => document.querySelector(".plet"));
  await settle(window);
  const after = window.__TEST_SB__.__test.setsOf("oliver@test.invalid").length;
  assert.equal(after, before, "Plan-Bearbeitung darf keine vorhandenen sets-Zeilen löschen/ändern — ein Plan beschreibt die Zukunft");
});

// ---------- Mehrbenutzer ----------
test("Mehrbenutzer: zweites (frisches) Konto sieht NICHTS von Oliver — eigene Historie/Pläne sind leer, Builtin A/B/C bleibt gemeinsam", async () => {
  const { window, document } = await bootApp();
  await loginAs(window, "neu@test.invalid", "zweites-konto-2");
  const acct = document.querySelector(".acct");
  assert.ok(acct.textContent.includes("neu@test.invalid"), "Header muss das NEUE Konto zeigen, nicht Olivers");
  assert.ok(!document.body.textContent.includes("Kurz 30 min"), "Olivers privater Plan darf für ein anderes Konto nicht sichtbar sein");

  window.__GYMBRO_TEST__.go("plaene");
  await settle(window);
  const letters = [...document.querySelectorAll(".plet")].map((e) => e.textContent);
  assert.deepEqual(letters, ["A", "B", "C"], "Nur die gemeinsamen Builtin-Vorlagen, Olivers Zusatzplan fehlt für das neue Konto");

  window.__GYMBRO_TEST__.go("fortschritt");
  await wait(() => document.querySelector("[data-pex]"));
  await settle(window);
  const rdl = document.querySelector('[data-pex="rdl-langhantel"]');
  assert.ok(rdl, "rdl-langhantel ist Teil der GETEILTEN Vorlage Plan C und muss als trainierbare Übung erscheinen");
  assert.ok(!rdl.querySelector(".progrow"), "aber OHNE eigene Historie: 0 Sessions -> ehrliche Leer-Meldung, kein geerbter Verlauf von Oliver");
  assert.ok(/[Nn]och keine bestätigten Sätze/.test(rdl.textContent));
});

test("Mehrbenutzer: Abmelden+Anmelden als ANDERES Konto im selben Tab löscht den alten Client-Zustand vollständig (kein Leck)", async () => {
  const { window, document } = await bootApp();
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  assert.ok(document.body.textContent.includes("Kurz 30 min"));
  await window.__TEST_SB__.auth.signOut();
  await wait(() => document.querySelector("#lf"));
  await settle(window);
  assert.ok(!document.body.textContent.includes("Kurz 30 min"), "Nach Abmelden darf keine Olivers-Daten mehr im DOM stehen");
  assert.equal(window.__GYMBRO_TEST__.get().data, null, "In-Memory-Zustand (data) muss nach Abmelden geleert sein");

  await loginAs(window, "neu@test.invalid", "zweites-konto-2");
  assert.ok(!document.body.textContent.includes("Kurz 30 min"), "Nach Kontowechsel darf Olivers Plan nicht wieder auftauchen");
  window.__GYMBRO_TEST__.go("plaene");
  await settle(window);
  const letters = [...document.querySelectorAll(".plet")].map((e) => e.textContent);
  assert.deepEqual(letters, ["A", "B", "C"]);
});

test("Mehrbenutzer: Mock erzwingt Zeilen-Isolation wie RLS — Plan-Insert eines Kontos landet nie beim anderen", async () => {
  const { window } = await bootApp();
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  window.__GYMBRO_TEST__.openEditor(null);
  const d = window.document;
  setVal(d.querySelector("#pn"), "Oliver-only Plan");
  click(d.querySelector('[data-add="dead-bug"]'));
  await settle(window);
  click(d.querySelector("#saveplan"));
  await wait(() => d.querySelector(".plet"));
  await settle(window);
  const oliverPlans = window.__TEST_SB__.__test.plansOf("oliver@test.invalid").map((p) => p.name);
  const neuPlans = window.__TEST_SB__.__test.plansOf("neu@test.invalid").map((p) => p.name);
  assert.ok(oliverPlans.includes("Oliver-only Plan"));
  assert.ok(!neuPlans.includes("Oliver-only Plan"), "Insert darf niemals im Datensatz eines anderen Kontos landen");
});

test("Mehrbenutzer: verzögerte Satz-Schreibantwort, die erst NACH Kontowechsel ankommt, darf nicht mehr fürs alte Konto rendern/toasten (Generation-Guard)", async () => {
  const { window, document } = await bootApp();
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  window.__GYMBRO_TEST__.start("A"); // Builtin-Plan A enthält kh-bankdruecken
  await settle(window);
  click(document.querySelector('[data-ex="kh-bankdruecken"] .head'));
  await settle(window);

  // Schreibantwort gezielt anhalten UND als Fehler markieren, damit der Fehlerpfad (Rollback+Toast) beobachtbar wäre,
  // WENN der Generation-Guard fehlte.
  const release = window.__TEST_SB__.__test.gateWrites();
  window.__TEST_SB__.__test.forceNextWriteError("verzögerter Fehler vom alten Konto");
  click(document.querySelector('[data-ex="kh-bankdruecken"] .setrow .done'));
  await settle(window); // optimistisches ✓ ist jetzt sichtbar, die Schreibantwort selbst hängt noch im Gate

  await window.__TEST_SB__.auth.signOut(); // Kontowechsel WÄHREND die alte Schreibantwort noch unterwegs ist
  await wait(() => document.querySelector("#lf"));
  await settle(window);

  release(); // jetzt erst löst die (fehlgeschlagene) Schreibantwort des ALTEN Kontos auf
  await settle(window);

  assert.ok(document.querySelector("#lf"), "Muss weiterhin auf dem Login-Screen bleiben, nicht durch die späte Antwort zurückgerissen werden");
  assert.ok(!document.body.textContent.includes("verzögerter Fehler vom alten Konto"),
    "Die verspätete Fehlerantwort des vorherigen Kontos darf keinen Toast mehr auslösen, nachdem abgemeldet wurde");
});

// ---------- Unbekannte/kaputte Plan-Daten ----------
test("Plan-Daten: unbekannte Übungs-ID in plans.exercises wird still gefiltert (kein Crash, Rest des Plans bleibt nutzbar)", async () => {
  const seed = {
    "oliver@test.invalid": {
      userId: "user-oliver", password: "correct-horse-1",
      plans: [{ name: "Kaputter Plan", exercises: [{ id: "kh-bankdruecken" }, { id: "GELOESCHTE-UEBUNG-XY" }] }],
      sets: []
    }
  };
  const { window, document } = await bootApp(seed);
  await loginAs(window, "oliver@test.invalid", "correct-horse-1");
  window.__GYMBRO_TEST__.go("plaene");
  await settle(window);
  assert.ok(document.body.textContent.includes("Kaputter Plan"), "Plan mit teils unbekannter Übung muss trotzdem laden/erscheinen");
  const broken = window.__GYMBRO_TEST__.get().data.plans.find((p) => p.name === "Kaputter Plan");
  assert.ok(broken, "Plan muss im geladenen State auffindbar sein");
  window.__GYMBRO_TEST__.start(broken.id);
  await settle(window);
  assert.ok(document.querySelector('[data-ex="kh-bankdruecken"]'), "bekannte Übung bleibt im Plan");
  assert.ok(!document.querySelector('[data-ex="GELOESCHTE-UEBUNG-XY"]'), "unbekannte Übungs-ID darf nicht gerendert werden");
});

test("Plan-Daten: exercises fehlt/ist kein Array (kaputte DB-Zeile) -> leerer, aber ladbarer Plan statt App-Crash", async () => {
  const seed = {
    "oliver@test.invalid": {
      userId: "user-oliver", password: "correct-horse-1",
      plans: [{ name: "Ohne Uebungsfeld", exercises: null }],
      sets: []
    }
  };
  const { window, document } = await bootApp(seed);
  await loginAs(window, "oliver@test.invalid", "correct-horse-1"); // darf NICHT werfen/hängen bleiben
  window.__GYMBRO_TEST__.go("plaene");
  await settle(window);
  assert.ok(document.body.textContent.includes("Ohne Uebungsfeld"), "Plan mit kaputtem exercises-Feld muss trotzdem in der Liste erscheinen (0 Übungen statt Crash)");
  assert.ok(document.body.textContent.includes("0 Übungen"), "Muss als 0-Übungen-Plan angezeigt werden, nicht die ganze Ladung zum Absturz bringen");
});
