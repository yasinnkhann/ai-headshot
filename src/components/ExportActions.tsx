import { useState } from "react";
import type {
  AspectRatio,
  ExportFormat,
  HeadshotPreset,
  PortraitFilter,
  WardrobeId,
  MicroTuningSettings,
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
import { getExportUrl } from "../lib/transformations";
import {
  getMicroTuningCssFilter,
  applyMicroTuningToCanvas,
  hasActiveMicroTuning,
} from "../lib/micro-tuning";

interface ExportActionsProps {
  publicId: string;
  selectedPreset: HeadshotPreset;
  aspectRatio: AspectRatio;
  filter?: PortraitFilter;
  wardrobe?: WardrobeId;
  microTuning?: MicroTuningSettings;
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "webp", label: "WEBP (Optimized)" },
  { value: "jpg", label: "JPG (Standard)" },
  { value: "png", label: "PNG (High Res)" },
];

export default function ExportActions({
  publicId,
  selectedPreset,
  aspectRatio,
  filter = "none",
  wardrobe = "original",
  microTuning,
}: ExportActionsProps) {
  const [format, setFormat] = useState<ExportFormat>("webp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  async function processBlobWithMicroTuning(
    blob: Blob,
    mimeType: string,
  ): Promise<Blob> {
    if (!microTuning || !hasActiveMicroTuning(microTuning)) {
      return blob;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image for micro-tuning export"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return blob;
    }

    // Apply CSS filters to 2D context
    ctx.filter = getMicroTuningCssFilter(microTuning);
    ctx.drawImage(img, 0, 0);

    // Apply vignette
    applyMicroTuningToCanvas(ctx, canvas.width, canvas.height, microTuning);

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

  function buildExportUrl(): string {
    return getExportUrl(
      publicId,
      selectedPreset,
      format,
      aspectRatio,
      filter,
      wardrobe,
    );
  }

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const url = buildExportUrl();
      let res = await fetch(url);

      // If Cloudinary is still deriving the target format (423), poll with backoff
      let attempts = 0;
      while (res.status === 423 && attempts < 16) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2500));
        res = await fetch(url);
      }

      if (!res.ok) throw new Error(`Download failed (${res.status})`);

      const rawBlob = await res.blob();
      if (rawBlob.size === 0) throw new Error("Download returned an empty file");

      const mimeType =
        format === "png"
          ? "image/png"
          : format === "jpg"
            ? "image/jpeg"
            : "image/webp";

      const blob = await processBlobWithMicroTuning(rawBlob, mimeType);

      const a = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      const ratioLabel = aspectRatio.replace(":", "x");
      const wardrobeSuffix = wardrobe !== "original" ? `-${wardrobe}` : "";
      const filterSuffix = filter !== "none" ? `-${filter}` : "";
      a.download = `headshot-${selectedPreset.id}-${ratioLabel}${wardrobeSuffix}${filterSuffix}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyImage() {
    setLoading(true);
    setError(null);
    try {
      // Request PNG format directly for system clipboard compatibility
      const url = getExportUrl(
        publicId,
        selectedPreset,
        "png",
        aspectRatio,
        filter,
        wardrobe,
      );
      let res = await fetch(url);

      let attempts = 0;
      while (res.status === 423 && attempts < 16) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2500));
        res = await fetch(url);
      }

      if (!res.ok) throw new Error("Could not fetch image for clipboard");

      const rawBlob = await res.blob();
      let pngBlob = await processBlobWithMicroTuning(rawBlob, "image/png");

      if (pngBlob.type !== "image/png") {
        const img = new Image();
        const objectUrl = URL.createObjectURL(pngBlob);
        img.src = objectUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context failed");
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(objectUrl);
        pngBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Image conversion failed"))),
            "image/png",
          );
        });
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Copying image to clipboard is not supported in this browser",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOpenTab() {
    setError(null);
    try {
      const url = buildExportUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open URL");
    }
  }

  async function handleCopyUrl() {
    setError(null);
    try {
      const url = buildExportUrl();
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copy failed");
    }
  }

  return (
    <section className="px-4 py-8">
      <div className="glass-card mx-auto max-w-xl p-6">
        <h3 className="mb-2 text-center text-lg font-semibold">
          Export Your Headshot
        </h3>
        <p className="mb-6 text-center text-sm text-white/50">
          Format: {format.toUpperCase()} · Ratio: {aspectRatio} ({aspectRatio === "1:1" ? "Square Avatar" : "Portrait"})
          {wardrobe !== "original" && ` · Attire: ${wardrobe}`}
          {filter !== "none" && ` · Filter: ${filter}`}
        </p>

        <div className="mb-6 flex justify-center gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFormat(f.value)}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-medium transition cursor-pointer",
                format === f.value
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download ({aspectRatio})
          </button>
          <button
            type="button"
            onClick={handleCopyImage}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-5 py-2.5 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-60 cursor-pointer transition"
          >
            {copiedImage ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {copiedImage ? "Copied Image!" : "Copy Image"}
          </button>
          <button
            type="button"
            onClick={handleOpenTab}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium hover:bg-white/5 disabled:opacity-60 cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Tab
          </button>
          <button
            type="button"
            onClick={handleCopyUrl}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium hover:bg-white/5 disabled:opacity-60 cursor-pointer"
          >
            {copiedUrl ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedUrl ? "Copied!" : "Copy URL"}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-400">{error}</p>
        )}
      </div>
    </section>
  );
}
