import { useEffect, useRef, useState } from "react";
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

  // New props for frame control
  fps?: number;
  requestedFrame?: number | null;
  onFrameInfo?: (info: { duration: number; totalFrames: number; fps: number }) => void;
  onFrameUpdate?: (frameIndex: number) => void;
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
  fps = 30,
  requestedFrame = null,
  onFrameInfo,
  onFrameUpdate,
}: VideoPlayerProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const [duration, setDuration] = useState(0);
  const [internalCurrentFrame, setInternalCurrentFrame] = useState(0);
  const [internalTotalFrames, setInternalTotalFrames] = useState(0);

  const effectiveFps = fps || 30;

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
      video
        .play()
        .catch(() => {
          // Autoplay might be blocked
        });
    } else {
      video.pause();
    }
  }, [isPlaying, videoUrl]);

  // When metadata is loaded, compute duration and total frames
  const handleLoadedMetadata = () => {
    const video = localVideoRef.current;
    if (!video) return;

    const newDuration = video.duration || 0;
    const totalFrames = Math.max(1, Math.round(newDuration * effectiveFps));

    setDuration(newDuration);
    setInternalTotalFrames(totalFrames);
    setInternalCurrentFrame(0);

    if (onFrameInfo) {
      onFrameInfo({
        duration: newDuration,
        totalFrames,
        fps: effectiveFps,
      });
    }
  };

  // On time update, compute current frame and notify parent
  const handleTimeUpdate = () => {
    const video = localVideoRef.current;
    if (!video) return;

    const currentTime = video.currentTime || 0;
    const frameIndex = Math.floor(currentTime * effectiveFps);

    setInternalCurrentFrame(frameIndex);
    if (onFrameUpdate) {
      onFrameUpdate(frameIndex);
    }
  };

  // Seek when parent requests a frame (from slider)
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    if (requestedFrame == null) return;
    if (!Number.isFinite(requestedFrame)) return;

    const targetTime = requestedFrame / effectiveFps;
    if (!Number.isFinite(targetTime)) return;

    const clampedTime =
      duration > 0 ? Math.min(Math.max(targetTime, 0), duration) : targetTime;

    video.currentTime = clampedTime;
  }, [requestedFrame, effectiveFps, duration]);

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
        className={
          "relative w-full flex-1 min-h-0 bg-black overflow-hidden transition-all " +
          (jumpHighlight ? "jump-highlight-pulse" : "")
        }
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
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
        />

        {/* Frame overlay */}
        <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {internalTotalFrames > 0 ? (
            <span>
              Frame {internalCurrentFrame + 1} / {internalTotalFrames}
            </span>
          ) : (
            <span>Frame -- / --</span>
          )}
        </div>

        {/* Label Badges */}
        {!userCorrection ? (
          // No correction - show single label in top-left
          <div className="absolute top-4 left-4">
            <div className="mb-1">
              <span className="text-white text-sm bg-black/50 px-2 py-0.5 rounded">
                Label
              </span>
            </div>
            <LabelBadge label={originalLabel} size="lg" />
          </div>
        ) : (
          // Has correction - show Previous (top-left) and Updated (top-right)
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
      </div>
    </div>
  );
}

