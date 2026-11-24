import { useState } from "react";
import type { CloudinaryImage } from "@cloudinary/url-gen/assets/CloudinaryImage";
import type { HeadshotPreset } from "../types";
import { AdvancedImage } from "@cloudinary/react";
import { AsyncHeadshotImage } from "./AsyncHeadshotImage";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { ChevronsLeftRight, Columns2 } from "lucide-react";
import { cn } from "../lib/utils";

interface ResultPreviewProps {
  originalImage: CloudinaryImage | null;
  selectedImage: CloudinaryImage | null;
  selectedPreset: HeadshotPreset | null;
}

export default function ResultPreview({
  originalImage,
  selectedImage,
  selectedPreset,
}: ResultPreviewProps) {
  const [viewMode, setViewMode] = useState<"slider" | "side">("slider");
  const [readyUrls, setReadyUrls] = useState<Set<string>>(() => new Set());

  if (!selectedImage || !selectedPreset || !originalImage) return null;

  const currentUrl = selectedImage.toURL();
  const isReady = readyUrls.has(currentUrl);

  const handleReady = () => {
    setReadyUrls((prev) => new Set(prev).add(currentUrl));
  };

  return (
    <section id="result-preview" className="px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-2 text-center text-2xl font-semibold">
          Your AI Generated Headshot
        </h2>
        <p className="mb-6 text-center text-white/60">
          Style: <span className="font-medium text-indigo-300">{selectedPreset.name}</span> — {selectedPreset.description}
        </p>

        {/* View Mode Switcher (Visible when generation is ready) */}
        {isReady && (
          <div className="mb-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("slider")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition cursor-pointer",
                viewMode === "slider"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              <ChevronsLeftRight className="h-3.5 w-3.5" />
              Interactive Split Slider
            </button>
            <button
              type="button"
              onClick={() => setViewMode("side")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition cursor-pointer",
                viewMode === "side"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Side by Side
            </button>
          </div>
        )}

        {/* When generation is ready and slider mode is active */}
        {isReady && viewMode === "slider" ? (
          <div className="glass-card p-6 flex flex-col items-center">
            <BeforeAfterSlider
              beforeImageUrl={originalImage.toURL()}
              afterImageUrl={currentUrl}
              beforeAlt="Original selfie"
              afterAlt={selectedPreset.name}
            />
          </div>
        ) : (
          /* Side by Side Mode OR during initial generation */
          <div className="glass-card grid gap-6 p-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-medium text-white/50">Before (Original)</p>
              <div className="aspect-[4/5] overflow-hidden rounded-xl bg-black/30">
                <AdvancedImage
                  cldImg={originalImage}
                  alt="Original selfie"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-indigo-400">
                After — AI Enhanced
              </p>
              <div className="aspect-[4/5] overflow-hidden rounded-xl bg-black/30 shadow-lg shadow-indigo-500/20">
                <AsyncHeadshotImage
                  key={`${selectedPreset.id}-${currentUrl}`}
                  imageUrl={currentUrl}
                  alt={selectedPreset.name}
                  onReady={handleReady}
                  className="h-full w-full object-cover rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
