// GymBro v1 — Scan-Liste, Satz-Eingabe, Supabase-Anbindung.
// Grundregeln (README): Vorbelegung = letztes tatsächliches Ist; kein Satz zählt ohne ✓;
// nur ✓-Sätze landen in der DB und im Volumen.
(() => {
  const PLAN = window.GYMBRO_PLAN, FIG = window.GYMBRO_FIGURES, CFG = window.GYMBRO_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const app = $("#app");

  // ---------- Datum (lokal, nicht UTC — sonst kippt der Tag nachts) ----------
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date(), TODAY = iso(today);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Montag
  const WEEK_START = iso(weekStart);
  const kw = (() => { // ISO-Kalenderwoche
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
  })();
  const dateLabel = today.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const fmtKg = (n) => Math.round(n).toLocaleString("de-DE") + " kg";
  const fmtW = (n) => String(n).replace(".", ",");

  // ---------- Theme ----------
  const tb = $("#t"), root = document.documentElement;
  tb.onclick = () => { const d = root.dataset.theme === "dark"; root.dataset.theme = d ? "light" : "dark"; tb.textContent = d ? "🌙 Dunkel" : "☀ Hell"; };

  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("on"), 4000); }

  // ---------- Zustand ----------
  // st[exId] = { sets:[{reps,kg,done}], last:[{reps,weight}]|null, lastDate }
  let sb, st = {}, openId = null, weekVol = 0;
  const mult = (e) => (e.pair ? 2 : 1) * (e.sides ? 2 : 1);
  const vol = (e, s) => s.reps * s.kg * mult(e);

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
      showLogin(error ? "Fehler: " + error.message : "Link ist unterwegs. Öffne ihn auf diesem Gerät.");
    };
  }

  // ---------- Laden ----------
  async function load() {
    const ids = PLAN.exercises.map((e) => e.id);
    // Eine Abfrage: alles ab Wochenbeginn (Wochensumme + heute) …
    const wk = await sb.from("sets").select("date,exercise,set_index,reps,weight").gte("date", WEEK_START).in("exercise", ids);
    if (wk.error) throw wk.error;
    // … und je Übung der letzte Trainingstag VOR heute (Vorbelegung, egal wie lange her)
    const lasts = await Promise.all(PLAN.exercises.map((e) =>
      sb.from("sets").select("date,set_index,reps,weight").eq("exercise", e.id).lt("date", TODAY)
        .order("date", { ascending: false }).order("set_index").limit(e.sets * 2)));
    st = {}; weekVol = 0;
    PLAN.exercises.forEach((e, i) => {
      const r = lasts[i]; if (r.error) throw r.error;
      const lastDate = r.data.length ? r.data[0].date : null;
      const last = lastDate ? r.data.filter((x) => x.date === lastDate) : null;
      const sets = Array.from({ length: e.sets }, (_, k) => {
        const l = last && (last.find((x) => x.set_index === k + 1) || last[last.length - 1]);
        // Vorschlag = letztes Ist, sonst Plan-Vorgabe (oberes Ende der Spanne)
        return { reps: l ? l.reps : e.wMax, kg: l ? +l.weight : e.kg, done: false };
      });
      st[e.id] = { sets, last, lastDate };
    });
    for (const row of wk.data) {
      const e = PLAN.exercises.find((x) => x.id === row.exercise);
      const s = { reps: row.reps, kg: +row.weight };
      weekVol += vol(e, s);
      const slot = st[e.id].sets[row.set_index - 1];
      if (row.date === TODAY && slot) Object.assign(slot, s, { done: true });
    }
  }

  // ---------- Schreiben (nur ✓) ----------
  async function persist(e, k) {
    const s = st[e.id].sets[k];
    const { error } = await sb.from("sets").upsert(
      { date: TODAY, exercise: e.id, set_index: k + 1, reps: s.reps, weight: s.kg, done_at: new Date().toISOString() },
      { onConflict: "user_id,date,exercise,set_index" });
    return error;
  }
  async function unpersist(e, k) {
    const { error } = await sb.from("sets").delete().eq("date", TODAY).eq("exercise", e.id).eq("set_index", k + 1);
    return error;
  }

  // Ändert einen Satz (Werte und/oder ✓-Status) optimistisch, schreibt in die DB, rollt bei Fehler zurück.
  // Die Wochensumme wird hier zentral nachgeführt: alter Beitrag raus, neuer rein.
  async function mutate(e, k, patch) {
    const s = st[e.id].sets[k], old = { ...s };
    if (s.done) weekVol -= vol(e, s);
    Object.assign(s, patch);
    if (s.done) weekVol += vol(e, s);
    render();
    let err = null;
    if (s.done) err = await persist(e, k);
    else if (old.done) err = await unpersist(e, k);
    if (err) {
      if (s.done) weekVol -= vol(e, s);
      Object.assign(s, old);
      if (s.done) weekVol += vol(e, s);
      render(); toast("Nicht gespeichert: " + err.message);
    }
  }

  // ---------- Rendering ----------
  const summary = (e) => { // Ist-Zeile: "2×17 kg · 10 / 10 / 8"
    const d = st[e.id].sets.filter((s) => s.done); if (!d.length) return null;
    const kgs = [...new Set(d.map((s) => fmtW(s.kg)))].join("/");
    return `${e.pair ? "2×" : ""}${kgs} kg · ${st[e.id].sets.map((s) => (s.done ? s.reps : "–")).join(" / ")}`;
  };
  const lastLine = (e) => {
    const { last } = st[e.id]; if (!last) return "noch kein Ist";
    return `zuletzt ${last.map((x) => x.reps).join(" / ")} @ ${fmtW(+last[0].weight)} kg`;
  };
  const exDone = (e) => st[e.id].sets.every((s) => s.done);
  const dayVol = () => PLAN.exercises.reduce((a, e) => a + st[e.id].sets.filter((s) => s.done).reduce((b, s) => b + vol(e, s), 0), 0);

  function render() {
    const totalSets = PLAN.exercises.reduce((a, e) => a + e.sets, 0);
    const doneSets = PLAN.exercises.reduce((a, e) => a + st[e.id].sets.filter((s) => s.done).length, 0);
    const doneEx = PLAN.exercises.filter(exDone).length;
    app.innerHTML = `
      <header><h1>${PLAN.title}</h1>
        <div class="sub">${dateLabel} · ${PLAN.exercises.length} Übungen · ${doneEx} / ${PLAN.exercises.length} erledigt</div>
        <div class="bar"><i style="width:${(doneSets / totalSets) * 100}%"></i></div></header>
      <div class="list">${PLAN.exercises.map(rowHtml).join("")}</div>
      <div class="foot">
        <div class="sum"><span>Heute bewegt</span><b>${fmtKg(dayVol())}</b></div>
        <div class="sum" style="margin-top:3px"><span>Woche (KW ${kw})</span><b>${fmtKg(weekVol)}</b></div>
        <button class="linkbtn" id="out">Abmelden</button></div>`;
    wire();
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

  function wire() {
    $("#out").onclick = () => sb.auth.signOut();
    app.querySelectorAll(".head").forEach((h) => h.onclick = () => { const id = h.closest(".row").dataset.ex; openId = openId === id ? null : id; render(); });
    app.querySelectorAll("[data-zoom]").forEach((s) => s.onclick = () => { $("#bigsvg").innerHTML = FIG[s.dataset.zoom]; $("#big").classList.add("on"); });
    app.querySelectorAll(".row.open").forEach((row) => {
      const e = PLAN.exercises.find((x) => x.id === row.dataset.ex);
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
    const { data } = await sb.auth.getSession();
    if (!data.session) return showLogin();
    app.innerHTML = `<div class="login"><p>Lade …</p></div>`;
    try { await load(); render(); } catch (err) { app.innerHTML = `<div class="login"><h1>GymBro</h1><p>Laden fehlgeschlagen: ${err.message}</p></div>`; }
  }
  sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") boot(); });
  boot();
})();
