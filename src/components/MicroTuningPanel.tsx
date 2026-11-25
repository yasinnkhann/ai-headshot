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
  className?: string;
}

export function MicroTuningPanel({
  settings,
  onChange,
  className = "",
}: MicroTuningPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div
      className={cn(
        "glass-card w-full max-w-2xl border border-white/10 bg-white/[0.03] transition-all",
        className,
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 sm:px-6">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2.5 text-left text-sm font-semibold text-white/90 hover:text-white transition cursor-pointer"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Wand2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span>Portrait Micro-Tuning & Polish</span>
              {isModified && (
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] font-normal text-white/50">
              Skin polish, lighting warmth, eye catchlights, and focus vignette
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Quick Preset Buttons (Always Visible or Collapsible) */}
      <div className="border-t border-white/5 px-4 py-2.5 sm:px-6 flex flex-wrap items-center gap-1.5 bg-black/10">
        <span className="text-[11px] font-medium text-white/40 mr-1">
          Quick Looks:
        </span>
        {MICRO_TUNING_PRESETS.map((p) => {
          const isActive =
            settings.skinSoftening === p.settings.skinSoftening &&
            settings.warmth === p.settings.warmth &&
            settings.exposure === p.settings.exposure &&
            settings.contrast === p.settings.contrast &&
            settings.vignette === p.settings.vignette &&
            settings.eyeClarity === p.settings.eyeClarity;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.settings)}
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

      {/* Expanded Detailed Sliders */}
      {isOpen && (
        <div className="border-t border-white/5 p-4 sm:p-6 space-y-5 bg-black/20">
          {/* Slider 1: Skin Softening */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                Skin Softening & Polish
              </span>
              <span className="text-white/50">{settings.skinSoftening}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.skinSoftening}
              onChange={(e) =>
                updateSetting("skinSoftening", Number(e.target.value))
              }
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>Natural texture</span>
              <span>Smooth studio polish</span>
            </div>
          </div>

          {/* Slider 2: Lighting Warmth */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                Lighting Warmth & Temperature
              </span>
              <span className="text-white/50">
                {settings.warmth > 0 ? `+${settings.warmth}` : settings.warmth}
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              step="5"
              value={settings.warmth}
              onChange={(e) => updateSetting("warmth", Number(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>Cool daylight (-50)</span>
              <span>Neutral (0)</span>
              <span>Golden amber (+50)</span>
            </div>
          </div>

          {/* Slider 3: Exposure & Fill Light */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" />
                Exposure & Facial Lighting
              </span>
              <span className="text-white/50">
                {settings.exposure > 0
                  ? `+${settings.exposure}`
                  : settings.exposure}
              </span>
            </div>
            <input
              type="range"
              min="-25"
              max="25"
              step="2"
              value={settings.exposure}
              onChange={(e) =>
                updateSetting("exposure", Number(e.target.value))
              }
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>Subtle shadow (-25)</span>
              <span>Even key light (+25)</span>
            </div>
          </div>

          {/* Slider 4: Eye Catchlights & Contrast */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                Eye Catchlight & Contrast
              </span>
              <span className="text-white/50">{settings.eyeClarity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.eyeClarity}
              onChange={(e) =>
                updateSetting("eyeClarity", Number(e.target.value))
              }
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>Standard contrast</span>
              <span>Vivid eye crispness</span>
            </div>
          </div>

          {/* Slider 5: Focus Vignette */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <Focus className="h-3.5 w-3.5 text-purple-400" />
                Subject Focus Vignette
              </span>
              <span className="text-white/50">{settings.vignette}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.vignette}
              onChange={(e) =>
                updateSetting("vignette", Number(e.target.value))
              }
              className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>Even brightness (0%)</span>
              <span>Dramatic edge falloff (100%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
