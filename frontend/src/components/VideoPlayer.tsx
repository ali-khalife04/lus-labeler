import { useEffect, useRef } from "react";
import { LabelBadge } from "./LabelBadge";

interface VideoPlayerProps {
  originalLabel: "H-LUS" | "C-LUS" | "I-LUS";
  userCorrection?: "H-LUS" | "C-LUS" | "I-LUS";
  isPlaying: boolean;
  isRepeating: boolean;
  videoUrl: string;
  onVideoRef: (ref: HTMLVideoElement | null) => void;
  onEnded: () => void;
  jumpHighlight?: boolean;
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
      video
        .play()
        .catch(() => {
          // Autoplay might be blocked; user will need to interact again
        });
    } else {
      video.pause();
    }
  }, [isPlaying, videoUrl]);

  return (
    <div className="space-y-1.5">
      {/* Repeat Mode Banner */}
      {isRepeating && (
        <div className="bg-green-600 text-white px-4 py-1.5 rounded-md flex items-center justify-center gap-2 animate-pulse-subtle shadow-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span>REPEAT MODE ACTIVE</span>
            <span className="mx-2">•</span>
            <span className="opacity-90">
              All controls locked except Pause
            </span>
          </div>
        </div>
      )}

      <div
        className={`relative w-full h-[70vh] bg-black overflow-hidden transition-all ${
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
          // We do not rely on autoPlay alone; we control play()/pause() via isPlaying effect
          onEnded={onEnded}
        />

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

