/* ============================================================
   CONFIG  —  fill these in to go "live shared" across devices.
   ------------------------------------------------------------
   Leave them blank ("") to run in LOCAL mode: the app works
   fully but data is saved only on THIS device's browser.

   To share data live across everyone's phones & laptops:
   1. Create a free project at supabase.com
   2. Run supabase_setup.sql in the Supabase SQL Editor
   3. Settings -> API -> copy the Project URL and the anon key
   4. Paste them below and re-load the page.
   ============================================================ */

const CONFIG = {
  SUPABASE_URL: "https://kizhmswviydwuxekothu.supabase.co",      // e.g. "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: "sb_publishable_sJRHAePjBeiyFwVdrRLj5w_PUvZ7p8O", // the long public "anon" key

  // LOGIN CODES are managed in the database (the `reviewers` table,
  // see supabase_setup.sql). In Supabase mode the login screen asks
  // for a code and validates it securely against that table.
  //
  // The list below is ONLY used in local mode (no Supabase keys) so
  // you can demo/test code-login offline. Ignored once Supabase is on.
  // Leave it empty [] to use simple name-entry while testing locally.
  LOCAL_REVIEWERS: [
    // Uncomment to test code-login offline (same list as supabase_setup.sql):
    // { name: "Bipan",       code: "bipan1234",   is_admin: true },
    // { name: "Chandra",     code: "chandra2233", is_admin: false },
    // { name: "Aarya (Jr)",  code: "aarya4455",   is_admin: false },
    // { name: "Aaryaa (Sr)", code: "aaryaa6677",  is_admin: false },
    // { name: "Aakriti",     code: "aakriti8899", is_admin: false },
    // { name: "Asim",        code: "asim1221",    is_admin: false },
    // { name: "Anubhav",     code: "anubhav3443", is_admin: false },
    // { name: "Aadit",       code: "aadit5665",   is_admin: false },
    // { name: "Guest (view only)", code: "guest0000", is_admin: false, view_only: true }
  ],

  // How often (seconds) to refresh data from the server as a safety
  // net in addition to live realtime updates.
  REFRESH_SECONDS: 20,

  // How often (seconds) to mirror a local recovery snapshot.
  AUTOSAVE_SECONDS: 30
};
