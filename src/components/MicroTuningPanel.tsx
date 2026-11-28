import { useState } from "react";
import type { MicroTuningSettings } from "../types";
import { DEFAULT_MICRO_TUNING } from "../types";
import {
  MICRO_TUNING_PRESETS,
  hasActiveMicroTuning,
} from "../lib/micro-tuning";
import {
  ChevronDown,
  ChevronUp,
  Droplets,
  Eye,
  Focus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Wand2,
} from "lucide-react";
import { cn } from "../lib/utils";

interface MicroTuningPanelProps {
  settings: MicroTuningSettings;
  onChange: (settings: MicroTuningSettings) => void;
  defaultOpen?: boolean;
  collapsible?: boolean;
  className?: string;
}

export function MicroTuningPanel({
  settings,
  onChange,
  defaultOpen = false,
  collapsible = true,
  className = "",
}: MicroTuningPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || !collapsible);
  const isModified = hasActiveMicroTuning(settings);

  const updateSetting = <K extends keyof MicroTuningSettings>(
    key: K,
    value: MicroTuningSettings[K],
  ) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_MICRO_TUNING });
  };

  const handleSelectPreset = (presetSettings: MicroTuningSettings) => {
    onChange({ ...presetSettings });
  };

  const showSliders = !collapsible || isOpen;

  return (
    <div
      className={cn(
        "glass-card w-full border border-white/10 bg-white/[0.03] transition-all overflow-hidden",
        className,
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={() => collapsible && setIsOpen((prev) => !prev)}
          className={cn(
            "flex items-center gap-2.5 text-left text-sm font-semibold text-white/90 transition",
            collapsible && "hover:text-white cursor-pointer",
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Wand2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span>Live 60fps Light & Color</span>
              {isModified && (
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] font-normal text-white/50">
              Instant browser grading · $0 unlimited
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          {isModified && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-white/60 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}

          {collapsible && (
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition cursor-pointer"
              aria-label={isOpen ? "Collapse panel" : "Expand panel"}
            >
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quick Looks Row */}
      <div className="border-t border-white/5 px-4 py-2.5 flex flex-wrap items-center gap-1.5 bg-black/15">
        {MICRO_TUNING_PRESETS.map((p) => {
          const isActive =
            settings.skinSoftening === p.settings.skinSoftening &&
            settings.warmth === p.settings.warmth &&
            settings.exposure === p.settings.exposure &&
            settings.contrast === p.settings.contrast &&
            settings.saturation === p.settings.saturation &&
            settings.vignette === p.settings.vignette &&
            settings.eyeClarity === p.settings.eyeClarity;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.settings)}
              title={p.description}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition cursor-pointer border",
                isActive
                  ? "border-indigo-500 bg-indigo-600/30 text-indigo-300"
                  : "border-white/5 bg-white/[0.03] text-white/60 hover:bg-white/10 hover:text-white",
              )}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Detailed Sliders */}
      {showSliders && (
        <div className="border-t border-white/5 p-4 space-y-4 bg-black/20">
          {/* Exposure */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" />
                Exposure
              </span>
              <span className="text-white/50 tabular-nums">
                {settings.exposure > 0 ? `+${settings.exposure}` : settings.exposure}
              </span>
            </div>
            <input
              type="range"
              min="-25"
              max="25"
              step="1"
              value={settings.exposure}
              onChange={(e) => updateSetting("exposure", Number(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Warmth */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                Color Temperature
              </span>
              <span className="text-white/50 tabular-nums">
                {settings.warmth > 0 ? `+${settings.warmth}` : settings.warmth}
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              step="2"
              value={settings.warmth}
              onChange={(e) => updateSetting("warmth", Number(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <Droplets className="h-3.5 w-3.5 text-pink-400" />
                Saturation
              </span>
              <span className="text-white/50 tabular-nums">
                {settings.saturation > 0
                  ? `+${settings.saturation}%`
                  : `${settings.saturation}%`}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="50"
              step="5"
              value={settings.saturation}
              onChange={(e) => updateSetting("saturation", Number(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-pink-500 cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                Contrast & Depth
              </span>
              <span className="text-white/50 tabular-nums">
                {settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="30"
              step="2"
              value={settings.contrast}
              onChange={(e) => updateSetting("contrast", Number(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Clarity / Catchlight */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                Detail & Eye Clarity
              </span>
              <span className="text-white/50 tabular-nums">{settings.eyeClarity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.eyeClarity}
              onChange={(e) => updateSetting("eyeClarity", Number(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Focus Vignette */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <Focus className="h-3.5 w-3.5 text-purple-400" />
                Focus Vignette
              </span>
              <span className="text-white/50 tabular-nums">{settings.vignette}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.vignette}
              onChange={(e) => updateSetting("vignette", Number(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-purple-500 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
