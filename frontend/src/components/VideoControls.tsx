import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface VideoControlsProps {
  isPlaying: boolean;
  isRepeating: boolean;
  onPlay: () => void;
  onPause: () => void;
  onToggleRepeat: () => void;
  currentSequence: number;
  totalSequences: number;
  onPrevious: () => void;
  onNext: () => void;

  // NEW props for frame slider
  currentFrameIndex: number; // 0-based
  totalFrames: number;
  onFrameChange: (frameIndex: number) => void;
}

export function VideoControls({
  isPlaying,
  isRepeating,
  onPlay,
  onPause,
  onToggleRepeat,
  currentSequence,
  totalSequences,
  onPrevious,
  onNext,
  currentFrameIndex,
  totalFrames,
  onFrameChange,
}: VideoControlsProps) {
  // When isPlaying is true, we are either in Play-all or Repeat mode.
  // We still lock sequence navigation + Play, but the slider remains usable.
  const controlsLocked = isPlaying;

  const clampedCurrentFrame =
    totalFrames > 0
      ? Math.min(Math.max(currentFrameIndex, 0), totalFrames - 1)
      : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frame = Number(e.target.value);
    onFrameChange(frame);
  };

  return (
    <div className="flex items-center justify-between gap-4 w-full mt-2">
      {/* Sequence Navigation */}
      <div className="flex items-center gap-2 mr-2">
        <button
          onClick={onPrevious}
          disabled={controlsLocked || currentSequence === 1}
          className="p-2.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors border-2 border-gray-300"
          title="Previous Sequence"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>

        <div className="text-gray-700 px-3 min-w-[110px] text-center font-medium">
          Sequence {currentSequence}/{totalSequences}
        </div>

        <button
          onClick={onNext}
          disabled={controlsLocked || currentSequence === totalSequences}
          className="p-2.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors border-2 border-gray-300"
          title="Next Sequence"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Frame Slider + Counter */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <span className="text-xs text-gray-600 whitespace-nowrap">
          Frame {totalFrames > 0 ? clampedCurrentFrame + 1 : 0}/{totalFrames}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(totalFrames - 1, 0)}
          value={clampedCurrentFrame}
          onChange={handleSliderChange}
          className="w-full accent-blue-600"
        />
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-3 ml-2">
        <button
          onClick={onPlay}
          disabled={controlsLocked}
          className="flex items-center gap-2.5 px-6 py-3 text-lg bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          <Play className="w-5 h-5" />
          Play
        </button>

        <button
          onClick={onPause}
          disabled={!isPlaying}
          className="flex items-center gap-2.5 px-6 py-3 text-lg bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-600 relative"
        >
          <Pause className="w-5 h-5" />
          Pause
          {isRepeating && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </button>

        <button
          onClick={onToggleRepeat}
          disabled={controlsLocked && !isRepeating}
          className={`flex items-center gap-2.5 px-6 py-3 text-lg rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            isRepeating
              ? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/50 animate-pulse-subtle"
              : "border-2 border-gray-300 hover:bg-gray-50"
          }`}
        >
          <RotateCcw
            className={`w-5 h-5 ${isRepeating ? "animate-spin-slow" : ""}`}
          />
          Repeat Current
        </button>
      </div>
    </div>
  );
}

