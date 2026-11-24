import type { GeneratedHeadshotItem } from "../types";
import { Sparkles, Trash2, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface HeadshotGalleryProps {
  gallery: GeneratedHeadshotItem[];
  activeUrl?: string;
  onSelect: (item: GeneratedHeadshotItem) => void;
  onRemove: (id: string) => void;
  className?: string;
}

export function HeadshotGallery({
  gallery,
  activeUrl,
  onSelect,
  onRemove,
  className = "",
}: HeadshotGalleryProps) {
  if (gallery.length === 0) return null;

  return (
    <section id="headshot-gallery" className={cn("px-4 py-8", className)}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">
              Your Headshot Collection
            </h3>
            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">
              {gallery.length} {gallery.length === 1 ? "style" : "styles"}
            </span>
          </div>
          <p className="hidden sm:block text-xs text-white/50">
            Click any headshot to load it into the slider or LinkedIn simulator
          </p>
        </div>

        {/* THUMBNAIL CAROUSEL ROW */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-white/10">
          {gallery.map((item) => {
            const isActive = activeUrl === item.url;
            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  document
                    .getElementById("result-preview")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={cn(
                  "group relative shrink-0 cursor-pointer overflow-hidden rounded-xl border transition-all duration-300 w-36 sm:w-44",
                  isActive
                    ? "border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/25"
                    : "border-white/10 hover:border-white/20 hover:scale-[1.02]",
                )}
              >
                {/* THUMBNAIL IMAGE */}
                <div
                  className={cn(
                    "relative overflow-hidden bg-black/40",
                    item.aspectRatio === "1:1" ? "aspect-square" : "aspect-[4/5]",
                  )}
                >
                  <img
                    src={item.url}
                    alt={item.presetName}
                    className="h-full w-full object-cover transition duration-300 group-hover:brightness-105"
                    loading="lazy"
                  />

                  {/* ACTIVE CHECK BADGE */}
                  {isActive && (
                    <div className="absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 shadow-md">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}

                  {/* DELETE BUTTON */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    title="Remove from collection"
                    className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/60 opacity-0 group-hover:opacity-100 transition hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

                  {/* BOTTOM INFO OVERLAY */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 text-left">
                    <p className="text-xs font-medium text-white truncate">
                      {item.presetName}
                    </p>
                    <p className="text-[10px] text-white/60">
                      {item.aspectRatio}
                      {item.filter !== "none" && ` · ${item.filter}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
