import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FolderOpen,
  ImagePlus,
  Images,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { LocalGalleryItem, LocalOperation } from "../types";
import { cn } from "../lib/utils";

interface LocalGalleryModalProps {
  items: LocalGalleryItem[];
  galleryDir?: string;
  loading: boolean;
  canAddAsReference: boolean;
  onRefresh: () => void;
  onOpenFolder: () => void;
  onLoadItem: (item: LocalGalleryItem) => void;
  onAddAsReference?: (item: LocalGalleryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onClose: () => void;
}

export function LocalGalleryModal({
  items,
  galleryDir,
  loading,
  canAddAsReference,
  onRefresh,
  onOpenFolder,
  onLoadItem,
  onAddAsReference,
  onDeleteItem,
  onClose,
}: LocalGalleryModalProps) {
  const [query, setQuery] = useState("");
  const [opFilter, setOpFilter] = useState<"all" | LocalOperation>("all");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (opFilter !== "all" && item.operation !== opFilter) return false;
      if (!q) return true;
      return (
        item.prompt.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        String(item.seed || "").includes(q)
      );
    });
  }, [items, opFilter, query]);

  const handleDownload = async (item: LocalGalleryItem) => {
    try {
      const res = await fetch(item.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename || `${item.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.imageUrl, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl rounded-2xl border border-white/15 bg-[#0e0e16] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Images className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Alterx Library ({items.length} saved)
              </h3>
              <p className="text-[11px] text-white/50 truncate max-w-md">
                Auto-saved to{" "}
                <code className="text-emerald-300/90">
                  {galleryDir || "~/Pictures/Alterx"}
                </code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenFolder}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-emerald-400" />
              Open in Finder
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 cursor-pointer"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by prompt, model, or seed..."
              className="w-full rounded-lg border border-white/10 bg-black/40 pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "all", label: "All" },
                { id: "edit", label: "Edits" },
                { id: "upscale", label: "Upscaled" },
                { id: "cutout", label: "Cutouts" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOpFilter(tab.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer border",
                  opFilter === tab.id
                    ? "border-indigo-500 bg-indigo-600/30 text-indigo-200"
                    : "border-white/10 bg-white/5 text-white/60 hover:text-white",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="h-8 w-8 text-white/25 mb-3" />
              <p className="text-sm font-medium text-white/75">
                {items.length === 0
                  ? "No saved local renders yet"
                  : "No renders match your search"}
              </p>
              <p className="mt-1 text-xs text-white/45 max-w-sm">
                Every Local Mac AI edit, upscale, and cutout is automatically
                saved to your Mac so you never lose a generation on refresh.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col hover:border-indigo-500/40 transition"
                >
                  <div
                    className={cn(
                      "relative aspect-square overflow-hidden",
                      item.operation === "cutout"
                        ? "bg-[repeating-conic-gradient(#1f2937_0%_25%,#111827_0%_50%)] bg-[length:16px_16px]"
                        : "bg-black/50",
                    )}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      <span className="rounded-md bg-black/75 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-white/10">
                        {item.operation === "upscale"
                          ? "🔍 Upscale"
                          : item.operation === "cutout"
                            ? "✂️ Cutout"
                            : item.model === "qwen-2.1-turbo"
                              ? "🎯 Qwen 2.1"
                              : "⚡ FLUX.2"}
                      </span>
                      {item.seed && (
                        <span className="rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[9px] text-white/70">
                          #{item.seed}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                    <div>
                      <p
                        className="text-xs font-medium text-white/90 line-clamp-2"
                        title={item.prompt}
                      >
                        {item.prompt}
                      </p>
                      <p className="mt-1 text-[10px] text-white/45">
                        {new Date(item.createdAt).toLocaleString()}
                        {item.elapsed ? ` · ${item.elapsed}s` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadItem(item);
                          onClose();
                        }}
                        className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition cursor-pointer text-center"
                      >
                        Open in Studio
                      </button>

                      {canAddAsReference && onAddAsReference && (
                        <button
                          type="button"
                          title="Add as Multi-Photo Reference image"
                          onClick={() => {
                            onAddAsReference(item);
                            onClose();
                          }}
                          className="rounded-lg border border-white/15 bg-white/5 p-1.5 text-white/75 hover:bg-emerald-600/30 hover:text-emerald-200 cursor-pointer"
                        >
                          <ImagePlus className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Download PNG"
                        onClick={() => handleDownload(item)}
                        className="rounded-lg border border-white/15 bg-white/5 p-1.5 text-white/75 hover:bg-white/15 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        title="Delete from Mac disk"
                        onClick={() => onDeleteItem(item.id)}
                        className="rounded-lg border border-white/15 bg-white/5 p-1.5 text-white/60 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
