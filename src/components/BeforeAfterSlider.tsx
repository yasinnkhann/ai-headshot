import { useState, useRef, useCallback } from "react";
import { ChevronsLeftRight, Sparkles } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
  afterStyle?: React.CSSProperties;
  afterOverlay?: React.ReactNode;
}

export function BeforeAfterSlider({
  beforeImageUrl,
  afterImageUrl,
  beforeAlt = "Original photo",
  afterAlt = "AI enhanced headshot",
  className = "",
  afterStyle,
  afterOverlay,
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if already released
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === "ArrowRight") {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    }
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Before and after comparison slider"
      aria-valuenow={Math.round(sliderPosition)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative aspect-[4/5] w-full max-w-md mx-auto overflow-hidden rounded-2xl select-none touch-none shadow-2xl border border-white/10 cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
    >
      {/* BASE LAYER: Before Image (visible on left) */}
      <img
        src={beforeImageUrl}
        alt={beforeAlt}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />

      {/* OVERLAY LAYER: After Image (clipped on right) */}
      <div
        className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
      >
        <img
          src={afterImageUrl}
          alt={afterAlt}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={afterStyle}
          loading="eager"
        />
        {afterOverlay}
      </div>

      {/* BADGES */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10 shadow-md">
        Before
      </div>

      <div className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-indigo-600/90 px-3 py-1 text-xs font-medium text-white backdrop-blur-md border border-indigo-400/30 shadow-md">
        <Sparkles className="h-3 w-3 text-amber-300" />
        After — AI
      </div>

      {/* SLIDER LINE & DRAGGABLE HANDLE */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-indigo-900 shadow-xl border-2 border-indigo-600 transition-transform hover:scale-110 active:scale-95">
          <ChevronsLeftRight className="h-4 w-4" />
        </div>
      </div>

      {/* HELPER TEXT */}
      <div className="pointer-events-none absolute bottom-3 inset-x-0 z-10 text-center">
        <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/70 backdrop-blur-sm border border-white/10">
          Drag slider to compare
        </span>
      </div>
    </div>
  );
}
