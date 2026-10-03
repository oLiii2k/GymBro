// GymBro v2 — Übersicht, Heute (Satz-Eingabe), Pläne. Supabase für Auth + Daten.
// Grundregeln (README): Wo ein Wert aus der Historie bekannt ist, wird er VORGESCHLAGEN statt leer
// gestartet; gespeichert wird erst nach Bestätigung (✓ bzw. "Plan speichern").
// Farbcode: Orange = weicht von der Vorgabe ab, Grün = bestätigt, Blau = anfassbare Aktion.
(() => {
  const EXS = window.GYMBRO_LIBRARY, PLAN_A = window.GYMBRO_PLAN_A, FIG = window.GYMBRO_FIGURES, CFG = window.GYMBRO_CONFIG || {};
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
  const SINCE = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 28)); // Historienfenster
  const kw = (() => { // ISO-Kalenderwoche
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
  })();
  const dateLabel = today.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const shortDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const fmtKg = (n) => Math.round(n).toLocaleString("de-DE") + " kg";
  const fmtW = (n) => String(n).replace(".", ",");

  // ---------- Theme ----------
  const tb = $("#t"), root = document.documentElement;
  tb.onclick = () => { const d = root.dataset.theme === "dark"; root.dataset.theme = d ? "light" : "dark"; tb.textContent = d ? "🌙 Dunkel" : "☀ Hell"; };
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("on"), 4000); }

  // ---------- Zustand ----------
  // data  = { plans:[{id,label,name,builtin,exs:[…]}], rows:[Sätze der letzten 28 Tage], lastBy:{exId:[Sätze letzter Tag]} }
  // st    = Satz-Eingabe für den AKTIVEN Plan: st[exId] = { sets:[{reps,kg,done}], last, lastDate }
  let sb, data = null, st = {}, activeId = null, tab = "uebersicht", openId = null, form = null;
  const mult = (e) => (e.pair ? 2 : 1) * (e.sides ? 2 : 1);
  const vol = (e, s) => s.reps * s.kg * mult(e);
  const plan = (id) => data.plans.find((p) => p.id === id);
  const planSets = (p) => p.exs.reduce((a, e) => a + e.sets, 0);
  const planTitle = (p) => `Training ${p.label} — ${p.name}`;

  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY || !window.supabase) {
    app.innerHTML = `<div class="login"><h1>GymBro</h1><p>Supabase ist noch nicht verbunden. Trage <b>SUPABASE_URL</b> und <b>SUPABASE_ANON_KEY</b> in <code>config.js</code> ein und führe <code>supabase/schema.sql</code> im SQL-Editor aus.</p></div>`;
    return;
  }
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

  // ---------- Auth: Magic Link ----------
  function showLogin(msg) {
    app.innerHTML = `<form class="login" id="lf"><h1>GymBro</h1>
      <p>${msg || "Anmelden per Magic Link: E-Mail eingeben, Link im Postfach antippen."}</p>
      <input type="email" id="em" placeholder="E-Mail" autocomplete="email" required>
      <button class="save" type="submit">Link senden</button></form>`;
    $("#lf").onsubmit = async (ev) => {
      ev.preventDefault();
      const { error } = await sb.auth.signInWithOtp({ email: $("#em").value.trim(), options: { emailRedirectTo: location.href.split("#")[0] } });
      showLogin(error ? "Fehler: " + esc(error.message) : "Link ist unterwegs. Öffne ihn auf diesem Gerät.");
    };
  }

  // ---------- Laden ----------
  const resolve = (pe) => (LIB[pe.id] ? { ...LIB[pe.id], sets: pe.sets, wMin: pe.wMin, wMax: pe.wMax, kg: pe.kg } : null);

  async function load() {
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
    // Plan A ist im Code fest; weitere Pläne aus der DB. Buchstaben A–E ergeben sich aus der Reihenfolge.
    const raw = [{ id: "A", builtin: true, name: PLAN_A.name, exercises: PLAN_A.ids.map((id) => ({ id, sets: LIB[id].sets, wMin: LIB[id].wMin, wMax: LIB[id].wMax, kg: LIB[id].kg })) },
      ...pl.data.map((p) => ({ id: p.id, name: p.name, exercises: p.exercises }))];
    const plans = raw.slice(0, MAX_PLANS).map((p, i) => ({ ...p, label: LABELS[i], exs: p.exercises.map(resolve).filter(Boolean) }));
    data = { plans, rows: rw.data, lastBy };
  }

  // "Dran" = der Plan nach dem zuletzt trainierten (Rotation). Ohne Historie: Plan A.
  function dranId() {
    if (!data.rows.length) return data.plans[0].id;
    const m = data.rows.reduce((a, b) => (b.date > a.date || (b.date === a.date && b.done_at > a.done_at) ? b : a));
    const i = data.plans.findIndex((p) => p.id === m.plan_id);
    return data.plans[(i + 1) % data.plans.length].id; // i = -1 (Plan gelöscht) → Plan A
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
    if (!activeId || !plan(activeId)) { activeId = dranId(); buildState(plan(activeId)); }
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
  async function mutate(e, k, patch) {
    const s = st[e.id].sets[k], old = { ...s };
    Object.assign(s, patch);
    render();
    let err = null;
    if (s.done) err = await persist(e, k);
    else if (old.done) err = await unpersist(e, k);
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
  const ICON = { uebersicht: "⌂", heute: "▶", plaene: "☰" };
  const TABS = [["uebersicht", "Übersicht"], ["heute", "Heute"], ["plaene", "Pläne"]];
  function shell(inner) {
    const t = tab === "neu" ? "plaene" : tab;
    app.innerHTML = `<div class="screen">${inner}</div>
      <nav class="tabs">${TABS.map(([id, w]) => `<button data-tab="${id}" class="${t === id ? "on" : ""}"${t === id ? ' aria-current="page"' : ""}><i>${ICON[id]}</i>${w}</button>`).join("")}</nav>`;
    app.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => go(b.dataset.tab));
  }
  async function go(t) {
    tab = t; openId = null;
    if (t !== "heute") { try { await refresh(); } catch (err) { toast("Laden fehlgeschlagen: " + err.message); } }
    render();
  }
  function start(id) { activeId = id; buildState(plan(id)); tab = "heute"; openId = null; render(); }

  function render() {
    if (tab === "heute") return renderHeute();
    if (tab === "plaene") return renderPlaene();
    if (tab === "neu") return renderForm();
    return renderUebersicht();
  }

  // ---------- Übersicht ----------
  function histories() { // eine "Einheit" = Datum + Plan
    const g = {};
    data.rows.forEach((r) => { const k = r.date + "|" + r.plan_id; (g[k] = g[k] || { date: r.date, plan_id: r.plan_id, n: 0 }).n++; });
    return Object.values(g).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 6);
  }
  function renderUebersicht() {
    const dran = plan(dranId()), recent = histories();
    const hist = recent.length ? recent.map((h) => {
      const p = plan(h.plan_id), total = p ? planSets(p) : null;
      const full = total !== null && h.n >= total, running = h.date === TODAY && !full;
      const cls = total === null || full ? "ok" : running ? "" : "warn"; // abgebrochen = vergangen und unvollständig
      return `<div class="hrow"><div><div class="rname">${p ? esc(planTitle(p)) : "Gelöschter Plan"}</div><div class="rmeta">${shortDate(h.date)}</div></div>
        <div class="hval ${cls}">${running ? "läuft · " : ""}${total === null ? h.n : `${h.n}/${total}`} Sätze</div></div>`;
    }).join("") : `<div class="hintline">Noch keine Einheit — starte oben die erste.</div>`;
    shell(`<header><h1>GymBro</h1><div class="sub">${dateLabel} · KW ${kw}</div></header><div class="pad">
      <div class="card"><div class="label">Als Nächstes</div><div class="ctitle">${esc(planTitle(dran))}</div>
        <div class="rmeta">${dran.exs.length} Übungen · ${planSets(dran)} Sätze</div>
        <button class="save" data-start="${dran.id}">Starten</button></div>
      <h4>Pläne</h4>${data.plans.map((p) => `<div class="hrow"><div class="rname">${esc(planTitle(p))}</div>${p.id === dran.id ? '<span class="chip">Dran</span>' : ""}</div>`).join("")}
      <h4>Letzte Einheiten</h4>${hist}</div>`);
    wireStart();
  }
  const wireStart = () => app.querySelectorAll("[data-start]").forEach((b) => b.onclick = () => start(b.dataset.start));

  // ---------- Pläne ----------
  function renderPlaene() {
    const dran = dranId();
    const rows = data.plans.map((p) => `<div class="prow"><div class="plet">${p.label}</div>
      <div class="pmain"><div class="rname">${esc(p.name)}${p.id === dran ? ' <span class="chip">Dran</span>' : ""}</div>
        <div class="rmeta">${p.exs.length} Übungen · ${planSets(p)} Sätze</div>
        ${p.builtin ? "" : `<button class="linkbtn" data-del="${p.id}">Löschen</button>`}</div>
      <button class="go" data-start="${p.id}">Starten</button></div>`).join("");
    const full = data.plans.length >= MAX_PLANS;
    shell(`<header><h1>Pläne</h1><div class="sub">${data.plans.length} von ${MAX_PLANS} · gleichberechtigt, Reihenfolge = Rotation</div></header><div class="pad">${rows}
      <button class="dashed" id="newplan"${full ? " disabled" : ""}>${full ? `Maximal ${MAX_PLANS} Pläne` : "+ Neuer Plan"}</button></div>`);
    wireStart();
    const n = $("#newplan"); if (n) n.onclick = () => { form = { name: "", sel: {} }; tab = "neu"; render(); };
    app.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!confirm("Plan löschen? Bereits gespeicherte Sätze bleiben erhalten.")) return;
      const { error } = await sb.from("plans").delete().eq("id", b.dataset.del);
      if (error) return toast("Nicht gelöscht: " + error.message);
      if (activeId === b.dataset.del) activeId = null;
      await go("plaene");
    });
  }

  // ---------- Plan anlegen ----------
  // Zielspanne/Sätze/kg = Vorschlag aus dem letzten Ist der Übung (Bibliotheks-Standard, falls noch keins existiert)
  function suggest(e) {
    const l = data.lastBy[e.id];
    if (!l) return { sets: e.sets, wMin: e.wMin, wMax: e.wMax, kg: e.kg, from: null };
    const reps = l.map((x) => x.reps);
    return { sets: l.length, wMin: Math.min(...reps), wMax: Math.max(...reps), kg: +l[0].weight, from: l[0].date };
  }
  function renderForm() {
    const picks = EXS.map((e) => {
      const s = form.sel[e.id];
      const spec = s ? `<div class="spec">${[["sets", "Sätze"], ["wMin", "Wdh von"], ["wMax", "Wdh bis"], ["kg", "kg"]].map(([f, l]) =>
        `<label>${l}<input type="number" inputmode="decimal" min="0" step="${f === "kg" ? 0.5 : 1}" data-ex="${e.id}" data-f="${f}" value="${s[f]}"></label>`).join("")}
        <div class="hintline">${s.from ? `Vorschlag aus dem Ist vom ${shortDate(s.from)}` : "Noch kein Ist — Standardvorgabe"}</div></div>` : "";
      return `<div class="pickwrap"><label class="pick"><input type="checkbox" data-pick="${e.id}"${s ? " checked" : ""}><span>${esc(e.name)}<small>${esc(e.muscle)}</small></span></label>${spec}</div>`;
    }).join("");
    shell(`<header><h1>Neuer Plan</h1><div class="sub">Nur Übungen aus der Bibliothek</div></header><div class="pad">
      <input class="txt" id="pn" maxlength="60" placeholder="Name des Plans, z. B. Unterkörper" value="${esc(form.name)}">
      <h4>Übungen</h4>${picks}
      <button class="save" id="saveplan">Plan speichern</button><button class="linkbtn" id="cancel">Abbrechen</button></div>`);
    $("#pn").oninput = (ev) => { form.name = ev.target.value; };
    app.querySelectorAll("[data-pick]").forEach((c) => c.onchange = () => {
      const id = c.dataset.pick;
      if (c.checked) form.sel[id] = suggest(LIB[id]); else delete form.sel[id];
      renderForm();
    });
    app.querySelectorAll("input[data-ex]").forEach((i) => i.oninput = () => { form.sel[i.dataset.ex][i.dataset.f] = i.value === "" ? "" : +i.value; });
    $("#cancel").onclick = () => go("plaene");
    $("#saveplan").onclick = async () => {
      const exs = EXS.filter((e) => form.sel[e.id]).map((e) => { const { sets, wMin, wMax, kg } = form.sel[e.id]; return { id: e.id, sets, wMin, wMax, kg }; });
      const bad = exs.find((x) => !(x.sets >= 1) || !(x.wMin >= 0) || !(x.wMax >= x.wMin) || !(x.kg >= 0));
      if (!form.name.trim()) return toast("Bitte einen Namen eingeben.");
      if (!exs.length) return toast("Mindestens eine Übung wählen.");
      if (bad) return toast(`Ungültige Werte bei ${LIB[bad.id].name} (Wdh bis ≥ von, Sätze ≥ 1).`);
      const { error } = await sb.from("plans").insert({ name: form.name.trim(), exercises: exs });
      if (error) return toast("Nicht gespeichert: " + error.message);
      await go("plaene");
    };
  }

  // ---------- Heute (Satz-Eingabe) ----------
  const summary = (e) => { // Ist-Zeile: "2×17 kg · 10 / 10 / 8"
    const d = st[e.id].sets.filter((s) => s.done); if (!d.length) return null;
    const kgs = [...new Set(d.map((s) => fmtW(s.kg)))].join("/");
    return `${e.pair ? "2×" : ""}${kgs} kg · ${st[e.id].sets.map((s) => (s.done ? s.reps : "–")).join(" / ")}`;
  };
  const lastLine = (e) => { const { last } = st[e.id]; return last ? `zuletzt ${last.map((x) => x.reps).join(" / ")} @ ${fmtW(+last[0].weight)} kg` : "noch kein Ist"; };
  const exDone = (e) => st[e.id].sets.every((s) => s.done);

  function renderHeute() {
    const p = plan(activeId);
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
    return `<div class="row${open ? " open" : ""}" data-ex="${e.id}">
      <div class="head"><div><div class="rname">${e.name}${flag}</div>
        <div class="rmeta">${e.sets} × ${e.wMin}–${e.wMax}${e.sides ? " / Seite" : ""} · ${e.muscle}</div>${tick}</div>
        <div class="rload">${e.pair ? "2×" : ""}${fmtW(e.kg)}<small>KG</small></div><div class="fslot"></div></div>
      ${open ? detailHtml(e) : ""}</div>`;
  }

  function detailHtml(e) {
    const demo = e.figure && FIG[e.figure] ? `<div class="demo"><svg class="stage" viewBox="0 0 104 104" data-zoom="${e.figure}">${FIG[e.figure]}</svg>
      <div class="txt"><b>Endposition · Tempo ${e.tempo}</b>${e.tempoText}
      <div class="ctrl"><a href="https://modusx.de/fitness-uebungen/" target="_blank" rel="noopener">Erklärung ↗</a></div></div></div>` : "";
    const hints = e.hints ? `<h4>Ausführung</h4><ol class="hints">${e.hints.map((h) => `<li>${h}</li>`).join("")}</ol>` : "";
    const rows = st[e.id].sets.map((s, k) => `
      <div class="setrow${s.done ? " ok" : ""}" data-k="${k}">
        <div class="setno">${k + 1}</div>
        <div class="field${s.reps < e.wMin || s.reps > e.wMax ? " devmark" : ""}"><button data-f="reps" data-d="-1">−</button><span class="val">${s.reps}</span><span class="unit">Wdh</span><button data-f="reps" data-d="1">+</button></div>
        <div class="field${s.kg !== e.kg ? " devmark" : ""}"><button data-f="kg" data-d="-1">−</button><span class="val">${fmtW(s.kg)}</span><span class="unit">kg</span><button data-f="kg" data-d="1">+</button></div>
        <button class="done" aria-label="Satz ${k + 1} erledigt">✓</button></div>`).join("");
    const { lastDate, last } = st[e.id];
    const hint = last ? `Vorbelegt mit dem <b>letzten Ist</b> (${lastDate.slice(8)}.${lastDate.slice(5, 7)}.: ${last.map((x) => x.reps).join(" / ")}).` : `Noch kein Ist — Vorbelegung aus dem Plan.`;
    return `<div class="detail">${demo}${hints}
      <h4>Sätze eintragen · <em>Ziel ${e.sets} × ${e.wMin}–${e.wMax} @ ${e.pair ? "2×" : ""}${fmtW(e.kg)} kg</em></h4>${rows}
      <div class="hintline">${hint} Orange = außerhalb der Plan-Spanne — markiert, nicht bewertet. Ein Satz zählt erst mit ✓.</div>
      <button class="allbtn">Alle ${e.sets} wie geplant ✓ &nbsp;${e.wMax} @ ${e.pair ? "2×" : ""}${fmtW(e.kg)} kg</button>
      ${e.note ? `<div class="note">${e.note}</div>` : ""}</div>`;
  }

  function wireHeute(p) {
    $("#out").onclick = () => sb.auth.signOut();
    app.querySelectorAll(".head").forEach((h) => h.onclick = () => { const id = h.closest(".row").dataset.ex; openId = openId === id ? null : id; render(); });
    app.querySelectorAll("[data-zoom]").forEach((s) => s.onclick = () => { $("#bigsvg").innerHTML = FIG[s.dataset.zoom]; $("#big").classList.add("on"); });
    app.querySelectorAll(".row.open").forEach((row) => {
      const e = p.exs.find((x) => x.id === row.dataset.ex);
      row.querySelectorAll(".setrow").forEach((r) => {
        const k = +r.dataset.k, s = st[e.id].sets[k];
        r.querySelectorAll(".field button").forEach((b) => b.onclick = () => {
          const f = b.dataset.f, step = f === "kg" ? 2 : 1; // kg in 2er-Schritten wie im Mockup
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
    if (!s.session) return showLogin();
    app.innerHTML = `<div class="login"><p>Lade …</p></div>`;
    try { activeId = null; await refresh(); tab = "uebersicht"; render(); }
    catch (err) { app.innerHTML = `<div class="login"><h1>GymBro</h1><p>Laden fehlgeschlagen: ${esc(err.message)}</p></div>`; }
  }
  // supabase-js feuert SIGNED_IN auch beim bloßen Zurückkehren in den Tab — nur beim echten Login neu starten,
  // sonst gingen Tab-Stand und noch nicht bestätigte Eingaben verloren.
  let booted = false;
  sb.auth.onAuthStateChange((ev) => {
    if (ev === "SIGNED_OUT") { booted = false; showLogin(); }
    else if (ev === "SIGNED_IN" && !booted) { booted = true; boot(); }
  });
  booted = true; boot();
})();
