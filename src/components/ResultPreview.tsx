import { useState } from "react";
import type { CloudinaryImage } from "@cloudinary/url-gen/assets/CloudinaryImage";
import type {
  HeadshotPreset,
  AspectRatio,
  PortraitFilter,
  WardrobeId,
  GeneratedHeadshotItem,
  MicroTuningSettings,
} from "../types";
import { AdvancedImage } from "@cloudinary/react";
import { AsyncHeadshotImage } from "./AsyncHeadshotImage";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { LinkedInSimulator } from "./LinkedInSimulator";
import { PortraitFilterBar } from "./PortraitFilterBar";
import { MicroTuningPanel } from "./MicroTuningPanel";
import { getWardrobeById } from "../lib/transformations";
import { getMicroTuningCssFilter, getVignetteOverlayStyle } from "../lib/micro-tuning";
import {
  ChevronsLeftRight,
  Columns2,
  RectangleVertical,
  Square,
} from "lucide-react";
import { cn } from "../lib/utils";

interface ResultPreviewProps {
  originalImage: CloudinaryImage | null;
  selectedImage: CloudinaryImage | null;
  selectedPreset: HeadshotPreset | null;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  activeFilter: PortraitFilter;
  onFilterChange: (filter: PortraitFilter) => void;
  activeWardrobe?: WardrobeId;
  microTuning: MicroTuningSettings;
  onMicroTuningChange: (settings: MicroTuningSettings) => void;
  onAddToGallery?: (
    item: Omit<GeneratedHeadshotItem, "id" | "timestamp">,
  ) => void;
}

export default function ResultPreview({
  originalImage,
  selectedImage,
  selectedPreset,
  aspectRatio,
  onAspectRatioChange,
  activeFilter,
  onFilterChange,
  activeWardrobe = "original",
  microTuning,
  onMicroTuningChange,
  onAddToGallery,
}: ResultPreviewProps) {
  const [viewMode, setViewMode] = useState<"slider" | "side" | "linkedin">("slider");
  const [readyUrls, setReadyUrls] = useState<Set<string>>(() => new Set());

  if (!selectedImage || !selectedPreset || !originalImage) return null;

  const currentUrl = selectedImage.toURL();
  const isReady = readyUrls.has(currentUrl);
  const wardrobeLabel = getWardrobeById(activeWardrobe)?.label || "Original";
  const cssFilter = getMicroTuningCssFilter(microTuning);
  const vignetteStyle = getVignetteOverlayStyle(microTuning);

  const handleReady = () => {
    setReadyUrls((prev) => new Set(prev).add(currentUrl));
    if (onAddToGallery && selectedPreset) {
      onAddToGallery({
        presetId: selectedPreset.id,
        presetName: selectedPreset.name,
        aspectRatio,
        filter: activeFilter,
        wardrobe: activeWardrobe,
        url: currentUrl,
      });
    }
  };

  return (
    <section id="result-preview" className="px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-2 text-center text-2xl font-semibold">
          Your AI Generated Headshot
        </h2>
        <p className="mb-6 text-center text-white/60">
          Style: <span className="font-medium text-indigo-300">{selectedPreset.name}</span>
          {activeWardrobe !== "original" && (
            <>
              {" "}· Attire: <span className="font-medium text-indigo-300">{wardrobeLabel}</span>
            </>
          )}
          {" "}— {selectedPreset.description}
        </p>

        {/* CONTROLS: ASPECT RATIO & RETOUCH FILTER */}
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* Aspect Ratio Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-white/50 mr-1">Aspect Ratio:</span>
            <button
              type="button"
              onClick={() => onAspectRatioChange("4:5")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
                aspectRatio === "4:5"
                  ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <RectangleVertical className="h-3.5 w-3.5" />
              4:5 Portrait (Resume / Web)
            </button>
            <button
              type="button"
              onClick={() => onAspectRatioChange("1:1")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
                aspectRatio === "1:1"
                  ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Square className="h-3.5 w-3.5" />
              1:1 Square (Avatar / Social)
            </button>
          </div>

          {/* Retouch Filter Bar */}
          <PortraitFilterBar
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />

          {/* Micro-Tuning & Polish Panel */}
          <MicroTuningPanel
            settings={microTuning}
            onChange={onMicroTuningChange}
            className="mt-2"
          />
        </div>

        {/* VIEW MODE SWITCHER (Visible when generation is ready) */}
        {isReady && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
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
            <button
              type="button"
              onClick={() => setViewMode("linkedin")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition cursor-pointer border",
                viewMode === "linkedin"
                  ? "border-[#0a66c2] bg-[#0a66c2] text-white shadow-md shadow-blue-600/30"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <span className="font-bold text-[#70b5f9] text-[11px] leading-none">in</span>
              LinkedIn Profile Mockup
            </button>
          </div>
        )}

        {/* RENDER CURRENT VIEW MODE */}
        {isReady && viewMode === "linkedin" ? (
          <div className="glass-card p-6 flex flex-col items-center">
            <LinkedInSimulator
              headshotUrl={currentUrl}
              headshotStyle={{ filter: cssFilter }}
            />
          </div>
        ) : isReady && viewMode === "slider" ? (
          <div className="glass-card p-6 flex flex-col items-center">
            <BeforeAfterSlider
              beforeImageUrl={originalImage.toURL()}
              afterImageUrl={currentUrl}
              beforeAlt="Original selfie"
              afterAlt={selectedPreset.name}
              className={aspectRatio === "1:1" ? "aspect-square" : "aspect-[4/5]"}
              afterStyle={{ filter: cssFilter }}
              afterOverlay={<div style={vignetteStyle} />}
            />
          </div>
        ) : (
          /* Side by Side Mode OR during initial generation */
          <div className="glass-card grid gap-6 p-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-medium text-white/50">Before (Original)</p>
              <div
                className={cn(
                  "overflow-hidden rounded-xl bg-black/30",
                  aspectRatio === "1:1" ? "aspect-square" : "aspect-[4/5]",
                )}
              >
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
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl bg-black/30 shadow-lg shadow-indigo-500/20",
                  aspectRatio === "1:1" ? "aspect-square" : "aspect-[4/5]",
                )}
              >
                <AsyncHeadshotImage
                  key={`${selectedPreset.id}-${currentUrl}-${aspectRatio}-${activeFilter}-${activeWardrobe}`}
                  imageUrl={currentUrl}
                  alt={selectedPreset.name}
                  onReady={handleReady}
                  className="h-full w-full object-cover rounded-xl"
                  style={{ filter: cssFilter }}
                />
                <div style={vignetteStyle} />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
