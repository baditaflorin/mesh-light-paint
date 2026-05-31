import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { createRoomSync } from "../sync/yjsRoom";
import { createClockSync } from "../sync/clockSync";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";
import { drawPattern, PATTERN_IDS, type PatternId } from "./patterns";

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
};

/** The room-wide brush — pattern/hue/speed are shared so every phone in the
 * room renders the same animation. `offset` stays per-phone (intentional: the
 * README uses different offsets to enrich the long-exposure composite). */
type SharedBrush = { pattern: PatternId; hue: number; speed: number };

type Props = {
  roomId: string;
  pattern: PatternId;
  hue: number;
  speed: number;
  offset: number;
  /** Called when a remote peer changes the shared brush, so the settings UI
   * (which owns the prop state) reflects the room's current selection. */
  onSharedBrush: (brush: SharedBrush) => void;
};

function isPattern(v: unknown): v is PatternId {
  return typeof v === "string" && (PATTERN_IDS as string[]).includes(v);
}

export function LightPaint({ roomId, pattern, hue, speed, offset, onSharedBrush }: Props) {
  const [armed, setArmed] = useState(false);
  const [peers, setPeers] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Latest shared brush, read by the render loop. Starts from local props and
  // is overwritten by whatever the room's Y.Map("brush") holds.
  const brushRef = useRef<SharedBrush>({ pattern, hue, speed });

  const mesh = useMemo(() => {
    if (!armed) return null;
    const room = createRoomSync(roomId);
    const clock = createClockSync(room.provider);
    const brush = room.doc.getMap<unknown>("brush");
    return { room, clock, brush };
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return;
    void maybeFetchTurnCredentials();
  }, [armed]);

  useEffect(() => {
    return () => {
      mesh?.clock.destroy();
      mesh?.room.provider?.destroy();
    };
  }, [mesh]);

  // Sync the room-wide brush both ways:
  //  - local prop change (user picked a pattern) → write into Y.Map("brush")
  //  - remote change → adopt it and notify App so the settings UI updates
  useEffect(() => {
    if (!mesh) return undefined;
    const { brush } = mesh;

    const readShared = (): SharedBrush | null => {
      const p = brush.get("pattern");
      const h = brush.get("hue");
      const s = brush.get("speed");
      if (!isPattern(p) || typeof h !== "number" || typeof s !== "number") return null;
      return { pattern: p, hue: h, speed: s };
    };

    // Seed the shared brush from this peer's local selection if the room has
    // none yet (first arrival), otherwise adopt the room's existing brush.
    const existing = readShared();
    if (!existing) {
      mesh.room.doc.transact(() => {
        brush.set("pattern", pattern);
        brush.set("hue", hue);
        brush.set("speed", speed);
      });
      brushRef.current = { pattern, hue, speed };
    } else {
      brushRef.current = existing;
      onSharedBrush(existing);
    }

    const onChange = () => {
      const next = readShared();
      if (!next) return;
      brushRef.current = next;
      onSharedBrush(next);
    };
    brush.observe(onChange);
    return () => brush.unobserve(onChange);
    // Only re-run when the room (re)connects, not on every prop tweak — local
    // prop writes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesh]);

  // Push local selection changes into the shared brush (host control: whoever
  // adjusts a slider sets it for the whole room). Skips no-op writes so a
  // remote update we just adopted doesn't echo back.
  useEffect(() => {
    if (!mesh) return;
    const cur = brushRef.current;
    if (cur.pattern === pattern && cur.hue === hue && cur.speed === speed) return;
    brushRef.current = { pattern, hue, speed };
    mesh.room.doc.transact(() => {
      mesh.brush.set("pattern", pattern);
      mesh.brush.set("hue", hue);
      mesh.brush.set("speed", speed);
    });
  }, [mesh, pattern, hue, speed]);

  // Awareness publish — keeps peerCount live and lets others see who's brushing.
  useEffect(() => {
    if (!mesh?.room.provider) return undefined;
    const awareness = (mesh.room.provider as unknown as { awareness: Awareness }).awareness;
    const publish = () => {
      awareness.setLocalStateField("brush", { offset, ts: Date.now() });
    };
    publish();
    const pub = setInterval(publish, 1500);
    const onChange = () => setPeers(mesh.clock.peerCount());
    awareness.on("change", onChange);
    onChange();
    return () => {
      clearInterval(pub);
      awareness.off("change", onChange);
    };
  }, [mesh, offset]);

  // Render loop
  useEffect(() => {
    if (!mesh) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let raf = 0;
    let lastSize = { w: 0, h: 0 };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      const pixelW = Math.round(cssW * dpr);
      const pixelH = Math.round(cssH * dpr);
      if (pixelW !== lastSize.w || pixelH !== lastSize.h) {
        canvas.width = pixelW;
        canvas.height = pixelH;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lastSize = { w: pixelW, h: pixelH };
      }

      const t = mesh.clock.meshNow();
      drawPattern(pattern, {
        ctx,
        w: cssW,
        h: cssH,
        t,
        hue,
        speed,
        offset,
      });
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mesh, pattern, hue, speed, offset]);

  if (!armed) {
    return (
      <div className="lightpaint-arm">
        <h1>mesh-light-paint</h1>
        <p>
          Mesh-synced phone-screen light painting. Set up a long exposure on your real camera
          (tripod, 4–10 s, bulb or night mode), then wave these phones across the frame. All
          patterns are driven by mesh time, so trails line up coherently in the photo.
        </p>
        <button type="button" className="lightpaint-arm-button" onClick={() => setArmed(true)}>
          Connect to brush
        </button>
        <p className="lightpaint-hint">
          Pattern <code>{pattern}</code> · hue {hue}° · speed {speed.toFixed(2)} · offset{" "}
          {offset.toFixed(2)}
        </p>
      </div>
    );
  }

  return (
    <div className="lightpaint-stage">
      <canvas ref={canvasRef} className="lightpaint-canvas" />
      <div
        className="lightpaint-hud"
        data-pattern={pattern}
        data-hue={hue}
        data-speed={speed.toFixed(2)}
      >
        <span className="lightpaint-hud-pattern">{pattern}</span>
        <span aria-hidden="true">·</span>
        <span>hue {hue}°</span>
        <span aria-hidden="true">·</span>
        <span>×{speed.toFixed(2)}</span>
        <span aria-hidden="true">·</span>
        <span>
          {peers + 1} brush{peers + 1 === 1 ? "" : "es"}
        </span>
      </div>
    </div>
  );
}
