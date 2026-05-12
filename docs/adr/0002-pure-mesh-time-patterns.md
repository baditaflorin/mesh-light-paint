---
status: accepted
date: 2026-05-12
---

# 0002 — Pattern functions are pure of mesh-time

## Context

The whole point of `mesh-light-paint` is that when you wave several phones in
front of a long-exposure camera, the light trails align coherently in the
photo. If phones drifted in time, the trails would look like a stuttering
mess. We need every phone running the same pattern to draw the same image at
the same wall-clock instant — same as the firefly app, but with spatially
varied output rather than uniform brightness.

## Decision

Each pattern is a **pure function** of mesh time and a few per-phone
parameters:

```ts
drawPattern(id, { ctx, w, h, t, hue, speed, offset });
// id     ∈ { stripes, gradient, dots, spiral }
// t      = meshNow()  (median-offset mesh time, same as firefly-walk)
// hue    ∈ [0, 360)
// speed  ∈ [0, 3]      animation rate multiplier
// offset ∈ [0, 1]      per-phone phase shift within the pattern cycle
```

There is no state — no `lastT`, no `accumulator`, no random seed evolved over
frames. Two phones with identical `(id, hue, speed, offset)` running at the
same mesh time draw the same image. Two phones with the same `(id, hue,
speed)` but different `offset` draw the same image shifted in phase.

## Consequences

- **Pros.**
  - Hot-reload / re-connect doesn't produce a visible glitch — the new phone
    is immediately in step.
  - Multi-phone composites are predictable: pick `offset = i/N` across N
    phones and you get an evenly-shifted phase array.
  - No frame-rate dependency: a phone running at 30 fps draws the same image
    at time `t` as a phone running at 60 fps.
- **Cons.** Per-frame work has to be enough that the pattern looks animated,
  not stepped. We test at 30 fps minimum.
- **Why mesh-time matters.** Long-exposure photos accumulate light over
  seconds. If two phones drift 100 ms apart, a "stripes" pattern would draw
  two stripes side-by-side, not a single continuous wave. Empirically, the
  median-offset clock sync settles to ~20 ms across a 4-phone mesh, which is
  imperceptible in a 4 s exposure.

## Patterns shipped

- **stripes** — vertical bars scrolling at `speed`-proportional rate.
- **gradient** — linear hue gradient with a rotating axis.
- **dots** — 8×rows grid of dots fading in/out via `sin(wave − d·4)` from the
  center (radial pulse).
- **spiral** — animated logarithmic-ish spiral with `turns = 3`.

## Alternatives considered

- **Stateful patterns evolving from a seed** (e.g. Perlin worms). Beautiful,
  but hard to keep coherent across phones without shipping the entire state.
  Rejected.
- **Bitmap "pattern" pre-baked into the build.** Eliminates the math but
  needs a pixel-per-frame stream over the network, defeats the
  "mesh-synced computed" property.
- **WebGL for the renderer.** Saved for a future ADR — for v1 the Canvas2D
  output is already plenty saturated on phone screens.
