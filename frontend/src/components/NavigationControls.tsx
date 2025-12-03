import { Slider } from "./ui/slider";

interface NavigationControlsProps {
  // Global frame index across all sequences of current patient + class
  globalFrameIndex: number;   // 0-based
  totalFrames: number;        // totalSequences * FRAMES_PER_SEQUENCE
  isPlaying?: boolean;
  onGlobalFrameChange: (frameIndex: number) => void;
  jumpHighlight?: boolean;
}

export function NavigationControls({
  globalFrameIndex,
  totalFrames,
  isPlaying,
  onGlobalFrameChange,
  jumpHighlight = false,
}: NavigationControlsProps) {
  // Slider should always be interactive, even while playing.
  const maxFrame = totalFrames > 0 ? totalFrames - 1 : 0;
  const clampedValue =
    totalFrames > 0
      ? Math.min(Math.max(globalFrameIndex, 0), maxFrame)
      : 0;

  const handleSliderChange = (value: number[]) => {
    const v = value[0];
    onGlobalFrameChange(v);
  };

  return (
    <div
      className={`transition-all ${
        jumpHighlight ? "jump-highlight-pulse" : ""
      }`}
    >
      {/* Green slider over all frames */}
      <div className="slider-green">
        <Slider
          value={[clampedValue]}
          onValueChange={handleSliderChange}
          min={0}
          max={maxFrame}
          step={1}
          // keep prop, but we do not disable based on isPlaying
          disabled={totalFrames === 0}
          className="w-full"
        />
      </div>
    </div>
  );
}

