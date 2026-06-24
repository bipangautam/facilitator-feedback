# Facilitator Feedback

A lightweight web app to record facilitators' performance during a 5-day training
and **rank/select** them at the end. Multiple people rate at the same time from
their phones and laptops; every comment and rating is stored under the reviewer's
name for later review.

It's a plain HTML/CSS/JS site (no build step) so it can be hosted free on **GitHub
Pages**, with **Supabase** holding the shared live data. It also runs fully in
**Local mode** (no setup) for quick testing.

---

## What it does

- **Home** — a grid of all facilitators (photo + name + phone). A live average and a
  ⚑ flag appear on each card.
- **Tap a facilitator → 3 options:**
  - **Quick comment** — a fast note, posted to the dashboard under your name.
  - **Detailed rating** — score the **12 rubric attributes (1–4)** for any of the 5
    days. The photo + name stay pinned at the top. Tap **ⓘ** to see what each level
    means; evidence boxes open automatically for 1s and 4s. Running daily total /48.
  - **Facilitator dashboard** — every comment & rating from all reviewers, a
    ratings grid (group by reviewer or by day), totals, evidence notes, and the
    decision band. You can pick **which reviewers to include in the totals**.
- **🏆 Cumulative Ranking** — all facilitators ranked, with mini photo, projected
  **/240** score, decision band, and panel-review flags. Filter which reviewers count.
- **Login** — each person enters their own **private code** (set up in the database).
  It's attached to everything they record, and admins get extra access.
- **Auto-save & export** — data is mirrored to the browser every 30s, and you can
  export a **JSON backup** or **CSV** (ratings / comments) at any time, and restore a
  backup file. This protects you if a device closes mid-session.

The rubric (12 attributes, 1–4, daily max 48, five-day max 240, decision bands, and
auto-flags for a "1" in Compassion / Non-Judgement / Attentiveness) lives in
[`js/rubric.js`](js/rubric.js) — **edit that one file to change any criteria**.

---

## Run it locally (zero setup)

Just open `index.html` in a browser, **or** serve the folder:

```bash
npx serve .
# then open the printed http://localhost:... URL
```

In Local mode data stays on that one device. Good for trying it out.

---

## Go live & shared (Supabase + GitHub Pages)

Because many people rate at once and share one ranking, the data needs a small
backend. Supabase's free tier is plenty.

### 1. Create the database
1. Sign up at [supabase.com](https://supabase.com) → **New Project**.
2. Open **SQL Editor → New Query**, paste all of [`supabase_setup.sql`](supabase_setup.sql), click **Run**.

### 2. Connect the app
1. In Supabase: **Settings → API**. Copy the **Project URL** and the **anon public key**.
2. Open [`js/config.js`](js/config.js) and paste them in:
   ```js
   SUPABASE_URL: "https://YOURPROJECT.supabase.co",
   SUPABASE_ANON_KEY: "your-anon-key",
   ```
3. (Optional) set `ADMIN_PASSPHRASE` to protect the Admin panel.

### 3. Set up login codes (who can rate)

The `reviewers` table (created by the SQL) holds each person's **name + private
code**. People log in with their code; codes are validated by a secure database
function and are **never readable from the browser**.

The SQL already inserts the team with simple `name + 4-digit` codes (codes are
**case-insensitive**, so phone auto-capitalisation won't matter):

| Name | Code | Role |
|------|------|------|
| Bipan | `bipan1234` | **admin** (manages facilitators & photos) |
| Chandra | `chandra2233` | reviewer |
| Aarya (Jr) | `aarya4455` | reviewer |
| Aaryaa (Sr) | `aaryaa6677` | reviewer |
| Aakriti | `aakriti8899` | reviewer |
| Asim | `asim1221` | reviewer |
| Anubhav | `anubhav3443` | reviewer |
| Aadit | `aadit5665` | reviewer |
| Guest (view only) | `guest0000` | **view-only** — for PIs to review results |

To add or change people later, edit the `reviewers` table in
**Supabase → Table Editor** (or via SQL):
```sql
insert into reviewers (name, code, is_admin, view_only)
values ('New Person', 'newperson1212', false, false);
```
- Tick **`is_admin`** for organisers who should manage facilitators/photos.
- Tick **`view_only`** for people who may **browse but not rate or comment**
  (the guest account). View-only users can open every dashboard and the ranking,
  but never see the comment / rating / admin controls.
- Set **`active = false`** to instantly revoke someone's access.

> To **test code-login locally** before going live, you can put a few entries in
> `LOCAL_REVIEWERS` in `js/config.js` (ignored once Supabase keys are set).

### 4. Host on GitHub Pages
1. Put this folder in a GitHub repo.
2. **Settings → Pages → Build from branch → `main` / root**.
3. Share the published URL. Everyone opens it, types their name, and starts rating —
   all data appears live for everyone.

> The anon key is meant to be public. This is an internal tool with open
> read/write policies on trusted devices. Add Supabase Auth later if you need
> stricter access.

---

## Admin (⚙️ top-right)

- Add facilitators one-by-one or in bulk (one per line, optional `, phone`).
- Upload / replace a **photo** per facilitator (auto-resized).
- Edit or delete facilitators.
- Export backups / CSV.

You (admin) can add photos any time — facilitators show coloured initials until then.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell |
| `js/config.js` | **Your Supabase keys** + options |
| `js/rubric.js` | **The rubric** — edit to change criteria |
| `js/store.js` | Data layer (Supabase + local), scoring math, export/import |
| `js/app.js` | UI, pages, rendering |
| `css/styles.css` | Styling (mobile-first) |
| `supabase_setup.sql` | Database schema — run once in Supabase |
