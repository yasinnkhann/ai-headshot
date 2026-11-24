import type { CloudinaryImage } from "@cloudinary/url-gen/assets/CloudinaryImage";
import type { HeadshotPreset } from "../types";
import { AdvancedImage, lazyload, placeholder } from "@cloudinary/react";
import { cn } from "../lib/utils";
import { Check, Sparkles, Building2, Trees, Landmark, UserCheck } from "lucide-react";

interface PresetImage {
  preset: HeadshotPreset;
  image: CloudinaryImage;
}

interface TransformationGridProps {
  title: string;
  presets: PresetImage[];
  originalImage: CloudinaryImage | null;
  selectedPresetId: string | null;
  onSelect: (id: string) => void;
}

const PRESET_ICONS: Record<string, typeof Sparkles> = {
  "corporate-executive": Building2,
  "outdoor-professional": Trees,
  "urban-business": Landmark,
  "executive-suit": UserCheck,
};

function PresetCard({
  preset,
  previewImage,
  isSelected,
  onSelect,
}: {
  preset: HeadshotPreset;
  previewImage: CloudinaryImage | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = PRESET_ICONS[preset.id] ?? Sparkles;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "glass-card group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer",
        isSelected
          ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500"
          : "border-white/10 hover:border-white/20 hover:bg-white/5",
      )}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black/40">
        {previewImage ? (
          <AdvancedImage
            cldImg={previewImage}
            plugins={[placeholder({ mode: "blur" }), lazyload()]}
            alt={preset.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/30">
            <Icon className="h-12 w-12 text-white/30" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10">
          <Icon className="h-3.5 w-3.5 text-indigo-400" />
          <span>{preset.name}</span>
        </div>

        {isSelected && (
          <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 shadow-md">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}

        <div className="absolute bottom-3 inset-x-3 text-left">
          <p className="text-xs text-white/80 line-clamp-2">{preset.description}</p>
        </div>
      </div>

      <div className="p-4 text-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={cn(
            "w-full rounded-xl py-2.5 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5",
            isSelected
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-white/10 text-white/80 hover:bg-white/20",
          )}
        >
          {isSelected ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Active Style
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Generate This Style
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function TransformationGrid({
  title,
  presets,
  originalImage,
  onSelect,
  selectedPresetId,
}: TransformationGridProps) {
  if (presets.length === 0) return null;

  return (
    <section id="styles-grid" className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-2 text-center text-2xl font-semibold">{title}</h2>
        <p className="mb-8 text-center text-sm text-white/60">
          Select a style below to generate your professional AI headshot
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {presets.map(({ preset }) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              previewImage={originalImage}
              isSelected={selectedPresetId === preset.id}
              onSelect={() => {
                onSelect(preset.id);
                setTimeout(() => {
                  document.getElementById("result-preview")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
