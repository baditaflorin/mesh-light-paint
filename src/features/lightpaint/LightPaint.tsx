import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSync } from "../sync/yjsRoom";
import { createClockSync } from "../sync/clockSync";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";
import { drawPattern, type PatternId } from "./patterns";

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
};

type Props = {
  roomId: string;
  pattern: PatternId;
  hue: number;
  speed: number;
  offset: number;
};

export function LightPaint({ roomId, pattern, hue, speed, offset }: Props) {
  const [armed, setArmed] = useState(false);
  const [peers, setPeers] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mesh = useMemo(() => {
    if (!armed) return null;
    const room = createRoomSync(roomId);
    const clock = createClockSync(room.provider);
    return { room, clock };
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

  // Publish my brush so others can show a "brushes here" debug overlay (and
  // primarily so peerCount works through awareness).
  useEffect(() => {
    if (!mesh?.room.provider) return undefined;
    const awareness = (mesh.room.provider as unknown as { awareness: Awareness }).awareness;
    const publish = () => {
      awareness.setLocalStateField("brush", { pattern, hue, speed, offset, ts: Date.now() });
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
  }, [mesh, pattern, hue, speed, offset]);

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
      <div className="lightpaint-hud">
        <span>{pattern}</span>
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
