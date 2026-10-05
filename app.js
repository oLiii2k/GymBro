// GymBro v3 — Übersicht, Heute (Satz-Eingabe), Pläne + Editor, Fortschritt, E-Mail/Passwort-Login.
// Grundregeln (README): Wo ein Wert aus der Historie bekannt ist, wird er VORGESCHLAGEN statt leer
// gestartet; gespeichert wird erst nach Bestätigung (✓ bzw. "Speichern"). Farbcode: Orange = weicht von
// der Vorgabe ab, Grün = bestätigt, Blau = anfassbare Aktion.
(() => {
  const EXS = window.GYMBRO_LIBRARY, BUILTIN = window.GYMBRO_BUILTIN_PLANS, FIG = window.GYMBRO_FIGURES;
  const CFG = window.GYMBRO_CONFIG || {}, LOGIC = window.GYMBRO_LOGIC;
  const LIB = Object.fromEntries(EXS.map((e) => [e.id, e]));
  const LABELS = "ABCDE", MAX_PLANS = LABELS.length;
  const $ = (s) => document.querySelector(s);
  const app = $("#app");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- Datum (lokal, nicht UTC — sonst kippt der Tag nachts) ----------
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date(), TODAY = iso(today);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Montag
  const WEEK_START = iso(weekStart);
  const SINCE = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 28)); // Historienfenster (Vorbelegung)
  const PROGRESS_SINCE = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 365)); // Fortschritt: 1 Jahr
  const kw = (() => { // ISO-Kalenderwoche
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
  })();
  const dateLabel = today.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const shortDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const fmtKg = (n) => Math.round(n).toLocaleString("de-DE") + " kg";
  const fmtW = (n) => String(n).replace(".", ",");
  const unitLabel = (e) => (e.unit === "s" ? "s" : "Wdh");

  // ---------- Theme ----------
  const tb = $("#t"), root = document.documentElement;
  tb.onclick = () => { const d = root.dataset.theme === "dark"; root.dataset.theme = d ? "light" : "dark"; tb.textContent = d ? "🌙 Dunkel" : "☀ Hell"; };
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("on"), 4000); }

  // ---------- Zustand ----------
  // data  = { plans:[{id,label,name,builtin,exs:[…]}], rows:[Sätze der letzten 28 Tage], lastBy:{exId:[Sätze letzter Tag]}, progress:{exId:rows}|null }
  // st    = Satz-Eingabe für den AKTIVEN Plan: st[exId] = { sets:[{reps,kg,done}], last, lastDate }
  // Mehrbenutzer-Härtung: jede Konto-Session bekommt eine Generation-Nummer (`gen`). Asynchrone Antworten,
  // die noch für eine ÄLTERE Generation unterwegs waren (Kontowechsel/Abmelden währenddessen), werden beim
  // Zurückkommen verworfen statt ins falsche Konto geschrieben zu werden — das ist der eigentliche Schutz,
  // RLS in Postgres ist die zweite, serverseitige Schicht (siehe supabase/schema.sql, schema-v2.sql).
  let sb, data = null, st = {}, activeId = null, tab = "uebersicht", openId = null, form = null, progressExId = null, recoveryMode = false;
  let gen = 0, currentUserId = null, currentEmail = null, noteEditId = null;
  function resetState() { data = null; st = {}; activeId = null; tab = "uebersicht"; openId = null; form = null; progressExId = null; currentUserId = null; currentEmail = null; noteEditId = null; }
  const mult = LOGIC.mult, vol = LOGIC.vol;
  const plan = (id) => data.plans.find((p) => p.id === id);
  const planSets = (p) => p.exs.reduce((a, e) => a + e.sets, 0);
  const planTitle = (p) => `Training ${p.label} — ${p.name}`;

  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY || !window.supabase) {
    app.innerHTML = `<div class="login"><h1>GymBro</h1><p>Supabase ist noch nicht verbunden. Trage <b>SUPABASE_URL</b> und <b>SUPABASE_ANON_KEY</b> in <code>config.js</code> ein und führe <code>supabase/schema.sql</code> im SQL-Editor aus.</p></div>`;
    return;
  }
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

  // ---------- Auth ----------
  // Ein Konto, drei Wege rein: Passwort (Normalweg, Primäraktion), Magic Link (Rückfallweg, umrandet),
  // Passwort-Reset (Textlink → E-Mail mit Link → PASSWORD_RECOVERY-Event → neues Passwort setzen).
  // Niemals signUp(): es gibt kein "neues Konto", nur das bestehende Supabase-Konto mit derselben E-Mail.
  function showLogin(opts) {
    opts = opts || {};
    const mode = opts.mode || "password"; // "password" | "magic" | "forgot"
    const err = opts.err ? `<div class="err">${esc(opts.err)}</div>` : "";
    const info = opts.info ? `<p class="hintline">${esc(opts.info)}</p>` : "";
    if (mode === "magic") {
      app.innerHTML = `<form class="login" id="lf"><div class="brand">GymBro</div><div class="brandsub">Dein Trainingslog</div>
        <p class="hintline">Anmelden per Magic Link: E-Mail eingeben, Link im Postfach antippen.</p>${info}
        <label class="f" for="em">E-Mail</label><input class="txt" type="email" id="em" autocomplete="email" required>
        <button class="primary" type="submit">Link senden</button>
        <button class="ghost" type="button" id="back">Stattdessen mit Passwort</button>${err}</form>`;
      $("#lf").onsubmit = async (ev) => {
        ev.preventDefault();
        // Nur Einladung, kein offenes Self-Signup (Nutzerentscheidung): shouldCreateUser:false verhindert,
        // dass eine unbekannte E-Mail per Magic Link automatisch ein neues Konto bekommt (siehe Supabase-Docs
        // "Passwordless email logins"). Das ist nur die Client-Bremse — serverseitig muss zusätzlich
        // "Allow new users to sign up" im Dashboard deaktiviert werden (siehe README, PENDING/nicht gesetzt).
        const { error } = await sb.auth.signInWithOtp({ email: $("#em").value.trim(),
          options: { emailRedirectTo: location.href.split("#")[0], shouldCreateUser: false } });
        showLogin({ mode: "magic", info: error ? null : "Falls ein Konto zu dieser E-Mail existiert, ist der Link unterwegs.", err: error && error.message });
      };
      $("#back").onclick = () => showLogin({ mode: "password" });
      return;
    }
    if (mode === "forgot") {
      app.innerHTML = `<form class="login" id="lf"><div class="brand">GymBro</div><div class="brandsub">Dein Trainingslog</div>
        <p class="hintline">Passwort vergessen: E-Mail eingeben, wir schicken einen Link zum Setzen eines neuen Passworts.</p>${info}
        <label class="f" for="em">E-Mail</label><input class="txt" type="email" id="em" autocomplete="email" required>
        <button class="primary" type="submit">Link senden</button>
        <button class="ghost" type="button" id="back">Zurück zur Anmeldung</button>${err}</form>`;
      $("#lf").onsubmit = async (ev) => {
        ev.preventDefault();
        const { error } = await sb.auth.resetPasswordForEmail($("#em").value.trim(), { redirectTo: location.href.split("#")[0] });
        // Supabase verrät bewusst nicht, ob die E-Mail existiert (Schutz vor User-Enumeration) — gleiche Meldung immer.
        showLogin({ mode: "forgot", info: error ? null : "Wenn ein Konto zu dieser E-Mail existiert, ist der Link unterwegs.", err: error && error.message });
      };
      $("#back").onclick = () => showLogin({ mode: "password" });
      return;
    }
    // mode === "password" (Standard): genau eine Primäraktion.
    app.innerHTML = `<form class="login" id="lf"><div class="brand">GymBro</div><div class="brandsub">Dein Trainingslog</div>
      <label class="f" for="em">E-Mail</label><input class="txt" type="email" id="em" inputmode="email" autocomplete="username" required>
      <label class="f" for="pw">Passwort</label>
      <div class="pwrow"><input class="txt" type="password" id="pw" autocomplete="current-password" style="padding-right:50px" required>
        <button class="eye" type="button" id="eye" aria-label="Passwort anzeigen">Zeigen</button></div>
      <button class="primary" type="submit">Anmelden</button>
      <button class="ghost" type="button" id="magic">Stattdessen Link per E-Mail</button>
      <a class="link" href="#" id="forgot">Passwort vergessen</a>${err}</form>`;
    $("#eye").onclick = () => { const p = $("#pw"), s = p.type === "password"; p.type = s ? "text" : "password"; $("#eye").textContent = s ? "Verbergen" : "Zeigen"; };
    $("#magic").onclick = () => showLogin({ mode: "magic" });
    $("#forgot").onclick = (ev) => { ev.preventDefault(); showLogin({ mode: "forgot" }); };
    $("#lf").onsubmit = async (ev) => {
      ev.preventDefault();
      const { error } = await sb.auth.signInWithPassword({ email: $("#em").value.trim(), password: $("#pw").value });
      // Generische Fehlermeldung: nie verraten, ob E-Mail ODER Passwort falsch war (Auskunft an Fremde).
      if (error) showLogin({ mode: "password", err: "E-Mail oder Passwort stimmt nicht." });
    };
  }

  // Passwort-Reset-Link führt zurück auf die Seite und löst PASSWORD_RECOVERY aus (Supabase loggt dabei
  // temporär ein). Dieser Screen ersetzt KEIN signUp — dasselbe Konto bekommt nur erstmals/neu ein Passwort.
  function showSetPassword(opts) {
    opts = opts || {};
    const err = opts.err ? `<div class="err">${esc(opts.err)}</div>` : "";
    app.innerHTML = `<form class="login" id="sf"><div class="brand">GymBro</div><div class="brandsub">Neues Passwort setzen</div>
      <label class="f" for="np">Neues Passwort</label><input class="txt" type="password" id="np" autocomplete="new-password" minlength="6" required>
      <button class="primary" type="submit">Passwort speichern</button>${err}</form>`;
    $("#sf").onsubmit = async (ev) => {
      ev.preventDefault();
      const { error } = await sb.auth.updateUser({ password: $("#np").value });
      if (error) return showSetPassword({ err: error.message });
      recoveryMode = false;
      toast("Passwort gespeichert. Du bist jetzt angemeldet.");
      await boot();
    };
  }

  // ---------- Laden ----------
  // Defensiv gegen unbekannte/kaputte Plan-Daten (fremde/alte DB-Zeile, manueller SQL-Edit, zukünftiges Schema):
  // pe kann null/kein Objekt sein oder auf eine gelöschte/unbekannte Übungs-ID zeigen — dann still filtern (unten),
  // statt die ganze App beim Laden abstürzen zu lassen.
  const resolve = (pe) => (pe && LIB[pe.id] ? { ...LIB[pe.id], sets: pe.sets ?? LIB[pe.id].sets, wMin: pe.wMin ?? LIB[pe.id].wMin, wMax: pe.wMax ?? LIB[pe.id].wMax, kg: pe.kg ?? LIB[pe.id].kg } : null);

  async function load() {
    const myGen = gen; // Mehrbenutzer-Guard: Ergebnis nur übernehmen, wenn währenddessen kein Konto-Wechsel/Logout war
    const [pl, rw, ...lasts] = await Promise.all([
      sb.from("plans").select("id,name,exercises").order("created_at"),
      sb.from("sets").select("date,plan_id,exercise,set_index,reps,weight,done_at").gte("date", SINCE).limit(5000),
      // Vorbelegung: je Übung der letzte Trainingstag VOR heute, planübergreifend (Historie hängt an der Übungs-ID)
      ...EXS.map((e) => sb.from("sets").select("date,set_index,reps,weight").eq("exercise", e.id).lt("date", TODAY)
        .order("date", { ascending: false }).order("set_index").limit(20))]);
    const migr = " — wurde supabase/schema-v2.sql im SQL-Editor ausgeführt?";
    if (pl.error) throw new Error(pl.error.message + migr);
    if (rw.error) throw new Error(rw.error.message + migr);
    const lastBy = {};
    EXS.forEach((e, i) => {
      if (lasts[i].error) throw lasts[i].error;
      const d = lasts[i].data;
      lastBy[e.id] = d.length ? d.filter((x) => x.date === d[0].date) : null;
    });
    // Builtin-Pläne (A/B/C) zuerst — Labels A..E ergeben sich aus der Reihenfolge, weitere Pläne aus der DB.
    const raw = [...BUILTIN.map((b) => ({ builtin: true, name: b.name, exercises: b.exercises })),
      ...pl.data.map((p) => ({ id: p.id, name: p.name, exercises: p.exercises }))];
    // p.exercises kann bei einer kaputten/fremden DB-Zeile fehlen oder kein Array sein — dann leerer Plan statt Crash.
    const plans = raw.slice(0, MAX_PLANS).map((p, i) => ({ ...p, id: p.builtin ? LABELS[i] : p.id, label: LABELS[i], exs: (Array.isArray(p.exercises) ? p.exercises : []).map(resolve).filter(Boolean) }));
    if (myGen !== gen) return; // währenddessen abgemeldet / Konto gewechselt — Ergebnis gehört nicht mehr hierher
    data = { plans, rows: rw.data, lastBy, progress: data ? data.progress : null, notes: data ? data.notes : [], notesError: data ? data.notesError : null };
    await loadNotes(myGen);
  }

  // ---------- v4: persönliche Übungsnotizen (RLS-geschützt, additive Tabelle exercise_notes) ----------
  // Bewusst NICHT Teil des Haupt-Promise.all oben: ein fehlendes exercise_notes (Migration supabase/schema-v4.sql
  // noch nicht ausgeführt) darf Sätze/Pläne/Login niemals mitreissen — nur der Notiz-Teil degradiert, klar benannt.
  async function loadNotes(myGen) {
    myGen = myGen === undefined ? gen : myGen;
    try {
      const { data: rows, error } = await sb.from("exercise_notes")
        .select("id,exercise_id,note,text_updated_at,review_ack_at,resolved_at").order("text_updated_at");
      if (myGen !== gen || !data) return;
      if (error) { data.notes = []; data.notesError = error.message; return; }
      data.notes = rows || []; data.notesError = null;
    } catch (err) {
      if (myGen !== gen || !data) return;
      data.notes = []; data.notesError = (err && err.message) || String(err);
    }
  }

  async function loadProgress() {
    const myGen = gen;
    const { data: rows, error } = await sb.from("sets").select("date,exercise,set_index,reps,weight").gte("date", PROGRESS_SINCE).limit(20000);
    if (error) throw error;
    if (myGen !== gen || !data) return; // Mehrbenutzer-Guard, siehe load()
    data.progress = rows;
  }

  // "Dran" = der Plan nach dem zuletzt trainierten (Rotation, gleichberechtigt über alle Pläne).
  function dranId() {
    const i = LOGIC.dranIndex(data.plans.map((p) => p.id), data.rows);
    return i < 0 ? null : data.plans[i].id;
  }

  // Satz-Eingabe für einen Plan aufbauen: Vorschlag = letztes Ist, sonst Planvorgabe; heutige ✓-Sätze einblenden
  function buildState(p) {
    st = {};
    p.exs.forEach((e) => {
      const last = data.lastBy[e.id];
      const sets = Array.from({ length: e.sets }, (_, k) => {
        const l = last && (last.find((x) => x.set_index === k + 1) || last[last.length - 1]);
        return { reps: l ? l.reps : e.wMax, kg: l ? +l.weight : e.kg, done: false };
      });
      st[e.id] = { sets, last, lastDate: last ? last[0].date : null };
    });
    data.rows.filter((r) => r.date === TODAY && r.plan_id === p.id).forEach((r) => {
      const s = st[r.exercise] && st[r.exercise].sets[r.set_index - 1];
      if (s) Object.assign(s, { reps: r.reps, kg: +r.weight, done: true });
    });
  }

  async function refresh() {
    await load();
    if (!activeId || !plan(activeId)) { activeId = dranId(); if (activeId) buildState(plan(activeId)); }
  }

  // ---------- Schreiben (nur ✓) ----------
  async function persist(e, k) {
    const s = st[e.id].sets[k];
    const { error } = await sb.from("sets").upsert(
      { date: TODAY, plan_id: activeId, exercise: e.id, set_index: k + 1, reps: s.reps, weight: s.kg, done_at: new Date().toISOString() },
      { onConflict: "user_id,date,plan_id,exercise,set_index" });
    return error;
  }
  async function unpersist(e, k) {
    const { error } = await sb.from("sets").delete().eq("date", TODAY).eq("plan_id", activeId).eq("exercise", e.id).eq("set_index", k + 1);
    return error;
  }
  // Ändert einen Satz optimistisch, schreibt in die DB, rollt bei Fehler zurück.
  // Mehrbenutzer-Guard (wie load()/loadProgress()): persist()/unpersist() können über den Netzwerk-Await hinweg
  // laufen, während währenddessen abgemeldet oder zu einem anderen Konto gewechselt wird (neue `gen`). Ohne den
  // Vergleich würde die danach laufende Fehlerbehandlung (Rollback-Render + Toast) auf dem dann AKTUELLEN
  // (neuen) Konto-Zustand rendern/toasten, obwohl der Fehler zum vorherigen Konto gehört — verwirrend bis
  // potenziell irreführend. Der Schreibzugriff selbst ist serverseitig bereits an den zum Aufrufzeitpunkt
  // gültigen Auth-Token gebunden (RLS greift serverseitig unabhängig davon), dieser Guard schützt nur die
  // CLIENT-seitige Nachbehandlung (Rollback/Render/Toast).
  async function mutate(e, k, patch) {
    const myGen = gen;
    const s = st[e.id].sets[k], old = { ...s };
    Object.assign(s, patch);
    render();
    let err = null;
    if (s.done) err = await persist(e, k);
    else if (old.done) err = await unpersist(e, k);
    if (myGen !== gen) return; // währenddessen abgemeldet/Konto gewechselt — Antwort gehört nicht mehr hierher
    if (err) { Object.assign(s, old); render(); toast("Nicht gespeichert: " + err.message); }
  }

  // ---------- Volumen ----------
  const dayVol = (p) => p.exs.reduce((a, e) => a + st[e.id].sets.filter((s) => s.done).reduce((b, s) => b + vol(e, s), 0), 0);
  // Woche = DB-Zeilen dieser Woche, ABER die heutigen Zeilen des aktiven Plans ersetzt der lokale Stand (sonst doppelt/veraltet)
  function weekVol(p) {
    const other = data.rows.filter((r) => r.date >= WEEK_START && !(r.date === TODAY && r.plan_id === p.id))
      .reduce((a, r) => a + (LIB[r.exercise] ? vol(LIB[r.exercise], { reps: r.reps, kg: +r.weight }) : 0), 0);
    return other + dayVol(p);
  }

  // ---------- Rendering: Rahmen + Tab-Leiste ----------
  const ICON = { uebersicht: "⌂", heute: "▶", plaene: "☰", fortschritt: "📈" };
  const TABS = [["uebersicht", "Übersicht"], ["heute", "Heute"], ["plaene", "Pläne"], ["fortschritt", "Fortschritt"]];
  function shell(inner) {
    const t = (tab === "neu" || tab === "bearbeiten") ? "plaene" : tab;
    app.innerHTML = `<div class="screen">${inner}</div>
      <nav class="tabs">${TABS.map(([id, w]) => `<button data-tab="${id}" class="${t === id ? "on" : ""}"${t === id ? ' aria-current="page"' : ""}><i>${ICON[id]}</i>${w}</button>`).join("")}</nav>`;
    app.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => go(b.dataset.tab));
  }
  async function go(t) {
    tab = t; openId = null;
    if (t === "fortschritt" && !data.progress) { try { await loadProgress(); } catch (err) { toast("Laden fehlgeschlagen: " + err.message); } }
    else if (t !== "heute") { try { await refresh(); } catch (err) { toast("Laden fehlgeschlagen: " + err.message); } }
    render();
  }
  function start(id) { activeId = id; buildState(plan(id)); tab = "heute"; openId = null; render(); }

  function render() {
    if (tab === "heute") return renderHeute();
    if (tab === "plaene") return renderPlaene();
    if (tab === "neu" || tab === "bearbeiten") return renderForm();
    if (tab === "fortschritt") return renderFortschritt();
    return renderUebersicht();
  }

  // ---------- Übersicht ----------
  function histories() { // eine "Einheit" = Datum + Plan
    const g = {};
    data.rows.forEach((r) => { const k = r.date + "|" + r.plan_id; (g[k] = g[k] || { date: r.date, plan_id: r.plan_id, n: 0 }).n++; });
    return Object.values(g).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 6);
  }
  function renderUebersicht() {
    const dranIdv = dranId(), dran = dranIdv ? plan(dranIdv) : null, recent = histories();
    const hist = recent.length ? recent.map((h) => {
      const p = plan(h.plan_id), total = p ? planSets(p) : null;
      const full = total !== null && h.n >= total, running = h.date === TODAY && !full;
      const cls = total === null || full ? "ok" : running ? "" : "warn"; // abgebrochen = vergangen und unvollständig
      return `<div class="hrow"><div><div class="rname">${p ? esc(planTitle(p)) : "Gelöschter Plan"}</div><div class="rmeta">${shortDate(h.date)}</div></div>
        <div class="hval ${cls}">${running ? "läuft · " : ""}${total === null ? h.n : `${h.n}/${total}`} Sätze</div></div>`;
    }).join("") : `<div class="hintline">Noch keine Einheit — starte oben die erste.</div>`;
    const nextCard = dran ? `<div class="card"><div class="label">Als Nächstes</div><div class="ctitle">${esc(planTitle(dran))}</div>
        <div class="rmeta">${dran.exs.length} Übungen · ${planSets(dran)} Sätze</div>
        <button class="save" data-start="${dran.id}">Starten</button></div>` : `<div class="card"><div class="label">Als Nächstes</div><div class="hintline">Noch kein Plan vorhanden.</div></div>`;
    shell(`<header><div><h1>GymBro</h1><div class="sub">${dateLabel} · KW ${kw}</div>
        <div class="acct"><span>${esc(currentEmail || "")}</span><button class="linkbtn" id="out0">Abmelden</button></div></div></header><div class="pad">
      ${nextCard}
      <h4>Pläne</h4>${data.plans.map((p) => `<div class="hrow"><div class="rname">${esc(planTitle(p))}</div>${dran && p.id === dran.id ? '<span class="chip">Dran</span>' : ""}</div>`).join("")}
      <h4>Letzte Einheiten</h4>${hist}</div>`);
    wireStart();
    $("#out0").onclick = () => sb.auth.signOut();
  }
  const wireStart = () => app.querySelectorAll("[data-start]").forEach((b) => b.onclick = () => start(b.dataset.start));

  // ---------- Pläne ----------
  function renderPlaene() {
    const dran = dranId();
    const rows = data.plans.map((p) => `<div class="prow"><div class="plet">${p.label}</div>
      <div class="pmain"><div class="rname">${esc(p.name)}${p.id === dran ? ' <span class="chip">Dran</span>' : ""}</div>
        <div class="rmeta">${p.exs.length} Übungen · ${planSets(p)} Sätze</div>
        ${p.builtin ? "" : `<button class="linkbtn" data-edit="${p.id}">Bearbeiten</button>`}</div>
      <button class="go" data-start="${p.id}">Starten</button></div>`).join("");
    const full = data.plans.length >= MAX_PLANS;
    shell(`<header><h1>Pläne</h1><div class="sub">${data.plans.length} von ${MAX_PLANS} · gleichberechtigt, Reihenfolge = Rotation</div></header><div class="pad">${rows}
      <button class="dashed" id="newplan"${full ? " disabled" : ""}>${full ? `Maximal ${MAX_PLANS} Pläne` : "+ Neuer Plan"}</button></div>`);
    wireStart();
    const n = $("#newplan"); if (n) n.onclick = () => openEditor(null);
    app.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => openEditor(b.dataset.edit));
  }

  // ---------- Plan-Editor (EIN Formular für Anlegen UND Bearbeiten) ----------
  // form = { id: bestehende Plan-ID oder null (= neu), name, order: [exId,...] in Reihenfolge, spec: {exId:{sets,wMin,wMax,kg}} }
  function suggest(e) { return LOGIC.suggestFromLast(e, data.lastBy[e.id]); }

  function openEditor(planId) {
    if (planId) {
      const p = plan(planId);
      form = { id: planId, name: p.name, order: p.exs.map((e) => e.id), spec: Object.fromEntries(p.exs.map((e) => [e.id, { sets: e.sets, wMin: e.wMin, wMax: e.wMax, kg: e.kg }])) };
    } else {
      form = { id: null, name: "", order: [], spec: {} };
    }
    tab = form.id ? "bearbeiten" : "neu";
    render();
  }

  function specFields(id) {
    const s = form.spec[id], e = LIB[id], isSec = e.unit === "s";
    const step = isSec ? 5 : 1;
    if (isSec) {
      return `<div class="spans" style="grid-template-columns:1fr 1fr 1fr">
        <label class="f" style="margin:0">Sätze<div class="field"><button data-ex="${id}" data-f="sets" data-d="-1">−</button><span class="val">${s.sets}</span><span class="unit"></span><button data-ex="${id}" data-f="sets" data-d="1">+</button></div></label>
        <label class="f" style="margin:0">Sek. von<div class="field"><button data-ex="${id}" data-f="wMin" data-d="-5">−</button><span class="val">${s.wMin}</span><span class="unit">s</span><button data-ex="${id}" data-f="wMin" data-d="5">+</button></div></label>
        <label class="f" style="margin:0">Sek. bis<div class="field"><button data-ex="${id}" data-f="wMax" data-d="-5">−</button><span class="val">${s.wMax}</span><span class="unit">s</span><button data-ex="${id}" data-f="wMax" data-d="5">+</button></div></label>
      </div><div class="hintline" style="grid-column:1/-1;padding-left:0">Körpergewicht — kein Gewichtsfeld, zählt nicht ins Tagesvolumen.</div>`;
    }
    return `<div class="spans">
      <label class="f" style="margin:0">Sätze<div class="field"><button data-ex="${id}" data-f="sets" data-d="-1">−</button><span class="val">${s.sets}</span><span class="unit"></span><button data-ex="${id}" data-f="sets" data-d="1">+</button></div></label>
      <label class="f" style="margin:0">Wdh von<div class="field"><button data-ex="${id}" data-f="wMin" data-d="-1">−</button><span class="val">${s.wMin}</span><span class="unit"></span><button data-ex="${id}" data-f="wMin" data-d="1">+</button></div></label>
      <label class="f" style="margin:0">Wdh bis<div class="field"><button data-ex="${id}" data-f="wMax" data-d="-1">−</button><span class="val">${s.wMax}</span><span class="unit"></span><button data-ex="${id}" data-f="wMax" data-d="1">+</button></div></label>
      <label class="f" style="margin:0">kg<div class="field"><button data-ex="${id}" data-f="kg" data-d="-2">−</button><span class="val">${fmtW(s.kg)}</span><span class="unit"></span><button data-ex="${id}" data-f="kg" data-d="2">+</button></div></label>
    </div>`;
  }

  function renderForm() {
    const ord = form.order.map((id, i) => {
      const e = LIB[id], s = form.spec[id];
      return `<div class="ord" data-row="${id}"><div class="onum">${i + 1}</div>
        <div><div class="oname">${esc(e.name)}</div><div class="ometa">${esc(e.muscle)}${s.from ? ` · Vorschlag vom ${shortDate(s.from)}` : ""}</div></div>
        <button class="mv" data-up="${id}"${i === 0 ? " disabled" : ""} aria-label="${esc(e.name)} nach oben">↑</button>
        <button class="mv" data-down="${id}"${i === form.order.length - 1 ? " disabled" : ""} aria-label="${esc(e.name)} nach unten">↓</button>
        <button class="rm" data-rm="${id}" aria-label="${esc(e.name)} entfernen">×</button>
        ${specFields(id)}</div>`;
    }).join("") || `<div class="hintline">Noch keine Übung gewählt — aus der Bibliothek unten hinzufügen.</div>`;
    const libRows = EXS.filter((e) => !form.order.includes(e.id)).map((e) => `<div class="lib">
      <button class="add" data-add="${e.id}" aria-label="${esc(e.name)} hinzufügen">+</button>
      <div><div class="oname">${esc(e.name)}</div><div class="ometa">${esc(e.muscle)}${e.unit === "s" ? " · in Sekunden" : ""}</div></div></div>`).join("");
    const editing = !!form.id;
    shell(`<header><div><h1>${editing ? `Plan ${plan(form.id).label} bearbeiten` : "Neuer Plan"}</h1>
        <div class="sub">${editing ? "Änderungen gelten ab der nächsten Einheit" : "Nur Übungen aus der Bibliothek"}</div></div>
        <button class="back" id="cancel">Abbrechen</button></header><div class="pad">
      <label class="f" for="pn">Name</label><input class="txt" id="pn" maxlength="60" placeholder="z. B. Unterkörper" value="${esc(form.name)}">
      <h4>Deine Reihenfolge · ${form.order.length} Übungen</h4><div id="ord">${ord}</div>
      <h4>Weitere Übungen hinzufügen</h4><div id="lib">${libRows || '<div class="hintline">Alle Übungen sind schon gewählt.</div>'}</div>
      <button class="save" id="saveplan">${editing ? "Änderungen speichern" : "Plan speichern"}</button>
      ${editing ? '<button class="danger" id="delplan">Plan löschen</button>' : ""}
      <div class="hint">Bereits absolvierte Einheiten bleiben unverändert — ein Plan beschreibt die Zukunft, nicht die Vergangenheit.</div></div>`);
    $("#pn").oninput = (ev) => { form.name = ev.target.value; };
    $("#cancel").onclick = () => go("plaene");
    app.querySelectorAll("[data-add]").forEach((b) => b.onclick = () => { const id = b.dataset.add; form.order.push(id); form.spec[id] = suggest(LIB[id]); renderForm(); });
    app.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => { const id = b.dataset.rm; form.order = form.order.filter((x) => x !== id); delete form.spec[id]; renderForm(); });
    app.querySelectorAll("[data-up]").forEach((b) => b.onclick = () => { const i = form.order.indexOf(b.dataset.up); if (i > 0) [form.order[i - 1], form.order[i]] = [form.order[i], form.order[i - 1]]; renderForm(); });
    app.querySelectorAll("[data-down]").forEach((b) => b.onclick = () => { const i = form.order.indexOf(b.dataset.down); if (i < form.order.length - 1) [form.order[i + 1], form.order[i]] = [form.order[i], form.order[i + 1]]; renderForm(); });
    app.querySelectorAll(".field button[data-ex]").forEach((b) => b.onclick = () => {
      const id = b.dataset.ex, f = b.dataset.f, d = +b.dataset.d, s = form.spec[id];
      const floor = f === "sets" ? 1 : 0;
      s[f] = Math.max(floor, (s[f] || 0) + d);
      renderForm();
    });
    const del = $("#delplan");
    if (del) del.onclick = async () => {
      if (!confirm("Plan löschen? Bereits gespeicherte Sätze bleiben erhalten.")) return;
      const { error } = await sb.from("plans").delete().eq("id", form.id);
      if (error) return toast("Nicht gelöscht: " + error.message);
      if (activeId === form.id) activeId = null;
      form = null; await go("plaene");
    };
    $("#saveplan").onclick = async () => {
      const exs = form.order.map((id) => { const s = form.spec[id]; return { id, sets: s.sets, wMin: s.wMin, wMax: s.wMax, kg: s.kg }; });
      const bad = exs.find((x) => !(x.sets >= 1) || !(x.wMin >= 0) || !(x.wMax >= x.wMin) || !(x.kg >= 0));
      if (!form.name.trim()) return toast("Bitte einen Namen eingeben.");
      if (!exs.length) return toast("Mindestens eine Übung wählen.");
      if (bad) return toast(`Ungültige Werte bei ${LIB[bad.id].name} (${LIB[bad.id].unit === "s" ? "Sek. bis ≥ von" : "Wdh bis ≥ von"}, Sätze ≥ 1).`);
      const payload = { name: form.name.trim(), exercises: exs };
      const { error } = form.id ? await sb.from("plans").update(payload).eq("id", form.id) : await sb.from("plans").insert(payload);
      if (error) return toast("Nicht gespeichert: " + error.message);
      form = null; await go("plaene");
    };
  }

  // ---------- Fortschritt ----------
  // Regel (bestätigt): <2 Sessions je Übung => kein Chart/Verlauf. 1 Session => reine Istwerte als Textzeile
  // + exakter Hinweistext. 0 Sessions => ehrliche "keine Daten"-Meldung, kein erfundener Wert.
  // Session = distinktes Trainingsdatum, NICHT Anzahl Sätze (siehe logic.js sessionsFromRows).
  function usedExerciseIds() {
    const ids = new Set();
    (data.progress || []).forEach((r) => ids.add(r.exercise));
    data.plans.forEach((p) => p.exs.forEach((e) => ids.add(e.id)));
    return EXS.filter((e) => ids.has(e.id)).map((e) => e.id);
  }
  function sessionLine(e, sess) {
    const vals = sess.sets.map((s) => s.reps).join(" / ");
    const w = e.unit === "s" ? "" : ` @ ${fmtW(+sess.sets[0].weight)} kg`;
    return `${shortDate(sess.date)}: ${vals} ${unitLabel(e)}${w}`;
  }
  function renderExProgress(id) {
    const e = LIB[id];
    const r = LOGIC.sessionsFromRows(data.progress || [], id);
    let body;
    if (r.count === 0) {
      body = `<div class="hintline">Noch keine bestätigten Sätze für ${esc(e.name)} — hier erscheint etwas, sobald du den ersten ✓-Satz einträgst.</div>`;
    } else if (r.count === 1) {
      body = `<div class="progrow">${sessionLine(e, r.sessions[0])}</div>
        <div class="hintline">Ab der zweiten Einheit siehst du hier den Verlauf.</div>`;
    } else {
      body = `<div class="prog-list">${r.sessions.slice().reverse().map((s) => `<div class="progrow">${sessionLine(e, s)}</div>`).join("")}</div>`;
    }
    return `<div class="prow-ex" data-pex="${id}"><div class="rname">${esc(e.name)}<span class="rmeta" style="display:inline;margin-left:6px">${esc(e.muscle)}</span></div>${body}</div>`;
  }
  function renderFortschritt() {
    const ids = usedExerciseIds();
    const list = ids.length ? ids.map(renderExProgress).join("") : `<div class="hintline">Noch keine Übung trainiert — Fortschritt erscheint, sobald die erste Einheit bestätigt ist.</div>`;
    shell(`<header><h1>Fortschritt</h1><div class="sub">Basis: bestätigte ✓-Sätze der letzten 12 Monate</div></header><div class="pad">${list}</div>`);
  }

  // ---------- Heute (Satz-Eingabe) ----------
  const summary = (e) => { // Ist-Zeile: "2×17 kg · 10 / 10 / 8" bzw. bei Sekunden "30 / 35 / 30 s"
    const d = st[e.id].sets.filter((s) => s.done); if (!d.length) return null;
    if (e.unit === "s") return `${st[e.id].sets.map((s) => (s.done ? s.reps : "–")).join(" / ")} s`;
    const kgs = [...new Set(d.map((s) => fmtW(s.kg)))].join("/");
    return `${e.pair ? "2×" : ""}${kgs} kg · ${st[e.id].sets.map((s) => (s.done ? s.reps : "–")).join(" / ")}`;
  };
  const lastLine = (e) => {
    const { last } = st[e.id];
    if (!last) return "noch kein Ist";
    if (e.unit === "s") return `zuletzt ${last.map((x) => x.reps).join(" / ")} s`;
    return `zuletzt ${last.map((x) => x.reps).join(" / ")} @ ${fmtW(+last[0].weight)} kg`;
  };
  const exDone = (e) => st[e.id].sets.every((s) => s.done);

  function renderHeute() {
    const p = plan(activeId);
    if (!p) { shell(`<div class="pad"><div class="hintline">Kein Plan ausgewählt — starte einen Plan in der Übersicht oder bei den Plänen.</div></div>`); return; }
    const totalSets = planSets(p), doneSets = p.exs.reduce((a, e) => a + st[e.id].sets.filter((s) => s.done).length, 0);
    shell(`<header><h1>${esc(planTitle(p))}</h1>
        <div class="sub">${dateLabel} · ${p.exs.length} Übungen · ${p.exs.filter(exDone).length} / ${p.exs.length} erledigt</div>
        <div class="bar"><i style="width:${(doneSets / totalSets) * 100}%"></i></div></header>
      <div class="list">${p.exs.map(rowHtml).join("")}</div>
      <div class="foot">
        <div class="sum"><span>Heute bewegt</span><b>${fmtKg(dayVol(p))}</b></div>
        <div class="sum" style="margin-top:3px"><span>Woche (KW ${kw})</span><b>${fmtKg(weekVol(p))}</b></div>
        <button class="linkbtn" id="out">Abmelden</button></div>`);
    wireHeute(p);
  }

  function rowHtml(e) {
    const sum = summary(e), full = exDone(e), open = openId === e.id;
    const flag = e.flag ? `<span class="flag ${e.flag.kind}">${e.flag.text}</span>` : "";
    const tick = sum ? `<div class="tick${full ? "" : " pending"}">${full ? "✓ " : ""}${sum}</div>` : `<div class="tick last">${lastLine(e)}</div>`;
    const loadCell = e.unit === "s" ? `${e.wMax}<small>SEK</small>` : `${e.pair ? "2×" : ""}${fmtW(e.kg)}<small>KG</small>`; // nie stillschweigend "0 kg" bei Zeit-Übungen
    return `<div class="row${open ? " open" : ""}" data-ex="${e.id}">
      <div class="head"><div><div class="rname">${esc(e.name)}${flag}</div>
        <div class="rmeta">${e.sets} × ${e.wMin}–${e.wMax}${e.unit === "s" ? " s" : e.sides ? " / Seite" : ""} · ${esc(e.muscle)}</div>${tick}</div>
        <div class="rload">${loadCell}</div><div class="fslot"></div></div>
      ${open ? detailHtml(e) : ""}</div>`;
  }

  function detailHtml(e) {
    const demo = e.figure && FIG[e.figure] ? `<div class="demo"><svg class="stage anim" viewBox="0 0 104 104" data-zoom="${e.figure}" style="--demo-loop:${tempoSeconds(e.tempo)}s">${FIG[e.figure]}</svg>
      <div class="txt"><b>Tempo ${esc(e.tempo || "—")}</b>${esc(e.tempoText || "")}
      <div class="ctrl"><a href="${esc(e.explain || "https://modusx.de/fitness-uebungen/")}" target="_blank" rel="noopener">Erklärung ↗</a></div></div></div>` : "";
    const hints = e.hints ? `<h4>Ausführung</h4><ol class="hints">${e.hints.map((h) => `<li>${esc(h)}</li>`).join("")}</ol>` : "";
    const isSec = e.unit === "s";
    const rows = st[e.id].sets.map((s, k) => `
      <div class="setrow${s.done ? " ok" : ""}" data-k="${k}">
        <div class="setno">${k + 1}</div>
        <div class="field${s.reps < e.wMin || s.reps > e.wMax ? " devmark" : ""}"><button data-f="reps" data-d="-1">−</button><span class="val">${s.reps}</span><span class="unit">${unitLabel(e)}</span><button data-f="reps" data-d="1">+</button></div>
        ${isSec ? '<div class="field" style="visibility:hidden"></div>' : `<div class="field${s.kg !== e.kg ? " devmark" : ""}"><button data-f="kg" data-d="-1">−</button><span class="val">${fmtW(s.kg)}</span><span class="unit">kg</span><button data-f="kg" data-d="1">+</button></div>`}
        <button class="done" aria-label="Satz ${k + 1} erledigt">✓</button></div>`).join("");
    const { lastDate, last } = st[e.id];
    const hint = last ? `Vorbelegt mit dem <b>letzten Ist</b> (${lastDate.slice(8)}.${lastDate.slice(5, 7)}.: ${last.map((x) => x.reps).join(" / ")}${isSec ? " s" : ""}).` : `Noch kein Ist — Vorbelegung aus dem Plan.`;
    const target = isSec ? `${e.sets} × ${e.wMin}–${e.wMax} s (Körpergewicht)` : `${e.sets} × ${e.wMin}–${e.wMax} @ ${e.pair ? "2×" : ""}${fmtW(e.kg)} kg`;
    return `<div class="detail">${demo}${hints}
      <h4>Sätze eintragen · <em>Ziel ${target}</em></h4>${rows}
      <div class="hintline">${hint} Orange = außerhalb der Plan-Spanne — markiert, nicht bewertet. Ein Satz zählt erst mit ✓.</div>
      <button class="allbtn">Alle ${e.sets} wie geplant ✓ &nbsp;${e.wMax}${isSec ? " s" : ` @ ${e.pair ? "2×" : ""}${fmtW(e.kg)} kg`}</button>
      ${e.note ? `<div class="note">${e.note}</div>` : ""}${renderNoteBlock(e)}</div>`;
  }

  // ---------- v4: persönliche Übungsnotizen — ACTIVE/REVIEW/RESOLVED (siehe logic.js) ----------
  function noteFormHtml(e, existing) {
    const val = existing ? existing.note : "";
    return `<div class="xnote-form" data-note-form="${e.id}">
      <textarea class="xnote-ta" id="noteta-${e.id}" maxlength="2000" placeholder="Eigene Notiz zu ${esc(e.name)} …">${esc(val)}</textarea>
      <div class="xnote-formrow">
        <button class="xnote-save" data-save-note="${e.id}" data-note-id="${existing ? existing.id : ""}">Speichern</button>
        <button class="xnote-cancel" data-cancel-note="${e.id}">Abbrechen</button></div></div>`;
  }
  function noteHistoryHtml(e) {
    const hist = LOGIC.resolvedNotesOf(data.notes || [], e.id);
    if (!hist.length) return "";
    return `<div class="xnote-hist"><h4>Notiz-Verlauf</h4>${hist.map((n) => `<div class="xnote-row">
      <div class="xnote-row-dates">${shortDate(n.text_updated_at.slice(0, 10))}–${shortDate(n.resolved_at.slice(0, 10))}</div>
      <div class="xnote-row-text">${esc(n.note)}</div></div>`).join("")}</div>`;
  }
  // Trainingsabschluss beweist NICHT Symptomfreiheit — kein automatisches Auflösen, nur EINE Rückfrage
  // (noteStatus/sessionsSinceDate, siehe logic.js). Bei fehlender Migration (data.notesError) klarer Hinweis
  // statt stillschweigend leerer/erfundener Notiz-UI.
  function renderNoteBlock(e) {
    if (data.notesError) return `<div class="hintline">Eigene Notizen aktuell nicht verfügbar (Migration <b>supabase/schema-v4.sql</b> fehlt oder Fehler: ${esc(data.notesError)}).</div>`;
    const editing = noteEditId === e.id;
    const active = LOGIC.activeNoteOf(data.notes || [], e.id);
    let block = "";
    if (editing) {
      block += noteFormHtml(e, active);
    } else if (active) {
      const since = shortDate(active.text_updated_at.slice(0, 10));
      const sessionsSince = LOGIC.sessionsSinceDate(data.rows, e.id, active.text_updated_at.slice(0, 10));
      const status = LOGIC.noteStatus(active, sessionsSince);
      if (status === "review") {
        block += `<div class="xnote review"><div class="xnote-text">${esc(active.note)}</div>
          <div class="xnote-meta">seit ${since}</div><div class="xnote-q">Gilt das noch?</div>
          <div class="xnote-actions"><button class="xnote-keep" data-keep="${active.id}">Behalten</button>
          <button class="xnote-done" data-done="${active.id}">Erledigt</button></div></div>`;
      } else {
        block += `<div class="xnote active"><div class="xnote-text">${esc(active.note)}</div>
          <div class="xnote-meta">seit ${since}</div>
          <div class="xnote-actions"><button class="xnote-edit" data-edit-note="${e.id}">Bearbeiten</button>
          <button class="xnote-done" data-done="${active.id}">Erledigt</button></div></div>`;
      }
    } else {
      block += `<button class="xnote-add" data-add-note="${e.id}">+ Notiz</button>`;
    }
    return block + noteHistoryHtml(e);
  }
  // Tempo-Text wie "2-1-2" (Sekunden je Phase) in eine CSS-Animationsdauer übersetzen; "halten" (z. B. Plank) = 2.4s Standard-Loop.
  function tempoSeconds(tempo) {
    if (!tempo) return 2.4;
    const parts = tempo.split("-").map(Number).filter((n) => !Number.isNaN(n));
    return parts.length ? parts.reduce((a, b) => a + b, 0) : 2.4;
  }

  // ---------- v4: persönliche Übungsnotizen — Klick-Wiring (Create/Edit/Behalten/Erledigt) ----------
  // Jede Mutation lädt exercise_notes über loadNotes() NEU statt lokal zu patchen: eine einzige Quelle der
  // Wahrheit (wie bei mutate() für Sätze), vermeidet Drift zwischen UI-Annahme und echtem Serverstand.
  function wireNotes() {
    app.querySelectorAll("[data-add-note]").forEach((b) => b.onclick = () => { noteEditId = b.dataset.addNote; render(); });
    app.querySelectorAll("[data-edit-note]").forEach((b) => b.onclick = () => { noteEditId = b.dataset.editNote; render(); });
    app.querySelectorAll("[data-cancel-note]").forEach((b) => b.onclick = () => { noteEditId = null; render(); });
    app.querySelectorAll("[data-save-note]").forEach((b) => b.onclick = async () => {
      const exId = b.dataset.saveNote, noteId = b.dataset.noteId || null;
      const ta = $("#noteta-" + exId); const val = (ta.value || "").trim();
      if (!val) { toast("Bitte Text eingeben."); return; }
      const myGen = gen;
      const existing = noteId ? (data.notes || []).find((n) => n.id === noteId) : null;
      const now = new Date().toISOString();
      let err;
      if (existing) {
        // Nur eine INHALTLICHE Änderung bumpt text_updated_at und setzt die Review-Berechtigung zurück
        // (review_ack_at=null) — reines erneutes Speichern desselben Texts darf den Zähler nicht neu starten.
        const changed = LOGIC.noteTextChanged(existing.note, val);
        const patch = changed ? { note: val, text_updated_at: now, review_ack_at: null } : { note: val };
        ({ error: err } = await sb.from("exercise_notes").update(patch).eq("id", noteId));
      } else {
        ({ error: err } = await sb.from("exercise_notes").insert({ exercise_id: exId, note: val, text_updated_at: now, review_ack_at: null, resolved_at: null }));
      }
      if (myGen !== gen) return;
      if (err) { toast("Notiz nicht gespeichert: " + err.message); return; }
      noteEditId = null;
      await loadNotes(myGen);
      if (myGen !== gen) return;
      render();
    });
    app.querySelectorAll("[data-keep]").forEach((b) => b.onclick = async () => {
      const myGen = gen;
      const { error } = await sb.from("exercise_notes").update({ review_ack_at: new Date().toISOString() }).eq("id", b.dataset.keep);
      if (myGen !== gen) return;
      if (error) { toast("Nicht gespeichert: " + error.message); return; }
      await loadNotes(myGen);
      if (myGen !== gen) return;
      render();
    });
    app.querySelectorAll("[data-done]").forEach((b) => b.onclick = async () => {
      // Erledigt = Soft-Resolve (resolved_at setzen). NIE ein DELETE — die Zeile bleibt als Verlauf erhalten.
      const myGen = gen;
      const { error } = await sb.from("exercise_notes").update({ resolved_at: new Date().toISOString() }).eq("id", b.dataset.done);
      if (myGen !== gen) return;
      if (error) { toast("Nicht gespeichert: " + error.message); return; }
      await loadNotes(myGen);
      if (myGen !== gen) return;
      render();
    });
  }

  function wireHeute(p) {
    $("#out").onclick = () => sb.auth.signOut();
    app.querySelectorAll(".head").forEach((h) => h.onclick = () => { const id = h.closest(".row").dataset.ex; openId = openId === id ? null : id; render(); });
    wireNotes();
    app.querySelectorAll("[data-zoom]").forEach((s) => s.onclick = () => { $("#bigsvg").innerHTML = FIG[s.dataset.zoom]; $("#bigsvg").classList.add("anim"); $("#bigsvg").style.setProperty("--demo-loop", s.style.getPropertyValue("--demo-loop")); $("#big").classList.add("on"); });
    app.querySelectorAll(".row.open").forEach((row) => {
      const e = p.exs.find((x) => x.id === row.dataset.ex);
      row.querySelectorAll(".setrow").forEach((r) => {
        const k = +r.dataset.k, s = st[e.id].sets[k];
        r.querySelectorAll(".field button").forEach((b) => b.onclick = () => {
          const f = b.dataset.f, step = f === "kg" ? 2 : (e.unit === "s" ? 5 : 1); // Sekunden in 5er-, kg in 2er-Schritten
          mutate(e, k, { [f]: Math.max(0, s[f] + (+b.dataset.d) * step) });
        });
        r.querySelector(".done").onclick = () => mutate(e, k, { done: !s.done });
      });
      row.querySelector(".allbtn").onclick = async () => {
        for (let k = 0; k < e.sets; k++) await mutate(e, k, { reps: e.wMax, kg: e.kg, done: true });
      };
    });
  }

  // ---------- Start ----------
  async function boot() {
    const { data: s } = await sb.auth.getSession();
    if (!s.session) return showLogin({ mode: "password" });
    currentUserId = s.session.user.id; currentEmail = s.session.user.email;
    app.innerHTML = `<div class="login"><p>Lade …</p></div>`;
    try { activeId = null; await refresh(); tab = "uebersicht"; render(); }
    catch (err) { app.innerHTML = `<div class="login"><h1>GymBro</h1><p>Laden fehlgeschlagen: ${esc(err.message)}</p></div>`; }
  }
  // supabase-js feuert SIGNED_IN auch beim bloßen Zurückkehren in den Tab — nur beim echten Login/Kontowechsel
  // neu starten, sonst gingen Tab-Stand und noch nicht bestätigte Eingaben verloren. PASSWORD_RECOVERY zeigt
  // immer den "neues Passwort setzen"-Screen, unabhängig vom booted-Stand (kommt per Link von außen).
  // Mehrbenutzer: wechselt die Session auf eine ANDERE user_id (z. B. Abmelden + sofortiges Anmelden als
  // jemand anders im selben Tab), wird der komplette Client-Zustand verworfen, bevor neu geladen wird —
  // sonst könnten kurz Plan-/Satz-Daten des vorherigen Kontos sichtbar bleiben.
  let booted = false;
  sb.auth.onAuthStateChange((ev, sess) => {
    if (ev === "PASSWORD_RECOVERY") { recoveryMode = true; showSetPassword(); return; }
    if (ev === "SIGNED_OUT") { gen++; resetState(); booted = false; if (!recoveryMode) showLogin({ mode: "password" }); return; }
    if (ev === "SIGNED_IN" && !recoveryMode) {
      const incomingId = sess && sess.user && sess.user.id;
      if (booted && incomingId && incomingId === currentUserId) return; // selbe Person, z. B. Tab-Refokus — kein Reset
      gen++; resetState(); booted = true; boot();
    }
  });
  booted = true; boot();

  // Test-Hook: ausschließlich für isolierte Browser-Tests mit Mock-Supabase (siehe test/). Kein Effekt in Produktion,
  // da echte Seiten diesen Namespace nicht abfragen.
  window.__GYMBRO_TEST__ = { go, start, render, openEditor,
    get: () => ({ data, st, activeId, tab, form, openId }) };
})();
