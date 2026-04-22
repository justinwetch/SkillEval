# SkillEval V2 Evaluate Motion Design

**Date:** 2026-04-22

## Goal

Add a restrained motion layer to the `v2` evaluate experience so state changes
feel spatial and readable without turning the page into an animation showcase.

The first pass should improve orientation and run-state clarity, not introduce a
broader app-wide motion system.

## Scope

### In scope

- `v2` evaluate page only in `app/src/views/EvaluateView.jsx`
- motion for:
  - top-level `Individual Analysis` / `Results` tab switching
  - eval row expand/collapse
  - primary run CTA state changes
  - per-row running indicators
  - sticky toolbar activation
- reduced-motion handling for all added motion
- a local implementation shape that keeps run-state ownership in
  `EvalRunContext` and UI choreography in `EvaluateView`

### Out of scope

- classic evaluate variant
- full-page route transitions
- animation work across other screens
- converting shared `Button` or `Card` components into generic motion
  primitives
- decorative looping animations

## Current State

The current `v2` evaluate flow already has the right state model, but state
changes are mostly abrupt:

- tabs switch by repainting active styles
- eval rows open and close without much spatial continuity
- the main CTA communicates state mostly through label/icon swaps
- row-level work in progress is visible in data, but not strongly localized in
  the layout
- the top action row does not visibly change when it detaches into sticky mode

This makes long runs harder to scan, especially when results begin arriving or
when the user moves between summary and detail.

## Design Principles

- Motion explains state; it does not decorate idle surfaces.
- Spatial continuity should be used where users switch context or reveal detail.
- Repeated or background updates should stay quiet.
- Motion should be local to the element whose state changed.
- Reduced-motion users must still get clear state changes without travel,
  stagger, or ornamental movement.

## Decision

Use a hybrid motion approach for `v2`:

1. Use a motion library for shared-layout and presence transitions.
2. Use CSS/Tailwind transitions for hover, press, and simple sticky-state
   styling.
3. Keep the motion layer local to `EvaluateView.jsx`.
4. Only add context-level state if the existing run model cannot identify active
   row work precisely enough.

## Motion Tokens

### Durations

- `micro`: `140ms`
- `fast`: `180ms`
- `base`: `240ms`
- `reveal`: `280ms`
- `stagger`: `50ms`

### Easing

- standard enter: `cubic-bezier(0.22, 1, 0.36, 1)`
- standard exit: `cubic-bezier(0.4, 0, 1, 1)`

Springs are allowed only where shared spatial continuity materially improves the
interaction. Bounce should stay near zero.

## Interaction Design

### 1. Top-Level Tab Switch

`Individual Analysis` and `Results` should share a moving active pill or
underline rather than switching by static border repaint only.

Behavior:

- the active indicator moves between tabs when the user changes sections
- only the indicator travels; the tab row should not shift layout
- unrelated content updates inside the active tab must not replay the motion

Motion:

- shared-layout move
- `240ms`
- standard enter easing

Reduced motion:

- indicator snaps or short-fades into place
- no pronounced lateral glide

## 2. Eval Row Expand / Collapse

Each row header remains anchored while the body reveals beneath it.

Behavior:

- expanding a row animates body `max-height`, opacity, and a small `y` settle
- collapsing a row exits slightly faster than expand
- data updates inside an open row must not replay the expand animation
- chevron rotation is part of the same state change

Motion:

- body enter: height + opacity + `y: 6px -> 0`
- body exit: height + opacity with faster exit timing
- chevron rotate: `140ms`

Reduced motion:

- height + opacity only
- no settle offset

## 3. Primary Run CTA

The main run button should morph through lifecycle states instead of swapping
text abruptly.

States:

- idle: solid button, stable surface
- running: progress treatment or spinner sweep inside the button
- complete: checkmark and softer success surface
- stopped/error: quiet resolve without success styling

Behavior:

- the button width should remain as stable as possible
- motion triggers only on run lifecycle boundaries, not every progress tick
- internal progress animation may continue while running, but the outer morph
  should not replay

Motion:

- state morph: `240ms`
- internal running treatment: continuous only while active

Reduced motion:

- use icon, label, and color changes
- no sweep animation

## 4. Per-Row Running Indicator

Each active row should communicate where work is happening without animating the
entire card.

Behavior:

- show a slim left rail or subtle edge glow while that row is generating or
  being judged
- resolve immediately into terminal row state when the row finishes
- support more than one active row only if the underlying run model actually
  exposes concurrent work

Motion:

- indicator enter: `180ms`
- indicator resolve: `180ms`

Reduced motion:

- static rail only
- no animated glow sweep

## 5. Sticky Toolbar Activation

The top tab/action row should gain a sticky-state treatment only after it
detaches.

Behavior:

- once sticky, add a soft shadow, slight blur, and slightly stronger surface
  tint
- no slide-in or vertical motion
- use a small threshold or stable observer boundary so the state does not flicker

Motion:

- shadow/blur/tint activation: `180ms`

Reduced motion:

- keep the same treatment, but still without positional animation

## Trigger Rules

The motion system should be driven by state boundaries, not general rerenders.

### Tab Indicator

- animate only on explicit user tab changes
- do not animate when tab content rerenders
- do not animate on initial restored render

### Row Expand / Collapse

- animate only from direct row toggle interactions
- do not replay when row content updates while open

### Primary CTA

- animate on:
  - `idle -> running`
  - `running -> complete`
  - `running -> stopped`
  - `running -> error`
- do not replay on every progress increment

### Sequential Result Reveal

This is a secondary behavior that can be added if the implementation remains
clean.

- use it only when results first populate after a fresh run or when a new
  completed run replaces an empty/reset state
- do not replay on tab switches, filter changes, row toggles, or minor updates
- stagger interval: `40-60ms`, target `50ms`
- disable it entirely under reduced motion

### Row Running Indicator

- show only while that specific row is actively processing
- resolve immediately on `complete`, `error`, or `stopped`

### Sticky Toolbar

- activate only on detach
- deactivate only on reattach
- avoid jitter at the threshold

### Export Actions

- remain visually quiet until results exist
- they may fade in once when becoming meaningful
- they should not animate repeatedly afterward

## Reduced-Motion Model

Respect `prefers-reduced-motion` across the entire `v2` motion layer.

Rules:

- disable stagger
- disable settle/bounce behavior
- replace long shared movement with short fades or snaps
- keep live progress readable through static indicators, color, and icon changes
- preserve sticky-state contrast without animating position

## Implementation Boundaries

### Owning file

- `app/src/views/EvaluateView.jsx`

### Conditional support file

- `app/src/contexts/EvalRunContext.jsx` only if the current state does not
  cleanly identify row-level active work for the indicator treatment

### New dependency

- add a motion library to `app/package.json`

### Local derived state

Recommended screen-local derived flags:

- `hasResults`
- `hasEverLoadedResults`
- `isInitialResultsReveal`
- `hasCompletedRunTransition`
- `isToolbarDetached`
- per-row `isRowRunning`
- per-row `isRowResolved`

These flags should gate animation playback and prevent accidental replays.

## Risks

### Highest risk

- result rows and run phases may not currently expose a precise enough active-row
  model for the running indicator without a small context refinement

### Medium risk

- adding motion directly in a large screen file could make the page harder to
  read unless the animated wrappers stay narrow and local

### Low risk

- sticky-toolbar activation may require small DOM measurement or observer logic,
  but it should stay screen-local

## Verification

### Required automated verification

From `app/`:

1. `npm run lint`
2. `npm run build`

### Required manual verification

Smoke the `v2` evaluate flow and confirm:

1. no gratuitous intro motion on initial page load
2. tab indicator moves only on explicit tab switches
3. primary CTA morphs cleanly into running, complete, and stopped/error states
4. row expand/collapse keeps headers anchored and rotates the chevron smoothly
5. row running indicators track active work and resolve into terminal state
6. sticky toolbar treatment appears only once detached
7. reduced-motion behavior removes stagger and larger travel while preserving
   state clarity

## Acceptance Criteria

- the `v2` evaluate page has a shared active tab indicator
- eval rows reveal and collapse with anchored detail motion
- the main run CTA communicates lifecycle changes without abrupt swaps
- active row work is localized with a per-row running indicator
- the sticky toolbar gains a visible detached-state treatment
- reduced-motion users receive a quieter but still fully legible version of the
  same state changes
- implementation remains local to the `v2` evaluate flow unless row-level run
  state requires a small context assist
