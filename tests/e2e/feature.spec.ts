import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing cross-peer test for the advertised core action:
 * "Synchronized phone-screen light painting — four phones running the same
 *  pattern at the same speed line up coherently."
 *
 * The falsifiable question: when peer A picks a pattern (and changes the
 * speed), does peer B's screen render that SAME pattern + speed? The patterns
 * are pure functions of mesh time, so for the trails to line up every phone
 * must agree on (pattern, speed) — that agreement is what must cross the mesh.
 *
 * Before the fix the pattern/speed were per-phone localStorage only and never
 * touched the Yjs doc, so picking "spiral" on A left B on "stripes" — the photo
 * would NOT line up. This test drives A's selection and reads the result on B.
 */
test("peer A's pattern + speed selection propagates to peer B", async ({ browser, baseURL }) => {
  // Force both peers off the persisted default so the starting pattern is
  // deterministic regardless of prior runs.
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix,
    roomId: `e2e-lp-${Math.random().toString(36).slice(2, 8)}`,
  });
  try {
    // Both peers connect to the mesh (the arm screen).
    await a.getByRole("button", { name: "Start light painting" }).click();
    await b.getByRole("button", { name: "Start light painting" }).click();

    // Both start on the default "stripes" pattern.
    await expect(a.locator(".lightpaint-hud")).toHaveAttribute("data-pattern", "stripes");
    await expect(b.locator(".lightpaint-hud")).toHaveAttribute("data-pattern", "stripes");

    // Peer A opens settings and picks "spiral".
    const aDrawer = a.locator(".mesh-settings-drawer, .settings-drawer");
    if ((await aDrawer.count()) === 0) {
      await a.getByLabel("Open settings").click();
    }
    await a.getByRole("button", { name: "spiral", exact: true }).click();

    // CROSS-PEER: peer B (who touched nothing) now renders "spiral" too,
    // because the room-wide brush crossed the Yjs doc.
    await expect(b.locator(".lightpaint-hud")).toHaveAttribute("data-pattern", "spiral");
    // And peer A also shows spiral (its own selection).
    await expect(a.locator(".lightpaint-hud")).toHaveAttribute("data-pattern", "spiral");

    // Now change the SPEED on peer A and confirm it crosses too (speed is the
    // other half of "same speed → coherent wave").
    const speedSlider = a.getByRole("slider").nth(1); // hue=0, speed=1, offset=2
    await speedSlider.focus();
    // Nudge speed up several steps; the exact value isn't important, only that
    // B sees a non-default speed land.
    for (let i = 0; i < 6; i++) await speedSlider.press("ArrowRight");

    const aSpeed = await a.locator(".lightpaint-hud").getAttribute("data-speed");
    expect(aSpeed).not.toBe("1.00");
    await expect(b.locator(".lightpaint-hud")).toHaveAttribute("data-speed", aSpeed ?? "");

    // Hue is the third part of the shared brush — without it the trails line up
    // in shape/speed but clash in colour, so confirm it crosses too. Drive it
    // from peer B this time to prove the brush is shared in both directions.
    const bDrawer = b.locator(".mesh-settings-drawer, .settings-drawer");
    if ((await bDrawer.count()) === 0) {
      await b.getByLabel("Open settings").click();
    }
    const bHueSlider = b.getByRole("slider").nth(0); // hue=0, speed=1, offset=2
    await bHueSlider.focus();
    for (let i = 0; i < 5; i++) await bHueSlider.press("ArrowRight");

    const bHue = await b.locator(".lightpaint-hud").getAttribute("data-hue");
    expect(bHue).not.toBe("30"); // moved off the default hue
    await expect(a.locator(".lightpaint-hud")).toHaveAttribute("data-hue", bHue ?? "");
  } finally {
    await cleanup();
  }
});
