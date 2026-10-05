// TEST-ONLY jsdom harness: lädt die ECHTEN App-Dateien (logic.js, plan.js, app.js) in ein jsdom-Fenster
// gegen den Mock-Supabase aus mock-supabase.js. Kein echtes Netzwerk, keine echten Daten — siehe
// mock-supabase.js / test-config.js. So lässt sich die Produktions-app.js ohne Browser-Automatisierung
// deterministisch durchklicken (DOM-Events, nicht nur Funktionsaufrufe).
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

function buildHtml() {
  return `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"></head><body>
    <button id="t"></button><div id="toast"></div><div id="app"></div>
    <div id="big"><svg id="bigsvg"></svg></div>
  </body></html>`;
}

// seedOverride ersetzt window.__GYMBRO_SEED__.accounts komplett, falls übergeben (sonst test-config.js Default)
async function bootApp(seedOverride) {
  const dom = new JSDOM(buildHtml(), { url: "http://localhost/test/", runScripts: "dangerously", pretendToBeVisual: true });
  const { window } = dom;
  window.console = console;
  const run = (code) => window.eval(code);
  run(read("test/mock-supabase.js"));
  run(read("test/test-config.js"));
  if (seedOverride) {
    if (seedOverride && seedOverride.accounts) Object.assign(window.__GYMBRO_SEED__, seedOverride);
    else window.__GYMBRO_SEED__.accounts = seedOverride;
  }
  // __TEST_SB__: Testzugriff auf den erzeugten Mock-Client (accounts/otpCalls/…), OHNE app.js' privates
  // `sb` anzutasten — app.js bleibt unverändert zur Produktion, der Haken sitzt nur im Test-Bootstrap.
  run(`window.supabase = { createClient: () => (window.__TEST_SB__ = window.__GYMBRO_MOCK__.makeFakeSupabase(window.__GYMBRO_SEED__)) };`);
  run(read("logic.js"));
  run(read("plan.js"));
  run(read("app.js"));
  await settle(window);
  return { dom, window, document: window.document };
}

// pollt bis eine Bedingung wahr ist (Promises in app.js laufen "echt" asynchron, jsdom hat keinen eigenen Takt dafür)
async function wait(fn, { timeout = 2000, step = 10 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const v = fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, step));
  }
  throw new Error("wait(): Bedingung nicht erfüllt innerhalb " + timeout + "ms — zuletzt: " + String(fn));
}
async function settle(window) { for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 5)); }

function click(el) { el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent("click", { bubbles: true, cancelable: true })); }
function setVal(el, v) { el.value = v; el.dispatchEvent(new el.ownerDocument.defaultView.Event("input", { bubbles: true })); }
function submit(form) { form.dispatchEvent(new form.ownerDocument.defaultView.Event("submit", { bubbles: true, cancelable: true })); }

async function loginAs(window, email, password) {
  const d = window.document;
  setVal(d.querySelector("#em"), email);
  setVal(d.querySelector("#pw"), password);
  submit(d.querySelector("#lf"));
  await wait(() => d.querySelector(".tabs"), { timeout: 3000 }); // Übersicht/Tab-Leiste ist da -> eingeloggt + geladen
  await settle(window);
}

module.exports = { bootApp, wait, settle, click, setVal, submit, loginAs };
