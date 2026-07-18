# Apogee

> The apogee is the highest point of an orbit — the peak you only reach when ascent and recovery are timed right.

A local-first strength-training PWA that pairs **sub-2-second set logging** with **evidence-based, explainable auto-progression** — the combination none of the mainstream apps ship (fast loggers have no intelligence; science-forward apps are slow, expensive, or online-only).

## What it does

- **One-tap logging.** Every set is pre-filled from the progression engine's suggestion; logging it is a single 56 px tap. Steppers and an RIR strip handle adjustments.
- **Explainable auto-progression.** Double progression (default) or linear mode per exercise, with a one-sentence reason for every suggestion: *"+2.5 kg because you hit 8 reps on all sets last session."* RIR input is only trusted in the 0–3 band (where self-report is reliable); incomplete sessions and light technique days never corrupt the baseline.
- **Trend-triggered deloads.** Stall counting plus e1RM-trend detection suggests a deload when your data says so — not every fourth week.
- **Plate math everywhere.** A to-scale barbell loadout in IPF competition colors renders for every barbell set, including auto-generated warm-up ramps and the rest timer's next-set preview.
- **Rest timer that survives backgrounding.** Timestamp-based countdown with vibration, notification, and an optional beep.
- **Per-muscle weekly volume** against editable guideline bands (starting points, not prescriptions), e1RM trends, and PR tracking.
- **Your data, owned.** Everything lives in IndexedDB on the device. Full-fidelity JSON backup/restore and per-set CSV export, from day one.

## Stack

Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · Dexie (IndexedDB) · vite-plugin-pwa. No backend, no accounts, fully offline after first load.

## Commands

```sh
npm install
npm run dev        # dev server
npm test           # engine unit tests (vitest)
npm run build      # typecheck + production build + service worker
npm run preview    # serve the production build
```

## Layout

- `src/lib/` — pure domain engine (progression, plates, warm-ups, e1RM, volume, deload detection, export), fully unit-tested
- `src/db/` — Dexie schema + seeded exercise catalog and program templates (Starter Full Body, Upper/Lower, PPL)
- `src/state/` — session lifecycle + live-query hooks
- `src/features/` — player, programs, history, analytics, settings
- `docs/superpowers/specs/` — the research-driven design doc
