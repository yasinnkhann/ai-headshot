import { useState } from "react";
import type {
  AspectRatio,
  EditEngine,
  EditHistoryItem,
  LocalAiHealth,
  LocalEditJobStatus,
  LocalModelId,
  MicroTuningSettings,
  PhotoLayer,
  PhotoLayerInput,
  PortraitFilter,
  PresetCategory,
  StudioPreset,
} from "../types";
import { AsyncHeadshotImage } from "./AsyncHeadshotImage";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { LinkedInSimulator } from "./LinkedInSimulator";
import { MicroTuningPanel } from "./MicroTuningPanel";
import { PortraitFilterBar } from "./PortraitFilterBar";
import { StudioExportPanel } from "./StudioExportPanel";
import { CURATED_STUDIO_PRESETS, isCreativeScenePrompt } from "../lib/studio-engine";
import {
  getMicroTuningCssFilter,
  getVignetteOverlayStyle,
} from "../lib/micro-tuning";
import { cn } from "../lib/utils";
import {
  AlertCircle,
  Check,
  ChevronsLeftRight,
  Clock,
  Columns2,
  Copy,
  Cpu,
  Download,
  Eraser,
  Expand,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  Layers,
  Loader2,
  Palette,
  RefreshCw,
  Replace,
  RotateCcw,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";

type CloudToolMode =
  | "smart"
  | "replace"
  | "remove"
  | "recolor"
  | "backdrop"
  | "expand"
  | "fixes";

type InspectorTab = "layers" | "color" | "export";

interface PhotoStudioProps {
  // Source & URLs
  publicId: string | null;
  originalPreviewUrl: string | null;
  activeResultUrl: string | null;
  cloudResultUrl: string | null;
  localResultUrl: string | null;
  hasCloudEdits: boolean;

  // Engine & Local Mac AI
  engine: EditEngine;
  onEngineChange: (engine: EditEngine) => void;
  localHealth: LocalAiHealth | null;
  onRefreshLocalHealth: () => Promise<LocalAiHealth | null>;
  localModel: LocalModelId;
  onLocalModelChange: (model: LocalModelId) => void;
  localResolution: number;
  onLocalResolutionChange: (res: number) => void;
  localAutoMask: string;
  onLocalAutoMaskChange: (mask: string) => void;
  localEnhancePrompt: boolean;
  onLocalEnhancePromptChange: (v: boolean) => void;
  localVerify: boolean;
  onLocalVerifyChange: (v: boolean) => void;
  localJob: LocalEditJobStatus | null;
  localLastPrompt: string;
  chainLocalEdits: boolean;
  onChainLocalEditsChange: (v: boolean) => void;
  onRunLocalPrompt: (prompt: string) => void;
  onCancelLocalJob: () => void;

  // Cloud layers & presets
  layers: PhotoLayer[];
  estimatedCredits: number;
  onAddLayer: (layer: PhotoLayerInput) => void;
  onToggleLayer: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onClearLayers: () => void;
  onApplySmartCloudPrompt: (prompt: string) => Promise<void>;
  onApplyPreset: (preset: StudioPreset) => void;

  // Styling
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  activeFilter: PortraitFilter;
  onFilterChange: (filter: PortraitFilter) => void;
  microTuning: MicroTuningSettings;
  onMicroTuningChange: (settings: MicroTuningSettings) => void;

  // History
  history: EditHistoryItem[];
  onAddToHistory: (item: Omit<EditHistoryItem, "id" | "timestamp">) => void;
  onRestoreHistory: (item: EditHistoryItem) => void;
  onRemoveHistory: (id: string) => void;
}

const QUICK_COLOR_SWATCHES = [
  { name: "Crimson", value: "crimson", hex: "#dc2626" },
  { name: "Navy", value: "navy", hex: "#1e3a8a" },
  { name: "Emerald", value: "emerald", hex: "#059669" },
  { name: "Charcoal", value: "charcoal", hex: "#27272a" },
  { name: "Gold", value: "gold", hex: "#d97706" },
  { name: "Ivory", value: "ivory", hex: "#f5f5f4" },
  { name: "Cobalt", value: "blue", hex: "#2563eb" },
  { name: "Plum", value: "purple", hex: "#7e22ce" },
];

const LOCAL_PROMPT_IDEAS = [
  "Make it look like a crisp 35mm Leica portrait at golden hour, keep exact face",
  "Turn my outfit into a tailored dark charcoal blazer and crisp white shirt",
  "Change the scene to a rainy Tokyo alley at night with cinematic neon reflections",
  "Remove everyone in the background and make the lighting soft editorial studio",
  "Transform into a warm minimalist Scandinavian interior design photo",
];

export function PhotoStudio({
  publicId,
  originalPreviewUrl,
  activeResultUrl,
  cloudResultUrl,
  localResultUrl,
  hasCloudEdits,
  engine,
  onEngineChange,
  localHealth,
  onRefreshLocalHealth,
  localModel,
  onLocalModelChange,
  localResolution,
  onLocalResolutionChange,
  localAutoMask,
  onLocalAutoMaskChange,
  localEnhancePrompt,
  onLocalEnhancePromptChange,
  localVerify,
  onLocalVerifyChange,
  localJob,
  localLastPrompt,
  chainLocalEdits,
  onChainLocalEditsChange,
  onRunLocalPrompt,
  onCancelLocalJob,
  layers,
  estimatedCredits,
  onAddLayer,
  onToggleLayer,
  onRemoveLayer,
  onClearLayers,
  onApplySmartCloudPrompt,
  onApplyPreset,
  aspectRatio,
  onAspectRatioChange,
  activeFilter,
  onFilterChange,
  microTuning,
  onMicroTuningChange,
  history,
  onAddToHistory,
  onRestoreHistory,
  onRemoveHistory,
}: PhotoStudioProps) {
  const [viewMode, setViewMode] = useState<
    "slider" | "result" | "side" | "linkedin"
  >("slider");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("layers");
  const [presetCategory, setPresetCategory] = useState<"all" | PresetCategory>(
    "all",
  );
  const [readyCloudUrls, setReadyCloudUrls] = useState<Set<string>>(
    () => new Set(),
  );

  // Prompt bar states
  const [localPrompt, setLocalPrompt] = useState("");
  const [cloudTool, setCloudTool] = useState<CloudToolMode>("smart");
  const [smartPrompt, setSmartPrompt] = useState("");
  const [parsingSmart, setParsingSmart] = useState(false);
  const [replaceFrom, setReplaceFrom] = useState("");
  const [replaceTo, setReplaceTo] = useState("");
  const [removeTarget, setRemoveTarget] = useState("");
  const [recolorTarget, setRecolorTarget] = useState("");
  const [recolorColor, setRecolorColor] = useState("crimson");
  const [backdropPrompt, setBackdropPrompt] = useState("");
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [checkingServer, setCheckingServer] = useState(false);

  const localConnected = Boolean(localHealth?.ok && localHealth.mfluxInstalled);
  const isLocalGenerating =
    localJob?.status === "queued" || localJob?.status === "running";

  const cssFilter = getMicroTuningCssFilter(microTuning);
  const vignetteStyle = getVignetteOverlayStyle(microTuning);

  // Determine whether the active image is immediately ready to display in Slider/LinkedIn
  const isCloudUrlReady =
    !hasCloudEdits ||
    !cloudResultUrl ||
    cloudResultUrl === originalPreviewUrl ||
    readyCloudUrls.has(cloudResultUrl);

  const isResultReady =
    engine === "local" ? !isLocalGenerating : isCloudUrlReady;

  const handleCloudReady = () => {
    if (!cloudResultUrl) return;
    setReadyCloudUrls((prev) => new Set(prev).add(cloudResultUrl));
    if (hasCloudEdits) {
      const enabledLabels = layers
        .filter((l) => l.enabled)
        .map((l) => l.label);
      onAddToHistory({
        label: enabledLabels[enabledLabels.length - 1] || "Cloud Edit",
        engine: "cloud",
        url: cloudResultUrl,
        aspectRatio,
        filter: activeFilter,
        layers: layers.map((l) => ({ ...l })),
      });
    }
  };

  const handleSmartCloudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartPrompt.trim()) return;
    setParsingSmart(true);
    try {
      await onApplySmartCloudPrompt(smartPrompt.trim());
      setSmartPrompt("");
    } finally {
      setParsingSmart(false);
    }
  };

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPrompt.trim() || isLocalGenerating) return;
    onRunLocalPrompt(localPrompt.trim());
  };

  const handleCopyLocalCmd = async () => {
    await navigator.clipboard.writeText("npm run local-ai");
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleRecheckServer = async () => {
    setCheckingServer(true);
    await onRefreshLocalHealth();
    setCheckingServer(false);
  };

  const filteredPresets =
    presetCategory === "all"
      ? CURATED_STUDIO_PRESETS
      : CURATED_STUDIO_PRESETS.filter((p) => p.category === presetCategory);

  const aspectClass =
    aspectRatio === "1:1"
      ? "aspect-square"
      : aspectRatio === "16:9"
        ? "aspect-video"
        : aspectRatio === "9:16"
          ? "aspect-[9/16] max-h-[620px]"
          : aspectRatio === "3:2"
            ? "aspect-[3/2]"
            : aspectRatio === "4:5"
              ? "aspect-[4/5]"
              : "aspect-[4/3] sm:aspect-[4/3]";

  const hasTransparentCutout =
    engine === "cloud" && layers.some((l) => l.enabled && l.type === "cutout");

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 pb-16">
      {/* TOP STUDIO TOOLBAR */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* ENGINE SWITCHER */}
        <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1 self-start">
          <button
            type="button"
            onClick={() => onEngineChange("local")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer",
              engine === "local"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                : "text-white/70 hover:text-white hover:bg-white/5",
            )}
          >
            <InfinityIcon className="h-3.5 w-3.5" />
            <span>Local Mac AI (Unlimited)</span>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                localConnected
                  ? "bg-emerald-300 animate-pulse"
                  : "bg-amber-400/80",
              )}
              title={
                localConnected
                  ? "Connected to local Apple Silicon mflux server"
                  : "Local server not running"
              }
            />
          </button>

          <button
            type="button"
            onClick={() => onEngineChange("cloud")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer",
              engine === "cloud"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-white/70 hover:text-white hover:bg-white/5",
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Cloud Photoshop</span>
            {layers.filter((l) => l.enabled).length > 0 && (
              <span className="rounded-full bg-black/30 px-1.5 py-0.5 text-[10px]">
                {layers.filter((l) => l.enabled).length}
              </span>
            )}
          </button>
        </div>

        {/* VIEW MODE SWITCHER */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("slider")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
              viewMode === "slider"
                ? "border-indigo-500 bg-indigo-600/30 text-indigo-200"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white",
            )}
          >
            <ChevronsLeftRight className="h-3.5 w-3.5" />
            Split Slider
          </button>
          <button
            type="button"
            onClick={() => setViewMode("result")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
              viewMode === "result"
                ? "border-indigo-500 bg-indigo-600/30 text-indigo-200"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white",
            )}
          >
            <Square className="h-3.5 w-3.5" />
            Result
          </button>
          <button
            type="button"
            onClick={() => setViewMode("side")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
              viewMode === "side"
                ? "border-indigo-500 bg-indigo-600/30 text-indigo-200"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white",
            )}
          >
            <Columns2 className="h-3.5 w-3.5" />
            Side by Side
          </button>
          <button
            type="button"
            onClick={() => setViewMode("linkedin")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
              viewMode === "linkedin"
                ? "border-[#0a66c2] bg-[#0a66c2] text-white"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white",
            )}
          >
            <span className="font-bold text-[#70b5f9] text-[11px] leading-none">
              in
            </span>
            Profile Mockup
          </button>
        </div>
      </div>

      {/* MAIN 2-PANE STUDIO GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT/CENTER CANVAS + COMMAND BAR (8 COLS) */}
        <div className="lg:col-span-8 space-y-5">
          {/* LIVE CANVAS VIEWPORT */}
          <div className="glass-card relative overflow-hidden border border-white/10 p-4 sm:p-5">
            {/* Local AI Live Processing Overlay */}
            {engine === "local" && isLocalGenerating && localJob && (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl bg-black/50 p-6 text-center border border-emerald-500/25">
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                  <Cpu className="absolute -bottom-1 -right-1 h-5 w-5 text-indigo-300" />
                </div>

                <h3 className="text-base font-semibold text-white">
                  Editing Locally on Your Apple Silicon GPU
                </h3>
                <p className="mt-1.5 max-w-md text-xs text-emerald-300/90">
                  {localJob.stage || "Processing with MLX..."}
                </p>

                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 border border-white/10">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{localJob.elapsed}s elapsed · $0 unlimited</span>
                </div>

                {localJob.logs.length > 0 && (
                  <div className="mt-4 w-full max-w-lg rounded-lg bg-black/70 p-3 text-left font-mono text-[10px] text-white/60 border border-white/10 max-h-28 overflow-y-auto">
                    {localJob.logs.slice(-5).map((line, i) => (
                      <div key={i} className="truncate">
                        {line}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={onCancelLocalJob}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel Edit
                </button>
              </div>
            )}

            {/* Local AI Error Banner */}
            {engine === "local" && localJob?.status === "error" && (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-200">Local AI Edit Error</p>
                    <p className="mt-0.5 text-red-200/80 break-words">
                      {localJob.error}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onEngineChange("cloud")}
                  className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20 cursor-pointer"
                >
                  Use Cloud
                </button>
              </div>
            )}

            {/* Active Image Canvas */}
            {!(engine === "local" && isLocalGenerating) &&
              originalPreviewUrl &&
              activeResultUrl && (
                <>
                  {!isResultReady && engine === "cloud" && cloudResultUrl ? (
                    /* Cloud async polling view */
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-medium text-white/50">
                          Original
                        </p>
                        <div
                          className={cn(
                            "overflow-hidden rounded-xl bg-black/40 border border-white/10",
                            aspectClass,
                          )}
                        >
                          <img
                            src={originalPreviewUrl}
                            alt="Original photo"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-indigo-400">
                          Rendering AI Layers...
                        </p>
                        <div
                          className={cn(
                            "relative overflow-hidden rounded-xl bg-black/40 border border-indigo-500/20",
                            aspectClass,
                          )}
                        >
                          <AsyncHeadshotImage
                            key={cloudResultUrl}
                            imageUrl={cloudResultUrl}
                            alt="Edited result"
                            onReady={handleCloudReady}
                            onClearLayers={onClearLayers}
                            onSwitchToLocal={() => onEngineChange("local")}
                            layerCount={layers.filter((l) => l.enabled).length}
                            className="h-full w-full object-contain rounded-xl"
                            style={{ filter: cssFilter }}
                          />
                          <div style={vignetteStyle} />
                        </div>
                      </div>
                    </div>
                  ) : viewMode === "linkedin" ? (
                    <div className="flex flex-col items-center py-2">
                      <LinkedInSimulator
                        headshotUrl={activeResultUrl}
                        headshotStyle={{ filter: cssFilter }}
                      />
                    </div>
                  ) : viewMode === "result" ? (
                    <div
                      className={cn(
                        "relative mx-auto max-w-2xl overflow-hidden rounded-xl border border-white/10",
                        hasTransparentCutout
                          ? "bg-[repeating-conic-gradient(#1f2937_0%_25%,#111827_0%_50%)] bg-[length:20px_20px]"
                          : "bg-black/40",
                      )}
                    >
                      <img
                        src={activeResultUrl}
                        alt="Edited result"
                        className="mx-auto max-h-[600px] w-full object-contain"
                        style={{ filter: cssFilter }}
                      />
                      <div style={vignetteStyle} />
                    </div>
                  ) : viewMode === "side" ? (
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-medium text-white/50">
                          Before (Original)
                        </p>
                        <div className="overflow-hidden rounded-xl bg-black/40 border border-white/10">
                          <img
                            src={originalPreviewUrl}
                            alt="Original"
                            className="max-h-[520px] w-full object-contain"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-indigo-400">
                          After ({engine === "local" ? "Local MLX AI" : "Cloud AI"})
                        </p>
                        <div
                          className={cn(
                            "relative overflow-hidden rounded-xl border border-indigo-500/25",
                            hasTransparentCutout
                              ? "bg-[repeating-conic-gradient(#1f2937_0%_25%,#111827_0%_50%)] bg-[length:20px_20px]"
                              : "bg-black/40",
                          )}
                        >
                          <img
                            src={activeResultUrl}
                            alt="Edited"
                            className="max-h-[520px] w-full object-contain"
                            style={{ filter: cssFilter }}
                          />
                          <div style={vignetteStyle} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Interactive Split Slider */
                    <div className="flex flex-col items-center">
                      <BeforeAfterSlider
                        beforeImageUrl={originalPreviewUrl}
                        afterImageUrl={activeResultUrl}
                        beforeAlt="Original photo"
                        afterAlt="AI edited photo"
                        className={cn("max-w-xl", aspectClass)}
                        afterStyle={{ filter: cssFilter }}
                        afterOverlay={<div style={vignetteStyle} />}
                      />
                      {activeResultUrl === originalPreviewUrl && (
                        <p className="mt-3 text-xs text-white/50">
                          ✨ Describe an edit below or click a preset on the right to
                          transform this photo.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
          </div>

          {/* FLOATING PROMPT COMMAND BAR */}
          <div className="glass-card border border-indigo-500/25 bg-white/[0.04] p-4 sm:p-5">
            {engine === "local" ? (
              /* === LOCAL MAC AI PROMPT BAR (UNLIMITED $0) === */
              !localConnected ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Start Your Local Mac AI Engine for Unlimited $0 Edits
                      </h3>
                      <p className="mt-1 text-xs text-white/60 leading-relaxed">
                        <code className="text-emerald-300">mflux</code> is already
                        installed on your Mac. Start the local bridge in your terminal to
                        unlock unlimited FLUX.2 &amp; Qwen 2.1 prompt editing:
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-black/60 px-4 py-3 border border-white/10 font-mono text-xs text-emerald-300">
                    <span>npm run local-ai</span>
                    <button
                      type="button"
                      onClick={handleCopyLocalCmd}
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-sans font-medium text-white hover:bg-white/20 transition cursor-pointer"
                    >
                      {copiedCmd ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleRecheckServer}
                      disabled={checkingServer}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition cursor-pointer"
                    >
                      <RefreshCw
                        className={cn(
                          "h-3.5 w-3.5",
                          checkingServer && "animate-spin",
                        )}
                      />
                      Recheck Connection
                    </button>

                    <button
                      type="button"
                      onClick={() => onEngineChange("cloud")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 transition cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5 text-indigo-400" />
                      Switch to Cloud Photoshop Now
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLocalSubmit} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-white">
                        Tell AI to Make It Anything
                      </span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/25">
                        Unlimited · Local MLX
                      </span>
                    </div>

                    {/* Model Selector */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onLocalModelChange("flux2-klein-4b")}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer border",
                          localModel === "flux2-klein-4b"
                            ? "border-emerald-500 bg-emerald-600/25 text-emerald-200"
                            : "border-white/10 bg-white/5 text-white/60 hover:text-white",
                        )}
                      >
                        ⚡ FLUX.2 Klein 4B (Fast)
                      </button>
                      <button
                        type="button"
                        onClick={() => onLocalModelChange("qwen-2.1-turbo")}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer border",
                          localModel === "qwen-2.1-turbo"
                            ? "border-indigo-500 bg-indigo-600/25 text-indigo-200"
                            : "border-white/10 bg-white/5 text-white/60 hover:text-white",
                        )}
                      >
                        🎯 Qwen 2.1 Turbo (Max Accuracy)
                      </button>
                    </div>
                  </div>

                  {/* Main Prompt Input */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={localPrompt}
                        onChange={(e) => setLocalPrompt(e.target.value)}
                        placeholder="Describe any edit... e.g. 'Change my jacket to black leather, put me in Paris at golden hour, keep my exact face'"
                        className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-9"
                      />
                      {localPrompt && (
                        <button
                          type="button"
                          onClick={() => setLocalPrompt("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!localPrompt.trim() || isLocalGenerating}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition cursor-pointer shrink-0 shadow-lg",
                        localPrompt.trim() && !isLocalGenerating
                          ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25"
                          : "bg-white/10 text-white/40 cursor-not-allowed",
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Edit
                    </button>
                  </div>

                  {/* Precision Controls Row */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/70 pt-0.5">
                    {/* Resolution */}
                    <div className="flex items-center gap-1">
                      <span className="text-white/45">Size:</span>
                      {[512, 768, 1024].map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => onLocalResolutionChange(res)}
                          className={cn(
                            "rounded px-2 py-0.5 transition cursor-pointer border",
                            localResolution === res
                              ? "border-indigo-500 bg-indigo-600/30 text-indigo-200"
                              : "border-white/10 bg-white/5 text-white/50 hover:text-white",
                          )}
                        >
                          {res}px
                        </button>
                      ))}
                    </div>

                    {/* Multi-turn Chaining Toggle */}
                    {localResultUrl && (
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={chainLocalEdits}
                          onChange={(e) =>
                            onChainLocalEditsChange(e.target.checked)
                          }
                          className="accent-emerald-500 rounded"
                        />
                        <span>Continue editing from latest result</span>
                      </label>
                    )}

                    {/* Qwen 2.1 Max-Accuracy Extra Options */}
                    {localModel === "qwen-2.1-turbo" && (
                      <>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={localEnhancePrompt}
                            onChange={(e) =>
                              onLocalEnhancePromptChange(e.target.checked)
                            }
                            className="accent-indigo-500 rounded"
                          />
                          <span>Auto-Enhance Prompt</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={localVerify}
                            onChange={(e) =>
                              onLocalVerifyChange(e.target.checked)
                            }
                            className="accent-indigo-500 rounded"
                          />
                          <span>AI Self-Verify</span>
                        </label>
                      </>
                    )}
                  </div>

                  {/* Qwen Auto-Mask Input for Surgical Face Lock */}
                  {localModel === "qwen-2.1-turbo" && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2.5">
                      <span className="text-[11px] font-medium text-indigo-300 shrink-0">
                        🎯 Auto-Mask Target (optional):
                      </span>
                      <input
                        type="text"
                        value={localAutoMask}
                        onChange={(e) => onLocalAutoMaskChange(e.target.value)}
                        placeholder="e.g. 'the shirt' or 'the background' — repaints ONLY this object, locks everything else"
                        className="flex-1 bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Quick Prompt Ideas */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-white/40 mr-1">Try:</span>
                    {LOCAL_PROMPT_IDEAS.slice(0, 3).map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => setLocalPrompt(idea)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/65 hover:bg-white/10 hover:text-white transition cursor-pointer truncate max-w-[260px]"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </form>
              )
            ) : !publicId ? (
              /* Local-only uploaded image cannot use Cloud tools without cloud upload */
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/70">
                <span>
                  This photo was opened locally without uploading to Cloudinary. Use{" "}
                  <strong className="text-emerald-300">Local Mac AI</strong> for unlimited
                  private edits.
                </span>
                <button
                  type="button"
                  onClick={() => onEngineChange("local")}
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  Switch to Local AI
                </button>
              </div>
            ) : (
              /* === CLOUD PHOTOSHOP TOOL BAR (7 GENERATIVE TOOLS) === */
              <div className="space-y-4">
                {/* Tool Mode Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "smart", label: "Smart Prompt", icon: Sparkles },
                      { id: "replace", label: "Replace", icon: Replace },
                      { id: "remove", label: "Magic Eraser", icon: Eraser },
                      { id: "recolor", label: "Recolor", icon: Palette },
                      { id: "backdrop", label: "Backdrop", icon: ImageIcon },
                      { id: "expand", label: "Magic Expand", icon: Expand },
                      { id: "fixes", label: "Cutout & Fix", icon: Scissors },
                    ] as const
                  ).map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => setCloudTool(tool.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer border",
                          cloudTool === tool.id
                            ? "border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                            : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tool.label}
                      </button>
                    );
                  })}
                </div>

                {/* Active Tool Input Area */}
                {cloudTool === "smart" && (
                  <form
                    onSubmit={handleSmartCloudSubmit}
                    className="space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={smartPrompt}
                        onChange={(e) => setSmartPrompt(e.target.value)}
                        placeholder="Type anything... e.g. 'remove the person behind me, replace shirt with black leather jacket, and put me in Tokyo'"
                        className="flex-1 rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!smartPrompt.trim() || parsingSmart}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition cursor-pointer shrink-0",
                          smartPrompt.trim() && !parsingSmart
                            ? "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25"
                            : "bg-white/10 text-white/40 cursor-not-allowed",
                        )}
                      >
                        {parsingSmart ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                        Add Edit Layer
                      </button>
                    </div>
                    <p className="text-[11px] text-white/45">
                      Supports chained natural commands (erase, replace, recolor, expand,
                      cutout, backdrop)
                      {localHealth?.ollama?.connected
                        ? " · Enhanced by local Ollama"
                        : ""}
                      .
                    </p>

                    {isCreativeScenePrompt(smartPrompt) && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 shrink-0 text-emerald-400" />
                          <span>
                            💡 Creative fantasy transformation detected. For best results (robes, lightsabers, full-scene art), use <strong>Local Mac AI (Unlimited)</strong>.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onEngineChange("local");
                            setLocalPrompt(smartPrompt);
                          }}
                          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition cursor-pointer"
                        >
                          Switch to Local AI
                        </button>
                      </div>
                    )}
                  </form>
                )}

                {cloudTool === "replace" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!replaceFrom.trim() || !replaceTo.trim()) return;
                      onAddLayer({
                        type: "replace",
                        label: `Replace ${replaceFrom.trim()} → ${replaceTo.trim().slice(0, 26)}`,
                        from: replaceFrom.trim(),
                        to: replaceTo.trim(),
                      });
                      setReplaceFrom("");
                      setReplaceTo("");
                    }}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
                  >
                    <input
                      type="text"
                      value={replaceFrom}
                      onChange={(e) => setReplaceFrom(e.target.value)}
                      placeholder="Object to replace (e.g. shirt, mug, sofa)"
                      className="sm:col-span-4 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={replaceTo}
                      onChange={(e) => setReplaceTo(e.target.value)}
                      placeholder="Replace with (e.g. tailored navy wool blazer)"
                      className="sm:col-span-5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!replaceFrom.trim() || !replaceTo.trim()}
                      className="sm:col-span-3 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 cursor-pointer transition"
                    >
                      Apply Replace
                    </button>
                  </form>
                )}

                {cloudTool === "remove" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!removeTarget.trim()) return;
                      onAddLayer({
                        type: "remove",
                        label: `Erase: ${removeTarget.trim()}`,
                        prompt: removeTarget.trim(),
                      });
                      setRemoveTarget("");
                    }}
                    className="flex flex-col sm:flex-row gap-2.5"
                  >
                    <input
                      type="text"
                      value={removeTarget}
                      onChange={(e) => setRemoveTarget(e.target.value)}
                      placeholder="What should Magic Eraser remove? (e.g. person on left, power lines, logo)"
                      className="flex-1 rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!removeTarget.trim()}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 cursor-pointer transition shrink-0"
                    >
                      Erase Object (~0.05 cr)
                    </button>
                  </form>
                )}

                {cloudTool === "recolor" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!recolorTarget.trim() || !recolorColor.trim()) return;
                      onAddLayer({
                        type: "recolor",
                        label: `Recolor ${recolorTarget.trim()} → ${recolorColor.trim()}`,
                        target: recolorTarget.trim(),
                        color: recolorColor.trim(),
                      });
                      setRecolorTarget("");
                    }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <input
                        type="text"
                        value={recolorTarget}
                        onChange={(e) => setRecolorTarget(e.target.value)}
                        placeholder="Object to recolor (e.g. jacket, sneaker, bicycle, hair)"
                        className="sm:col-span-6 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={recolorColor}
                        onChange={(e) => setRecolorColor(e.target.value)}
                        placeholder="Color or hex (e.g. emerald)"
                        className="sm:col-span-3 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!recolorTarget.trim() || !recolorColor.trim()}
                        className="sm:col-span-3 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 cursor-pointer transition"
                      >
                        Apply Color
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {QUICK_COLOR_SWATCHES.map((sw) => (
                        <button
                          key={sw.name}
                          type="button"
                          onClick={() => setRecolorColor(sw.value)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition cursor-pointer",
                            recolorColor === sw.value
                              ? "border-indigo-400 bg-indigo-500/20 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/65 hover:text-white",
                          )}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-white/25"
                            style={{ backgroundColor: sw.hex }}
                          />
                          {sw.name}
                        </button>
                      ))}
                    </div>
                  </form>
                )}

                {cloudTool === "backdrop" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!backdropPrompt.trim()) return;
                      onAddLayer({
                        type: "background_replace",
                        label: `Backdrop: ${backdropPrompt.trim().slice(0, 34)}`,
                        prompt: backdropPrompt.trim(),
                      });
                      setBackdropPrompt("");
                    }}
                    className="flex flex-col sm:flex-row gap-2.5"
                  >
                    <input
                      type="text"
                      value={backdropPrompt}
                      onChange={(e) => setBackdropPrompt(e.target.value)}
                      placeholder="Describe any scene... e.g. 'sunlit minimalist penthouse overlooking Manhattan at dusk'"
                      className="flex-1 rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!backdropPrompt.trim()}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 cursor-pointer transition shrink-0"
                    >
                      Swap Background
                    </button>
                  </form>
                )}

                {cloudTool === "expand" && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/60">
                      AI Generative Fill invents missing pixels beyond the borders to
                      expand your photo:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { ratio: "16:9", label: "16:9 Widescreen" },
                          { ratio: "9:16", label: "9:16 Story / Reel" },
                          { ratio: "4:5", label: "4:5 Portrait" },
                          { ratio: "1:1", label: "1:1 Square" },
                          { ratio: "3:2", label: "3:2 Landscape" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.ratio}
                          type="button"
                          onClick={() =>
                            onAddLayer({
                              type: "expand",
                              label: `Magic Expand → ${opt.ratio}`,
                              aspectRatio: opt.ratio,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-600 hover:border-indigo-500 transition cursor-pointer"
                        >
                          <Expand className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {cloudTool === "fixes" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        onAddLayer({
                          type: "cutout",
                          label: "Transparent PNG Cutout",
                        })
                      }
                      className="flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-indigo-500/50 hover:bg-indigo-500/10 transition cursor-pointer"
                    >
                      <span className="text-xs font-semibold text-white">
                        ✂️ Transparent Cutout
                      </span>
                      <span className="text-[11px] text-white/50">
                        Remove background cleanly
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onAddLayer({
                          type: "restore",
                          label: "AI Restore & Sharpen",
                        })
                      }
                      className="flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-indigo-500/50 hover:bg-indigo-500/10 transition cursor-pointer"
                    >
                      <span className="text-xs font-semibold text-white">
                        ✨ AI Photo Restore
                      </span>
                      <span className="text-[11px] text-white/50">
                        Fix blurry or compressed photos
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onAddLayer({
                          type: "upscale",
                          label: "AI Super Upscale",
                        })
                      }
                      className="flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-indigo-500/50 hover:bg-indigo-500/10 transition cursor-pointer"
                    >
                      <span className="text-xs font-semibold text-white">
                        🔍 AI Super Upscale
                      </span>
                      <span className="text-[11px] text-white/50">
                        Boost resolution &amp; fine detail
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VERSION HISTORY FILMSTRIP */}
          {history.length > 0 && (
            <div className="glass-card border border-white/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/80">
                    Edit History ({history.length})
                  </h3>
                </div>
                <span className="text-[11px] text-white/45">
                  Click any version to restore or branch from it
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1">
                {history.map((item) => {
                  const isActive = activeResultUrl === item.url;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onRestoreHistory(item)}
                      className={cn(
                        "group relative w-28 sm:w-32 shrink-0 cursor-pointer overflow-hidden rounded-xl border transition",
                        isActive
                          ? "border-indigo-500 ring-2 ring-indigo-500/40"
                          : "border-white/10 hover:border-white/30",
                      )}
                    >
                      <div className="relative aspect-square bg-black/50">
                        <img
                          src={item.url}
                          alt={item.label}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          {item.engine === "local" ? "♾️ Local" : "⚡ Cloud"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveHistory(item.id);
                          }}
                          className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <div className="bg-black/60 px-2 py-1.5">
                        <p className="truncate text-[10px] font-medium text-white/90">
                          {item.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT INSPECTOR SIDEBAR (4 COLS) */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Inspector Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setInspectorTab("layers")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition cursor-pointer",
                inspectorTab === "layers"
                  ? "bg-indigo-600 text-white"
                  : "text-white/60 hover:text-white",
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              Layers
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab("color")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition cursor-pointer",
                inspectorTab === "color"
                  ? "bg-indigo-600 text-white"
                  : "text-white/60 hover:text-white",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Color
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab("export")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition cursor-pointer",
                inspectorTab === "export"
                  ? "bg-indigo-600 text-white"
                  : "text-white/60 hover:text-white",
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>

          {/* TAB 1: LAYERS & CURATED PRESETS */}
          {inspectorTab === "layers" && (
            <div className="space-y-4">
              {/* Active Layer Stack (Cloud Mode) */}
              {engine === "cloud" ? (
                <div className="glass-card border border-white/10 bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/90">
                        Active Edit Layers ({layers.length})
                      </h3>
                    </div>
                    {layers.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearLayers}
                        className="inline-flex items-center gap-1 text-[11px] text-white/50 hover:text-red-300 transition cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Clear
                      </button>
                    )}
                  </div>

                  {layers.length === 0 ? (
                    <p className="rounded-lg bg-black/30 px-3 py-3 text-xs text-white/45 text-center border border-dashed border-white/10">
                      No Cloud edit layers yet. Use the prompt bar or click a preset
                      below to stack non-destructive edits.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {layers.filter((l) => l.enabled).length > 3 && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
                          <p className="font-semibold text-amber-300">
                            ⚠️ Heavy layer stack ({layers.filter((l) => l.enabled).length} active)
                          </p>
                          <p className="mt-0.5 text-white/70">
                            Cloudinary can stall when chaining &gt;3 generative layers. The engine will safely execute the 3 most recent active layers.
                          </p>
                        </div>
                      )}
                      {layers.map((layer) => (
                        <div
                          key={layer.id}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition",
                            layer.enabled
                              ? "border-indigo-500/30 bg-indigo-500/10 text-white"
                              : "border-white/5 bg-black/20 text-white/40 line-through",
                          )}
                        >
                          <span className="truncate font-medium">
                            {layer.label}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onToggleLayer(layer.id)}
                              title={layer.enabled ? "Hide layer" : "Show layer"}
                              className="rounded p-1 hover:bg-white/10 cursor-pointer"
                            >
                              {layer.enabled ? (
                                <Eye className="h-3.5 w-3.5 text-indigo-300" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5 text-white/40" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveLayer(layer.id)}
                              title="Remove layer"
                              className="rounded p-1 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between pt-1 text-[10px] text-white/45">
                        <span>Est. free Cloudinary cost:</span>
                        <span className="font-mono text-indigo-300">
                          ~{estimatedCredits} / 25 monthly credits
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Local AI Session Summary Card */
                <div className="glass-card border border-emerald-500/20 bg-emerald-500/[0.04] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5" />
                      Local MLX Session
                    </span>
                    <span className="text-[10px] text-white/50">
                      {localModel === "flux2-klein-4b"
                        ? "FLUX.2 Klein 4B"
                        : "Qwen 2.1 Turbo"}
                    </span>
                  </div>
                  <p className="text-xs text-white/65">
                    {localLastPrompt
                      ? `Last edit: "${localLastPrompt}"`
                      : "Enter any natural-language prompt below the canvas or click a 1-click preset."}
                  </p>
                </div>
              )}

              {/* Curated One-Click Presets */}
              <div className="glass-card border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/90">
                    1-Click Studio Presets
                  </h3>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "headshots", label: "Portraits" },
                      { id: "creative", label: "Creative" },
                      { id: "product", label: "Product" },
                      { id: "fixes", label: "Fixes" },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPresetCategory(cat.id)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[11px] font-medium transition cursor-pointer",
                        presetCategory === cat.id
                          ? "bg-indigo-600/30 text-indigo-200 border border-indigo-500/50"
                          : "bg-white/[0.03] text-white/55 hover:text-white border border-transparent",
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {filteredPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={isLocalGenerating}
                      onClick={() => onApplyPreset(preset)}
                      className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-left hover:border-indigo-500/50 hover:bg-indigo-500/10 transition cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">
                          {preset.name}
                        </span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-indigo-300">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-white/55 line-clamp-2">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE 60FPS LIGHT & COLOR */}
          {inspectorTab === "color" && (
            <div className="space-y-4">
              <MicroTuningPanel
                settings={microTuning}
                onChange={onMicroTuningChange}
                collapsible={false}
              />

              {engine === "cloud" && publicId && (
                <div className="glass-card border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold text-white/80 mb-3">
                    Cloud Tone Filters
                  </p>
                  <PortraitFilterBar
                    activeFilter={activeFilter}
                    onFilterChange={onFilterChange}
                    className="justify-start"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPORT & FRAMING */}
          {inspectorTab === "export" && (
            <StudioExportPanel
              engine={engine}
              publicId={publicId}
              activeImageUrl={activeResultUrl}
              layers={layers}
              aspectRatio={aspectRatio}
              onAspectRatioChange={onAspectRatioChange}
              filter={activeFilter}
              microTuning={microTuning}
            />
          )}
        </aside>
      </div>
    </main>
  );
}
