import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { LightPaint } from "./features/lightpaint/LightPaint";
import { PATTERN_IDS, type PatternId } from "./features/lightpaint/patterns";
import { SettingsExtras } from "./features/settings/SettingsExtras";
import { appConfig } from "./shared/config";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  pattern: `${appConfig.storagePrefix}:pattern`,
  hue: `${appConfig.storagePrefix}:hue`,
  speed: `${appConfig.storagePrefix}:speed`,
  offset: `${appConfig.storagePrefix}:offset`,
};

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}
function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
function readPattern(key: string, fallback: PatternId): PatternId {
  const raw = localStorage.getItem(key);
  if (raw && (PATTERN_IDS as string[]).includes(raw)) return raw as PatternId;
  return fallback;
}

export function App() {
  const [roomId, setRoomId] = useState(() => readString(STORAGE.room, "default"));
  const [pattern, setPattern] = useState<PatternId>(() => readPattern(STORAGE.pattern, "stripes"));
  const [hue, setHue] = useState(() => readNumber(STORAGE.hue, 30));
  const [speed, setSpeed] = useState(() => readNumber(STORAGE.speed, 1));
  const [offset, setOffset] = useState(() => readNumber(STORAGE.offset, 0));

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.pattern, pattern);
  }, [pattern]);
  useEffect(() => {
    localStorage.setItem(STORAGE.hue, String(hue));
  }, [hue]);
  useEffect(() => {
    localStorage.setItem(STORAGE.speed, String(speed));
  }, [speed]);
  useEffect(() => {
    localStorage.setItem(STORAGE.offset, String(offset));
  }, [offset]);

  return (
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={
        <SettingsExtras
          pattern={pattern}
          onPatternChange={setPattern}
          hue={hue}
          onHueChange={setHue}
          speed={speed}
          onSpeedChange={setSpeed}
          offset={offset}
          onOffsetChange={setOffset}
        />
      }
    >
      <LightPaint roomId={roomId} pattern={pattern} hue={hue} speed={speed} offset={offset} />
    </MeshShell>
  );
}
