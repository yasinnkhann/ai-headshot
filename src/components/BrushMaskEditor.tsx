import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brush,
  Check,
  Eraser,
  FlipHorizontal2,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

interface BrushMaskEditorProps {
  sourceImageUrl: string;
  initialMaskDataUrl?: string | null;
  onSave: (maskDataUrl: string, previewDataUrl: string) => void;
  onClose: () => void;
}

export function BrushMaskEditor({
  sourceImageUrl,
  initialMaskDataUrl,
  onSave,
  onClose,
}: BrushMaskEditorProps) {
  const [brushSize, setBrushSize] = useState(44);
  const [tool, setTool] = useState<"paint" | "erase">("paint");
  const [hasStrokes, setHasStrokes] = useState(Boolean(initialMaskDataUrl));
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [undoDepth, setUndoDepth] = useState(0);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);

  // Synchronize visible tinted overlay from binary mask canvas (white = repaint, transparent = protected)
  const syncOverlay = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!maskCanvas || !overlayCanvas) return;

    const oCtx = overlayCanvas.getContext("2d");
    if (!oCtx) return;

    oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    oCtx.save();
    oCtx.drawImage(maskCanvas, 0, 0);
    oCtx.globalCompositeOperation = "source-in";
    oCtx.fillStyle = "rgba(168, 85, 247, 0.58)"; // Vivid purple tint over masked pixels
    oCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    oCtx.restore();
  }, []);

  const checkHasStrokes = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return false;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    // Sample every 16th pixel for fast check
    for (let i = 3; i < data.length; i += 64) {
      if (data[i] > 20) return true;
    }
    return false;
  }, []);

  const pushUndoSnapshot = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    undoStackRef.current = [...undoStackRef.current.slice(-14), snap];
    setUndoDepth(undoStackRef.current.length);
  }, []);

  // Initialize hidden binary mask canvas once image loads
  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth || 768;
    const h = img.naturalHeight || 768;
    setImgDims({ w, h });

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = w;
    maskCanvas.height = h;
    maskCanvasRef.current = maskCanvas;

    const overlay = overlayCanvasRef.current;
    if (overlay) {
      overlay.width = w;
      overlay.height = h;
    }

    // Restore existing white-on-black mask if re-opening editor
    if (initialMaskDataUrl) {
      const mImg = new Image();
      mImg.onload = () => {
        const mCtx = maskCanvas.getContext("2d");
        if (!mCtx) return;
        const temp = document.createElement("canvas");
        temp.width = w;
        temp.height = h;
        const tCtx = temp.getContext("2d");
        if (!tCtx) return;
        tCtx.drawImage(mImg, 0, 0, w, h);
        const raw = tCtx.getImageData(0, 0, w, h);
        const out = mCtx.createImageData(w, h);
        for (let i = 0; i < raw.data.length; i += 4) {
          const isWhite = raw.data[i] > 128;
          out.data[i] = 255;
          out.data[i + 1] = 255;
          out.data[i + 2] = 255;
          out.data[i + 3] = isWhite ? 255 : 0;
        }
        mCtx.putImageData(out, 0, 0);
        syncOverlay();
        setHasStrokes(checkHasStrokes());
      };
      mImg.src = initialMaskDataUrl;
    } else {
      syncOverlay();
    }
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      displayX: e.clientX - rect.left,
      displayY: e.clientY - rect.top,
      scale: scaleX,
    };
  };

  const drawSegment = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    scale: number,
  ) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize * scale;
    if (tool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#ffffff";
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();

    syncOverlay();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    if (!pt) return;
    pushUndoSnapshot();
    drawingRef.current = true;
    lastPtRef.current = { x: pt.x, y: pt.y };
    drawSegment(pt, { x: pt.x + 0.1, y: pt.y + 0.1 }, pt.scale);
    setHasStrokes(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (!pt) return;
    setCursorPos({ x: pt.displayX, y: pt.displayY });
    if (!drawingRef.current || !lastPtRef.current) return;
    drawSegment(lastPtRef.current, { x: pt.x, y: pt.y }, pt.scale);
    lastPtRef.current = { x: pt.x, y: pt.y };
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPtRef.current = null;
    setHasStrokes(checkHasStrokes());
  };

  const handleUndo = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || undoStackRef.current.length === 0) return;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    const last = undoStackRef.current.pop();
    if (last) {
      ctx.putImageData(last, 0, 0);
      syncOverlay();
      setUndoDepth(undoStackRef.current.length);
      setHasStrokes(checkHasStrokes());
    }
  }, [checkHasStrokes, syncOverlay]);

  const handleClear = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    pushUndoSnapshot();
    const ctx = maskCanvas.getContext("2d");
    ctx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    syncOverlay();
    setHasStrokes(false);
  };

  const handleInvert = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    pushUndoSnapshot();
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const painted = d[i + 3] > 128;
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = painted ? 0 : 255;
    }
    ctx.putImageData(imgData, 0, 0);
    syncOverlay();
    setHasStrokes(checkHasStrokes());
  };

  const handleSave = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    // Export binary white-on-black mask PNG at exact natural image dimensions
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = maskCanvas.width;
    exportCanvas.height = maskCanvas.height;
    const eCtx = exportCanvas.getContext("2d");
    if (!eCtx) return;

    eCtx.fillStyle = "#000000";
    eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    eCtx.drawImage(maskCanvas, 0, 0);
    const maskDataUrl = exportCanvas.toDataURL("image/png");

    // Also create a small composite thumbnail preview (image + purple overlay)
    const previewCanvas = document.createElement("canvas");
    const maxPreview = 180;
    const ratio = Math.min(
      maxPreview / maskCanvas.width,
      maxPreview / maskCanvas.height,
      1,
    );
    previewCanvas.width = Math.max(1, Math.round(maskCanvas.width * ratio));
    previewCanvas.height = Math.max(1, Math.round(maskCanvas.height * ratio));
    const pCtx = previewCanvas.getContext("2d");
    let previewDataUrl = maskDataUrl;
    if (pCtx && imgRef.current && overlayCanvasRef.current) {
      try {
        pCtx.drawImage(
          imgRef.current,
          0,
          0,
          previewCanvas.width,
          previewCanvas.height,
        );
        pCtx.drawImage(
          overlayCanvasRef.current,
          0,
          0,
          previewCanvas.width,
          previewCanvas.height,
        );
        previewDataUrl = previewCanvas.toDataURL("image/png");
      } catch {
        // Fallback to pure mask preview if source image is cross-origin tainted
        previewDataUrl = maskDataUrl;
      }
    }

    onSave(maskDataUrl, previewDataUrl);
  };

  // Keyboard shortcuts: [ / ] for brush size, Cmd/Ctrl+Z for undo, Esc to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "[") setBrushSize((s) => Math.max(10, s - 8));
      else if (e.key === "]") setBrushSize((s) => Math.min(140, s + 8));
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-white/15 bg-[#0e0e16] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Brush className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Brush Mask — Paint Where AI Should Edit
              </h3>
              <p className="text-[11px] text-white/55">
                Purple areas will be repainted · Unpainted areas stay 100% locked
                {imgDims ? ` · ${imgDims.w}×${imgDims.h}px` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Brush Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTool("paint")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
                tool === "paint"
                  ? "border-purple-500 bg-purple-600/30 text-purple-100"
                  : "border-white/10 bg-white/5 text-white/65 hover:text-white",
              )}
            >
              <Brush className="h-3.5 w-3.5" />
              Paint Edit Area
            </button>
            <button
              type="button"
              onClick={() => setTool("erase")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
                tool === "erase"
                  ? "border-emerald-500 bg-emerald-600/30 text-emerald-100"
                  : "border-white/10 bg-white/5 text-white/65 hover:text-white",
              )}
            >
              <Eraser className="h-3.5 w-3.5" />
              Protect / Erase
            </button>
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-2.5 text-xs text-white/70">
            <span>Size:</span>
            <input
              type="range"
              min={10}
              max={140}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-28 accent-purple-500 cursor-pointer"
            />
            <span className="w-10 font-mono text-[11px] text-purple-300">
              {brushSize}px
            </span>
          </div>

          {/* Utilities */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoDepth === 0}
              title="Undo stroke (⌘Z)"
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/75 hover:bg-white/10 disabled:opacity-35 cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              type="button"
              onClick={handleInvert}
              title="Invert selection (great for painting subject then inverting to edit background)"
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/75 hover:bg-white/10 cursor-pointer"
            >
              <FlipHorizontal2 className="h-3.5 w-3.5" />
              Invert
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasStrokes}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/15 disabled:opacity-35 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-[#07070c] p-4 select-none">
          <div className="relative inline-block max-w-full">
            <img
              ref={imgRef}
              src={sourceImageUrl}
              crossOrigin="anonymous"
              alt="Mask source"
              onLoad={handleImageLoad}
              draggable={false}
              className="block max-h-[58vh] max-w-full rounded-lg border border-white/10 object-contain pointer-events-none"
            />
            <canvas
              ref={overlayCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => {
                handlePointerUp();
                setCursorPos(null);
              }}
              className="absolute inset-0 h-full w-full touch-none cursor-none rounded-lg"
            />
            {cursorPos && (
              <div
                className={cn(
                  "pointer-events-none absolute rounded-full border-2 -translate-x-1/2 -translate-y-1/2",
                  tool === "paint"
                    ? "border-purple-300 bg-purple-500/20"
                    : "border-emerald-300 bg-emerald-500/20",
                )}
                style={{
                  left: cursorPos.x,
                  top: cursorPos.y,
                  width: brushSize,
                  height: brushSize,
                }}
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5 bg-white/[0.02]">
          <p className="text-[11px] text-white/50">
            Pro tip: Paint over your face &amp; body then hit{" "}
            <strong className="text-white/80">Invert</strong> to swap only the
            background with zero face drift. Keys: <code>[</code> <code>]</code>{" "}
            brush size · <code>⌘Z</code> undo.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/75 hover:bg-white/10 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              disabled={!hasStrokes}
              onClick={handleSave}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-semibold text-white transition cursor-pointer",
                hasStrokes
                  ? "bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/25"
                  : "bg-white/10 text-white/40 cursor-not-allowed",
              )}
            >
              <Check className="h-3.5 w-3.5" />
              Apply Brush Mask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
