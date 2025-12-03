import { useEffect, useRef } from "react";
import { LabelBadge } from "./LabelBadge";

type LabelType = "H-LUS" | "C-LUS" | "I-LUS";

interface VideoPlayerProps {
  originalLabel: LabelType;
  userCorrection?: LabelType;
  isPlaying: boolean;
  isRepeating: boolean;
  videoUrl: string;
  onVideoRef: (ref: HTMLVideoElement | null) => void;
  onEnded: () => void;
  jumpHighlight?: boolean;

  // Frame overlay + sync
  currentFrameIndex: number; // 0-based frame index within the sequence
  totalFrames: number;       // typically 32
  onTimeUpdate: (currentTimeSeconds: number) => void;
}

export function VideoPlayer({
  originalLabel,
  userCorrection,
  isPlaying,
  isRepeating,
  videoUrl,
  onVideoRef,
  onEnded,
  jumpHighlight = false,
  currentFrameIndex,
  totalFrames,
  onTimeUpdate,
}: VideoPlayerProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Expose the video element to the parent (App)
  useEffect(() => {
    onVideoRef(localVideoRef.current);
    return () => {
      onVideoRef(null);
    };
  }, [onVideoRef]);

  // React to play/pause changes from parent
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {
        // Autoplay blocked, user will need to interact
      });
    } else {
      video.pause();
    }
  }, [isPlaying, videoUrl]);

  // Display frame as 1-based, clamped
  const displayFrame = totalFrames
    ? Math.min(totalFrames, Math.max(1, currentFrameIndex + 1))
    : 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-1.5">
      {/* Repeat Mode Banner */}
      {isRepeating && (
        <div className="bg-green-600 text-white px-4 py-1.5 rounded-md flex items-center justify-center gap-2 animate-pulse-subtle shadow-lg flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span>REPEAT MODE ACTIVE</span>
            <span className="mx-2">•</span>
            <span className="opacity-90">
              All controls locked except Pause
            </span>
          </div>
        </div>
      )}

      {/* Video container */}
      <div
        className={`relative w-full flex-1 min-h-0 bg-black overflow-hidden transition-all ${
          jumpHighlight ? "jump-highlight-pulse" : ""
        }`}
        style={{ borderRadius: "6px" }}
      >
        {/* Video Display */}
        <video
          ref={localVideoRef}
          src={videoUrl}
          className="w-full h-full object-contain bg-black"
          controls={false}
          loop={isRepeating}
          onEnded={onEnded}
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime || 0;
            onTimeUpdate(t);
          }}
        />

        {/* Label Badges */}
        {!userCorrection ? (
          <div className="absolute top-4 left-4">
            <div className="mb-1">
              <span className="text-white text-sm bg-black/50 px-2 py-0.5 rounded">
                Label
              </span>
            </div>
            <LabelBadge label={originalLabel} size="lg" />
          </div>
        ) : (
          <>
            <div className="absolute top-4 left-4">
              <div className="mb-1">
                <span className="text-white text-sm bg-black/50 px-2 py-0.5 rounded">
                  Previous
                </span>
              </div>
              <LabelBadge label={originalLabel} size="lg" />
            </div>
            <div className="absolute top-4 right-4">
              <div className="mb-1 text-right">
                <span className="text-white text-sm bg-black/50 px-2 py-0.5 rounded">
                  Updated
                </span>
              </div>
              <LabelBadge label={userCorrection} size="lg" />
            </div>
          </>
        )}

        {/* Frame Counter Overlay */}
        <div className="absolute bottom-3 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded">
          Frame {displayFrame} / {totalFrames}
        </div>
      </div>
    </div>
  );
}

