// Supabase-Zugang. Der anon-Key ist öffentlich vorgesehen — der Schutz kommt aus RLS (supabase/schema.sql).
// NIEMALS den service_role-Key hier eintragen.
window.GYMBRO_CONFIG = {
  SUPABASE_URL: "https://pqqvoeoutqpfxzkhqbhq.supabase.co/rest/v1/",       // z. B. https://abcdxyz.supabase.co
  SUPABASE_ANON_KEY: "sb_publishable_vUqHLYkon_osJ39VjqfyyQ_dposrxxV"   // Project Settings → API → anon public
};
