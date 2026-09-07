# GrantAlign — Redesign Plan (Phase 0 Audit)

Status: **Phase 0 and Phase 1 complete. Phase 2 complete except step 8 (marketing), which is deferred — see §11.**

---

## 1. Stack detection

| Concern | Finding |
|---|---|
| Framework | Next.js 15.3.8, **App Router**, React 18.3.1, TypeScript 5.7 |
| Styling | Tailwind CSS 3.4.1 + PostCSS/autoprefixer. No CSS modules, no styled-components |
| Component library | **None.** All primitives are hand-rolled in `src/components/ui.tsx` plus a `@layer components` block in `src/app/globals.css` |
| Icons | **No icon package.** Icons are hand-authored inline `<svg>` in 3 files only (`app/page.tsx`, `landing/Artwork.tsx`, `landing/Diagram.tsx`) |
| Class utilities | No `clsx`, `cva`, or `tailwind-merge`. Variants are string-concatenated by hand |
| Fonts | `next/font/google` in `src/app/layout.tsx`: Inter to `--font-aeonik`, IBM Plex Mono to `--font-input`, both `display: swap`, latin subset |
| Dark mode | **Not present.** No `darkMode` key in Tailwind config, zero `dark:` classes in the codebase |
| Data/auth | Prisma 6 to Supabase Postgres; Supabase Auth for identity only. Authorization in `src/lib/auth.ts`, not RLS |

---

## 2. Headline finding — three parallel visual systems are live right now

This is the single most important thing to resolve, and it pre-dates this brief.

**System A — "Community" (`com-*`)**, added recently to `tailwind.config.ts` and `globals.css:9-15`.
Tokens: `com-ivory #F8F8F4`, `com-navy #102A43`, `com-green #20845B`, `com-light-green`, `com-coral #F07A55`, `com-light-peach`, `com-border`, plus `rounded-com-cards/buttons: 24px`.
Applied to **`src/app/page.tsx` only** (the landing page). This is already close to the "Warm Civic" direction the brief asks for.

**System B — "Hyperstudio" dark.** Tokens `obsidian, carbon, chalk, smoke, ash, graphite, iron, compass-gold, card-slate, pulse-green`, plus the `.rule / .hairline / .pill-white / .btn-ghost-outline / .status-pill / .meta` component classes in `globals.css`. Now used by **`/login` only** — the landing page it was built for has moved on. Comments still cite a `reference_ui.md` that no longer governs any current screen.

**System C — app light.** Tokens `ink, muted, line, surface, brand{DEFAULT,dark,light}, apply, maybe, skip`, plus `.card / .input / .btn-* / .chip / .label / .field-empty`. Used by **every `(app)` route plus `/signup`, `/no-access`, `/onboarding`**.

Consequences visible today:

- `/login` (dark) and `/signup` (light) are the same flow in two different design languages.
- The landing page promises System A; signing in delivers System B, then System C.
- `tailwind.config.ts` carries all three palettes at once, with the third commented "kept for safety".

**This plan's core job is to collapse A + B + C into one token layer** and delete the other two. That satisfies the brief's "leave no parallel old/new style systems behind" and is achievable without touching logic.

---

## 3. Route inventory

### 3.1 Public / marketing

| Route | File | States present | Notes |
|---|---|---|---|
| `/` | `app/page.tsx` (447 ln) | populated; **degraded** (stats omitted when the DB query fails — `landingData()` returns `null`) | Already migrated to System A. Contains all briefed sections |
| `/login` | `app/login/page.tsx` + `LoginForm.tsx` | idle, submitting (`busy`), error | System B (dark) |
| `/signup` | `app/signup/page.tsx` + `AuthForm.tsx` | idle, pending, error | System C (light) |
| `/no-access` | `app/no-access/page.tsx` | signed-in variant, signed-out variant | System C |
| `/onboarding` | `app/onboarding/page.tsx` | single state | System C |
| `/handoff` | `app/handoff/page.tsx` | none — redirect only | **No UI to style** |
| `/auth/callback` | route handler | n/a | **No UI** |

### 3.2 Application (`(app)` group — shared shell in `(app)/layout.tsx`)

| Route | File | States present | States missing |
|---|---|---|---|
| `/dashboard` | `dashboard/page.tsx` (196 ln) | populated, empty (`EmptyState`), loading (`SkeletonStats`, `SkeletonCard` via `Suspense`) | error |
| `/matches` | `matches/page.tsx` (109 ln) | populated, empty, loading (`matches/loading.tsx`), run-in-progress (`MatchRunner`) | error |
| `/seekers` | `seekers/page.tsx` (83 ln) | populated, empty | loading, error |
| `/seekers/new` | `seekers/new/page.tsx` (72 ln) | form idle, pending | validation error display |
| `/seekers/[id]` | `seekers/[id]/page.tsx` (198 ln) | populated, loading (`[id]/loading.tsx`) | empty, error |
| `/seekers/[id]/one-pager` | `one-pager/page.tsx` (45 ln) + `OnePagerView.tsx` | idle, generating, generated, error; **print stylesheet** | — |
| `/donors` | `donors/page.tsx` (83 ln) | populated, empty | loading, error |
| `/donors/new` | `donors/new/page.tsx` (54 ln) | form idle, pending | validation error display |
| `/donors/[id]` | `donors/[id]/page.tsx` (210 ln) | populated, loading (`[id]/loading.tsx`) | empty, error |
| `/staff/people` | `staff/people/page.tsx` (81 ln) | populated table + inline forms | empty, loading, error |

### 3.3 API routes — no UI, out of scope

`/api/cron/donor-refresh`, `/api/donors/research`, `/api/interview`, `/api/matches/run`, `/api/one-pager`, `/auth/callback`.

### 3.4 Surfaces the brief names that **do not exist**

The brief asks for these; creating them would violate its own "no new pages" rule. **Flagged, not built, pending your decision:**

- Contact page
- Legal pages (privacy, terms)
- Custom **404** and **500** — there is no `not-found.tsx`, `error.tsx`, or `global-error.tsx` anywhere. Today these render Next's unstyled defaults
- Password reset / magic-link / verify — `auth-actions.ts` exports only `signIn`, `signUp`, `signOut`. Email + password only
- Org-selection screen — `claimOrganization` exists but is a staff action inside `/staff/people`, not its own screen
- Standalone **match detail** route — the six-dimension breakdown lives inside a `<details>` disclosure in `MatchList.tsx`, not on its own page
- Separate funder "criteria management" and "exclusions editor" screens — both are `<Card>` sections inside `/donors/[id]`
- Separate seeker "document tracking" screen — it is `ComplianceCard.tsx` inside `/seekers/[id]`
- Research console / source-citation review / criteria-approval queue — the only research surface is `ResearchRuns.tsx`, a card inside `/donors/[id]`
- Settings page
- Mobile nav sheet/drawer — `(app)/layout.tsx` renders one flat `<nav>` with no breakpoint handling and no mobile menu

**Recommendation:** `error.tsx` and `not-found.tsx` are error *boundaries*, not new destinations — no route is added and no flow changes. I read them as in-scope presentational work and would like to build them. The rest I will leave alone unless you say otherwise.

---

## 4. Primitive inventory

### 4.1 Exists in `src/components/ui.tsx`

`PageHeader`, `Card` (plus `card-header` / `card-title` / `card-body`), `VerdictBadge`, `Field`, `Tags`, `EmptyState`, `StatTile`, `SkeletonLine`, `SkeletonCard`, `SkeletonStats`

### 4.2 Exists as CSS classes in `globals.css`

`.card`, `.input`, `.label`, `.field-empty`, `.chip`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.rule`, `.hairline`, `.pill-white`, `.btn-ghost-outline`, `.status-pill`, `.meta`, `.no-print`, `.print-sheet`

### 4.3 Exists as feature components

`ActionButton`, `AuthForm`, `LoginForm`, `UserMenu`, `MatchList` (`MatchCard`), `MatchRunner`, `InterviewPanel`, `ComplianceCard`, `OrgContacts`, `ResearchRuns`, `OnePagerView`, `landing/Artwork`, `landing/Diagram`, `landing/SampleMatch`

### 4.4 Briefed primitives that **do not exist** — to be built in Phase 1

Textarea (styled — currently reuses `.input`), select, combobox, checkbox, radio (unstyled native in `/signup`), switch, file upload, tabs, accordion, modal, drawer/sheet, toast, tooltip, popover, pagination, breadcrumbs, avatar, alert/callout banner, destructive + link + icon-only button variants, size scale (sm/md/lg), dedicated **ScoreMeter**

### 4.5 Duplication to consolidate

`landing/SampleMatch.tsx` (marketing) and `MatchList.tsx` (product) render the same concept twice, independently. The brief asks for **one shared `MatchCard` + `ScoreMeter`**. This is a presentational extraction — allowed — and is the highest-value consolidation in the plan.

---

## 5. Token debt to clear

| Debt | Count | Where |
|---|---|---|
| Arbitrary Tailwind values (`text-[14px]`, `h-[80px]`, `w-[7.5rem]`…) | **206** | 14 files. Worst: `app/page.tsx`, `login/page.tsx`, `landing/Diagram.tsx`, `landing/SampleMatch.tsx`, `ui.tsx`, the three `loading.tsx` files |
| Hard-coded hex | **43** | `app/page.tsx`, `landing/Artwork.tsx`, `landing/Diagram.tsx` — mostly SVG `fill` / `stroke` |
| Inline `style={{…}}` | 3 | `MatchList.tsx` (meter width — legitimate, data-driven), 2 others to remove |
| Unused token sets | 2 full palettes | System B (9 colors) plus duplicated System C entries |

### Live inconsistency worth naming

`src/app/layout.tsx` still loads Inter via `next/font/google` and exposes it as `--font-aeonik`, but `tailwind.config.ts:8` now sets `sans: ['"Segoe UI"', …]` and no longer references that variable. **Inter is downloaded on every page load and never used for body text.** Plex Mono to `--font-input` is still correctly wired to `mono`. Phase 1 must resolve which family wins; either is fine, but paying for a webfont nothing renders is not.

---

## 6. Order of work

**Phase 1 — token layer and primitives** (no screen touched)

1. `tailwind.config.ts` + `globals.css`: build the single Warm Civic token set — `surface` ramp, `ink` ramp, `brand`, `accent`, semantic, verdict, `line`; type scale; spacing; radii; 3 shadows; motion. System A's palette is the best starting point; extend rather than replace it.
2. Resolve the font question; wire families to tokens.
3. Rebuild `ui.tsx` primitives against tokens; add the missing primitives from section 4.4.
4. Extract shared `MatchCard` + `ScoreMeter`.
5. Build `/design-system` (dev-only route; the brief explicitly authorizes it).

**Phase 2 — screens, in this order** (each its own commit, build + typecheck + screenshots after each)

6. `redesign(shell)` — `(app)/layout.tsx` nav plus mobile sheet, `UserMenu`, footer
7. `redesign(auth)` — `/login`, `/signup`, `/no-access`, `/onboarding` onto one system, retiring System B
8. `redesign(marketing)` — `/` reconciled to final tokens, arbitrary values removed
9. `redesign(seeker): list + detail` — `/seekers`, `/seekers/new`, `/seekers/[id]`, including the negative-scope editor
10. `redesign(seeker): compliance + one-pager` — `ComplianceCard`, `OnePagerView` (preserve print styles)
11. `redesign(donor)` — `/donors`, `/donors/new`, `/donors/[id]`, criteria and exclusions cards
12. `redesign(matches)` — `/matches`, `MatchRunner`, shared `MatchCard`
13. `redesign(admin)` — `/staff/people`, `ResearchRuns` (denser, monospace identifiers)
14. `redesign(states)` — skeletons, empty states, and (if approved) `error.tsx` / `not-found.tsx`
15. Verification sweep — grep for residual hex and arbitrary values, screenshots at 375 / 768 / 1024 / 1440

---

## 7. Six-dimension grammar (must be identical everywhere)

From `src/ai/flows/scoreMatch.ts:23-30` — fixed order and weights, **not to be changed**:

| # | key | label | weight |
|---|---|---|---|
| 1 | `mission` | Mission & program fit | 30 |
| 2 | `population` | Population served | 20 |
| 3 | `geography` | Geographic eligibility | 20 |
| 4 | `exclusions` | Clear of donor exclusions | 15 |
| 5 | `size` | Grant size vs. organization scale | 8 |
| 6 | `compliance` | Documentation readiness | 7 |

Note the brief lists "funder size" as a dimension; the code has no such dimension. The six above are authoritative. Labels are user-facing copy and stay verbatim.

`VerdictBadge` currently pairs color with a text label (`Apply` / `Worth a look` / `Skip`) but **carries no icon**. The brief requires icon plus label so verdict is never hue-only — adding icons is presentational and in scope.

Blockers must read as categorically different from a low score. Today they are a `bg-skip/5` panel titled "Disqualifiers" inside the disclosure, while the scoring bars are all `bg-brand` regardless of value. Both need a stronger distinction.

---

## 8. Bugs found — flagged, not fixed (per brief)

1. **Landing stats silently missing.** `DATABASE_URL` sets `connection_limit=1`, but `landingData()` in `app/page.tsx:26-37` fires five queries in one `Promise.all`. They exhaust the single-connection pool and time out after 10s; the `catch` returns `null` and the page renders **without its live counts**. The comment there says a stale number is "the kind of thing a subject-matter reviewer notices first" — right now there is no number at all. Correct for Vercel serverless, wrong for local dev.
2. **Dev server 500 on Node 25.** Next 15.3.8's dev overlay calls `localStorage.getItem('__nextjs-dev-tools-scale')` during server render; Node v25.9.0 exposes a method-less `localStorage` global, so `/` and `/login` return 500 in dev. Workaround in use: `NODE_OPTIONS=--no-experimental-webstorage`. Not a styling issue, but it blocks screenshotting.
3. **No route-level error boundaries** — an uncaught render error anywhere shows Next's default error page.

---

## 9. Where visual-only was impossible — flagged, not done

| Item | Why it is blocked | Proposed |
|---|---|---|
| Contact / legal pages | Do not exist; creating them adds routes | Skip unless you approve |
| 404 / 500 styling | Requires new `error.tsx` / `not-found.tsx` files | **Request approval** — boundaries, not new destinations |
| Password reset, magic link, verify | No such flows in `auth-actions.ts` | Skip — adding them is auth logic |
| Standalone match detail, criteria, exclusions, compliance, research screens | All are card sections inside existing pages; promoting them changes IA | Restyle in place |
| Mobile nav drawer | No mobile menu exists; adding one adds interactive state | Presentational only; **request approval** |
| "Funder size" dimension | Not in the engine | Ignore; use the six real dimensions |
| Dark mode | Not present | Do not add. Tokens will be authored so it stays possible |

---

## 10. Dependencies I would want (none added yet — asking first, per brief)

| Package | Why | Alternative if declined |
|---|---|---|
| `clsx` + `tailwind-merge` | Variant-heavy primitives with hand-concatenated strings are how style drift returns | Hand-rolled `cn()` helper, about 10 lines, no dependency |
| An icon set (`lucide-react`) | Verdicts, the six dimensions, compliance status, and nav all need icons; the brief requires verdict icons for accessibility | Hand-author roughly 15 inline SVGs, consistent with current practice |

My recommendation: **decline both.** A local `cn()` helper and a small hand-authored icon set match how this codebase already works and keep the dependency list honest.

---

## Decisions needed before Phase 1

1. **Brand primary** — the brief says pick one and commit. System A's `com-green #20845B` is already in place and fits Warm Civic. Confirm, or name another.
2. **Font** — resolve Inter vs. Segoe UI. Recommendation: keep Inter (already loaded, better cross-platform) and point `tailwind.config.ts:8` back at `var(--font-aeonik)`; or drop the `next/font` import if Segoe UI is intended.
3. **`error.tsx` / `not-found.tsx`** — approve or decline.
4. **Mobile nav drawer** — approve or decline.
5. **Dependencies** — confirm the decline above.

---

## 11. Status log

Branch `redesign/warm-civic`. Build and typecheck pass on every commit.

| Step | Surface | Commit | State |
|---|---|---|---|
| 0 | Audit | — | done |
| 1–5 | Token layer, primitives, `/design-system` | `e8df5c9` | done |
| 6 | App shell, mobile sheet, user menu | `84b0ee5` | done |
| 7 | Auth: login, signup, no-access, onboarding | `b1fafc5` | done |
| 8 | Marketing `/` | — | **deferred — see below** |
| 9–13 | Seeker, donor, matches, admin | `6231ad3` | done |
| 14 | Skeletons, empty states, `error.tsx`, `not-found.tsx` | `6231ad3` | done |
| 15 | Verification sweep, screenshots | `HEAD` | partial — see below |

### Step 8 is deferred, deliberately

`src/app/page.tsx`, `src/app/layout.tsx`, `src/components/landing/Diagram.tsx`,
`src/components/landing/SampleMatch.tsx`, `src/components/landing/Artwork.tsx` and
`public/images/` were **already modified and uncommitted** in the working tree when this
work began. They are not mine. Rewriting them would have mixed two people's changes into
one commit and put that work at risk.

What step 8 still owes, once those files are committed or confirmed:

- reconcile the `com-*` palette on `/` to the final tokens, and delete the seven `com-*`
  colours plus `rounded-com-cards`/`rounded-com-buttons` from `tailwind.config.ts`
- remove the ~200 arbitrary values and 43 raw hex values still in those four files
- replace the raw System B hex still in `Artwork.tsx` (`#212121`, `#f3f3f3`, `#474747`)
- fold `landing/SampleMatch.tsx` into the shared `MatchCard` + `ScoreMeter`
- resolve `layout.tsx`, which still loads Inter through `next/font/google`

### Verification sweep

Across the 36 files this redesign owns:

- hard-coded hex: **none**
- arbitrary px values: **none**
- legacy tokens (`text-muted`, `bg-surface`, `text-apply/maybe/skip`): **none**
- four dimensional one-offs remain (`32rem`, `85%`, `26rem`, `8.5in`), each commented
  with why it is not a scale step

### Screenshots

`node scripts/shots.mjs` captures at 375 and 1440 into `redesign-screenshots/`.

Only `/login` could be captured. Everything else is unreachable to an unauthenticated
browser, and Supabase owns the passwords, so the seed data does not supply any. The script
takes `SHOT_EMAIL` / `SHOT_PASSWORD` and will capture the remaining nine routes with real
credentials; it reports redirected routes as SKIP rather than saving a screenshot of the
login page under another route's name.

### Bugs found, not fixed

4. **`/signup` is unreachable when signed out.** `PUBLIC_PATHS` in `src/middleware.ts` is
   `['/', '/login', '/auth', '/no-access']`, so `/signup` 307s to `/login` — for exactly
   the visitors who need it. Pre-existing, and a middleware change rather than a styling one.
5. **`/design-system` is behind the same gate**, so it renders only when signed in.
