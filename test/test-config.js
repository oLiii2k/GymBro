// TEST-ONLY config + seed data for the isolated browser harness (test/index.test.html) AND the jsdom
// test suite (test/dom.test.js). Never used by index.html / production. Two separate accounts so
// multi-user isolation is part of the default fixture, not an afterthought.
window.GYMBRO_CONFIG = { SUPABASE_URL: "https://test.invalid", SUPABASE_ANON_KEY: "test-anon-key" };

window.__GYMBRO_SEED__ = {
  accounts: {
    "oliver@test.invalid": {
      userId: "user-oliver",
      password: "correct-horse-1",
      plans: [
        { name: "Kurz 30 min", exercises: [
          { id: "kh-bankdruecken", sets: 3, wMin: 6, wMax: 10, kg: 17 },
          { id: "plank", sets: 3, wMin: 30, wMax: 40, kg: 0 }
        ] }
      ],
      sets: [
        { date: "2026-09-20", plan_id: "A", exercise: "rdl-langhantel", set_index: 1, reps: 8, weight: 47.5, done_at: "2026-09-20T10:00:00Z" },
        { date: "2026-09-20", plan_id: "A", exercise: "rdl-langhantel", set_index: 2, reps: 8, weight: 47.5, done_at: "2026-09-20T10:01:00Z" },
        { date: "2026-09-27", plan_id: "A", exercise: "rdl-langhantel", set_index: 1, reps: 9, weight: 47.5, done_at: "2026-09-27T10:00:00Z" },
        { date: "2026-09-27", plan_id: "B", exercise: "plank", set_index: 1, reps: 30, weight: 0, done_at: "2026-09-27T11:00:00Z" },
        { date: "2026-09-27", plan_id: "B", exercise: "plank", set_index: 2, reps: 35, weight: 0, done_at: "2026-09-27T11:01:00Z" },
        { date: "2026-09-27", plan_id: "B", exercise: "plank", set_index: 3, reps: 30, weight: 0, done_at: "2026-09-27T11:02:00Z" }
      ]
    },
    "neu@test.invalid": {
      userId: "user-neu",
      password: "zweites-konto-2",
      plans: [],
      sets: []
    }
  }
};
