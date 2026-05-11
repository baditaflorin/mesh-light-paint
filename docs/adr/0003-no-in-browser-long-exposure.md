---
status: accepted
date: 2026-05-12
---

# 0003 — Why no ImageCapture / no in-browser long-exposure

## Context

The natural "complete" version of this app would let one phone hold a long
exposure inside the browser (`getUserMedia` → manual frame accumulation →
canvas integration) so the user never leaves the page. We chose not to ship
that.

## Decision

The browser side renders **only** the light-painting patterns. The user
takes the photo with their **native camera app**:

- iOS: Live Photo + long-press → "Long Exposure" effect, or any third-party
  app with bulb mode.
- Android: Pro mode shutter-speed slider, or Night mode, or third-party apps
  like Pro Cam X / Open Camera.

The app's job ends at "every phone is showing the right pattern at the right
time."

## Consequences

- **Pros.**
  - No camera/mic permissions requested. Dramatically lowers the friction
    bar — the arm button is just "Connect."
  - No surprise battery drain from `getUserMedia` running on a tripod phone.
  - Native camera apps consistently outperform any browser-based attempt:
    image stabilization, hardware ISO, RAW capture, proper noise reduction.
  - Survives iOS Safari quirks around long-running getUserMedia streams.
- **Cons.**
  - The user has to know how to set their camera to long exposure. We add a
    one-line hint on the arm screen.
  - We don't get to show the composite in the browser; that lives in the
    user's camera roll.

## Alternatives considered

- **`ImageCapture.grabFrame()` + manual integration in a `<canvas>`.**
  Works on Chrome Android but not Safari iOS. Would need a separate code path
  per platform and would still struggle to match native ISO/noise tuning.
  Rejected as platform-fragmented and inferior.
- **`getUserMedia` + a "lighten" composite operation across N seconds.**
  Same iOS Safari fragility, same noise issues, plus burns the camera-phone's
  battery. Rejected.
- **Server-side compositing**, where each phone uploads a screen capture and
  a backend stacks them. Violates the "no per-app backend" rule (ADR 0001)
  and adds a privacy nightmare we don't need.
