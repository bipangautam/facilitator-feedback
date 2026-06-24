/* ============================================================
   STORE — data layer
   Works in two interchangeable modes:
     * SUPABASE mode  (CONFIG keys set)  -> shared, live, multi-user
     * LOCAL mode     (keys blank)       -> this device only
   Exposes a small async API used by app.js, plus scoring math.
   ============================================================ */

const Store = (() => {
  const LS_KEY = "fac_feedback_v1";
  const useSupabase = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
  let db = null;

  // in-memory cache, always the source of truth for rendering
  const state = {
    facilitators: [], // {id,name,phone,photo_url,display_order,created_at}
    comments: [],     // {id,facilitator_id,reviewer,body,day,created_at}
    ratings: []       // {id,facilitator_id,reviewer,day,scores{},notes{},overall_note,updated_at}
  };

  let onChange = () => {};
  const setOnChange = (fn) => { onChange = fn; };

  /* ---------- id + helpers ---------- */
  const uid = () => (crypto.randomUUID ? crypto.randomUUID()
    : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2));
  const nowIso = () => new Date().toISOString();

  /* ---------- LOCAL persistence + recovery mirror ---------- */
  function saveLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        savedAt: nowIso(), ...state
      }));
    } catch (e) { console.warn("local save failed", e); }
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      state.facilitators = d.facilitators || [];
      state.comments = d.comments || [];
      state.ratings = d.ratings || [];
      return true;
    } catch (e) { return false; }
  }
  function lastSavedAt() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}").savedAt || null; }
    catch { return null; }
  }

  /* ---------- INIT ---------- */
  async function init() {
    if (useSupabase) {
      db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      await loadAll();
      subscribeRealtime();
      // periodic safety refresh
      setInterval(() => loadAll().then(onChange), (CONFIG.REFRESH_SECONDS || 20) * 1000);
    } else {
      loadLocal();
    }
    // keep a recovery mirror regardless of mode
    setInterval(saveLocal, (CONFIG.AUTOSAVE_SECONDS || 30) * 1000);
    return mode();
  }

  function mode() { return useSupabase ? "supabase" : "local"; }

  /* ---------- AUTH (unique login codes) ----------
     'code' mode -> login screen asks for a private code.
     'name' mode -> simple name entry (local testing only). */
  function authMode() {
    if (useSupabase) return "code";
    if (Array.isArray(CONFIG.LOCAL_REVIEWERS) && CONFIG.LOCAL_REVIEWERS.length) return "code";
    return "name";
  }

  // Returns {name, is_admin, id} on success, or null if the code is
  // invalid / inactive. Throws only on a network failure.
  async function login(input) {
    const v = (input || "").trim();
    if (!v) return null;
    if (authMode() === "name") return { name: v, is_admin: true, view_only: false, id: null };
    if (useSupabase) {
      const { data, error } = await db.rpc("login", { p_code: v });
      if (error) { console.warn(error); throw new Error("Could not reach the login service."); }
      if (data && data.length) return { name: data[0].name, is_admin: !!data[0].is_admin, view_only: !!data[0].view_only, id: data[0].id };
      return null;
    }
    const r = (CONFIG.LOCAL_REVIEWERS || []).find(x => String(x.code).toLowerCase() === v.toLowerCase());
    return r ? { name: r.name, is_admin: !!r.is_admin, view_only: !!r.view_only, id: null } : null;
  }

  async function loadAll() {
    if (!useSupabase) return;
    const [f, c, r] = await Promise.all([
      db.from("facilitators").select("*").order("display_order", { ascending: true }),
      db.from("comments").select("*").order("created_at", { ascending: false }),
      db.from("ratings").select("*")
    ]);
    if (!f.error) state.facilitators = f.data || [];
    if (!c.error) state.comments = c.data || [];
    if (!r.error) state.ratings = r.data || [];
    saveLocal();
  }

  function subscribeRealtime() {
    db.channel("realtime-all")
      .on("postgres_changes", { event: "*", schema: "public" }, async () => {
        await loadAll(); onChange();
      })
      .subscribe();
  }

  /* ---------- READ accessors ---------- */
  const facilitators = () => state.facilitators.slice()
    .sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name));
  const facilitator = (id) => state.facilitators.find(f => f.id === id);
  const commentsFor = (id) => state.comments
    .filter(c => c.facilitator_id === id)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  const ratingsFor = (id) => state.ratings.filter(r => r.facilitator_id === id);
  const ratingBy = (id, reviewer, day) =>
    state.ratings.find(r => r.facilitator_id === id && r.reviewer === reviewer && Number(r.day) === Number(day));
  const allReviewers = () => {
    const s = new Set();
    state.ratings.forEach(r => s.add(r.reviewer));
    state.comments.forEach(c => s.add(c.reviewer));
    return [...s].sort((a, b) => a.localeCompare(b));
  };

  /* ---------- WRITES ---------- */
  async function addFacilitator({ name, phone = "", photo_url = "" }) {
    const row = { id: uid(), name, phone, photo_url,
      display_order: state.facilitators.length, created_at: nowIso() };
    state.facilitators.push(row); saveLocal(); onChange();
    if (useSupabase) {
      const { error } = await db.from("facilitators").insert(stripLocal(row));
      if (error) console.warn(error);
      await loadAll(); onChange();
    }
    return row.id;
  }

  async function updateFacilitator(id, patch) {
    const f = facilitator(id); if (!f) return;
    Object.assign(f, patch); saveLocal(); onChange();
    if (useSupabase) {
      const { error } = await db.from("facilitators").update(patch).eq("id", id);
      if (error) console.warn(error);
    }
  }

  async function deleteFacilitator(id) {
    state.facilitators = state.facilitators.filter(f => f.id !== id);
    state.comments = state.comments.filter(c => c.facilitator_id !== id);
    state.ratings = state.ratings.filter(r => r.facilitator_id !== id);
    saveLocal(); onChange();
    if (useSupabase) {
      await db.from("facilitators").delete().eq("id", id);
    }
  }

  async function addComment({ facilitator_id, reviewer, body, day = null }) {
    const row = { id: uid(), facilitator_id, reviewer, body, day, created_at: nowIso() };
    state.comments.unshift(row); saveLocal(); onChange();
    if (useSupabase) {
      const { error } = await db.from("comments").insert(stripLocal(row));
      if (error) console.warn(error);
      await loadAll(); onChange();
    }
    return row.id;
  }

  async function deleteComment(id) {
    state.comments = state.comments.filter(c => c.id !== id);
    saveLocal(); onChange();
    if (useSupabase) await db.from("comments").delete().eq("id", id);
  }

  // Wipe ALL ratings + comments (keeps facilitators & reviewers).
  // Used by admin to reset after test runs. Deletes from Supabase too.
  async function purgeData() {
    state.comments = []; state.ratings = [];
    saveLocal(); onChange();
    if (useSupabase) {
      const c = await db.from("comments").delete().not("id", "is", null);
      const r = await db.from("ratings").delete().not("id", "is", null);
      if (c.error) console.warn(c.error);
      if (r.error) console.warn(r.error);
      await loadAll(); onChange();
    }
  }

  // Upsert one rating per (facilitator, reviewer, day)
  async function saveRating({ facilitator_id, reviewer, day, scores, notes = {}, overall_note = "" }) {
    let row = ratingBy(facilitator_id, reviewer, day);
    if (row) {
      row.scores = scores; row.notes = notes;
      row.overall_note = overall_note; row.updated_at = nowIso();
    } else {
      row = { id: uid(), facilitator_id, reviewer, day, scores, notes,
        overall_note, updated_at: nowIso() };
      state.ratings.push(row);
    }
    saveLocal(); onChange();
    if (useSupabase) {
      const payload = {
        facilitator_id, reviewer, day, scores, notes, overall_note,
        updated_at: row.updated_at
      };
      const { error } = await db.from("ratings")
        .upsert(payload, { onConflict: "facilitator_id,reviewer,day" });
      if (error) console.warn(error);
      await loadAll(); onChange();
    }
    return row.id;
  }

  const stripLocal = (o) => { const c = { ...o }; return c; };

  /* ============================================================
     SCORING MATH
     ============================================================ */

  // sum of present scores in a single rating row (blanks excluded)
  function rowTotal(rating) {
    if (!rating || !rating.scores) return { sum: 0, count: 0 };
    let sum = 0, count = 0;
    ATTR_KEYS.forEach(k => {
      const v = rating.scores[k];
      if (v != null && v !== "") { sum += Number(v); count++; }
    });
    return { sum, count };
  }

  // Aggregate a list of rating rows -> mean attribute score (1-4),
  // projected /240, decision band, flags, per-attribute means.
  function aggregate(ratings) {
    let sum = 0, count = 0;
    const perAttr = Object.fromEntries(ATTR_KEYS.map(k => [k, { sum: 0, count: 0 }]));
    let oneFlag = false;           // any 1 in flagged attributes
    const oneCounts = {};          // attr -> how many 1s (for "repeated 1s")
    ratings.forEach(r => {
      ATTR_KEYS.forEach(k => {
        const v = r.scores ? r.scores[k] : null;
        if (v != null && v !== "") {
          const n = Number(v);
          sum += n; count++;
          perAttr[k].sum += n; perAttr[k].count++;
          if (n === 1) {
            oneCounts[k] = (oneCounts[k] || 0) + 1;
            if (RUBRIC.flagAttributes.includes(k)) oneFlag = true;
          }
        }
      });
    });
    const mean = count ? sum / count : null;
    const projected = mean == null ? null : Math.round(mean * 60); // 4 -> 240
    const repeatedOnes = Object.values(oneCounts).some(c => c >= 2);
    const attrMeans = Object.fromEntries(ATTR_KEYS.map(k =>
      [k, perAttr[k].count ? perAttr[k].sum / perAttr[k].count : null]));
    return {
      mean, projected, count,
      band: projected == null ? null : decisionBand(projected),
      flagSerious: oneFlag,        // a 1 in Compassion / Non-Judgement / Attentiveness
      flagRepeated: repeatedOnes,  // repeated 1s in any attribute
      attrMeans
    };
  }

  function decisionBand(projected) {
    return RUBRIC.decisionBands.find(b => projected >= b.min && projected <= b.max)
      || RUBRIC.decisionBands[RUBRIC.decisionBands.length - 1];
  }

  // Per-facilitator summary, optionally restricted to selected reviewers
  function facilitatorSummary(id, includeReviewers = null) {
    let rs = ratingsFor(id);
    if (includeReviewers) rs = rs.filter(r => includeReviewers.includes(r.reviewer));
    const agg = aggregate(rs);
    const reviewers = [...new Set(rs.map(r => r.reviewer))];
    const days = [...new Set(rs.map(r => Number(r.day)))].sort();
    return { ...agg, reviewers, days, ratingCount: rs.length,
      commentCount: commentsFor(id).length };
  }

  /* ============================================================
     EXPORT / IMPORT  (crash recovery)
     ============================================================ */
  function exportBundle() {
    return { app: "facilitator-feedback", version: 1, exportedAt: nowIso(),
      mode: mode(), ...state };
  }

  function download(filename, text, type = "application/json") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function exportJSON() {
    download(`facilitator-feedback-${stamp()}.json`,
      JSON.stringify(exportBundle(), null, 2));
  }

  function csvEscape(v) {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportRatingsCSV() {
    const head = ["facilitator", "phone", "reviewer", "day",
      ...ATTR_KEYS, "present", "total", "overall_note", "updated_at"];
    const lines = [head.join(",")];
    state.ratings.forEach(r => {
      const f = facilitator(r.facilitator_id) || {};
      const { sum, count } = rowTotal(r);
      const row = [f.name, f.phone, r.reviewer, r.day,
        ...ATTR_KEYS.map(k => (r.scores && r.scores[k] != null ? r.scores[k] : "")),
        count, sum, r.overall_note || "", r.updated_at || ""];
      lines.push(row.map(csvEscape).join(","));
    });
    download(`facilitator-ratings-${stamp()}.csv`, lines.join("\n"), "text/csv");
  }

  function exportCommentsCSV() {
    const head = ["facilitator", "reviewer", "day", "comment", "created_at"];
    const lines = [head.join(",")];
    state.comments.forEach(c => {
      const f = facilitator(c.facilitator_id) || {};
      lines.push([f.name, c.reviewer, c.day || "", c.body, c.created_at]
        .map(csvEscape).join(","));
    });
    download(`facilitator-comments-${stamp()}.csv`, lines.join("\n"), "text/csv");
  }

  async function importBundle(obj) {
    if (!obj || obj.app !== "facilitator-feedback")
      throw new Error("Not a valid backup file.");
    state.facilitators = obj.facilitators || [];
    state.comments = obj.comments || [];
    state.ratings = obj.ratings || [];
    saveLocal();
    if (useSupabase) {
      // push everything up (best-effort)
      if (state.facilitators.length)
        await db.from("facilitators").upsert(state.facilitators);
      if (state.comments.length)
        await db.from("comments").upsert(state.comments);
      if (state.ratings.length)
        await db.from("ratings").upsert(state.ratings,
          { onConflict: "facilitator_id,reviewer,day" });
      await loadAll();
    }
    onChange();
  }

  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

  return {
    init, mode, authMode, login, setOnChange, loadAll, lastSavedAt,
    facilitators, facilitator, commentsFor, ratingsFor, ratingBy, allReviewers,
    addFacilitator, updateFacilitator, deleteFacilitator,
    addComment, deleteComment, saveRating, purgeData,
    rowTotal, aggregate, decisionBand, facilitatorSummary,
    exportJSON, exportRatingsCSV, exportCommentsCSV, importBundle, exportBundle
  };
})();
