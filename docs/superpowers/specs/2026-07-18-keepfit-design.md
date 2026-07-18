# KeepFit — Design Doc

**Date:** 2026-07-18
**Status:** Approved for implementation (autonomous build; research-driven)

## Thesis

Research across the competitive landscape (Strong, Hevy, Fitbod, Boostcamp, Juggernaut AI, Alpha Progression, Caliber, RP Hypertrophy, Liftosaur) and the exercise-science literature converges on one gap: **no app pairs genuine training intelligence with sub-2-second logging speed.** The fast loggers carry no progression science; the science-forward apps are slow, expensive, or browser-only. KeepFit wins by doing both, offline, with the user owning their data.

## Product decisions

### Differentiators (build these)

1. **Zero-friction workout player.** Huge one-thumb tap targets, tap-to-complete sets pre-filled from the progression suggestion, steppers instead of keyboards where possible, auto-starting rest timer, superset blocks. The logging loop must never exceed ~2 seconds per set.
2. **Explainable auto-progression, per exercise.** A pure decision engine (double progression default, linear mode for novice barbell work) that pre-fills the next session's targets and explains every suggestion in one sentence ("+2.5 kg because you hit 12 reps on all sets last time"). Opt-in per exercise; every suggestion overridable by hand. This is the "flexibility dial" between rigid guided apps and dumb loggers.
3. **RIR input constrained to where it's valid.** Optional 0–4 RIR logging surfaced as a big 5-button row; the engine only trusts it in the 0–3 band (Remmert/Zourdos 2023: self-report degrades sharply beyond 3). Programming defaults target 1–3 RIR, not failure (Refalo 2022/2024).
4. **Trend-triggered deload suggestions, not calendar ones.** Stall counting + performance trend (e1RM drift at matched loads) triggers a suggested −10% deload, explained. (2023 Delphi consensus + Bell 2025: autoregulated deload timing beats fixed-week schedules.)
5. **Contextual warm-up + plate math.** Given a working weight, generate warm-up sets automatically and render the exact plate loadout per side for every barbell set — shown inline, not in a separate calculator tool.
6. **Per-muscle weekly volume with adjustable bands.** Volume heatmap of weekly sets per muscle vs. personal, editable guideline bands (seeded from population heuristics, framed as starting points — never prescriptions; the MEV/MAV/MRV framework is a heuristic, not validated constants).
7. **Local-first, offline-always, data owned.** IndexedDB storage, PWA installable, zero backend. Full-fidelity JSON + CSV export (every set) and JSON import from day one.

### Anti-scope (deliberately not building)

Social feeds, LLM workout generation, native watch apps, macro/calorie tracking, exercise video hosting, camera bar-speed tracking (VBT is flagged as a possible v2; validated in consumer apps but out of scope for v1), accounts/sync backend.

## Approaches considered

- **A. Local-first PWA — Vite + React + TypeScript + Dexie (IndexedDB) + Tailwind. ← chosen.** Instant offline, installable on phone, zero server cost, best iteration speed, trivially verifiable locally.
- **B. Next.js + hosted backend.** Rejected: a server adds cost and a sync failure mode — the exact category weakness research flagged — with no v1 benefit.
- **C. React Native/Expo.** Rejected: better native ergonomics but far heavier toolchain; PWA covers the phone use case for v1.

## Architecture

```
src/
  lib/            # pure domain logic, unit-tested, no I/O
    types.ts        # shared domain types
    progression.ts  # (history, config) → suggestion  [double + linear + RIR modifiers]
    deload.ts       # stall/trend detection → deload suggestion
    warmup.ts       # working weight → warm-up ramp
    plates.ts       # weight → per-side plate loadout; rounding to plate math
    e1rm.ts         # Epley-based e1RM + trend series
    volume.ts       # sets/week per muscle group aggregation
    export.ts       # full-fidelity JSON/CSV serialization + import
  db/             # Dexie schema + seed data (exercise catalog, program templates)
  state/          # thin hooks over Dexie liveQuery
  features/
    player/       # active-workout screen: set rows, rest timer, plate bar, RIR row
    programs/     # program list/builder/templates
    history/      # session log + detail
    analytics/    # volume heatmap, e1RM trends, PRs
    settings/     # units, plates, bar weight, export/import
  app/            # router, layout, theme
```

**Data model (Dexie tables):** `exercises` (name, muscles, equipment, increment), `programs` (days → slots: exercise, sets×rep-range, progression config, rest, supersetGroup), `sessions` (date, entries → sets {weight, reps, rir?, isWarmup, completedAt}), `progressionState` (per exercise: stallCount, lastTargets), `settings` (units, bar, plates).

**Progression engine (core rules):** all sets ≥ top of rep range → +increment, reset to bottom of range; added reps → hold weight, chase top of range; matched/regressed reps → hold, stall+1; stall ≥ threshold (2–3 by equipment) → −10% deload rounded to plate math, reset stall. RIR modifiers when present: hit top with RIR > target → double increment; hit top grinding below target RIR → hold. Gap > 14 days → decay suggestion ~10% per fortnight missed. Warm-up sets never feed the engine. Every output carries an `explanation` string.

**Defaults:** barbell compound 2.5 kg/5 lb increments (rep ranges 5–8), dumbbell 8–12 @ 2 kg/5 lb per hand, machine/cable 10–15 @ 2.5 kg, isolation 12–20 @ 1.25 kg; stall threshold 2 (barbell) / 3 (other); deload −10%.

**Error handling:** engine is pure and total — malformed history degrades to "repeat last session" with an explanation, never throws into the UI. DB writes are transactional per set-completion, so a crash mid-workout loses at most the in-flight set. Export includes schema version for forward-compatible import.

**Testing:** Vitest unit tests for every `lib/` module (progression decision table cases, plate math edge cases, RIR band handling, deload triggers, export round-trip). Playwright smoke test of the core loop: start workout → log sets → finish → history shows session.

## Success criteria

- Log a set in ≤2 taps when the suggestion is right.
- Fully functional with network off after first load.
- Every auto-suggestion shows a one-sentence "because."
- Export → wipe → import round-trips losslessly.
