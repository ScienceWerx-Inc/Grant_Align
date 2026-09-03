# Grant Matcher System — Master System Design & User Story Specification

## 1. Project Context

Design and architect a production-ready prototype of a dual-sided AI-powered grant matching platform called **Grant Matcher**.

The platform connects:

1. **Grant Seekers** — local nonprofit organizations looking for funding.
2. **Grant Givers / Donors** — foundations, corporations, government programs, and other organizations providing grants.
3. **Administrators / Grant Experts** — platform operators responsible for data quality, donor configuration, AI review, and system governance.

The initial geographic focus is **Frederick County, Maryland and surrounding areas**.

The system must go beyond simple keyword matching. Its primary value is to transform qualitative information about nonprofits and donor preferences into structured, machine-readable profiles and then perform **explainable, high-precision grant matching**.

The system should answer two questions:

### For nonprofits:

> "Which grants are actually worth applying for, and why?"

### For donors:

> "Which local nonprofits actually align with our funding priorities, and why?"

---

# 2. Product Vision

The system should function as a combination of:

* CRM
* AI conversational intake system
* Nonprofit knowledge extraction system
* Donor intelligence system
* Grant information aggregation platform
* Eligibility verification system
* Matching/recommendation engine
* Document generation system
* Administrative review platform

The AI should NOT simply act as a chatbot.

The conversational AI is primarily an interface for collecting and structuring information.

The core architecture should preserve structured, auditable data underneath the AI layer.

---

# 3. Primary Actors

## 3.1 Grant Seeker

A nonprofit organization looking for funding.

Typical goals:

* Create an organization profile
* Explain its mission and activities
* Describe its actual target population
* Explain geographic scope
* Identify excluded populations/services
* Upload eligibility documentation
* Discover suitable grants
* Understand why a grant is or is not suitable
* Generate a one-page organization summary

---

## 3.2 Grant Giver / Donor

A foundation, government organization, rotary club, corporation, or other grant provider.

Typical goals:

* Create a donor profile
* Define funding priorities
* Define geographic restrictions
* Define eligible organization types
* Define excluded sectors
* Define grant sizes
* Define application cycles
* Explain nuanced funding preferences
* Discover matching nonprofits
* Keep donor information current

---

## 3.3 Administrator

Platform operator or grant expert.

Typical goals:

* Manage organizations
* Manage donors
* Manage grants
* Review AI-extracted information
* Review scraped information
* Approve/reject AI-generated changes
* Manage donor sources
* Manage matching rules
* Monitor scraping jobs
* Review system activity
* Maintain data quality

---

# 4. High-Level System Architecture

Use a modular architecture similar to:

```text
                         GRANT MATCHER PLATFORM
                                  |
             +--------------------+--------------------+
             |                                         |
             v                                         v
      GRANT SEEKER SIDE                         GRANT GIVER SIDE
             |                                         |
             v                                         v
     Organization CRM                          Donor CRM
             |                                         |
             v                                         v
      AI Seeker Interview                    AI Donor Interview
             |                                         |
             +--------------------+--------------------+
                                  |
                                  v
                         KNOWLEDGE / DATA LAYER
                                  |
             +--------------------+--------------------+
             |                    |                    |
             v                    v                    v
       Structured Data       Vector Search       Documents
             |                    |                    |
             +--------------------+--------------------+
                                  |
                                  v
                         MATCHING ENGINE
                                  |
                   +--------------+--------------+
                   |                             |
                   v                             v
             Seeker Results                 Donor Results
                   |                             |
                   v                             v
            "Apply / Skip"                "Organizations"
```

Supporting infrastructure:

```text
External Sources
      |
      v
Crawler / API / Data Ingestion
      |
      v
Raw Source Documents
      |
      v
Content Extraction
      |
      v
AI Information Extraction
      |
      v
Donor Knowledge Base
      |
      v
Change Detection
      |
      v
Human Review
      |
      v
Updated Donor Criteria
      |
      v
Matching Engine
```

---

# 5. Recommended Technical Architecture

Design the system using a modular backend architecture.

A possible implementation stack:

### Frontend

* Next.js
* React
* TypeScript

### Backend

* NestJS
* TypeScript
* REST API initially
* WebSocket/SSE if real-time AI conversations require it

### Database

Prefer PostgreSQL for the primary relational database.

Use it for:

* users
* organizations
* donors
* grants
* criteria
* eligibility records
* interviews
* extracted facts
* matches
* audit logs
* scraping jobs

### Vector Search

Use PostgreSQL + pgvector initially if possible.

Avoid introducing a separate vector database unless scale requires it.

### Background Jobs

Use:

* Redis
* BullMQ
* NestJS workers

For:

* scraping
* document processing
* embeddings
* matching recalculation
* notifications
* scheduled donor updates

### Object Storage

Use object storage for:

* Form 990 files
* Good Standing documents
* PDFs
* source documents
* generated 1-pagers

### AI Layer

The AI layer should support:

1. Conversational interviewing
2. Structured information extraction
3. Document extraction
4. Semantic similarity
5. Match explanation generation

AI calls must be isolated behind an internal service abstraction.

Do not couple the entire backend directly to one LLM provider.

---

# 6. Core Domain Model

The initial domain model should include:

```text
User
Organization
OrganizationContact
OrganizationProfile
OrganizationProgram
OrganizationPopulation
OrganizationGeography
OrganizationExclusion
EligibilityRequirement
EligibilityDocument

Donor
DonorContact
DonorProfile
FundingCriterion
FundingExclusion
FundingGeography
FundingPopulation
FundingCycle
GrantOpportunity

Interview
InterviewMessage
ExtractedFact
FactVerification

Source
SourceDocument
ScrapingJob
SourceChange

Match
MatchCriterion
MatchScore
MatchExplanation

OnePager
Notification
AuditLog
```

---

# 7. Organization Model

An organization should have both structured and qualitative information.

Example:

```json
{
  "name": "Example Nonprofit",
  "mission": "...",
  "geography": ["Frederick County"],
  "populationsServed": [
    "children",
    "low-income families"
  ],
  "ageRange": {
    "min": 8,
    "max": 16
  },
  "services": [
    "STEM education",
    "after-school programs"
  ],
  "excludedServices": [
    "direct financial assistance"
  ],
  "excludedPopulations": [
    "adults"
  ]
}
```

The system must distinguish between:

* explicitly stated information
* AI-inferred information
* externally sourced information
* administrator-verified information

Every important fact should have provenance.

---

# 8. AI Seeker Interview

The AI interviewer should conduct a structured conversation.

It should progressively discover:

## Identity

* What is your organization's mission?
* What problem are you solving?
* What makes your organization different?

## Population

* Who do you serve?
* What age groups?
* What socioeconomic groups?
* Are there specific communities you focus on?

## Geography

* Where do you operate?
* Which counties/cities do you serve?
* Are services restricted to residents of a specific area?

## Programs

* What programs do you operate?
* What does a typical participant receive?
* How frequently do you provide services?

## Exclusions

* Who do you not serve?
* What services do you not provide?
* What types of projects are outside your mission?

## Funding

* What are you seeking funding for?
* How much funding are you seeking?
* Is it program funding, operating funding, capital funding, etc.?

## Impact

* How many people do you serve?
* What measurable outcomes do you track?
* What evidence demonstrates your impact?

The interviewer should dynamically ask follow-up questions when an answer is ambiguous.

---

# 9. AI Interview State

Do not model the interview as an uncontrolled chatbot.

Represent it as a stateful process:

```text
START
 |
 v
IDENTITY
 |
 v
MISSION
 |
 v
POPULATION
 |
 v
GEOGRAPHY
 |
 v
PROGRAMS
 |
 v
EXCLUSIONS
 |
 v
FUNDING NEED
 |
 v
IMPACT
 |
 v
COMPLIANCE
 |
 v
REVIEW
 |
 v
COMPLETE
```

The AI can skip irrelevant sections or return to previous sections when clarification is needed.

---

# 10. Human Verification

AI-extracted information must not automatically become authoritative.

Use a workflow:

```text
Conversation
     |
     v
AI Extraction
     |
     v
Draft Facts
     |
     v
User Review
     |
     +----> Edit
     |
     +----> Approve
     |
     +----> Reject
     |
     v
Verified Profile
```

Every extracted fact should ideally have:

```text
value
source
confidence
created_at
verified_at
verified_by
status
```

Possible statuses:

```text
DRAFT
AI_EXTRACTED
USER_VERIFIED
ADMIN_VERIFIED
REJECTED
```

---

# 11. Donor Model

A donor should have structured criteria such as:

```json
{
  "fundingAreas": [
    "education",
    "youth development"
  ],
  "geography": [
    "Frederick County"
  ],
  "eligibleOrganizations": [
    "501(c)(3)"
  ],
  "targetPopulation": [
    "children",
    "youth"
  ],
  "excludedAreas": [
    "political activities"
  ],
  "fundingTypes": [
    "program",
    "operating"
  ],
  "grantAmount": {
    "min": 5000,
    "max": 50000
  },
  "applicationCycle": "annual"
}
```

---

# 12. Donor AI Interview

The donor interviewer should discover:

* What causes does the donor prioritize?
* What causes are excluded?
* What populations are prioritized?
* What geography is eligible?
* What organization types are eligible?
* What organization types are excluded?
* What funding types are allowed?
* What funding types are excluded?
* Typical grant size
* Maximum/minimum grant size
* Application frequency
* Deadlines
* Required documents
* Restrictions
* Preferred outcomes
* Strategic priorities
* Unwritten/nuanced preferences

The AI should distinguish:

### Hard requirements

Example:

```text
Must operate in Frederick County.
```

### Soft preferences

Example:

```text
Preference for organizations serving children.
```

This distinction is critical for matching.

---

# 13. External Donor Intelligence

Initial donor seed list:

* Ausherman Foundation
* The Community Foundation
* Serini Foundation
* Delaplaine Foundation
* William Cross
* City of Frederick Community Grants / CDBG
* Frederick County
* Carroll Creek Rotary Club
* Noon Rotary Club

The architecture must support adding additional donors later.

Do NOT hardcode donors into business logic.

Instead:

```text
Donor
  |
  +-- Source
  |
  +-- Source Documents
  |
  +-- Extracted Criteria
  |
  +-- Verification Status
```

---

# 14. Source Ingestion Pipeline

Design:

```text
               SOURCE
                 |
                 v
          Fetch / Crawl
                 |
                 v
           Raw Document
                 |
                 v
        Content Extraction
                 |
                 v
       Document Normalization
                 |
                 v
        AI Information Parser
                 |
                 v
       Structured Candidate Data
                 |
                 v
          Change Detection
                 |
                 v
          Human Review
                 |
                 v
        Donor Knowledge Base
```

Sources may contain:

* HTML
* PDFs
* grant application pages
* annual reports
* Form 990 documents
* FAQ pages
* application instructions

The scraper must preserve the original source and timestamp.

---

# 15. Change Detection

Do not blindly overwrite donor data.

When a source changes:

```text
Previous Version
       |
       v
New Version
       |
       v
Diff / Change Detection
       |
       v
AI Interpretation
       |
       v
Candidate Update
       |
       v
Human Approval
```

Example:

```text
Previous:
Maximum grant = $25,000

New source:
Maximum grant = $50,000

Detected change:
grant_amount.max
25,000 → 50,000
```

---

# 16. Matching Engine

The matching engine should use a hybrid model.

Do NOT use only:

```text
LLM → "87% match"
```

Instead combine deterministic rules with semantic similarity.

Potential dimensions:

```text
Geography
Mission / Funding Area
Population
Program Type
Eligibility
Funding Type
Funding Amount
Application Cycle
Organizational Type
Exclusions
```

---

# 17. Hard vs Soft Matching

### Hard constraints

Failure may make the organization ineligible.

Examples:

```text
Wrong geography
Not eligible organization type
Required Form 990 missing
Donor explicitly excludes the sector
Grant deadline passed
```

### Soft constraints

Failure reduces the score but does not necessarily eliminate the match.

Examples:

```text
Preferred population
Preferred program area
Preferred impact area
Preferred organization size
```

---

# 18. Example Matching Formula

Start with an interpretable weighted model:

```text
Final Score =
    Geography Score       × 0.25
  + Program Score         × 0.20
  + Population Score      × 0.15
  + Mission Similarity    × 0.15
  + Eligibility Score     × 0.15
  + Funding Fit           × 0.10
```

Weights must eventually be configurable.

The system should store individual criterion scores.

Example:

```json
{
  "overallScore": 93,
  "criteria": {
    "geography": 100,
    "program": 95,
    "population": 90,
    "mission": 92,
    "eligibility": 100,
    "funding": 80
  }
}
```

---

# 19. Match Result

A match must be explainable.

Example:

```text
93% Match

Strong Matches:
✓ Operates in Frederick County
✓ Serves children
✓ Provides educational programming
✓ Meets nonprofit eligibility requirements

Potential Concern:
⚠ Requested funding amount is above the donor's typical grant size

Disqualifiers:
None
```

The system should distinguish:

```text
ELIGIBLE
LIKELY_MATCH
POSSIBLE_MATCH
LOW_MATCH
INELIGIBLE
```

A score alone should never determine eligibility.

---

# 20. Grant Seeker User Stories

## US-001 — Create Organization

As a grant seeker, I want to create an organization profile so that I can participate in the grant matching platform.

Acceptance criteria:

* User can enter organization information.
* Required fields are validated.
* Organization receives a unique ID.
* Profile can be saved as incomplete.

---

## US-002 — Complete AI Interview

As a grant seeker, I want to complete an AI-guided interview so that the system understands my organization's actual work.

Acceptance criteria:

* AI asks relevant questions.
* AI asks follow-up questions when necessary.
* Interview state is persisted.
* User can leave and resume later.
* AI produces structured candidate facts.

---

## US-003 — Review Extracted Information

As a grant seeker, I want to review AI-extracted information so that I can correct inaccurate information.

Acceptance criteria:

* Extracted facts are displayed.
* User can edit facts.
* User can approve/reject facts.
* Verified information becomes part of the official profile.

---

## US-004 — Manage Compliance

As a grant seeker, I want to upload and track eligibility documents so that the system can determine my eligibility for grants.

---

## US-005 — Discover Grants

As a grant seeker, I want to see grants that match my organization so that I can prioritize the opportunities most relevant to me.

---

## US-006 — Understand Match

As a grant seeker, I want to understand why a grant matches or does not match my organization so that I can make informed decisions.

---

## US-007 — Generate 1-Pager

As a grant seeker, I want to generate a standardized one-page organization summary so that I can share it with funders.

---

# 21. Grant Giver User Stories

## US-008 — Create Donor Profile

As a donor, I want to create a donor profile so that the platform can represent my funding organization.

---

## US-009 — Define Funding Criteria

As a donor, I want to define my funding criteria so that the platform can identify aligned nonprofits.

---

## US-010 — Complete Donor AI Interview

As a donor representative, I want an AI interviewer to ask detailed questions so that nuanced funding preferences can be captured.

---

## US-011 — Review AI Donor Profile

As a donor, I want to review AI-extracted criteria so that inaccurate information does not affect matching.

---

## US-012 — Discover Nonprofits

As a donor, I want to discover nonprofits that align with my funding priorities so that I can identify potential applicants.

---

## US-013 — Understand Nonprofit Fit

As a donor, I want to understand why an organization matches my criteria so that I can evaluate it efficiently.

---

# 22. Administrator User Stories

## US-014 — Manage Donors

As an administrator, I want to create, edit, deactivate, and review donor profiles.

## US-015 — Manage Organizations

As an administrator, I want to review and manage nonprofit profiles.

## US-016 — Review AI Data

As an administrator, I want to review AI-generated information before it becomes authoritative.

## US-017 — Manage Sources

As an administrator, I want to configure external sources used for donor intelligence.

## US-018 — Review Scraping Jobs

As an administrator, I want to monitor scraping jobs and failures.

## US-019 — Review Match Quality

As a grant expert, I want to inspect match results so that I can identify incorrect matching behavior.

---

# 23. System User Stories

## US-020 — Scheduled Scraping

As the system, I want to periodically retrieve configured donor sources so that donor information remains current.

## US-021 — Detect Source Changes

As the system, I want to detect changes between source versions so that only relevant donor updates are processed.

## US-022 — Recalculate Matches

As the system, I want to recalculate affected matches whenever verified donor or organization criteria change.

## US-023 — Maintain Audit Trail

As the system, I want to maintain an audit trail so that important AI, data, and matching changes can be traced.

---

# 24. Core User Journey — Grant Seeker

Design the primary journey as:

```text
Sign Up
   ↓
Create Organization
   ↓
Basic Profile
   ↓
AI Interview
   ↓
Review Extracted Information
   ↓
Upload Eligibility Documents
   ↓
Complete Profile
   ↓
System Calculates Matches
   ↓
View Matching Grants
   ↓
Open Grant
   ↓
View Match Explanation
   ↓
Apply / Skip
```

---

# 25. Core User Journey — Donor

```text
Sign Up
   ↓
Create Donor Profile
   ↓
Define Basic Criteria
   ↓
AI Donor Interview
   ↓
Review Criteria
   ↓
Connect External Sources
   ↓
System Monitors Sources
   ↓
Donor Criteria Updated
   ↓
Matching Engine Runs
   ↓
Discover Matching Nonprofits
   ↓
Review Organization Profiles
```

---

# 26. MVP Scope

The first prototype should NOT implement every possible feature.

MVP should include:

### Grant Seeker

* Authentication
* Organization profile
* AI interview
* Structured profile extraction
* User verification
* Eligibility tracking
* Match results
* Match explanation
* 1-pager generation

### Donor

* Donor profile
* Funding criteria
* AI interview
* Basic donor management
* A small number of manually configured donors

### Matching

* Hard eligibility rules
* Weighted matching
* Basic semantic similarity
* Explainable results

### Admin

* Organization management
* Donor management
* AI extraction review
* Match inspection

### Automation

* Basic scheduled scraping
* Source storage
* Change detection

Start with only 2–3 external donor sources before scaling.

---

# 27. Non-Functional Requirements

The system should be designed for:

### Security

* Role-based access control
* Secure document storage
* Encryption in transit
* Proper authentication
* Audit logging
* Least-privilege access

### Reliability

* Background jobs must be retryable.
* Scraping failures must not corrupt donor data.
* AI failures must not corrupt profiles.
* Important operations should be idempotent.

### Observability

Track:

* API errors
* AI requests
* AI failures
* scraping jobs
* extraction failures
* matching runs
* processing times
* source changes

### Explainability

Every match should be traceable to:

```text
Source data
    ↓
Extracted criteria
    ↓
Matching criteria
    ↓
Individual scores
    ↓
Final score
    ↓
Explanation
```

---

# 28. Important Architectural Principle

AI-generated information must always be treated as **candidate knowledge**, not unquestionable truth.

Use:

```text
RAW DATA
   ↓
AI EXTRACTION
   ↓
CANDIDATE FACT
   ↓
VERIFICATION
   ↓
CANONICAL FACT
   ↓
MATCHING
```

Never:

```text
RAW DATA
   ↓
LLM
   ↓
DIRECT DATABASE UPDATE
   ↓
MATCHING
```

---

# 29. Recommended Development Phases

## Phase 1 — Domain & Architecture

Define:

* actors
* use cases
* domain entities
* database schema
* API contracts
* authorization model

## Phase 2 — CRM

Implement:

* users
* organizations
* donors
* contacts
* profiles

## Phase 3 — AI Interview

Implement:

* interview sessions
* conversation state
* structured extraction
* fact verification

## Phase 4 — Eligibility

Implement:

* compliance records
* document upload
* verification status

## Phase 5 — Matching Engine

Implement:

* hard rules
* weighted scoring
* semantic similarity
* explanations

## Phase 6 — Donor Intelligence

Implement:

* source management
* crawling
* document extraction
* AI parsing
* change detection

## Phase 7 — 1-Pager

Implement:

* templates
* document generation
* downloadable output

## Phase 8 — Production Hardening

Implement:

* monitoring
* retries
* audit logs
* security
* performance optimization
* evaluation framework

---

# 30. The Most Important Design Question

Before implementing the system, answer:

> **What exactly constitutes a "good match"?**

Do not start implementation until the team agrees on:

1. Hard eligibility constraints
2. Soft preferences
3. Matching dimensions
4. Scoring weights
5. Minimum match threshold
6. How missing information is treated
7. How conflicting information is treated
8. How AI confidence affects matching
9. How match explanations are generated
10. How human experts can override the result

The matching model is the core intellectual property of the platform.

The CRM, chatbot, scraper, and PDF generator support this core.

---

# 31. Final System Mental Model

Think about the platform as four layers:

```text
┌───────────────────────────────────────────────┐
│                 EXPERIENCE                    │
│                                               │
│ Dashboards / AI Chat / Match Results / PDF   │
└───────────────────────┬───────────────────────┘
                        │
┌───────────────────────▼───────────────────────┐
│                 INTELLIGENCE                  │
│                                               │
│ Extraction / Embeddings / Matching / Explain │
└───────────────────────┬───────────────────────┘
                        │
┌───────────────────────▼───────────────────────┐
│                  KNOWLEDGE                    │
│                                               │
│ Nonprofits / Donors / Grants / Criteria      │
│ Eligibility / Sources / Verified Facts       │
└───────────────────────┬───────────────────────┘
                        │
┌───────────────────────▼───────────────────────┐
│                INFRASTRUCTURE                 │
│                                               │
│ PostgreSQL / Redis / Workers / Storage / API │
└───────────────────────────────────────────────┘
```

The system should therefore be designed around one central principle:

> **Collect messy real-world information → convert it into verified structured knowledge → evaluate compatibility → explain the result to humans.**

That principle should guide all architectural, database, AI, and product decisions.
