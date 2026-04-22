# SkillEval Iterative Skill Improvement Future Implementation Plan

> Future scope only. Do not start implementation until the current compare flow is validated.

**Goal:** Add a second benchmarking mode, `Iterative Improvement`, that lets a user compare external skills, extract criterion-level lessons from each run, and curate those lessons into a maintained internal `skill.md` over multiple rounds.

**Primary product split:**
- `Simple Compare`: the current flow, focused on comparing skills and reviewing results.
- `Iterative Improvement`: a guided workflow that compares benchmark skills, extracts structured insights, and applies approved insights into a curated skill file.

**Recommendation:** Implement this as a separate workflow layered on the shared generation/judging engine, not as incremental UI clutter inside the current compare surface.

---

## Why This Is A Separate Initiative

This is not just an additional results panel. It introduces:

- a second top-level workflow mode
- a persistent curated skill artifact
- repeated benchmark rounds
- structured insight extraction
- skill-file mutation with approval
- conflict and duplicate handling across rounds

The current binary and multi-skill compare engine can be reused, but the orchestration, persistence model, and review UX are meaningfully different.

---

## Target Product Behavior

### Mode 1: Simple Compare

Keep the current flow:

- upload skills
- configure prompts and criteria
- run generation
- judge results
- inspect summary, breakdown, and individual analysis

### Mode 2: Iterative Improvement

Add a new entry flow:

1. User chooses `Iterative Improvement`.
2. User chooses a curated target:
   - create a new skill file
   - or upload an existing custom `skill.md`
3. User uploads benchmark skills for the current round.
4. System runs generation and judging.
5. System extracts structured insights from the run.
6. UI shows insight proposals grouped by criterion and source skill.
7. User can:
   - copy an insight
   - add it to the curated skill
   - later reject or edit it before adding
8. The round is saved in iterative history.
9. User starts another round with different benchmark skills.

---

## Structural Shifts

### 1. Introduce top-level evaluation mode

Add a first-class mode selector:

- `simple_compare`
- `iterative_improvement`

This mode must influence:

- setup flow
- run model
- results UI
- persistence

### 2. Separate benchmark skills from curated target skill

Current configuration treats uploaded skills as the thing being compared.

Iterative mode requires two different roles:

- `benchmark skills`: skills being tested this round
- `curated target skill`: the evolving internal skill file being improved over time

### 3. Add rounds as a first-class concept

Iterative work is not a single run. It is a sequence of rounds under one experiment.

Each round must capture:

- benchmark skills used
- config snapshot
- results
- judgments
- extracted insights
- accepted or rejected mutations

### 4. Add insights as first-class persisted artifacts

Insights must not be treated as loose judge text. They need their own structured records with provenance and status.

---

## Architectural Shifts

### 1. Expand the run model

Current evaluation state is run-centric.

Iterative mode needs:

- `experiment`
- `round`
- `curated skill target`
- `insight proposals`
- `applied mutations`

### 2. Add a dedicated insight-extraction layer

Do not generate insight cards directly in the UI.

Add a post-judge domain layer that:

- reads run outputs and judge results
- maps findings back to source skill text
- emits structured insight proposals

### 3. Add a curated-skill mutation layer

Do not append raw judge text directly into a skill file.

Add a controlled writer that:

- inserts into the correct section
- avoids exact duplicates
- records provenance
- supports future edit/reject/version logic

### 4. Add contradiction and conditional reasoning support

The system must eventually distinguish:

- generally good reusable guidance
- prompt-type-specific guidance
- guidance that regresses results in some contexts
- guidance that conflicts with already-curated rules

This should not be deferred to the UI alone. The data model must support it.

---

## Logical Areas / Ownership Boundaries

### A. Mode orchestration

Owns:

- mode selection
- route branching
- mode-specific flow decisions

### B. Curated skill workspace

Owns:

- create new curated skill file
- upload existing custom `skill.md`
- show current curated content
- later version snapshots

### C. Round execution

Owns:

- benchmark skill inputs
- run generation
- run judging
- round lifecycle and persistence

### D. Insight extraction

Owns:

- criterion-level insight synthesis
- source excerpt mapping
- positive/negative/conditional insight typing
- proposed addition text

### E. Insight review UI

Owns:

- grouping by criterion
- grouping by source skill
- copy action
- add-to-skill action
- later edit/reject actions

### F. Conflict and duplicate analysis

Owns:

- duplicate detection
- overlap detection
- contradiction detection
- applicability scoping

### G. Skill artifact writer

Owns:

- applying approved insights into the curated skill
- preserving formatting and structure
- section placement
- change provenance

### H. Iterative history

Owns:

- round timeline
- what was accepted
- what was rejected
- how the curated skill changed over time

---

## Proposed Data Model Direction

### experiment

- `id`
- `mode`
- `createdAt`
- `curatedSkillTargetId`

### curatedSkillTarget

- `id`
- `sourceType`: `new` | `uploaded`
- `filePath` or local artifact id
- `currentContent`
- `versions[]`

### round

- `id`
- `experimentId`
- `configSnapshot`
- `benchmarkSkills[]`
- `resultsBySkillId`
- `comparisons[]`
- `insights[]`

### insight

- `id`
- `roundId`
- `sourceSkillId`
- `criterionId`
- `insightType`: `positive` | `negative` | `conditional` | `conflict`
- `sourceExcerpt`
- `judgeRationale`
- `proposedSkillText`
- `applicabilityContext`
- `status`: `proposed` | `accepted` | `rejected` | `edited`

### skillMutation

- `id`
- `insightId`
- `targetSection`
- `appliedText`
- `versionBefore`
- `versionAfter`

---

## Insight Semantics

Each proposed insight should answer:

- which skill did this come from
- which criterion did it help or hurt
- what exact text or pattern likely caused the effect
- whether it is transferable, conditional, or harmful
- what candidate text should be added to the curated skill

### Required insight categories

- `positive transferable`
- `conditional`
- `negative/regression`
- `conflict`

Example future case:

- a rule helped for one prompt family
- a similar rule hurt a later prompt family

The system should not simply append both.
It should be able to store:

- “works for prompt type A”
- “avoid for prompt type B”

---

## UI Scope

### Start flow

Add a mode selector before setup begins:

- `Simple Compare`
- `Iterative Improvement`

### Configure flow in iterative mode

Add curated-target setup before benchmark upload:

- create new curated skill
- upload existing curated skill

### Evaluate flow in iterative mode

Add an `Insights` surface after judging.

This should support:

- grouping by criterion
- grouping by source skill
- accepted/rejected state
- copy and add actions

### Curated skill preview

Show:

- current curated skill content
- pending additions
- recently accepted changes

---

## Dependencies And Prerequisites

### 1. Structured judge output

Likely the biggest dependency.

Current judge output is comparison-oriented.
Iterative mode needs stronger structure for:

- winner by criterion
- why a criterion was won
- what source text likely contributed

### 2. Source excerpt mapping

Need a robust way to trace a successful pattern back to the relevant source text in a benchmark skill file.

This likely requires:

- section-aware parsing
- chunking or excerpt indexing
- provenance storage

### 3. Skill-file writer

Need a reliable writer that can update a curated skill without degrading formatting or duplicating content.

### 4. Durable persistence

Iterative work will outgrow browser-only storage quickly.

Need durable storage for:

- experiments
- rounds
- curated skill versions
- accepted and rejected insights

### 5. Versioning and diff support

Useful for later phases so the user can see how the curated skill evolved across rounds.

---

## Risks

### Highest risk

- false attribution of a result to the wrong source text
- low-signal or noisy insight accumulation
- contradiction drift inside the curated skill

### Medium risk

- overwhelming the current compare UI if iterative concepts are mixed into it
- weak deduplication causing near-duplicate rules to pile up

### Low risk

- initial copy-only insight review without auto-apply

---

## Recommended Phases

### Phase A: Mode split

- add `Simple Compare` vs `Iterative Improvement`
- no skill mutation yet

### Phase B: Curated target artifact

- create/import curated skill file
- persist experiment and rounds

### Phase C: Structured insights

- add insight extraction
- add review UI
- support copy-only first

### Phase D: Apply to skill set

- controlled add-to-skill flow
- accepted/rejected tracking

### Phase E: Contradiction and conditional logic

- duplicate detection
- conflicting rule detection
- prompt-family applicability

### Phase F: Evolution history

- timeline of rounds
- version diffs
- curated skill evolution view

---

## Scope Control Rules

- Do not auto-edit the curated skill in the first iterative release.
- First release should require explicit user approval before adding any insight.
- Reuse the existing compare engine where possible.
- Keep `Simple Compare` stable and uncluttered.
- Add iterative concepts only behind the new mode.

---

## Initial Acceptance Criteria For The First Iterative Release

- User can choose `Iterative Improvement` at the start.
- User can create a new curated skill or upload an existing one.
- User can run at least one benchmark round.
- System produces structured insight proposals after judging.
- User can copy an insight.
- User can explicitly add an insight into the curated skill.
- The round and its accepted insights are persisted.

---

## Not In Current Scope

- full auto-merge of insights without review
- complex rule synthesis across many rounds
- semantic deduplication using embeddings
- automatic resolution of contradictory guidance

