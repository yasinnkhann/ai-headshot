import type { WardrobeId } from "../types";
import { WARDROBE_OPTIONS } from "../lib/transformations";
import {
  Award,
  Briefcase,
  Check,
  Shirt,
  Sparkles,
  Stethoscope,
  SunMedium,
  User,
} from "lucide-react";
import { cn } from "../lib/utils";

interface WardrobeStudioProps {
  activeWardrobe: WardrobeId;
  onWardrobeChange: (wardrobe: WardrobeId) => void;
  className?: string;
}

const WARDROBE_ICONS: Record<WardrobeId, typeof Shirt> = {
  original: User,
  "charcoal-blazer": Briefcase,
  "navy-suit": Award,
  "black-turtleneck": Sparkles,
  "linen-shirt": SunMedium,
  "white-coat": Stethoscope,
};

export function WardrobeStudio({
  activeWardrobe,
  onWardrobeChange,
  className = "",
}: WardrobeStudioProps) {
  return (
    <section id="wardrobe-studio" className={cn("px-4 py-8", className)}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300 mb-2">
            <Shirt className="h-3.5 w-3.5" />
            AI Wardrobe & Outfit Studio
          </div>
          <h2 className="text-2xl font-semibold text-white">
            Choose Your Professional Attire
          </h2>
          <p className="mt-1 text-sm text-white/60 max-w-xl">
            Swap what you're wearing while keeping your face, lighting, and chosen background setting perfectly intact.
          </p>
        </div>

        {/* WARDROBE CARDS GRID */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {WARDROBE_OPTIONS.map((item) => {
            const Icon = WARDROBE_ICONS[item.id] || Shirt;
            const isActive = activeWardrobe === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onWardrobeChange(item.id)}
                className={cn(
                  "group relative flex flex-col items-start justify-between rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer",
                  isActive
                    ? "border-indigo-500 bg-indigo-600/15 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]",
                )}
              >
                {/* ACTIVE BADGE */}
                {isActive && (
                  <div className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                )}

                <div className="w-full">
                  <div
                    className={cn(
                      "mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "bg-white/10 text-white/70 group-hover:bg-white/15 group-hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">
                    {item.category}
                  </span>

                  <h4 className="text-xs font-semibold text-white truncate w-full">
                    {item.label}
                  </h4>
                </div>

                <p className="mt-2 text-[11px] leading-snug text-white/50 line-clamp-2">
                  {item.tagline}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
