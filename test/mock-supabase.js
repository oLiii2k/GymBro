// TEST-ONLY Fixture — isolierter, fest verdrahteter Fake von window.supabase. Niemals echte Daten,
// nie echte Netzwerkaufrufe. Bildet nur die Methoden nach, die app.js tatsächlich aufruft.
// Eindeutig als Test-Fixture gekennzeichnet (Dateiname + Kommentar), kein Teil der Produktions-App.
(function () {
  "use strict";

  // accounts: { "user-a@test": { userId, password, plans:[...], sets:[...] }, ... } — mehrere Konten in
  // EINER Fake-Instanz, damit Tests einen Login-/Kontowechsel im selben Tab durchspielen können, so wie es
  // app.js' onAuthStateChange tatsächlich behandeln muss (siehe gen/resetState in app.js).
  function makeFakeSupabase(seed) {
    seed = seed || {};
    const accounts = seed.accounts || {
      [seed.email]: { userId: seed.userId || "u1", password: seed.password, plans: seed.plans || [], sets: seed.sets || [] }
    };
    Object.keys(accounts).forEach((email) => {
      const a = accounts[email];
      a.email = email;
      a.plans = (a.plans || []).map((p, i) => ({ ...p, id: p.id || email + "-plan-" + i, user_id: a.userId, created_at: p.created_at || new Date(2026, 0, i + 1).toISOString() }));
      a.sets = (a.sets || []).map((s) => ({ ...s, user_id: a.userId }));
      // v4: exercise_notes je Konto. notesTableMissing simuliert ein Projekt, in dem supabase/schema-v4.sql
      // noch NICHT ausgeführt wurde (Postgres-Fehler "relation does not exist") — testet, dass app.js den
      // Rest der App (Sätze/Pläne) davon unberührt lädt.
      a.notes = (a.notes || []).map((n, i) => ({ id: n.id || email + "-note-" + i, user_id: a.userId, ...n }));
      a.notesTableMissing = !!seed.notesTableMissing && (seed.notesTableMissing === true || seed.notesTableMissing === email);
    });
    let session = seed.session || null; // {user:{id,email}} oder null = ausgeloggt
    const listeners = [];
    const fire = (ev) => listeners.forEach((cb) => cb(ev, session));
    // RLS-Simulation: "plans"/"sets" sind GLOBALE Tabellen in Produktion, aber jede Zeile trägt user_id und
    // echte Policies filtern serverseitig auf auth.uid() (siehe supabase/schema.sql). Dieser Mock bildet das
    // nach, indem er NUR Zeilen des aktuell eingeloggten Kontos zurückgibt/ändert — bewusst strenger als
    // nötig für Scan-Komfort, exakt um Cross-Account-Leaks hier deterministisch testen zu können.
    function accountForSession() {
      if (!session) return null;
      return Object.values(accounts).find((a) => a.userId === session.user.id) || null;
    }

    function matchesFilters(row, filters) {
      return filters.every(([op, col, val]) => {
        if (op === "eq") return row[col] === val;
        if (op === "lt") return row[col] < val;
        if (op === "gte") return row[col] >= val;
        return true;
      });
    }

    function tableApi(table) {
      const state = { select: null, filters: [], order: [], limit: null };
      const api = {
        select(cols) { state.select = cols; return api; },
        eq(col, val) { state.filters.push(["eq", col, val]); return api; },
        lt(col, val) { state.filters.push(["lt", col, val]); return api; },
        gte(col, val) { state.filters.push(["gte", col, val]); return api; },
        order(col, opts) { state.order.push([col, opts]); return api; },
        limit(n) { state.limit = n; return api; },
        then(resolve) { return resolve(run()); } // macht die Kette awaitbar, ohne echtes Promise-Thenable-Risiko
      };
      // RLS-Kern: ohne Session oder Konto -> immer leer, NIE Daten eines anderen/keines Kontos.
      function rowsOf() {
        const a = accountForSession(); if (!a) return [];
        if (table === "plans") return a.plans;
        if (table === "exercise_notes") return a.notes;
        return a.sets;
      }
      function missingTable() {
        const a = accountForSession();
        return table === "exercise_notes" && a && a.notesTableMissing;
      }
      function run() {
        if (missingTable()) return { data: null, error: { message: 'relation "public.exercise_notes" does not exist', code: "42P01" } };
        let rows = rowsOf().filter((r) => matchesFilters(r, state.filters));
        // Mehrfach-.order() muss wie SQL ORDER BY a,b wirken: zuerst zuletzt angegebene (am wenigsten
        // signifikante) Spalte sortieren, dann rückwärts bis zur ersten — Array.sort ist stabil, das reicht.
        state.order.slice().reverse().forEach(([col, opts]) => {
          rows = rows.slice().sort((a, b) => {
            const d = a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0;
            return opts && opts.ascending === false ? -d : d;
          });
        });
        if (state.limit) rows = rows.slice(0, state.limit);
        return { data: rows.map((r) => ({ ...r })), error: null };
      }
      api.insert = (row) => {
        const a = accountForSession();
        if (!a) return Promise.resolve({ data: null, error: { message: "not authenticated" } });
        if (missingTable()) return Promise.resolve({ data: null, error: { message: 'relation "public.exercise_notes" does not exist', code: "42P01" } });
        if (table === "exercise_notes") {
          const rec = { ...row, id: "note-" + (a.notes.length + 1) + "-" + a.userId, user_id: a.userId };
          a.notes.push(rec); return Promise.resolve({ data: [rec], error: null });
        }
        const rec = { ...row, id: "plan-" + (a.plans.length + 1) + "-" + a.userId, user_id: a.userId, created_at: new Date().toISOString() };
        a.plans.push(rec); return Promise.resolve({ data: [rec], error: null });
      };
      api.update = (patch) => ({
        eq(col, val) {
          const a = accountForSession();
          if (!a) return Promise.resolve({ data: null, error: { message: "not authenticated" } });
          if (missingTable()) return Promise.resolve({ data: null, error: { message: 'relation "public.exercise_notes" does not exist', code: "42P01" } });
          // WITH CHECK-Analogon: nur Zeilen DIESES Kontos werden getroffen, nie fremde — selbst wenn die
          // aufrufende Seite (irrtümlich) eine fremde ID übergibt, bleibt sie unverändert (vgl. echte RLS).
          if (table === "exercise_notes") { a.notes = a.notes.map((n) => (n[col] === val ? { ...n, ...patch, user_id: a.userId } : n)); return Promise.resolve({ data: null, error: null }); }
          a.plans = a.plans.map((p) => (p[col] === val ? { ...p, ...patch, user_id: a.userId } : p));
          return Promise.resolve({ data: null, error: null });
        }
      });
      api.delete = () => {
        const delState = { filters: [] };
        const delApi = {
          eq(col, val) { delState.filters.push(["eq", col, val]); return delApi; },
          then(resolve) {
            const doDelete = () => {
              const a = accountForSession();
              if (missingTable()) return { data: null, error: { message: 'relation "public.exercise_notes" does not exist', code: "42P01" } };
              if (a) {
                if (table === "plans") a.plans = a.plans.filter((p) => !matchesFilters(p, delState.filters));
                else if (table === "exercise_notes") a.notes = a.notes.filter((n) => !matchesFilters(n, delState.filters));
                else a.sets = a.sets.filter((r) => !matchesFilters(r, delState.filters));
              }
              return { data: null, error: null };
            };
            return (table === "sets" ? throughGate(doDelete) : Promise.resolve(doDelete())).then(resolve);
          }
        };
        return delApi;
      };
      api.upsert = (row) => {
        const a = accountForSession();
        if (!a) return Promise.resolve({ data: null, error: { message: "not authenticated" } });
        const doUpsert = () => {
          const idx = a.sets.findIndex((r) => r.date === row.date && r.plan_id === row.plan_id && r.exercise === row.exercise && r.set_index === row.set_index);
          const rec = { ...row, user_id: a.userId };
          if (idx >= 0) a.sets[idx] = { ...a.sets[idx], ...rec }; else a.sets.push(rec);
          return { data: null, error: null };
        };
        return table === "sets" ? throughGate(doUpsert) : Promise.resolve(doUpsert());
      };
      return api;
    }

    const otpCalls = []; // Testbeleg: shouldCreateUser wurde tatsächlich als false übergeben, nicht nur im Kommentar behauptet

    // Mehrbenutzer-Timing-Steuerung für Tests: erlaubt, eine sets-Schreiboperation (upsert/delete) gezielt
    // "unterwegs" zu halten (z. B. während eines Kontowechsels), um app.js' Generation-Guard gegen
    // verzögerte/veraltete Schreibantworten deterministisch zu prüfen. Ohne aktives Gate verhält sich
    // alles wie bisher (sofort auflösendes Promise) — NUR Test-Infrastruktur, kein Produktionscode.
    let writeGate = null;
    let forcedWriteError = null;
    function gateWrites() {
      let release;
      writeGate = new Promise((res) => { release = res; });
      return () => { const w = writeGate; writeGate = null; release(); return w; };
    }
    function forceNextWriteError(message) { forcedWriteError = message; }
    function throughGate(doWrite) {
      return (writeGate || Promise.resolve()).then(() => {
        if (forcedWriteError) { const msg = forcedWriteError; forcedWriteError = null; return { data: null, error: { message: msg } }; }
        return doWrite();
      });
    }

    return {
      __test: {
        get accounts() { return accounts; },
        get plansOf() { return (email) => (accounts[email] ? accounts[email].plans : []); },
        get setsOf() { return (email) => (accounts[email] ? accounts[email].sets : []); },
        get notesOf() { return (email) => (accounts[email] ? accounts[email].notes : []); },
        get otpCalls() { return otpCalls; },
        setSession: (s) => { session = s; }, fire,
        gateWrites, forceNextWriteError
      },
      auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: (cb) => { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
        signOut: async () => { session = null; fire("SIGNED_OUT"); return { error: null }; },
        signInWithOtp: async ({ email, options }) => {
          otpCalls.push({ email, shouldCreateUser: options && options.shouldCreateUser });
          const known = !!accounts[email];
          if (options && options.shouldCreateUser === false && !known) return { error: null }; // Supabase: generische Antwort, kein Konto angelegt, kein Leak ob E-Mail existiert
          return { error: null };
        },
        signInWithPassword: async ({ email, password }) => {
          const a = accounts[email];
          if (a && password === a.password) {
            session = { user: { id: a.userId, email } };
            fire("SIGNED_IN");
            return { data: { session }, error: null };
          }
          return { data: null, error: { message: "Invalid login credentials" } };
        },
        resetPasswordForEmail: async () => ({ data: {}, error: null }),
        updateUser: async ({ password }) => {
          const a = accountForSession();
          if (a) a.password = password;
          return { data: { user: { email: a && a.email } }, error: null };
        }
      },
      from: tableApi
    };
  }

  window.__GYMBRO_MOCK__ = { makeFakeSupabase };
})();
