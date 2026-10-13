# Doge Rescue Run — Concept (MVP spec)

Status: **derived from user-provided MVP scope, not from the PDF.** The PDF
`Doge_Rescue_Run_Game_Concept.pdf` was never delivered and does not exist in this
folder. Everything below marked **UNDECIDED** is a placeholder I was told to ask
about rather than invent. It is currently set to a neutral default.

## Loop

Drive the rescue van through Doge City. Avoid obstacles, collect pickups, rescue
stray dogs. Score, distance and mission progress are tracked during the run. The
run ends on the end-of-run screen.

## MVP scope

| Area | Included |
| --- | --- |
| Level | Doge City (only level) |
| Character | one (the rescue van) |
| Steer | left / right |
| Obstacles | yes, collision handled |
| Collectibles | yes |
| Rescuable dogs | **CONFLICT** — scope table says 5, see note |
| Score | yes |
| Distance | yes |
| Missions | yes |
| End-of-run screen | yes |

### Explicitly out of scope

Garage, shelter, streaks, Web3, other levels, global rescue.

## Tech

Vanilla JS (ES modules) + HTML5 Canvas 2D. Zero npm dependencies, no build step.

Logical resolution is 480 x 800 and the canvas is scaled to fit the window.
All art is drawn with Canvas 2D primitives — the project ships **no image or
audio assets**.

## UNDECIDED — awaiting user answer

**Open conflict: how many dogs per run.** The original MVP scope says "5
rescuable dogs", but you later said the goal is to "save as many dogs as
possible", with the run only ending on a crash. Those contradict each other.
`dogs.maxPerRun` is currently `null`, meaning **unlimited**, which follows your
more recent instruction. Setting it to a number restores the original 5-dog cap
and is a one-line change in `src/config.js`.

These are set to defaults in `src/config.js` so the game is runnable, and are
marked in that file. They are not invented requirements, just placeholders.

1. **Collectible identity.** RESOLVED: bones, drawn as a two-lobed bone shape.
   Each obstacle wave reports its gap via `field.onWave`, and a line of bones is
   placed inside that gap, 26 px apart, 1 to 5 bones depending on gap width.
   A bone line is never wider than the gap it sits in. Collection is AABB overlap
   against the van, and a bone is removed the frame it is taken so it cannot
   be double-counted.
2. **Obstacle set.** RESOLVED: traffic cars. Each car is chunky low-poly,
   built from Three.js primitives (boxes and low-segment cylinders) in one of
   five bright body colours. All cars travel in the same direction as the van at
   a fixed `0.55` fraction of the van's speed, never change lane, and always
   leave at least one of the three lanes open, so the player only ever meets
   them from behind. Because every car shares one traffic speed, the relative
   speed between any two cars is zero and the spacing a wave was born with can
   never collapse. Waves use the same rules as before: seeded RNG, roughly every
   1.15s of van travel, 1-2 lanes blocked per wave, at least 120 px between two
   cars in the same lane. Rear-ending a car is a crash, using the same AABB test
   and the same `game.state = 'crashed'` path as before.
3. **Dog rescue mechanic.** RESOLVED: drive over a dog to scoop it up. The van
   has a square hatch at its top-front edge; on contact the dog plays a 0.3s
   ease-in transfer into that hatch, shrinking as it goes, then counts as aboard.
   Rescued dogs are drawn riding in a rear window on the van body, up to 5
   visible with a `+N` overflow badge.

   **Placement conflict:** dogs are spawned on every obstacle wave at a random x
   inside that wave's gap. This is the only way to satisfy "placed randomly,
   spawning frequently" *and* "never on an obstacle" at the same time — a dog
   scrolls the entire road, so any fixed x would eventually pass through some
   obstacle. Inside a gap, horizontal containment guarantees it can never collide.
   Measured: 0 dog/obstacle overlaps across a 200s run.
4. **Mission list and count.** RESOLVED: three goals per run, ticked off live in
   the top-left — rescue 10 dogs, collect 50 bones, reach 3 km. Progress is
   clamped to the target so a completed mission reads `10/10`, not `12/10`.
   Missions are per-run only; no persistence across runs.
5. **Score values.** RESOLVED: `floor(distance / 10) + bones * 10 + dogs * 500`.
   One dog is worth 500 points, the same as driving 5000 m, so a rescue is always
   worth roughly a long stretch of road. Score is displayed top-right in gold.
6. **Controls.** RESOLVED: keyboard only (Arrow keys + A/D), smooth free horizontal
   steering, clamped to road edges. No touch controls in MVP.
7. **Van collision penalty.** RESOLVED: crash is game over. One obstacle hit ends
   the run immediately and sets `game.state = 'crashed'`, which freezes elapsed
   time, distance, scroll and steering. The end-of-run screen is Task 8.
8. **Run end condition.** RESOLVED: the run ends only on a crash. There is no
   target distance and no other fail state.
9. **Speed ramp / difficulty curve.** RESOLVED: quadratic ease-in from 260 px/s
   to 720 px/s, reaching max at 90s and holding there.

Distance is displayed in metres, switching to km at 1000. The
`pixelsPerMeter: 10` scale in `config.js` is still a placeholder, so the absolute
number is arbitrary — the *rate* is what matters until obstacles land.

## Change log

- Scaffold created: concept doc, canvas loop, Doge City backdrop, van render.
- Steering added: keyboard axis input, smooth movement, road-edge clamping.
- Distance + speed ramp added: quadratic ease-in to 720 px/s at 90s, distance HUD.
- Obstacles added: seeded cone/roadblock waves with guaranteed gap, AABB collision,
  crash = game over which freezes the world.
- Collectibles added: bone lines co-located with each obstacle wave's gap.
- Dogs added: random spawn inside obstacle gaps, 0.3s transfer into a top-front
  hatch, rescued dogs drawn riding in the van's rear window.
- Score + missions added: weighted score top-right, three live per-run goals
  top-left with clamped progress.
- End-of-run screen added: dimmed overlay with final score, distance, dogs,
  bones, mission results and a Space/Enter restart prompt. Each run uses a fresh
  random seed, so layouts differ between runs.
- Obstacles replaced by moving traffic cars: `src/obstacles.js` became
  `src/traffic.js`, cones and roadblocks deleted, cars built from Three.js
  primitives and always moving slower than the van.

Note: the rest of this document is stale. The game is Three.js + Vite with a
WebGL scene and three discrete lanes, not Canvas 2D with free steering.