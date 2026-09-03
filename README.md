# Grant Align

Prototype of the Grant Matcher System described in `project_requirements.md`: a
dual-sided platform that matches Frederick County non-profits to regional
funders on **operational reality** — what an organization actually does, and
explicitly does not do — rather than on mission-statement language.

## Stack

- **Next.js 15** (App Router, server actions) + TypeScript + Tailwind
- **Postgres via Prisma** — plain `DATABASE_URL`, so Vercel Postgres and
  Supabase are interchangeable
- **Genkit**, running on **Google Gemini** or **Mistral** (see below)
- **Vercel Cron** for the scheduled donor research job

## Running locally

```bash
cp .env.example .env          # add your GEMINI_API_KEY
npm install
./scripts/dev-db.sh start     # Postgres on 5432, data under .devdb/
npm run db:push               # create the tables
npm run db:seed               # load the local seed donors from §2.3
npm run dev
```

`./scripts/dev-db.sh` also takes `stop`, `status` and `reset`. It keeps its data
directory inside the project, so it never disturbs a system Postgres you run for
something else.

Two scripts do the rest:

```bash
npm run smoke     # exercise all four AI flows once against real seed data
npm run demo      # research live donor criteria, then score every pair
```

`npm run genkit:dev` opens the Genkit developer UI against the same flows, which
is the fastest way to iterate on interviewer and scoring prompts.

### AI provider

`AI_PROVIDER` selects between `gemini` (default) and `mistral`. Mistral is
reached through the official OpenAI-compatibility plugin, so any other
OpenAI-compatible endpoint (Groq, OpenRouter, Together, a local vLLM) works by
changing `baseURL` in `src/ai/providers.ts` and nothing else.

**Both providers can search the live web**, by different routes, and donor
research behaves the same on either:

- **Gemini** attaches Google Search as a tool to an ordinary generate call.
- **Mistral** cannot do that in chat completions at all, but exposes the same
  capability through its **Agents API** `web_search` connector
  (`src/ai/search-mistral.ts`). The agent is created once and reused by name;
  creating one per search would litter the account with identical agents.

Search is what reaches the section 4 aggregators, and it earns its keep beyond
them. The Community Foundation of Frederick County refuses direct connections
to `cffredco.org` entirely, and search found that its grants actually live on a
different domain (`frederickcountygives.org`) - a real funder with real
deadlines that direct fetching alone reported as having no criteria at all.

Both routes report whether search actually ran, and a provider that answered
from memory instead is recorded as ungrounded rather than passed off as
researched.

A note on Gemini quota, since it is easy to lose an hour here: a perfectly valid
API key on a Google Cloud project with no billing and no free-tier grant returns
`quota_limit_value: 0` on *every* model in *every* region, with a 429 whose text
says "Too Many Requests". Check
`console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas`
and filter for "generate content" before assuming the key is wrong.

### Connection pooling

`pgagroal/` holds a working pool config, started with
`./scripts/dev-db.sh start --pool` (pool on 5433, Postgres on 5432).

**It is off by default, and you probably want to leave it off locally.**
pgagroal 2.2.0 on macOS stops answering entirely as soon as Prisma opens its
normal burst of concurrent connections — the log shows only
`read error errno=54` and every later connection hangs. Raising
`max_connections`, raising the per-database `MAX_SIZE` and pinning Prisma's
`connection_limit` all failed to prevent it; the identical workload against
Postgres directly is stable across every run. A local Postgres handles one
developer's connections without help, and the deployed app pools through
Supabase rather than pgagroal, so the pool buys nothing here worth an
unexplained hang mid-demo. The config is kept because it works for sequential
clients and pgagroal is a first-class citizen on Linux, where this is worth
revisiting.

Note also that pgagroal cannot pool for the deployed app at all: it is a daemon
needing a persistent host, and Vercel functions are ephemeral.

## Deploying to Vercel + Supabase

1. **Supabase**: create the project, then take both strings from
   *Project Settings > Database > Connection string*:

   | Variable | Which tab | Port | Suffix |
   | --- | --- | --- | --- |
   | `DATABASE_URL` | Transaction pooler | **6543** | `?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | Session pooler | **5432** | none |

   **Use the Session pooler, not "Direct connection", for `DIRECT_URL`.** The
   `db.<ref>.supabase.co` host publishes an AAAA record and no A record, so it
   is reachable over IPv6 only — and Vercel's functions are IPv4-only, as are
   most local machines. It fails to connect from both, with a DNS error that
   reads like a typo. The pooler hostnames are dual-stack. Session mode holds a
   connection for the whole session, so migrations work over it.

   Both suffixes matter. `pgbouncer=true` stops Prisma using prepared
   statements, which a transaction-mode pooler cannot hold between statements.
   `connection_limit=1` keeps each serverless invocation to one connection —
   without it Prisma sizes its pool at `num_cpus*2+1` *per instance* and
   exhausts the pooler under any real traffic.

   Note the username in both strings is `postgres.<project-ref>`, not plain
   `postgres`.

2. **Schema and seed**, run once from your machine with the production values:

   ```bash
   DATABASE_URL=<session pooler url> DIRECT_URL=<session pooler url> npx prisma db push
   DATABASE_URL=<transaction pooler url> npm run db:seed
   ```

   `db push` goes over the session pooler — migrations cannot run over a
   transaction-mode pooler, which is what port 6543 is.

3. **Vercel**: import the repo (build command is already
   `prisma generate && next build`) and set `DATABASE_URL`, `DIRECT_URL`,
   `GEMINI_API_KEY` and `CRON_SECRET`.

4. `vercel.json` registers the cron at Mondays 06:00 UTC. Vercel sends
   `CRON_SECRET` as a bearer token; the endpoint refuses to run in production
   without it, since an open refresh endpoint is a way to burn the model quota.
   Cron only fires on production deployments, not previews.

Two Supabase gotchas worth knowing before a demo: free-tier projects pause after
about a week idle and the first request back is slow, and the pooler's
connection ceiling is low enough that a runaway `connection_limit` shows up as
intermittent 500s rather than a clean error.

### After the POC: Firestore

The plan is to move to Firebase/Firestore once the POC has been shown, so this
build deliberately does not invest in Postgres-specific features — no triggers,
no views, no stored procedures, no RLS policies. What will need rewriting is
`src/lib/*.ts` and the `prisma.*` calls inside `src/app/**/page.tsx`; the AI
flows in `src/ai/` take plain strings and objects and are storage-agnostic
already. The array columns (`fundingFocus`, `excludedSectors`, `populations`)
map cleanly onto Firestore arrays, and `Match.dimensions` is already JSON.

## What is built

| Requirement | Where |
| --- | --- |
| §2.1 Shared CRM | `prisma/schema.prisma` — one `Organization` table for both sides, plus contacts, notes, addresses |
| §2.2 Mission & identity repository | Seeker profile on `/seekers/[id]` |
| §2.2 AI conversational interviewer | `src/ai/flows/interviewer.ts`, `src/components/InterviewPanel.tsx` |
| §2.2 Eligibility & compliance | `src/components/ComplianceCard.tsx` — Form 990, good standing, determination letter and more |
| §2.2 Automated 1-pager | `src/ai/flows/onePager.ts`, `/seekers/[id]/one-pager` — print-to-letterhead and copy-as-text |
| §2.3 Seed donors | `prisma/seed.ts` — the nine organizations from the requirements |
| §2.3 Web scraper | `src/ai/web-research.ts` + `src/ai/flows/researchDonor.ts` |
| §2.3 Cron task | `src/app/api/cron/donor-refresh/route.ts`, `vercel.json` |
| §2.3 Donor AI interviewer | Same flow as the seeker interviewer, different agenda |
| §3 Matching engine | `src/ai/flows/scoreMatch.ts`, `src/lib/matching.ts`, `/matches` |

## Structured output across providers

Every flow asks the model for structured data, and the schemas handed to the
model leave the extracted fields **untyped**, coercing the shapes afterwards in
`src/ai/coerce.ts`. That looks backwards, so it is worth saying why.

Genkit validates the model's raw output against the JSON Schema derived from the
Zod type *before* parsing it. A strict `z.string()` therefore rejects the whole
turn when a model answers a "who do you serve" field with a nested object of
sub-answers - a reasonable reading of the instruction, and one smaller models
make constantly. `z.preprocess` cannot rescue it either: the preprocessed field
still publishes `"type": "string"`, so validation fails and the preprocessor
never runs. Leaving the field untyped in the schema is the only layer where this
can be fixed.

The cost of getting this wrong is not cosmetic. A failed interview turn loses an
answer the user already typed and asks them the same question twice; a failed
research pass costs two model calls plus a set of live page fetches and leaves a
funder with no criteria at all.

One trap worth knowing about, since it produced silently wrong data before it
was caught: the coercion splits a comma-joined string into tags, but must NOT
split the elements of an array the model already returned correctly. Doing so
turned `"Frederick County, MD"` into two separate geographies and an exclusion
of `"grant requests under $2,500"` into `"grant requests under $2"` plus a stray
`"500"`.

## Design decisions worth knowing

**Interviews chase negative scope.** Both interviewers are built to push on what
an organization does *not* do and who a funder will *not* fund. Exclusions are
what let the engine say "skip this one" with confidence, and nobody volunteers
them unasked.

**Research proposes; a person accepts.** A scraped criterion never writes
straight to a donor profile. Runs land in `ResearchRun.extracted` with their
sources, and someone accepts them on the donor page. A wrong scraped exclusion
does its damage invisibly — it removes eligible seekers from a funder's results
and nobody sees the match that did not happen.

**Grounding is tracked, not assumed.** Gemini will happily answer a research
prompt from memory if Search is unavailable. Runs record whether Search actually
ran, and unverified results are labelled as such throughout the UI.

**Blockers override the score.** Six weighted dimensions produce the number, but
a stated exclusion, an out-of-footprint address, or missing mandatory paperwork
forces SKIP regardless. A false "apply" costs a small non-profit more than a
false "skip".

**Scoring is sequential.** The Gemini free tier rate-limits hard enough that a
parallel fan-out over a full donor list fails most of its calls.

## Running on a free-tier key

Free Mistral keys meter **tokens** per minute, not just requests, and a web
search response is token-heavy. Two things follow, both already handled:

- Every model call retries on 429 with linear backoff (`src/ai/retry.ts`).
  Linear rather than exponential, because per-minute limits refill on a fixed
  schedule - waiting a minute in total beats waiting sixteen.
- `npm run demo` pauses between donors (`DEMO_PAUSE_MS`, default 20s). Without
  it, research exhausts the token window around the fourth donor and every
  remaining one fails, which reads as broken research rather than a quota
  ceiling.

A run that still comes back empty leaves the donor marked unresearched, so
simply running the demo again picks up exactly the ones that failed.

One quota-shaped failure is deliberately NOT retried: a Gemini project whose
quota limit is literally `0` fails immediately with a message saying so. No
amount of backoff adds headroom to a project that has none.

## Known limitations

- **Some funder sites cannot be fetched.** `cffredco.org` refuses our requests
  outright (the connection fails, not a 403), and JS-only sites reduce to an
  empty shell. The search pass covers those, which is why both run on every
  refresh.
- **Not every donor researches successfully, by design.** A run that finds
  nothing records why and proposes nothing, rather than inventing plausible
  criteria. Expect roughly the funders with readable public sites to work.
- **The §4 paid databases are reached only indirectly.** Foundant, Candid /
  GuideStar and the Foundation Directory are hit through Google Search
  grounding, not through accounts or APIs. Direct integration needs
  subscriptions and a terms-of-service review before it is built.
- **No authentication.** Every visitor sees every organization. Real deployment
  needs auth and a seeker/donor/staff permission split before any non-profit's
  data goes in.
- **No file storage.** Compliance items hold a link to a document, not the
  document.
- **The section 4 databases are still reached only through search**, not
  through accounts or APIs. Direct Foundant/Candid integration needs
  subscriptions and a terms-of-service review.
- **No pooling on macOS.** See the connection-pooling note above.

## Open questions for the grants expert (§5)

The requirements list a review checklist. Three items need a decision before the
next iteration:

1. **Interviewer agendas** — `SEEKER_AGENDA` and `DONOR_AGENDA` in
   `src/ai/flows/interviewer.ts` are a first pass at the qualitative metrics.
   They are plain text and meant to be edited by whoever knows the domain.
2. **1-pager fields** — the sections in `OnePagerSchema` are an informed guess
   at what local funders expect. Confirm against actual local applications.
3. **Compliance items** — `REQUIRED_COMPLIANCE` in `src/lib/profile-text.ts`
   currently requires Form 990, good standing and the IRS determination letter.
   Audited financials, board roster and state charity registration are tracked
   but optional.
