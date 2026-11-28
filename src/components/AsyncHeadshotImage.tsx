import { useEffect, useRef, useState } from "react";
import { AlertCircle, Clock, Cpu, Loader2, RotateCcw, Sparkles } from "lucide-react";

interface AsyncHeadshotImageProps {
  imageUrl: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onReady?: () => void;
  onClearLayers?: () => void;
  onSwitchToLocal?: () => void;
  layerCount?: number;
}

export function AsyncHeadshotImage({
  imageUrl,
  alt,
  className = "",
  style,
  onReady,
  onClearLayers,
  onSwitchToLocal,
  layerCount,
}: AsyncHeadshotImageProps) {
  const [status, setStatus] = useState<
    "checking" | "processing" | "rate_limited" | "ready" | "error"
  >("checking");
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attemptRef = useRef(0);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let isCancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let elapsedTimer: ReturnType<typeof setInterval> | null = null;

    // Timer for counting seconds while AI is generating
    elapsedTimer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    async function pollImage() {
      if (isCancelled) return;
      attemptRef.current += 1;

      try {
        // Cache-busting query parameter ensures fresh status from Cloudinary edge
        const sep = imageUrl.includes("?") ? "&" : "?";
        const pollUrl = `${imageUrl}${sep}_t=${Date.now()}`;
        const response = await fetch(pollUrl, {
          method: "HEAD",
          cache: "no-store",
        });

        if (isCancelled) return;

        if (response.status === 200) {
          // Preload the image before switching to ready so it renders immediately with no flicker
          const preloadImg = new Image();
          preloadImg.src = imageUrl;
          preloadImg.onload = () => {
            if (!isCancelled) {
              setStatus("ready");
              if (elapsedTimer) clearInterval(elapsedTimer);
              onReadyRef.current?.();
            }
          };
          preloadImg.onerror = () => {
            // If the image asset is still finalizing propagation, retry shortly
            if (!isCancelled) {
              pollTimer = setTimeout(pollImage, 2500);
            }
          };
          return;
        }

        if (response.status === 423) {
          // Cloudinary: Processing continued in the background
          setStatus("processing");
          pollTimer = setTimeout(pollImage, 3000);
          return;
        }

        if (response.status === 429) {
          // Cloudinary: Rate limit or concurrent limit reached
          setStatus("rate_limited");
          // Wait 6 seconds to give Cloudinary time to clear the queue
          pollTimer = setTimeout(pollImage, 6000);
          return;
        }

        // Other HTTP error codes
        if (response.status >= 400) {
          if (attemptRef.current < 5) {
            pollTimer = setTimeout(pollImage, 3000);
          } else {
            setStatus("error");
            setErrorMessage(`Cloudinary returned HTTP ${response.status}`);
            if (elapsedTimer) clearInterval(elapsedTimer);
          }
          return;
        }

        // Default to ready for any other 2xx
        setStatus("ready");
        if (elapsedTimer) clearInterval(elapsedTimer);
        onReadyRef.current?.();
      } catch {
        if (isCancelled) return;
        // In case of network glitch or timeout, retry
        if (attemptRef.current < 6) {
          pollTimer = setTimeout(pollImage, 3000);
        } else {
          setStatus("ready");
          if (elapsedTimer) clearInterval(elapsedTimer);
          onReadyRef.current?.();
        }
      }
    }

    void pollImage();

    return () => {
      isCancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (elapsedTimer) clearInterval(elapsedTimer);
    };
  }, [imageUrl]);

  if (status === "ready") {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={className}
        style={style}
        loading="eager"
      />
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full min-h-[350px] w-full flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <h4 className="font-semibold text-red-300">Generation Error</h4>
        <p className="mt-1 text-xs text-white/60">
          {errorMessage || "Unable to complete AI transformation."}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("checking");
            setElapsed(0);
          }}
          className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-xs font-medium hover:bg-white/20 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[350px] w-full flex-col items-center justify-center p-6 text-center bg-black/40 rounded-xl border border-indigo-500/20 backdrop-blur-sm">
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-300 animate-pulse" />
      </div>

      <h4 className="text-base font-semibold text-white">
        {status === "rate_limited"
          ? "Cloudinary AI Queue Busy (429)"
          : "Generating Your AI Headshot..."}
      </h4>

      <p className="mt-1.5 max-w-xs text-xs text-white/70">
        {status === "rate_limited"
          ? "Rate limit reached. Automatically cooling down and retrying..."
          : "Cloudinary is processing your AI transformation in the background."}
      </p>

      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-indigo-300 border border-white/10">
        <Clock className="h-3.5 w-3.5" />
        <span>{elapsed}s elapsed (usually takes 10–25s)</span>
      </div>

      {elapsed >= 25 && (
        <div className="mt-4 max-w-sm rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-left text-xs text-amber-200">
          <p className="font-semibold text-amber-300 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Taking longer than usual ({elapsed}s)
          </p>
          <p className="mt-1 text-white/70 leading-relaxed text-[11px]">
            {layerCount && layerCount > 3
              ? `You have ${layerCount} layers stacked. Chaining multiple generative AI effects (or conflicting backdrops) can cause Cloudinary to hang.`
              : "Cloudinary may be queuing or struggling with conflicting layer transformations."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onClearLayers && (
              <button
                type="button"
                onClick={onClearLayers}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white transition cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Clear Layers
              </button>
            )}
            {onSwitchToLocal && (
              <button
                type="button"
                onClick={onSwitchToLocal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white transition cursor-pointer"
              >
                <Cpu className="h-3 w-3" />
                Switch to Local Mac AI
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
