# AGENTS.md — Doge Rescue Run

Three.js + Vite, single level ("Doge City"), no game assets, all art is
primitive geometry drawn at runtime. Logical canvas 480 x 800, scaled to fit
the window. Run ends only on a crash.

## Scope (current design — supersedes docs/concept.md)

| Area | Included |
| --- | --- |
| Vehicle | one rescue van |
| Controls | swipe left/right (one lane per swipe) + SPEED button (hold to boost) + BRAKE button (hold to slow/stop) |
| Traffic | moving cars to dodge, always slower than the van, never change lane, at least one lane always open |
| Parking | bays on the right side of the road, signed. No traffic may enter a bay. |
| Dogs | wait on the sidewalk beside a bay, 3-4 per bay, different colours (white/black/brown). Walk to the van when it is parked in their bay, hop in one by one. |
| Tasks | random task on the HUD, e.g. "Save 4 white dogs". Only matching colours count. On completion show a success message and give a new task. |
| Environment | roadside houses, Lagos neighbourhood feel: low-poly flat-roof houses, bright painted walls, fences, palm trees, street lamps. Primitives only, cartoon style. |
| HUD | distance, score, current task + progress |
| End screen | final score, distance, dogs saved, task results, restart prompt |

### Explicitly removed (dead code must not remain)

- Dognapper cars and caged dogs
- ATTACK mechanic and the ATTACK button
- RESCUE button and the rescue meter
- `actions.js` module entirely (ATTACK/RESCUE constants, `createActions`,
  `attack`, `updateRescue`, `releaseCagedDog`, `cageDog`, `dognapper` field
  on the traffic field, `dognapperRig` in the renderer)

## Code conventions

- ES modules, `import { CONFIG } from './config.js'`.
- All tuning numbers live in `src/config.js` and are commented RESOLVED or
  UNDECIDED. Do not hardcode magic numbers elsewhere.
- Seeded RNG via `makeRng(seed)` — same pattern in traffic/dogs/collectibles.
- Rendering is Three.js with `MeshToonMaterial` + a 4-stop gradient map.
- HUD is a separate 2D canvas overlaid on top, drawn by `src/hud.js`.

## Controls

- Swipe left/right on the world canvas → exactly one lane per swipe.
- Keyboard: ArrowLeft/A, ArrowRight/D for lanes; Space/Enter restarts after a run.
- SPEED button (hold) → boosts van speed above the normal ramp.
- BRAKE button (hold) → slows and can stop the van. While stopped inside a
  parking bay, dogs walk to the van and hop in.

## Parking detection rules

A bay is "occupied by the van" when **all** of the following are true:

1. **Lane check.** The van's lane equals the bay's lane (bays are on the
   right side of the road, so exactly one lane index is a bay lane).
2. **Position check.** The van's x-range is contained inside the bay's x-range
   with a small tolerance (bay is wider than the van). Use the bay's
   `x`, `width` and the van's `x`, `width`.
3. **Speed threshold.** `game.vanSpeed <= CONFIG.parking.stopSpeedMph`
   (default ~0.5 m/s equivalent). The van must be nearly stationary. This is
   the gate that decides whether dogs start walking — a van rolling through
   a bay at 5 m/s does not trigger boarding.

When all three hold, the van is "parked". While parked, the dogs assigned to
that bay walk toward the van and board one at a time. If the van moves out of
the bay (lane change or speed rises above the threshold), boarding pauses and
the dogs return to the sidewalk.

Traffic is never allowed to enter a bay: `spawnWave` treats bay x-ranges as
occupied when picking blocked lanes, and cars are clamped to non-bay lanes.

## Build order (tiny milestones)

See the plan below. Each milestone ends with `npm run dev` running and the
stated thing being visible/true.

## Open questions

Marked UNVERIFIED in the plan.