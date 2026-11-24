import type { PortraitFilter } from "../types";
import { Contrast, SlidersHorizontal, Sun, Wand2 } from "lucide-react";
import { cn } from "../lib/utils";

interface PortraitFilterBarProps {
  activeFilter: PortraitFilter;
  onFilterChange: (filter: PortraitFilter) => void;
  className?: string;
}

const FILTERS: {
  id: PortraitFilter;
  label: string;
  icon: typeof SlidersHorizontal;
  description: string;
}[] = [
  {
    id: "none",
    label: "Natural",
    icon: SlidersHorizontal,
    description: "Standard vibrant portrait lighting",
  },
  {
    id: "enhance",
    label: "AI Auto-Enhance",
    icon: Wand2,
    description: "Optimizes facial exposure & eye clarity",
  },
  {
    id: "bw",
    label: "Executive B&W",
    icon: Contrast,
    description: "Timeless monochrome portrait",
  },
  {
    id: "warm",
    label: "Warm Studio",
    icon: Sun,
    description: "Golden warm portrait tones",
  },
];

export function PortraitFilterBar({
  activeFilter,
  onFilterChange,
  className = "",
}: PortraitFilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2",
        className,
      )}
    >
      <span className="text-xs font-medium text-white/50 mr-1">
        Retouch Filter:
      </span>
      {FILTERS.map((f) => {
        const Icon = f.icon;
        const isActive = activeFilter === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            title={f.description}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
              isActive
                ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
