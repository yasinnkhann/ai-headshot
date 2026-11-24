import { useState } from "react";
import type { AspectRatio, ExportFormat, HeadshotPreset } from "../types";
import { cn } from "../lib/utils";
import { Check, Copy, Download, ExternalLink, Loader2 } from "lucide-react";
import { getExportUrl } from "../lib/transformations";

interface ExportActionsProps {
  publicId: string;
  selectedPreset: HeadshotPreset;
  aspectRatio: AspectRatio;
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
}: ExportActionsProps) {
  const [format, setFormat] = useState<ExportFormat>("webp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function buildExportUrl(): string {
    return getExportUrl(publicId, selectedPreset, format, aspectRatio);
  }

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const url = buildExportUrl();
      let res = await fetch(url);

      // If Cloudinary is still deriving the target format (423), poll briefly
      let attempts = 0;
      while (res.status === 423 && attempts < 8) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2500));
        res = await fetch(url);
      }

      if (!res.ok) throw new Error(`Download failed (${res.status})`);

      const blob = await res.blob();
      if (blob.size === 0) throw new Error("Download returned an empty file");

      const a = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      const ratioLabel = aspectRatio.replace(":", "x");
      a.download = `headshot-${selectedPreset.id}-${ratioLabel}.${format}`;
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy URL"}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-400">{error}</p>
        )}
      </div>
    </section>
  );
}
