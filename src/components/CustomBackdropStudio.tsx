import { useState } from "react";
import { Sparkles, Wand2, X, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface CustomBackdropStudioProps {
  onGenerate: (prompt: string) => void;
  isActive: boolean;
  activePrompt?: string;
}

const INSPIRATION_CHIPS = [
  {
    label: "☕ Cozy Cafe",
    prompt: "minimalist coffee shop with warm ambient lighting and soft bokeh",
  },
  {
    label: "🏙️ Sunset Rooftop",
    prompt: "modern rooftop terrace overlooking city skyline at dusk with warm golden hour bokeh",
  },
  {
    label: "🌿 Architectural Loft",
    prompt: "modern architectural loft with concrete walls, lush indoor plants and natural window light",
  },
  {
    label: "📚 Oak Library",
    prompt: "historic library with dark oak bookshelves, leather books and warm lamp lighting bokeh",
  },
  {
    label: "🎨 Moody Studio",
    prompt: "dark charcoal minimalist photo studio with dramatic rim lighting and subtle vignette",
  },
  {
    label: "🏖️ Coastal Sunset",
    prompt: "mediterranean coastal terrace overlooking ocean at golden hour with soft sunset bokeh",
  },
];

export function CustomBackdropStudio({
  onGenerate,
  isActive,
  activePrompt,
}: CustomBackdropStudioProps) {
  const [prompt, setPrompt] = useState(activePrompt || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onGenerate(prompt.trim());
  };

  const handleSelectChip = (chipPrompt: string) => {
    setPrompt(chipPrompt);
    onGenerate(chipPrompt);
  };

  return (
    <div
      className={cn(
        "glass-card relative overflow-hidden rounded-2xl p-6 sm:p-8 transition-all duration-300 border",
        isActive
          ? "border-indigo-500 bg-indigo-500/10 shadow-xl shadow-indigo-500/15 ring-1 ring-indigo-500"
          : "border-white/10 hover:border-white/20 bg-white/5",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
            <Wand2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Custom Backdrop Studio
              {isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-sm">
                  <Check className="h-3 w-3" />
                  Active
                </span>
              )}
            </h3>
            <p className="text-xs text-white/60">
              Type your own background description or pick an inspiration setting
            </p>
          </div>
        </div>
      </div>

      {/* INSPIRATION CHIPS */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-medium text-white/50">Quick Inspiration Settings:</p>
        <div className="flex flex-wrap gap-2">
          {INSPIRATION_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleSelectChip(chip.prompt)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
                prompt === chip.prompt && isActive
                  ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20 hover:text-white",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* CUSTOM PROMPT INPUT FORM */}
      <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Modern penthouse with floor-to-ceiling glass windows and dusk lighting..."
            className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-10"
          />
          {prompt && (
            <button
              type="button"
              onClick={() => setPrompt("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!prompt.trim()}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition cursor-pointer shrink-0 shadow-lg",
            prompt.trim()
              ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25"
              : "bg-white/10 text-white/40 cursor-not-allowed opacity-60",
          )}
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          Generate Custom
        </button>
      </form>
    </div>
  );
}
