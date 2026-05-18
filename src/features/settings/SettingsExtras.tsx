import { PATTERN_IDS, type PatternId } from "../lightpaint/patterns";

type Props = {
  pattern: PatternId;
  onPatternChange: (next: PatternId) => void;
  hue: number;
  onHueChange: (next: number) => void;
  speed: number;
  onSpeedChange: (next: number) => void;
  offset: number;
  onOffsetChange: (next: number) => void;
};

export function SettingsExtras({
  pattern,
  onPatternChange,
  hue,
  onHueChange,
  speed,
  onSpeedChange,
  offset,
  onOffsetChange,
}: Props) {
  return (
    <>
      <label>
        <span>Pattern</span>
        <div className="settings-pattern-grid">
          {PATTERN_IDS.map((p) => (
            <button
              key={p}
              type="button"
              className={pattern === p ? "on" : ""}
              onClick={() => onPatternChange(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </label>

      <label>
        <span>Hue ({hue}°)</span>
        <input
          type="range"
          min={0}
          max={359}
          value={hue}
          onChange={(e) => onHueChange(Number(e.target.value))}
        />
      </label>

      <label>
        <span>Speed (×{speed.toFixed(2)})</span>
        <input
          type="range"
          min={0}
          max={3}
          step={0.05}
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
        />
      </label>

      <label>
        <span>Per-phone offset ({offset.toFixed(2)})</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={offset}
          onChange={(e) => onOffsetChange(Number(e.target.value))}
        />
      </label>

      <p className="mesh-settings-help">
        Each phone uses the same mesh time, so giving phones different offsets prevents identical
        patterns and makes the long-exposure composite richer.
      </p>
    </>
  );
}
