/* ============================================================
   APP — UI, routing, rendering
   ============================================================ */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const PALETTE = ["#4f9cf9", "#7b5cff", "#2dd4a7", "#f5b14c", "#f06a6a", "#39c0c8", "#e879b9", "#9b8cff", "#5fcf8f", "#ff8a5c"];
  const colorFor = (s) => PALETTE[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  const initials = (n) => (n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

  const app = $("#app");
  let route = { name: "home" };
  // identity: `reviewer` is the display name used for attribution everywhere;
  // isAdmin gates the Admin panel; myId is the reviewers.id (Supabase).
  let reviewer = "", isAdmin = false, viewOnly = false, myId = null;
  (function loadIdentity() {
    try {
      const raw = localStorage.getItem("me");
      if (raw) { const m = JSON.parse(raw); reviewer = m.name || ""; isAdmin = !!m.is_admin; viewOnly = !!m.view_only; myId = m.id || null; return; }
    } catch (e) {}
    const old = localStorage.getItem("reviewerName"); // migrate older sessions
    if (old) { reviewer = old; isAdmin = true; }
  })();
  function setIdentity(m) {
    reviewer = m.name; isAdmin = !!m.is_admin; viewOnly = !!m.view_only; myId = m.id || null;
    localStorage.setItem("me", JSON.stringify({ name: reviewer, is_admin: isAdmin, view_only: viewOnly, id: myId }));
    localStorage.removeItem("reviewerName");
  }
  function clearIdentity() {
    reviewer = ""; isAdmin = false; viewOnly = false; myId = null;
    localStorage.removeItem("me"); localStorage.removeItem("reviewerName");
  }

  /* avatar markup (photo or coloured initials) */
  function avatar(f, cls = "avatar") {
    if (f && f.photo_url)
      return `<img class="${cls}" src="${esc(f.photo_url)}" alt="${esc(f.name)}">`;
    const c = colorFor(f ? f.name : "?");
    return `<div class="${cls} avatar-fb" style="background:linear-gradient(135deg,${c},${c}99)">${esc(initials(f && f.name))}</div>`;
  }
  function timeago(iso) {
    if (!iso) return "";
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return "just now";
    if (d < 3600) return Math.floor(d / 60) + "m ago";
    if (d < 86400) return Math.floor(d / 3600) + "h ago";
    return new Date(iso).toLocaleDateString();
  }

  /* ---------------- routing ---------------- */
  function go(name, params = {}) { route = { name, ...params }; window.scrollTo(0, 0); render(); }
  function render() {
    if (!reviewer) return renderLogin();
    const fns = { home: renderHome, rate: renderRate, dash: renderDash, cumulative: renderCumulative, admin: renderAdmin };
    (fns[route.name] || renderHome)();
  }

  /* ---------------- LOGIN ---------------- */
  function renderLogin() {
    app.innerHTML = "";
    const codeMode = Store.authMode() === "code";
    const c = el(`
      <div class="login-wrap"><div class="login-card">
        <div class="logo">📋</div>
        <h1>Facilitator Feedback</h1>
        <p>${codeMode
          ? "Enter your personal login code. Everything you record is saved under your name."
          : "Live rating &amp; ranking for the 5-day training.<br>Enter your name so your comments and ratings are recorded under it."}</p>
        <input class="txt" id="nm" placeholder="${codeMode ? "Your login code (e.g. bipan1234)" : "Your name (e.g. Anita)"}"
          autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">
        <div class="err hidden" id="loginErr" style="color:var(--bad);font-size:13px;margin-top:10px"></div>
        <div style="height:12px"></div>
        <button class="btn block" id="enter">Enter</button>
        <div class="hint" style="margin-top:14px">Mode: <b>${Store.mode() === "supabase" ? "Live shared (Supabase)" : "Local (this device only)"}</b>${
          codeMode ? "" : " · using simple name login"}</div>
      </div></div>`);
    app.appendChild(c);
    const inp = $("#nm", c), errEl = $("#loginErr", c), btn = $("#enter", c);
    inp.focus();
    const showErr = (m) => { errEl.textContent = m; errEl.classList.remove("hidden"); };
    const submit = async () => {
      const v = inp.value.trim();
      if (!v) return inp.focus();
      errEl.classList.add("hidden");
      btn.disabled = true; btn.textContent = "Checking…";
      try {
        const m = await Store.login(v);
        if (!m) { showErr(codeMode ? "That code isn't recognised (or has been deactivated)." : "Please enter a name."); btn.disabled = false; btn.textContent = "Enter"; return; }
        setIdentity(m); render();
      } catch (e) {
        showErr(e.message || "Login failed. Check your connection and try again.");
        btn.disabled = false; btn.textContent = "Enter";
      }
    };
    btn.onclick = submit;
    inp.onkeydown = (e) => { if (e.key === "Enter") submit(); };
  }

  /* ---------------- shell / topbar ---------------- */
  function shell(inner) {
    app.innerHTML = "";
    app.appendChild(el(`
      <div class="topbar">
        <div class="brand"><span class="logo">📋</span>
          <span>Facilitator&nbsp;Feedback<div class="sub">5-day training panel</div></span></div>
        <div class="spacer"></div>
        <div class="who" title="Log out">👤 <b>${esc(reviewer)}</b>${isAdmin ? ' <span style="color:var(--accent);font-size:11px">admin</span>' : viewOnly ? ' <span style="color:var(--muted);font-size:11px">view only</span>' : ""}</div>
        ${isAdmin ? `<button class="iconbtn" id="adminBtn" title="Admin">⚙️</button>` : ""}
      </div>`));
    const wrap = el(`<div class="wrap"></div>`);
    wrap.appendChild(inner);
    app.appendChild(wrap);
    app.appendChild(el(`<footer class="foot">Recorded as ${esc(reviewer)} · ${Store.mode() === "supabase" ? "live shared" : "local-only"} · last local save ${Store.lastSavedAt() ? timeago(Store.lastSavedAt()) : "—"}</footer>`));
    const ab = $("#adminBtn"); if (ab) ab.onclick = adminGate;
    $(".who").onclick = () => {
      if (confirm(`You are logged in as "${reviewer}". Log out?`)) {
        clearIdentity(); go("home");
      }
    };
  }

  /* ---------------- HOME ---------------- */
  let homeSearch = "";
  function renderHome() {
    const root = el(`<div></div>`);

    if (Store.mode() === "local")
      root.appendChild(el(`<div class="banner warn">⚠️ <span><b>Local mode.</b> Data is saved only on this device. To let everyone rate together live, add Supabase keys in <code>js/config.js</code>. Your work is still auto-saved &amp; exportable.</span></div>`));

    root.appendChild(el(`
      <div class="hometools">
        <div class="searchbox">🔎<input id="search" placeholder="Search facilitator…" value="${esc(homeSearch)}"></div>
        <button class="btn" id="rankBtn">🏆 Cumulative Ranking</button>
      </div>`));

    const list = Store.facilitators().filter(f =>
      !homeSearch || f.name.toLowerCase().includes(homeSearch.toLowerCase()));

    if (!Store.facilitators().length) {
      root.appendChild(el(`<div class="empty"><div class="big">🧑‍🏫</div>
        <div>No facilitators yet.</div>
        <div class="hint">Open <b>⚙️ Admin</b> (top-right) to add facilitators and upload photos.</div>
        <div style="height:14px"></div></div>`));
      const b = el(`<div style="text-align:center"></div>`);
      const ab = el(`<button class="btn">➕ Add facilitators</button>`); ab.onclick = adminGate;
      b.appendChild(ab); root.appendChild(b);
    } else {
      const grid = el(`<div class="grid"></div>`);
      list.forEach(f => {
        const sum = Store.facilitatorSummary(f.id);
        const meanTxt = sum.mean == null ? "no ratings" : `avg ${sum.mean.toFixed(2)} · ${sum.ratingCount} rating${sum.ratingCount > 1 ? "s" : ""}`;
        const dotColor = sum.mean == null ? "var(--faint)" : sum.flagSerious ? "var(--bad)" : `var(--s${Math.max(1, Math.round(sum.mean))})`;
        const card = el(`
          <div class="fcard" tabindex="0">
            ${f.photo_url ? `<img class="photo" src="${esc(f.photo_url)}" alt="${esc(f.name)}">`
              : `<div class="ph-fallback" style="background:linear-gradient(135deg,${colorFor(f.name)},${colorFor(f.name)}88)">${esc(initials(f.name))}</div>`}
            <div class="body">
              <div class="name">${esc(f.name)}</div>
              ${f.phone ? `<div class="phone">📞 ${esc(f.phone)}</div>` : ""}
              <div class="pill"><span class="dot" style="background:${dotColor}"></span>${meanTxt}${sum.flagSerious ? " ⚑" : ""}</div>
            </div>
          </div>`);
        card.onclick = () => openOptions(f.id);
        card.onkeydown = (e) => { if (e.key === "Enter") openOptions(f.id); };
        grid.appendChild(card);
      });
      root.appendChild(grid);
    }

    shell(root);
    const s = $("#search");
    if (s) s.oninput = () => { homeSearch = s.value; const g = $(".grid"); if (g) renderHome(); };
    $("#rankBtn").onclick = () => go("cumulative");
  }

  /* ---------------- OPTION SHEET ---------------- */
  function openModal(node) {
    const ov = el(`<div class="overlay"></div>`);
    ov.appendChild(node);
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov);
    return ov;
  }
  function openOptions(id) {
    const f = Store.facilitator(id);
    const sheet = el(`
      <div class="sheet">
        <div class="sheethead">${avatar(f, "avatar lg")}
          <div><div class="name">${esc(f.name)}</div>${f.phone ? `<div class="phone">📞 ${esc(f.phone)}</div>` : ""}</div>
          <div class="spacer" style="flex:1"></div><button class="x" data-x>×</button></div>
        ${viewOnly ? "" : `<button class="optbtn" data-act="comment"><span class="ic" style="background:rgba(79,156,249,.16)">💬</span>
          <span><span class="t">Quick comment</span><span class="d">Drop a fast note — posts to the dashboard under your name</span></span></button>
        <button class="optbtn" data-act="rate"><span class="ic" style="background:rgba(45,212,167,.16)">⭐</span>
          <span><span class="t">Detailed rating</span><span class="d">Score the 12 attributes (1–4) for a training day</span></span></button>`}
        <button class="optbtn" data-act="dash"><span class="ic" style="background:rgba(245,177,76,.16)">📊</span>
          <span><span class="t">Facilitator dashboard</span><span class="d">All comments &amp; ratings from every reviewer</span></span></button>
      </div>`);
    const ov = openModal(sheet);
    $("[data-x]", sheet).onclick = () => ov.remove();
    sheet.querySelectorAll(".optbtn").forEach(b => b.onclick = () => {
      const act = b.dataset.act; ov.remove();
      if (act === "comment") openComment(id);
      else if (act === "rate") go("rate", { id, day: 1 });
      else go("dash", { id });
    });
  }

  /* ---------------- QUICK COMMENT ---------------- */
  function openComment(id) {
    if (viewOnly) return;
    const f = Store.facilitator(id);
    const sheet = el(`
      <div class="sheet">
        <div class="sheethead">${avatar(f, "avatar lg")}
          <div><div class="name">${esc(f.name)}</div><div class="phone">Quick comment · as ${esc(reviewer)}</div></div>
          <div style="flex:1"></div><button class="x" data-x>×</button></div>
        <textarea id="cbody" rows="4" placeholder="e.g. Asked a great follow-up question that drew out a quiet participant…"></textarea>
        <label class="fld">Training day (optional)</label>
        <select class="txt" id="cday">
          <option value="">— not specified —</option>
          ${[1,2,3,4,5].map(d => `<option value="${d}">Day ${d}</option>`).join("")}
        </select>
        <div style="height:14px"></div>
        <button class="btn block" id="csend">Post comment</button>
      </div>`);
    const ov = openModal(sheet);
    const ta = $("#cbody", sheet); ta.focus();
    $("[data-x]", sheet).onclick = () => ov.remove();
    $("#csend", sheet).onclick = async () => {
      const body = ta.value.trim(); if (!body) return ta.focus();
      const day = $("#cday", sheet).value || null;
      await Store.addComment({ facilitator_id: id, reviewer, body, day: day ? Number(day) : null });
      ov.remove(); toast("Comment posted");
    };
    ta.onkeydown = (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $("#csend", sheet).click(); };
  }

  /* ---------------- RATE PAGE ---------------- */
  function renderRate() {
    if (viewOnly) return go("home");
    const f = Store.facilitator(route.id);
    if (!f) return go("home");
    let day = route.day || 1;
    const existing = Store.ratingBy(route.id, reviewer, day);
    const scores = Object.assign({}, existing ? existing.scores : {});
    const notes = Object.assign({}, existing ? existing.notes : {});
    let overall = existing ? (existing.overall_note || "") : "";

    const root = el(`<div></div>`);
    root.appendChild(el(`<button class="back" id="back">← Home</button>`));

    const head = el(`
      <div class="ratehead">
        ${avatar(f, "avatar lg")}
        <div><div class="name">${esc(f.name)}</div>
          <div class="meta">${f.phone ? "📞 " + esc(f.phone) + " · " : ""}rating as <b>${esc(reviewer)}</b></div></div>
        <div class="daypick" id="daypick">
          ${[1,2,3,4,5].map(d => {
            const has = !!Store.ratingBy(route.id, reviewer, d);
            return `<button class="daybtn ${d===day?"active":""}" data-day="${d}">${d}${has?'<span class="mk">●</span>':''}</button>`;
          }).join("")}
        </div>
      </div>`);
    root.appendChild(head);
    root.appendChild(el(`<div class="hint" style="margin:-6px 2px 12px">Tap a score 1–4 for each attribute. Leave blank if you couldn't observe it. Tap <b>ⓘ</b> to see what each level means. Evidence notes open automatically for 1s and 4s.</div>`));

    // groups
    RUBRIC.groups.forEach(g => {
      const gc = el(`<div class="groupcard"><div class="grouphd">${esc(g.name)}</div></div>`);
      g.attributes.forEach(a => {
        const cur = scores[a.key];
        const att = el(`
          <div class="attr" data-key="${a.key}">
            <div class="ahead"><span class="aname">${esc(a.name)}</span>
              <span class="aabbr">${esc(a.key)}</span>
              <button class="ainfo" title="What the levels mean">ⓘ</button></div>
            <div class="scalebtns">
              ${[1,2,3,4].map(v => `<button class="sbtn ${cur==v?"sel":""}" data-v="${v}">${v}<small>${esc(RUBRIC.scoreBands[v].label.split(" ")[0])}</small></button>`).join("")}
              <button class="sbtn clr ${cur==null?"":""}" data-v="clear">blank</button>
            </div>
            <div class="levelhint"></div>
            <div class="evidence ${cur==1||cur==4?"show":""}">
              <div class="lbl">Evidence note (recommended for 1s &amp; 4s): one concrete observation</div>
              <textarea data-note rows="2" placeholder="${esc(a.evidence)}">${esc(notes[a.key]||"")}</textarea>
            </div>
          </div>`);
        const hint = $(".levelhint", att);
        const ev = $(".evidence", att);
        const noteBox = $("[data-note]", att);
        const showHint = (v) => { hint.textContent = `${v} = ${RUBRIC.scoreBands[v].label}: ${a.levels[v]}`; hint.classList.add("show"); };
        $(".ainfo", att).onclick = () => {
          if (hint.classList.contains("show") && hint.dataset.mode === "all") { hint.classList.remove("show"); return; }
          hint.dataset.mode = "all";
          hint.innerHTML = [1,2,3,4].map(v => `<div style="margin:2px 0"><b style="color:var(--s${v})">${v} ${RUBRIC.scoreBands[v].label}:</b> ${esc(a.levels[v])}</div>`).join("");
          hint.classList.add("show");
        };
        att.querySelectorAll(".sbtn").forEach(btn => btn.onclick = () => {
          const v = btn.dataset.v;
          att.querySelectorAll(".sbtn").forEach(b => b.classList.remove("sel"));
          if (v === "clear") { delete scores[a.key]; ev.classList.remove("show"); hint.classList.remove("show"); btn.classList.add("sel"); }
          else {
            scores[a.key] = Number(v); btn.classList.add("sel");
            hint.dataset.mode = "one"; showHint(Number(v));
            if (v === "1" || v === "4") ev.classList.add("show");
          }
          updateTotal();
        });
        noteBox.oninput = () => { notes[a.key] = noteBox.value; };
        gc.appendChild(att);
      });
      root.appendChild(gc);
    });

    // overall note
    const ov = el(`<div class="section"><h2>Overall evidence note <span class="c">(optional)</span></h2>
      <textarea id="overall" rows="3" placeholder="Anything notable across the day — a standout moment or a concern to raise in panel review.">${esc(overall)}</textarea></div>`);
    root.appendChild(ov);

    // sticky save bar
    const bar = el(`<div class="savebar">
      <div class="tot"><span id="totv">0</span><small> / ${RUBRIC.dailyMax} today</small></div>
      <div class="grow"></div>
      <button class="btn ghost sm" id="dashFromRate">📊 Dashboard</button>
      <button class="btn" id="saveBtn">Save Day ${day}</button></div>`);

    shell(root);
    document.body.appendChild(bar);
    cleanupBars(bar);

    function updateTotal() {
      let s = 0, n = 0;
      ATTR_KEYS.forEach(k => { if (scores[k] != null) { s += scores[k]; n++; } });
      $("#totv", bar).textContent = s;
      $("#totv", bar).parentElement.querySelector("small").textContent = ` / ${RUBRIC.dailyMax} today · ${n}/12 scored`;
    }
    updateTotal();

    $("#back", root).onclick = () => { bar.remove(); go("home"); };
    $("#dashFromRate", bar).onclick = () => { bar.remove(); go("dash", { id: route.id }); };
    $("#overall", root).oninput = (e) => { overall = e.target.value; };
    head.querySelectorAll(".daybtn").forEach(b => b.onclick = () => {
      bar.remove(); go("rate", { id: route.id, day: Number(b.dataset.day) });
    });
    $("#saveBtn", bar).onclick = async () => {
      await Store.saveRating({ facilitator_id: route.id, reviewer, day, scores, notes, overall_note: overall });
      toast(`Day ${day} saved`);
      // refresh the day-dot marker
      const db = head.querySelector(`.daybtn[data-day="${day}"]`);
      if (db && !db.querySelector(".mk")) db.insertAdjacentHTML("beforeend", '<span class="mk">●</span>');
    };
  }

  // remove stray fixed bars when navigating
  function cleanupBars(keep) {
    document.querySelectorAll(".savebar").forEach(b => { if (b !== keep) b.remove(); });
  }

  /* ---------------- FACILITATOR DASHBOARD ---------------- */
  let dashGroupBy = "reviewer"; // or "day"
  function renderDash() {
    const f = Store.facilitator(route.id);
    if (!f) return go("home");
    cleanupBars(null);

    const allRevs = [...new Set(Store.ratingsFor(route.id).map(r => r.reviewer))].sort();
    if (!route._include) route._include = allRevs.slice();
    const include = route._include.filter(r => allRevs.includes(r));
    const sum = Store.facilitatorSummary(route.id, include.length ? include : null);

    const root = el(`<div></div>`);
    root.appendChild(el(`<button class="back" id="back">← Home</button>`));
    root.appendChild(el(`
      <div class="pagehead">${avatar(f, "avatar lg")}
        <div><h1>${esc(f.name)}</h1>
          <div class="muted">${f.phone ? "📞 " + esc(f.phone) + " · " : ""}${sum.reviewers.length} reviewer(s) · ${sum.ratingCount} rating(s) · ${sum.commentCount} comment(s)</div></div></div>`));

    // summary stats
    const band = sum.band;
    root.appendChild(el(`
      <div class="summary">
        <div class="stat"><div class="k">Average score</div><div class="v">${sum.mean==null?"—":sum.mean.toFixed(2)}<small> / 4</small></div></div>
        <div class="stat"><div class="k">Projected 5-day</div><div class="v">${sum.projected==null?"—":sum.projected}<small> / 240</small></div></div>
        <div class="stat"><div class="k">Decision band</div><div class="v" style="font-size:15px;margin-top:8px">${band?`<span class="band ${band.css}">${band.label}</span>`:"—"}</div></div>
        <div class="stat"><div class="k">Panel-review flags</div><div class="v" style="font-size:13px;margin-top:8px">${
          (sum.flagSerious||sum.flagRepeated)
            ? `${sum.flagSerious?'<span class="flag">⚑ a "1" in Com/NJ/Att</span>':""} ${sum.flagRepeated?'<span class="flag">⚑ repeated 1s</span>':""}`
            : '<span style="color:var(--s3)">none</span>'}</div></div>
      </div>`));

    // reviewer include chips
    if (allRevs.length) {
      const chipWrap = el(`<div class="section"><h2>Include in totals <span class="c">(${include.length}/${allRevs.length} reviewers)</span></h2><div class="chips" id="chips"></div></div>`);
      const chips = $("#chips", chipWrap);
      const allOn = include.length === allRevs.length;
      const allChip = el(`<label class="chip allc"><input type="checkbox" ${allOn?"checked":""}> All</label>`);
      allChip.querySelector("input").onchange = (e) => {
        route._include = e.target.checked ? allRevs.slice() : [];
        renderDash();
      };
      chips.appendChild(allChip);
      allRevs.forEach(r => {
        const c = el(`<label class="chip"><input type="checkbox" ${include.includes(r)?"checked":""}> ${esc(r)}</label>`);
        c.querySelector("input").onchange = (e) => {
          const set = new Set(route._include);
          e.target.checked ? set.add(r) : set.delete(r);
          route._include = [...set]; renderDash();
        };
        chips.appendChild(c);
      });
      root.appendChild(chipWrap);
    }

    // ratings grid (attributes x reviewer/day)
    const ratings = Store.ratingsFor(route.id).filter(r => !include.length || include.includes(r.reviewer));
    const grid = el(`<div class="section">
      <h2>Ratings grid
        <span class="c">— grouped by</span>
        <button class="btn ghost sm" id="gb" style="margin-left:6px">${dashGroupBy==="reviewer"?"Reviewer ⇄":"Day ⇄"}</button>
      </h2></div>`);
    grid.appendChild(buildRatingsTable(ratings, dashGroupBy));
    root.appendChild(grid);

    // comments feed
    const comments = Store.commentsFor(route.id);
    const cwrap = el(`<div class="section"><h2>Comments <span class="c">(${comments.length})</span></h2></div>`);
    if (!comments.length) cwrap.appendChild(el(`<div class="hint">No comments yet.</div>`));
    comments.forEach(c => {
      const node = el(`<div class="cmt">
        <div class="top"><span class="rv">${esc(c.reviewer)}</span><span class="tm">${timeago(c.created_at)}</span>
          ${c.day?`<span class="dy">Day ${c.day}</span>`:""}
          ${c.reviewer===reviewer?`<button class="del" title="Delete">🗑</button>`:""}</div>
        <div class="bd">${esc(c.body)}</div></div>`);
      const del = node.querySelector(".del");
      if (del) del.onclick = async () => { if (confirm("Delete your comment?")) { await Store.deleteComment(c.id); renderDash(); } };
      cwrap.appendChild(node);
    });
    root.appendChild(cwrap);

    // evidence notes
    const notes = [];
    ratings.forEach(r => {
      ATTR_KEYS.forEach(k => { if (r.notes && r.notes[k]) notes.push({ rev: r.reviewer, day: r.day, attr: ATTR_BY_KEY[k].name, text: r.notes[k] }); });
      if (r.overall_note) notes.push({ rev: r.reviewer, day: r.day, attr: "Overall", text: r.overall_note });
    });
    if (notes.length) {
      const nw = el(`<div class="section"><h2>Evidence notes <span class="c">(${notes.length})</span></h2></div>`);
      notes.forEach(n => nw.appendChild(el(`<div class="cmt"><div class="top"><span class="rv">${esc(n.rev)}</span>
        <span class="dy">Day ${n.day}</span><span class="tm">${esc(n.attr)}</span></div><div class="bd">${esc(n.text)}</div></div>`)));
      root.appendChild(nw);
    }

    // actions (hidden for view-only guests)
    if (!viewOnly) {
      const acts = el(`<div class="row" style="margin-top:6px">
        <button class="btn" id="rateBtn">⭐ Add / edit my rating</button>
        <button class="btn ghost" id="cmtBtn">💬 Quick comment</button></div>`);
      root.appendChild(acts);
    }

    shell(root);
    $("#back", root).onclick = () => go("home");
    const gbBtn = $("#gb"); if (gbBtn) gbBtn.onclick = () => { dashGroupBy = dashGroupBy === "reviewer" ? "day" : "reviewer"; renderDash(); };
    const rb = $("#rateBtn", root); if (rb) rb.onclick = () => go("rate", { id: route.id, day: 1 });
    const cb = $("#cmtBtn", root); if (cb) cb.onclick = () => openComment(route.id);
  }

  function buildRatingsTable(ratings, groupBy) {
    if (!ratings.length) return el(`<div class="hint">No ratings yet.</div>`);
    // columns = each rating (reviewer+day). header label depends on grouping
    const cols = ratings.slice().sort((a, b) =>
      groupBy === "reviewer"
        ? (a.reviewer.localeCompare(b.reviewer) || a.day - b.day)
        : (a.day - b.day || a.reviewer.localeCompare(b.reviewer)));
    const wrap = el(`<div class="tablewrap"></div>`);
    const t = el(`<table class="grid-t"></table>`);
    const head = el(`<tr><th class="attrn">Attribute</th></tr>`);
    cols.forEach(c => head.appendChild(el(`<th>${groupBy==="reviewer"?esc(c.reviewer)+"<br><small style='color:var(--faint)'>D"+c.day+"</small>":"Day "+c.day+"<br><small style='color:var(--faint)'>"+esc(c.reviewer)+"</small>"}</th>`)));
    head.appendChild(el(`<th>Mean</th>`));
    t.appendChild(head);

    ATTR_KEYS.forEach(k => {
      const tr = el(`<tr><td class="attrn">${esc(ATTR_BY_KEY[k].name)} <span style="color:var(--faint)">${k}</span></td></tr>`);
      let s = 0, n = 0;
      cols.forEach(c => {
        const v = c.scores ? c.scores[k] : null;
        if (v != null) { s += v; n++; }
        tr.appendChild(el(`<td>${v!=null?`<span class="cellscore" data-v="${v}">${v}</span>`:`<span style="color:var(--faint)">–</span>`}</td>`));
      });
      tr.appendChild(el(`<td class="tot">${n?(s/n).toFixed(1):"–"}</td>`));
      t.appendChild(tr);
    });
    // totals row
    const trt = el(`<tr><td class="attrn"><b>Day total</b> <span style="color:var(--faint)">/48</span></td></tr>`);
    cols.forEach(c => { const { sum } = Store.rowTotal(c); trt.appendChild(el(`<td class="tot">${sum}</td>`)); });
    trt.appendChild(el(`<td></td>`));
    t.appendChild(trt);

    wrap.appendChild(t);
    return wrap;
  }

  /* ---------------- CUMULATIVE RANKING ---------------- */
  function renderCumulative() {
    cleanupBars(null);
    const allRevs = Store.allReviewers();
    if (!route._include) route._include = allRevs.slice();
    const include = route._include.filter(r => allRevs.includes(r));

    const rows = Store.facilitators().map(f => {
      const s = Store.facilitatorSummary(f.id, include.length ? include : null);
      return { f, s };
    }).filter(r => true);

    rows.sort((a, b) => {
      if (a.s.mean == null && b.s.mean == null) return a.f.name.localeCompare(b.f.name);
      if (a.s.mean == null) return 1;
      if (b.s.mean == null) return -1;
      return b.s.mean - a.s.mean;
    });

    const root = el(`<div></div>`);
    root.appendChild(el(`<button class="back" id="back">← Home</button>`));
    root.appendChild(el(`<div class="pagehead"><div style="font-size:30px">🏆</div>
      <div><h1>Cumulative Ranking</h1>
        <div class="muted">${Store.facilitators().length} facilitators · ${include.length}/${allRevs.length} reviewers counted · projected /240</div></div></div>`));

    // export bar
    root.appendChild(el(`<div class="row" style="margin-bottom:14px">
      <button class="btn ghost sm" id="ej">⬇ Backup (JSON)</button>
      <button class="btn ghost sm" id="er">⬇ Ratings (CSV)</button>
      <button class="btn ghost sm" id="ec">⬇ Comments (CSV)</button>
      <button class="btn ghost sm" id="imp">⬆ Restore backup</button>
      <input type="file" id="impf" accept="application/json" class="hidden">
    </div>`));

    // reviewer filter
    if (allRevs.length) {
      const cw = el(`<div class="section"><h2>Reviewers counted</h2><div class="chips" id="chips"></div></div>`);
      const chips = $("#chips", cw);
      const allChip = el(`<label class="chip allc"><input type="checkbox" ${include.length===allRevs.length?"checked":""}> All</label>`);
      allChip.querySelector("input").onchange = (e) => { route._include = e.target.checked ? allRevs.slice() : []; renderCumulative(); };
      chips.appendChild(allChip);
      allRevs.forEach(r => {
        const c = el(`<label class="chip"><input type="checkbox" ${include.includes(r)?"checked":""}> ${esc(r)}</label>`);
        c.querySelector("input").onchange = (e) => { const set = new Set(route._include); e.target.checked ? set.add(r) : set.delete(r); route._include = [...set]; renderCumulative(); };
        chips.appendChild(c);
      });
      root.appendChild(cw);
    }

    if (!Store.facilitators().length) {
      root.appendChild(el(`<div class="empty"><div class="big">🏆</div><div>No facilitators to rank yet.</div></div>`));
    } else {
      rows.forEach((r, i) => {
        const s = r.s, f = r.f;
        const pct = s.mean == null ? 0 : (s.mean / 4) * 100;
        const barColor = s.mean == null ? "var(--faint)" : `var(--s${Math.max(1, Math.round(s.mean))})`;
        const rank = s.mean == null ? "–" : (i + 1);
        const node = el(`
          <div class="rankrow">
            <div class="rk ${i<3 && s.mean!=null?"top":""}">${rank}</div>
            ${avatar(f, "avatar")}
            <div style="flex:1;min-width:0">
              <div class="nm">${esc(f.name)} ${s.flagSerious?'<span class="flag" style="padding:1px 7px">⚑</span>':""}</div>
              <div class="mt">
                <span>${s.band?`<span class="band ${s.band.css}" style="padding:2px 8px;font-size:11px">${s.band.label}</span>`:"no ratings"}</span>
                <span>${s.reviewers.length} reviewer(s)</span><span>${s.days.length} day(s)</span>
              </div>
              <div class="bar"><i style="width:${pct}%;background:${barColor}"></i></div>
            </div>
            <div class="scorebox"><div class="big">${s.projected==null?"—":s.projected}</div><div class="of">/240</div>
              <div class="of" style="margin-top:2px">${s.mean==null?"":"avg "+s.mean.toFixed(2)}</div></div>
          </div>`);
        node.onclick = () => go("dash", { id: f.id });
        root.appendChild(node);
      });
      root.appendChild(el(`<div class="hint" style="margin-top:8px">Projected /240 = average attribute score × 60 — comparable even when reviewers scored different days. Tap a row for the full breakdown.</div>`));
    }

    shell(root);
    $("#back", root).onclick = () => go("home");
    $("#ej").onclick = () => Store.exportJSON();
    $("#er").onclick = () => Store.exportRatingsCSV();
    $("#ec").onclick = () => Store.exportCommentsCSV();
    const impf = $("#impf");
    $("#imp").onclick = () => impf.click();
    impf.onchange = async () => {
      const file = impf.files[0]; if (!file) return;
      try { const obj = JSON.parse(await file.text());
        if (confirm("Restore this backup? It will merge into current data.")) { await Store.importBundle(obj); toast("Backup restored"); renderCumulative(); } }
      catch (e) { alert("Could not read backup: " + e.message); }
    };
  }

  /* ---------------- ADMIN ---------------- */
  function adminGate() {
    if (!isAdmin) {
      alert("Admin access only. Ask the organiser for an admin login code to manage facilitators and photos.");
      return;
    }
    go("admin");
  }
  function renderAdmin() {
    cleanupBars(null);
    const root = el(`<div></div>`);
    root.appendChild(el(`<button class="back" id="back">← Home</button>`));
    root.appendChild(el(`<div class="pagehead"><div style="font-size:28px">⚙️</div>
      <div><h1>Admin</h1><div class="muted">Add facilitators, upload photos, manage data</div></div></div>`));

    // add single
    const add = el(`<div class="section"><h2>Add a facilitator</h2>
      <div class="row"><input class="txt" id="an" placeholder="Name"><input class="txt" id="ap" placeholder="Phone (optional)"></div>
      <div style="height:10px"></div><button class="btn" id="addb">➕ Add</button></div>`);
    root.appendChild(add);

    // bulk add
    root.appendChild(el(`<div class="section"><h2>Bulk add <span class="c">— one per line, optional <code>, phone</code></span></h2>
      <textarea id="bulk" rows="4" placeholder="Sita Sharma, 98XXXXXXXX&#10;Rita Gurung&#10;Maya Thapa, 98XXXXXXXX"></textarea>
      <div style="height:10px"></div><button class="btn" id="bulkb">➕ Add all</button></div>`));

    // list
    const listSec = el(`<div class="section"><h2>Facilitators <span class="c">(${Store.facilitators().length})</span></h2></div>`);
    if (!Store.facilitators().length) listSec.appendChild(el(`<div class="hint">None yet.</div>`));
    Store.facilitators().forEach(f => {
      const r = el(`<div class="adminrow">${avatar(f, "avatar")}
        <div class="grow"><div class="name">${esc(f.name)}</div><div class="phone">${f.phone?"📞 "+esc(f.phone):"<i>no phone</i>"} · ${f.photo_url?"📷 photo set":"no photo"}</div></div>
        <button class="btn ghost sm" data-photo>📷 Photo</button>
        <button class="btn ghost sm" data-edit>✎</button>
        <button class="btn danger sm" data-del>🗑</button>
        <input type="file" accept="image/*" class="hidden" data-file></div>`);
      const file = r.querySelector("[data-file]");
      r.querySelector("[data-photo]").onclick = () => file.click();
      file.onchange = async () => {
        const img = file.files[0]; if (!img) return;
        const url = await resizeImage(img, 480);
        await Store.updateFacilitator(f.id, { photo_url: url });
        toast("Photo updated"); renderAdmin();
      };
      r.querySelector("[data-edit]").onclick = async () => {
        const name = prompt("Name:", f.name); if (name === null) return;
        const phone = prompt("Phone:", f.phone || ""); if (phone === null) return;
        await Store.updateFacilitator(f.id, { name: name.trim() || f.name, phone: phone.trim() });
        renderAdmin();
      };
      r.querySelector("[data-del]").onclick = async () => {
        if (confirm(`Delete ${f.name} and ALL their comments & ratings? This cannot be undone.`)) {
          await Store.deleteFacilitator(f.id); renderAdmin();
        }
      };
      listSec.appendChild(r);
    });
    root.appendChild(listSec);

    // login codes (managed in the database for security)
    root.appendChild(el(`<div class="section"><h2>Reviewers &amp; login codes</h2>
      <div class="hint" style="line-height:1.6">
        Each reviewer logs in with a private <b>code</b>. For security, codes live in the database and
        can't be listed from here. Manage them in <b>Supabase → Table Editor → <code>reviewers</code></b>:
        <br>• Add a row with a <b>name</b> + a unique <b>code</b>; tick <code>is_admin</code> for organisers.
        <br>• Set <code>active = false</code> to instantly revoke someone's access.
        <br>Or run in the SQL editor:
        <div style="margin-top:8px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:9px 11px;font-family:monospace;font-size:12px;white-space:pre-wrap">insert into reviewers (name, code, is_admin)
values ('New Person', 'CODE-123', false);</div>
      </div></div>`));

    // data tools
    root.appendChild(el(`<div class="section"><h2>Data &amp; backup</h2>
      <div class="hint" style="margin-bottom:10px">Data auto-saves locally every ${CONFIG.AUTOSAVE_SECONDS}s. Export regularly so nothing is lost if a device closes.</div>
      <div class="row">
        <button class="btn ghost" id="ej">⬇ Backup JSON</button>
        <button class="btn ghost" id="er">⬇ Ratings CSV</button>
        <button class="btn ghost" id="ec">⬇ Comments CSV</button>
      </div></div>`));

    shell(root);
    $("#back", root).onclick = () => go("home");
    $("#addb", root).onclick = async () => {
      const n = $("#an").value.trim(); if (!n) return $("#an").focus();
      await Store.addFacilitator({ name: n, phone: $("#ap").value.trim() });
      renderAdmin();
    };
    $("#bulkb", root).onclick = async () => {
      const lines = $("#bulk").value.split("\n").map(s => s.trim()).filter(Boolean);
      for (const line of lines) {
        const [name, phone] = line.split(",").map(s => (s || "").trim());
        if (name) await Store.addFacilitator({ name, phone: phone || "" });
      }
      if (lines.length) toast(`Added ${lines.length}`);
      renderAdmin();
    };
    $("#ej", root).onclick = () => Store.exportJSON();
    $("#er", root).onclick = () => Store.exportRatingsCSV();
    $("#ec", root).onclick = () => Store.exportCommentsCSV();
  }

  /* resize an uploaded image to a square-ish data URL to keep storage small */
  function resizeImage(file, max = 480) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /* ---------------- toast ---------------- */
  let toastTimer;
  function toast(msg) {
    let t = $(".saved-toast");
    if (!t) { t = el(`<div class="saved-toast"></div>`); document.body.appendChild(t); }
    t.textContent = "✓ " + msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---------------- boot ---------------- */
  Store.setOnChange(() => {
    // re-render the current data-driven view on live updates
    if (["home", "dash", "cumulative", "admin"].includes(route.name)) {
      const active = document.activeElement;
      const typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      if (!typing && !document.querySelector(".overlay")) render();
    }
  });
  Store.init().then(() => render());
})();
