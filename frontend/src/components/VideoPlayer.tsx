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

  // New props for frame-aware playback
  fps?: number; // assumed FPS for frame calculations
  requestedFrame?: number | null;
  onFrameInfo?: (info: { totalFrames: number; duration: number; fps: number }) => void;
  onFrameUpdate?: (frameIndex: number, timeSeconds: number) => void;
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
  const lastEmittedFrameRef = useRef<number>(-1);

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
          // Autoplay might be blocked; user will need to interact again
        });
    } else {
      video.pause();
    }
  }, [isPlaying, videoUrl]);

  // When metadata is loaded, compute total frames (approx) and notify parent
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const duration = video.duration || 0;
      const totalFrames = duration > 0 ? Math.max(Math.round(duration * fps), 1) : 0;
      if (onFrameInfo) {
        onFrameInfo({ totalFrames, duration, fps });
      }
      lastEmittedFrameRef.current = -1;
    };

    // In case metadata is already loaded
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoUrl, fps, onFrameInfo]);

  // Emit frame updates during playback / seeking
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video || !onFrameUpdate) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime || 0;
      const frameIndex = Math.max(Math.floor(time * fps), 0);
      if (frameIndex !== lastEmittedFrameRef.current) {
        lastEmittedFrameRef.current = frameIndex;
        onFrameUpdate(frameIndex, time);
      }
    };

    const handleSeeking = () => {
      const time = video.currentTime || 0;
      const frameIndex = Math.max(Math.floor(time * fps), 0);
      lastEmittedFrameRef.current = frameIndex;
      onFrameUpdate(frameIndex, time);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("seeking", handleSeeking);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("seeking", handleSeeking);
    };
  }, [fps, onFrameUpdate]);

  // Seek to a requested frame when the parent updates it
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    if (requestedFrame == null || requestedFrame < 0) return;

    const time = requestedFrame / fps;
    // Avoid infinite loops if we're already at that frame
    const currentFrame = Math.floor((video.currentTime || 0) * fps);
    if (currentFrame === requestedFrame) return;

    video.currentTime = time;
  }, [requestedFrame, fps]);

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
            <span className="opacity-90">All controls locked except Pause</span>
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
        />

        {/* Small frame indicator in bottom-left */}
        <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
          Frame-aware mode
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

