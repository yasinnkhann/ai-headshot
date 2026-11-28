import { useState } from "react";
import type {
  AspectRatio,
  EditEngine,
  ExportFormat,
  MicroTuningSettings,
  PhotoLayer,
  PortraitFilter,
} from "../types";
import { cn } from "../lib/utils";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { buildStudioImage, getStudioDimensions } from "../lib/studio-engine";
import {
  applyMicroTuningToCanvas,
  getMicroTuningCssFilter,
  hasActiveMicroTuning,
} from "../lib/micro-tuning";

interface StudioExportPanelProps {
  engine: EditEngine;
  publicId: string | null;
  activeImageUrl: string | null;
  layers: PhotoLayer[];
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  filter: PortraitFilter;
  microTuning: MicroTuningSettings;
}

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "4:5", label: "4:5 Portrait" },
  { value: "1:1", label: "1:1 Square" },
  { value: "16:9", label: "16:9 Wide" },
  { value: "9:16", label: "9:16 Story" },
  { value: "3:2", label: "3:2 Photo" },
];

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG (Lossless)" },
  { value: "webp", label: "WEBP (Fast)" },
  { value: "jpg", label: "JPG (Universal)" },
];

export function StudioExportPanel({
  engine,
  publicId,
  activeImageUrl,
  layers,
  aspectRatio,
  onAspectRatioChange,
  filter,
  microTuning,
}: StudioExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  function resolveSourceUrl(targetFormat: ExportFormat): string | null {
    if (engine === "cloud" && publicId) {
      return buildStudioImage(
        publicId,
        layers,
        aspectRatio,
        filter,
        targetFormat,
      ).toURL();
    }
    return activeImageUrl;
  }

  async function fetchBlobWithRetry(url: string): Promise<Blob> {
    if (url.startsWith("data:")) {
      const res = await fetch(url);
      return res.blob();
    }

    let res = await fetch(url);
    let attempts = 0;
    while (res.status === 423 && attempts < 16) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 2500));
      res = await fetch(url);
    }
    if (!res.ok) throw new Error(`Export fetch failed (${res.status})`);
    const blob = await res.blob();
    if (blob.size === 0) throw new Error("Empty image returned");
    return blob;
  }

  async function renderToCanvasBlob(
    blob: Blob,
    mimeType: string,
    shouldCropLocally: boolean,
  ): Promise<Blob> {
    const needsFilter = hasActiveMicroTuning(microTuning);
    const needsFormatConvert = blob.type !== mimeType;
    if (!needsFilter && !needsFormatConvert && !shouldCropLocally) {
      return blob;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not decode image for export"));
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    let cropX = 0;
    let cropY = 0;
    let cropW = srcW;
    let cropH = srcH;
    let outW = srcW;
    let outH = srcH;

    if (shouldCropLocally && aspectRatio !== "original") {
      const targetDims = getStudioDimensions(aspectRatio);
      if (targetDims) {
        const targetRatio = targetDims.width / targetDims.height;
        const currentRatio = srcW / srcH;
        if (currentRatio > targetRatio) {
          cropW = Math.round(srcH * targetRatio);
          cropX = Math.round((srcW - cropW) / 2);
        } else {
          cropH = Math.round(srcW / targetRatio);
          cropY = Math.round((srcH - cropH) / 2);
        }
        outW = cropW;
        outH = cropH;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return blob;
    }

    if (needsFilter) {
      ctx.filter = getMicroTuningCssFilter(microTuning);
    }
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
    ctx.filter = "none";

    if (needsFilter) {
      applyMicroTuningToCanvas(ctx, outW, outH, microTuning);
    }

    URL.revokeObjectURL(objectUrl);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Canvas export failed"));
        },
        mimeType,
        0.95,
      );
    });
  }

  async function handleDownload() {
    const url = resolveSourceUrl(format);
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const rawBlob = await fetchBlobWithRetry(url);
      const mimeType =
        format === "png"
          ? "image/png"
          : format === "jpg"
            ? "image/jpeg"
            : "image/webp";

      const finalBlob = await renderToCanvasBlob(
        rawBlob,
        mimeType,
        engine === "local",
      );

      const objectUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const ratioTag = aspectRatio.replace(":", "x");
      a.download = `alterx-${engine}-${ratioTag}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyImage() {
    const url = resolveSourceUrl("png");
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const rawBlob = await fetchBlobWithRetry(url);
      const pngBlob = await renderToCanvasBlob(
        rawBlob,
        "image/png",
        engine === "local",
      );
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Clipboard copy failed — try downloading directly.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyUrl() {
    const url = resolveSourceUrl(format);
    if (!url || url.startsWith("data:")) return;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  const shareableCloudUrl =
    engine === "cloud" && publicId ? resolveSourceUrl(format) : null;

  return (
    <div className="glass-card border border-white/10 bg-white/[0.03] p-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Export &amp; Framing</h3>
        <p className="text-[11px] text-white/50 mt-0.5">
          All live light &amp; color adjustments are baked into your download.
        </p>
      </div>

      {/* Aspect Ratio */}
      <div>
        <label className="block text-[11px] font-medium text-white/60 mb-2">
          Crop / Aspect Ratio
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onAspectRatioChange(opt.value)}
              className={cn(
                "rounded-lg px-2 py-1.5 text-[11px] font-medium transition cursor-pointer border",
                aspectRatio === opt.value
                  ? "border-indigo-500 bg-indigo-600/30 text-indigo-200"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/10 hover:text-white",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* File Format */}
      <div>
        <label className="block text-[11px] font-medium text-white/60 mb-2">
          File Format
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFormat(f.value)}
              className={cn(
                "rounded-lg px-2 py-1.5 text-[11px] font-medium transition cursor-pointer border",
                format === f.value
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/10 hover:text-white",
              )}
            >
              {f.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading || !activeImageUrl}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition cursor-pointer shadow-lg shadow-indigo-600/25 hover:bg-indigo-500",
            (loading || !activeImageUrl) && "opacity-60 pointer-events-none",
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download {format.toUpperCase()}
        </button>

        <button
          type="button"
          onClick={handleCopyImage}
          disabled={loading || !activeImageUrl}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition cursor-pointer",
            copiedImage
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
              : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10",
          )}
        >
          {copiedImage ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied Image to Clipboard!
            </>
          ) : (
            <>
              <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
              Copy Image to Clipboard
            </>
          )}
        </button>

        {shareableCloudUrl && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              {copiedUrl ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copiedUrl ? "Copied URL" : "Copy URL"}
            </button>
            <a
              href={shareableCloudUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              <ExternalLink className="h-3 w-3" />
              Open Full
            </a>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 border border-red-500/20">
          {error}
        </p>
      )}
    </div>
  );
}
