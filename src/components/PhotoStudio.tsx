import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type {
  AspectRatio,
  EditEngine,
  EditHistoryItem,
  LocalAiHealth,
  LocalEditJobStatus,
  LocalModelId,
  LocalOperation,
  LocalReferenceImage,
  LocalStyleMode,
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

const BrushMaskEditor = lazy(() =>
  import("./BrushMaskEditor").then((m) => ({ default: m.BrushMaskEditor })),
);
import { CURATED_STUDIO_PRESETS, isCreativeScenePrompt } from "../lib/studio-engine";
import {
  getMicroTuningCssFilter,
  getVignetteOverlayStyle,
} from "../lib/micro-tuning";
import { cn } from "../lib/utils";
import {
  AlertCircle,
  Bell,
  BellOff,
  Brush,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsLeftRight,
  Clock,
  Columns2,
  Copy,
  Cpu,
  Dices,
  Download,
  Eraser,
  Expand,
  Eye,
  EyeOff,
  HelpCircle,
  Image as ImageIcon,
  ImagePlus,
  Images,
  Infinity as InfinityIcon,
  Layers,
  Loader2,
  Lock,
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
  Unlock,
  Wand2,
  X,
  Zap,
  ZoomIn,
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
  localPreviousResultUrl: string | null;
  hasCloudEdits: boolean;

  // Engine & Local Mac AI
  activeSamplePrompts?: string[];
  promotingToCloud?: boolean;
  onPromoteLocalToCloud?: () => Promise<void>;
  engine: EditEngine;
  onEngineChange: (engine: EditEngine) => void;
  localHealth: LocalAiHealth | null;
  checkingLocal?: boolean;
  onRefreshLocalHealth: () => Promise<LocalAiHealth | null>;
  onTryConnectLocal?: () => Promise<void>;
  onOpenSetupModal?: () => void;
  localModel: LocalModelId;
  onLocalModelChange: (model: LocalModelId) => void;
  localResolution: number;
  onLocalResolutionChange: (res: number) => void;
  localStrength: number;
  onLocalStrengthChange: (strength: number) => void;
  localAutoMask: string;
  onLocalAutoMaskChange: (mask: string) => void;
  localMaskDataUrl: string | null;
  localMaskPreviewUrl: string | null;
  onSaveBrushMask: (maskDataUrl: string, previewDataUrl: string) => void;
  onClearBrushMask: () => void;
  localReferenceImages: LocalReferenceImage[];
  onAddReferenceFiles: (files: FileList | File[]) => Promise<void>;
  onRemoveReferenceImage: (id: string) => void;
  onClearReferenceImages: () => void;
  localNegativePrompt: string;
  onLocalNegativePromptChange: (v: string) => void;
  localStyleMode: LocalStyleMode;
  onLocalStyleModeChange: (style: LocalStyleMode) => void;
  localLoraPath: string;
  onLocalLoraPathChange: (v: string) => void;
  localLoraScale: number;
  onLocalLoraScaleChange: (v: number) => void;
  localSeed: string;
  onLocalSeedChange: (v: string) => void;
  localSeedLocked: boolean;
  onLocalSeedLockedChange: (v: boolean) => void;
  localLastSeed: number | null;
  localEnhancePrompt: boolean;
  onLocalEnhancePromptChange: (v: boolean) => void;
  localVerify: boolean;
  onLocalVerifyChange: (v: boolean) => void;
  soundAlertsEnabled: boolean;
  onSoundAlertsEnabledChange: (v: boolean) => void;
  onRequestDesktopNotifications: () => Promise<void>;
  localJob: LocalEditJobStatus | null;
  localLastPrompt: string;
  localLastOperation: LocalOperation;
  chainLocalEdits: boolean;
  onChainLocalEditsChange: (v: boolean) => void;
  onRunLocalPrompt: (prompt: string) => void;
  onRegenerateLocalEdit: () => void;
  onRunLocalUpscale: (scale?: string) => void;
  onRunLocalCutout: () => void;
  onCancelLocalJob: () => void;
  onOpenGallery: () => void;
  galleryCount: number;

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

const LOCAL_STYLE_OPTIONS: Array<{ id: LocalStyleMode; label: string }> = [
  { id: "", label: "Natural" },
  { id: "identity", label: "Identity Lock" },
  { id: "portrait", label: "Portrait Pro" },
  { id: "cinematic", label: "Cinematic 35mm" },
  { id: "storyboard", label: "Storyboard" },
  { id: "illustration", label: "Illustration" },
];

const QUICK_NEGATIVE_PRESETS = [
  "distorted hands, extra fingers, blurry face, plastic skin, watermark",
  "low quality, artifacts, deformed anatomy, oversaturated",
];

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
  localPreviousResultUrl,
  hasCloudEdits,
  activeSamplePrompts = [],
  promotingToCloud = false,
  onPromoteLocalToCloud,
  engine,
  onEngineChange,
  localHealth,
  checkingLocal = false,
  onRefreshLocalHealth,
  onTryConnectLocal,
  onOpenSetupModal,
  localModel,
  onLocalModelChange,
  localResolution,
  onLocalResolutionChange,
  localStrength,
  onLocalStrengthChange,
  localAutoMask,
  onLocalAutoMaskChange,
  localMaskDataUrl,
  localMaskPreviewUrl,
  onSaveBrushMask,
  onClearBrushMask,
  localReferenceImages,
  onAddReferenceFiles,
  onRemoveReferenceImage,
  onClearReferenceImages,
  localNegativePrompt,
  onLocalNegativePromptChange,
  localStyleMode,
  onLocalStyleModeChange,
  localLoraPath,
  onLocalLoraPathChange,
  localLoraScale,
  onLocalLoraScaleChange,
  localSeed,
  onLocalSeedChange,
  localSeedLocked,
  onLocalSeedLockedChange,
  localLastSeed,
  localEnhancePrompt,
  onLocalEnhancePromptChange,
  localVerify,
  onLocalVerifyChange,
  soundAlertsEnabled,
  onSoundAlertsEnabledChange,
  onRequestDesktopNotifications,
  localJob,
  localLastPrompt,
  localLastOperation,
  chainLocalEdits,
  onChainLocalEditsChange,
  onRunLocalPrompt,
  onRegenerateLocalEdit,
  onRunLocalUpscale,
  onRunLocalCutout,
  onCancelLocalJob,
  onOpenGallery,
  galleryCount,
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
  const [compareTarget, setCompareTarget] = useState<"original" | "previous">(
    "original",
  );
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("layers");
  const [presetCategory, setPresetCategory] = useState<"all" | PresetCategory>(
    "all",
  );
  const [readyCloudUrls, setReadyCloudUrls] = useState<Set<string>>(
    () => new Set(),
  );

  // Prompt bar & modal states
  const [localPrompt, setLocalPrompt] = useState("");
  const [brushMaskOpen, setBrushMaskOpen] = useState(false);
  const [showProControls, setShowProControls] = useState(false);
  const refFileInputRef = useRef<HTMLInputElement | null>(null);
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
  const [peekingOriginal, setPeekingOriginal] = useState(false);

  const localConnected = Boolean(localHealth?.ok && localHealth.mfluxInstalled);
  const isLocalGenerating =
    localJob?.status === "queued" || localJob?.status === "running";

  // Photoshop-style keyboard shortcut: hold Space to peek at Original photo
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isTypingTarget(e.target) && !brushMaskOpen) {
        if (activeResultUrl && originalPreviewUrl && activeResultUrl !== originalPreviewUrl) {
          e.preventDefault();
          setPeekingOriginal(true);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setPeekingOriginal(false);
    };
    const onBlur = () => setPeekingOriginal(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [activeResultUrl, originalPreviewUrl, brushMaskOpen]);

  const displayedResultUrl =
    peekingOriginal && originalPreviewUrl ? originalPreviewUrl : activeResultUrl;

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
    await navigator.clipboard.writeText("git clone https://github.com/yasinnkhann/alterx.git && cd alterx && npm run local-ai");
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
    (engine === "cloud" && layers.some((l) => l.enabled && l.type === "cutout")) ||
    (engine === "local" && localLastOperation === "cutout" && Boolean(localResultUrl));

  const canComparePrevious =
    engine === "local" &&
    Boolean(localPreviousResultUrl) &&
    localPreviousResultUrl !== originalPreviewUrl &&
    localPreviousResultUrl !== activeResultUrl;

  const effectiveBeforeUrl =
    canComparePrevious && compareTarget === "previous" && localPreviousResultUrl
      ? localPreviousResultUrl
      : originalPreviewUrl;

  const effectiveBeforeLabel =
    canComparePrevious && compareTarget === "previous"
      ? "Previous Step"
      : "Original";

  const maskSourceImageUrl =
    chainLocalEdits && localResultUrl ? localResultUrl : originalPreviewUrl;

  const activeProCount =
    (localStrength < 0.99 ? 1 : 0) +
    (localSeedLocked || localSeed.trim() ? 1 : 0) +
    (localNegativePrompt.trim() ? 1 : 0) +
    (localLoraPath.trim() ? 1 : 0) +
    (localAutoMask.trim() && !localMaskDataUrl ? 1 : 0) +
    (localModel === "qwen-2.1-turbo" && localVerify ? 1 : 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 pb-16">
      {/* TOP STUDIO TOOLBAR */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* ENGINE SWITCHER */}
        <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1 self-start">
          <button
            type="button"
            disabled={checkingLocal}
            onClick={() => {
              if (localConnected) {
                onEngineChange("local");
              } else if (onTryConnectLocal) {
                void onTryConnectLocal();
              } else {
                onEngineChange("local");
              }
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer",
              engine === "local"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                : "text-white/70 hover:text-white hover:bg-white/5",
            )}
          >
            {checkingLocal ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300" />
            ) : (
              <InfinityIcon className="h-3.5 w-3.5" />
            )}
            <span>
              {checkingLocal ? "Checking Mac..." : "Local Mac AI (Unlimited)"}
            </span>
            {localConnected && (
              <span
                className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse"
                title="Connected to local Apple Silicon mflux server"
              />
            )}
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
                  {localJob.phase === "download"
                    ? "Downloading Model Weights (One-Time Cache)"
                    : "Rendering Locally on Your Apple Silicon GPU"}
                </h3>
                <p className="mt-1.5 max-w-md text-xs text-emerald-300/90">
                  {localJob.stage || "Processing with MLX..."}
                </p>

                {/* Real Visual Progress Bar + ETA */}
                <div className="mt-4 w-full max-w-md space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span className="text-white/75">
                      {localJob.step && localJob.totalSteps
                        ? localJob.phase === "download"
                          ? `File ${localJob.step} / ${localJob.totalSteps}`
                          : `Step ${localJob.step} / ${localJob.totalSteps}`
                        : localJob.phase === "decoding"
                          ? "Decoding high-res output"
                          : "Initializing MLX graph..."}
                    </span>
                    <span className="font-mono text-emerald-300">
                      {typeof localJob.progress === "number"
                        ? `${localJob.progress}%`
                        : "Starting..."}
                      {localJob.eta ? ` · ~${localJob.eta} left` : ""}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 border border-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        localJob.phase === "download"
                          ? "bg-gradient-to-r from-indigo-500 to-cyan-400"
                          : "bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-400",
                        typeof localJob.progress !== "number" && "animate-pulse",
                      )}
                      style={{
                        width: `${Math.max(4, localJob.progress ?? 12)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-white/75 border border-white/10">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{localJob.elapsed}s elapsed · $0 unlimited</span>
                  </span>
                  {typeof localJob.seed === "number" && (
                    <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-white/60 border border-white/10">
                      Seed #{localJob.seed}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundAlertsEnabled;
                      onSoundAlertsEnabledChange(next);
                      if (next) void onRequestDesktopNotifications();
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 border transition cursor-pointer",
                      soundAlertsEnabled
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/5 text-white/45",
                    )}
                    title="Chime + browser notification when render finishes"
                  >
                    {soundAlertsEnabled ? (
                      <Bell className="h-3 w-3" />
                    ) : (
                      <BellOff className="h-3 w-3" />
                    )}
                    {soundAlertsEnabled ? "Done Alert ON" : "Alerts Muted"}
                  </button>
                </div>

                {localJob.logs.length > 0 && (
                  <div className="mt-4 w-full max-w-lg rounded-lg bg-black/70 p-3 text-left font-mono text-[10px] text-white/60 border border-white/10 max-h-24 overflow-y-auto">
                    {localJob.logs.slice(-4).map((line, i) => (
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
                      {peekingOriginal && (
                        <div className="pointer-events-none absolute top-3 left-3 z-10 rounded-full bg-black/75 border border-white/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                          Showing Original · Release Space
                        </div>
                      )}
                      <img
                        src={displayedResultUrl || activeResultUrl}
                        alt={peekingOriginal ? "Original photo" : "Edited result"}
                        className="mx-auto max-h-[600px] w-full object-contain"
                        style={{ filter: peekingOriginal ? "none" : cssFilter }}
                      />
                      {!peekingOriginal && <div style={vignetteStyle} />}
                    </div>
                  ) : viewMode === "side" ? (
                    <div className="space-y-3">
                      {canComparePrevious && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/50">
                            Comparing against:
                          </span>
                          <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setCompareTarget("original")}
                              className={cn(
                                "rounded-md px-2.5 py-1 transition cursor-pointer",
                                compareTarget === "original"
                                  ? "bg-indigo-600 text-white"
                                  : "text-white/60 hover:text-white",
                              )}
                            >
                              Original Photo
                            </button>
                            <button
                              type="button"
                              onClick={() => setCompareTarget("previous")}
                              className={cn(
                                "rounded-md px-2.5 py-1 transition cursor-pointer",
                                compareTarget === "previous"
                                  ? "bg-emerald-600 text-white"
                                  : "text-white/60 hover:text-white",
                              )}
                            >
                              Previous Step
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-medium text-white/50">
                            Before ({effectiveBeforeLabel})
                          </p>
                          <div className="overflow-hidden rounded-xl bg-black/40 border border-white/10">
                            <img
                              src={effectiveBeforeUrl || originalPreviewUrl}
                              alt={effectiveBeforeLabel}
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
                    </div>
                  ) : (
                    /* Interactive Split Slider */
                    <div className="flex flex-col items-center">
                      {canComparePrevious && (
                        <div className="mb-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-0.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setCompareTarget("original")}
                            className={cn(
                              "rounded-md px-2.5 py-1 transition cursor-pointer",
                              compareTarget === "original"
                                ? "bg-indigo-600 text-white"
                                : "text-white/60 hover:text-white",
                            )}
                          >
                            vs. Original
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompareTarget("previous")}
                            className={cn(
                              "rounded-md px-2.5 py-1 transition cursor-pointer",
                              compareTarget === "previous"
                                ? "bg-emerald-600 text-white"
                                : "text-white/60 hover:text-white",
                            )}
                          >
                            vs. Previous Step
                          </button>
                        </div>
                      )}
                      {peekingOriginal ? (
                        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-black/40 max-w-xl w-full">
                          <div className="pointer-events-none absolute top-3 left-3 z-10 rounded-full bg-black/75 border border-white/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                            Showing Original · Release Space
                          </div>
                          <img
                            src={originalPreviewUrl}
                            alt="Original photo"
                            className="mx-auto max-h-[600px] w-full object-contain"
                          />
                        </div>
                      ) : (
                        <BeforeAfterSlider
                          beforeImageUrl={effectiveBeforeUrl || originalPreviewUrl}
                          afterImageUrl={activeResultUrl}
                          beforeAlt={effectiveBeforeLabel}
                          afterAlt="AI edited photo"
                          beforeLabel={effectiveBeforeLabel}
                          className={cn("max-w-xl", aspectClass)}
                          afterStyle={{ filter: cssFilter }}
                          afterOverlay={<div style={vignetteStyle} />}
                        />
                      )}
                      {activeResultUrl === originalPreviewUrl ? (
                        <p className="mt-3 text-xs text-white/50">
                          ✨ Describe an edit below or click a preset on the right to
                          transform this photo.
                        </p>
                      ) : (
                        <p className="mt-2 text-[11px] text-white/40 hidden sm:block">
                          Tip: Hold <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/65">Space</kbd> anytime to peek at the original
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">
                          Local Mac AI Engine is Offline
                        </h3>
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Setup Needed
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/65 leading-relaxed">
                        To unlock unlimited $0 FLUX.2 &amp; Qwen 2.1 edits running on your Apple Silicon Mac GPU, run this quickstart command. Or switch to Cloud Photoshop for instant, zero-setup browser editing on any device.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-black/60 px-4 py-3 border border-white/10 font-mono text-xs text-emerald-300 gap-3">
                    <span className="truncate">git clone https://github.com/yasinnkhann/alterx.git &amp;&amp; cd alterx &amp;&amp; npm run local-ai</span>
                    <button
                      type="button"
                      onClick={handleCopyLocalCmd}
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-sans font-medium text-white hover:bg-white/20 transition cursor-pointer shrink-0"
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
                    {onOpenSetupModal && (
                      <button
                        type="button"
                        onClick={onOpenSetupModal}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition cursor-pointer shadow-md shadow-emerald-600/25"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        Open Mac Setup Guide
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleRecheckServer}
                      disabled={checkingServer}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 transition cursor-pointer"
                    >
                      <RefreshCw
                        className={cn(
                          "h-3.5 w-3.5",
                          checkingServer && "animate-spin text-emerald-400",
                        )}
                      />
                      Recheck Connection
                    </button>

                    <button
                      type="button"
                      onClick={() => onEngineChange("cloud")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5 text-indigo-400" />
                      Switch to Cloud Photoshop (Zero Setup)
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLocalSubmit} className="space-y-3.5">
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
                    <div className="flex flex-wrap items-center gap-1.5">
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

                  {/* Photoshop-Level Tools Strip: Brush Mask + Multi-Photo Reference + Local Upscale/Cutout */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isLocalGenerating || !maskSourceImageUrl}
                      onClick={() => setBrushMaskOpen(true)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition cursor-pointer border",
                        localMaskDataUrl
                          ? "border-purple-500 bg-purple-600/25 text-purple-200"
                          : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10 hover:text-white",
                      )}
                      title="Paint directly on your photo to lock your face and repaint only the painted pixels (Qwen 2.1)"
                    >
                      <Brush className="h-3.5 w-3.5 text-purple-400" />
                      {localMaskDataUrl ? "Edit Brush Mask" : "Paint Mask"}
                    </button>

                    <input
                      ref={refFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          void onAddReferenceFiles(e.target.files);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={isLocalGenerating || localReferenceImages.length >= 3}
                      onClick={() => refFileInputRef.current?.click()}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition cursor-pointer border",
                        localReferenceImages.length > 0
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200"
                          : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10 hover:text-white",
                      )}
                      title="Add up to 3 extra reference photos (e.g. a jacket, car, background, or friend) and reference them as 'image 2', 'image 3'"
                    >
                      <ImagePlus className="h-3.5 w-3.5 text-cyan-400" />
                      {localReferenceImages.length > 0
                        ? `Ref Photos (${localReferenceImages.length}/3)`
                        : "+ Ref Photo"}
                    </button>

                    <button
                      type="button"
                      disabled={isLocalGenerating}
                      onClick={() => onRunLocalUpscale("2x")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/75 hover:bg-white/10 hover:text-white transition cursor-pointer disabled:opacity-40"
                      title="Super-resolution 2× upscale locally on Apple Silicon using SeedVR2 ($0)"
                    >
                      <ZoomIn className="h-3.5 w-3.5 text-amber-400" />
                      2× AI Upscale
                    </button>

                    <button
                      type="button"
                      disabled={isLocalGenerating}
                      onClick={onRunLocalCutout}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/75 hover:bg-white/10 hover:text-white transition cursor-pointer disabled:opacity-40"
                      title="Create a crisp transparent PNG cutout locally using FIBO RMBG ($0, zero Cloudinary credits)"
                    >
                      <Scissors className="h-3.5 w-3.5 text-pink-400" />
                      PNG Cutout
                    </button>
                  </div>

                  {/* Active Brush Mask Badge */}
                  {localMaskDataUrl && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-500/35 bg-purple-500/10 px-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {localMaskPreviewUrl && (
                          <img
                            src={localMaskPreviewUrl}
                            alt="Active brush mask"
                            className="h-10 w-10 rounded-lg border border-purple-400/40 object-cover shrink-0 bg-black"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-purple-200">
                            Brush Mask Active (Qwen 2.1 Pixel-Lock)
                          </p>
                          <p className="text-[11px] text-purple-200/70 truncate">
                            Only painted purple pixels will change; everything else stays locked.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setBrushMaskOpen(true)}
                          className="rounded-lg bg-purple-600/40 hover:bg-purple-600/60 px-2.5 py-1 text-[11px] font-medium text-white cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={onClearBrushMask}
                          className="rounded-lg bg-white/10 hover:bg-red-500/30 px-2.5 py-1 text-[11px] font-medium text-white/80 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Multi-Photo Reference Strip */}
                  {localReferenceImages.length > 0 && (
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.07] p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-cyan-200">
                          Multi-Photo Compositing — refer to them as{" "}
                          <code className="text-white">image 2</code>
                          {localReferenceImages.length > 1 ? ", image 3" : ""} in your prompt
                        </span>
                        <button
                          type="button"
                          onClick={onClearReferenceImages}
                          className="text-[10px] text-white/50 hover:text-red-300 cursor-pointer"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-[10px] text-white/75">
                          <span className="font-semibold text-emerald-300">Image 1</span>
                          <span>Main Canvas</span>
                        </div>
                        {localReferenceImages.map((ref, idx) => (
                          <div
                            key={ref.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-black/50 pr-1.5 pl-1 py-1 text-[10px] text-white"
                          >
                            <img
                              src={ref.dataUrl}
                              alt={ref.name}
                              className="h-6 w-6 rounded object-cover"
                            />
                            <span className="font-semibold text-cyan-300">
                              Image {idx + 2}
                            </span>
                            <span className="max-w-[90px] truncate text-white/70">
                              {ref.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveReferenceImage(ref.id)}
                              className="rounded p-0.5 text-white/50 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Prompt Input + Generate + Retry New Seed */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={localPrompt}
                        onChange={(e) => setLocalPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && localPrompt.trim() && !isLocalGenerating) {
                            e.preventDefault();
                            onRunLocalPrompt(localPrompt.trim());
                          }
                        }}
                        placeholder={
                          localReferenceImages.length > 0
                            ? "e.g. 'Put me wearing the jacket from image 2 in a warm sunlit coffee shop'"
                            : localResultUrl && chainLocalEdits
                              ? "Describe a follow-up edit... e.g. 'Change the lightsaber to purple' or 'Place me on Tatooine'"
                              : "Describe any edit... e.g. 'Change my jacket to black leather, put me in Paris at golden hour'"
                        }
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

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="submit"
                        disabled={!localPrompt.trim() || isLocalGenerating}
                        className={cn(
                          "inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition cursor-pointer shadow-lg",
                          localPrompt.trim() && !isLocalGenerating
                            ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25"
                            : "bg-white/10 text-white/40 cursor-not-allowed",
                        )}
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate Edit
                      </button>

                      {localResultUrl && localLastPrompt && !isLocalGenerating && (
                        <button
                          type="button"
                          onClick={onRegenerateLocalEdit}
                          title={`Re-run "${localLastPrompt}" on the same source image with a fresh random seed`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-xs font-semibold text-white/85 hover:bg-white/10 hover:text-white transition cursor-pointer"
                        >
                          <Dices className="h-4 w-4 text-indigo-400" />
                          <span className="hidden md:inline">Retry Seed</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Single Context-Aware Prompt Suggestions Row (hides while typing to stay clean) */}
                  {!localPrompt.trim() && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-white/40 uppercase font-semibold tracking-wider">
                        Try:
                      </span>
                      {(activeSamplePrompts.length > 0
                        ? activeSamplePrompts
                        : LOCAL_PROMPT_IDEAS.slice(0, 4)
                      ).map((idea) => (
                        <button
                          key={idea}
                          type="button"
                          onClick={() => setLocalPrompt(idea)}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-white/70 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200 transition cursor-pointer truncate max-w-[260px]"
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Primary Controls Row (Decluttered — advanced options live in Pro Controls) */}
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[11px] text-white/75 pt-0.5">
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
                        <span>Continue from latest</span>
                      </label>
                    )}

                    {/* Sound / Desktop Alert Bell */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !soundAlertsEnabled;
                        onSoundAlertsEnabledChange(next);
                        if (next) void onRequestDesktopNotifications();
                      }}
                      className={cn(
                        "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 border transition cursor-pointer",
                        soundAlertsEnabled
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 bg-white/5 text-white/45",
                      )}
                      title="Play chime & notify when GPU render completes"
                    >
                      {soundAlertsEnabled ? (
                        <Bell className="h-3 w-3" />
                      ) : (
                        <BellOff className="h-3 w-3" />
                      )}
                      <span>{soundAlertsEnabled ? "Alerts" : "Muted"}</span>
                    </button>
                  </div>

                  {/* Style Directives Row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-white/45 mr-0.5">
                      Style:
                    </span>
                    {LOCAL_STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id || "default"}
                        type="button"
                        onClick={() => onLocalStyleModeChange(opt.id)}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition cursor-pointer border",
                          localStyleMode === opt.id
                            ? "border-indigo-500 bg-indigo-600/30 text-indigo-100"
                            : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white hover:bg-white/10",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setShowProControls((v) => !v)}
                      className={cn(
                        "ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer border",
                        showProControls || activeProCount > 0
                          ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-200"
                          : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white",
                      )}
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      Pro Controls
                      {activeProCount > 0 && (
                        <span className="rounded-full bg-indigo-500/40 px-1.5 text-[9px] text-white">
                          {activeProCount}
                        </span>
                      )}
                      {showProControls ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  {/* Collapsible Pro Controls: Strength, Seed Lock, Negative Prompt, Auto-Mask, Custom LoRA */}
                  {showProControls && (
                    <div className="rounded-xl border border-white/10 bg-black/35 p-3.5 space-y-3.5">
                      {/* Edit Strength Slider (Qwen 2.1) */}
                      {localModel === "qwen-2.1-turbo" && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-white/80">
                              Edit Strength (Subtle Touch-up ↔ Full Reimagine)
                            </span>
                            <div className="flex items-center gap-1.5">
                              {[
                                { label: "Subtle", val: 0.55 },
                                { label: "Balanced", val: 0.8 },
                                { label: "Full", val: 1.0 },
                              ].map((p) => (
                                <button
                                  key={p.label}
                                  type="button"
                                  onClick={() => onLocalStrengthChange(p.val)}
                                  className={cn(
                                    "rounded px-1.5 py-0.5 text-[10px] border cursor-pointer",
                                    Math.abs(localStrength - p.val) < 0.03
                                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                                      : "border-white/10 bg-white/5 text-white/55 hover:text-white",
                                  )}
                                >
                                  {p.label}
                                </button>
                              ))}
                              <span className="w-9 text-right font-mono text-emerald-300">
                                {localStrength.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0.15}
                            max={1.0}
                            step={0.05}
                            value={localStrength}
                            onChange={(e) =>
                              onLocalStrengthChange(Number(e.target.value))
                            }
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Seed Lock + Custom Seed */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-white/75 flex items-center justify-between">
                            <span>Seed Control</span>
                            {localLastSeed && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextLock = !localSeedLocked;
                                  onLocalSeedLockedChange(nextLock);
                                  if (nextLock) {
                                    onLocalSeedChange(String(localLastSeed));
                                  }
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] cursor-pointer",
                                  localSeedLocked
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    : "bg-white/5 text-white/55 hover:text-white",
                                )}
                              >
                                {localSeedLocked ? (
                                  <Lock className="h-2.5 w-2.5" />
                                ) : (
                                  <Unlock className="h-2.5 w-2.5" />
                                )}
                                {localSeedLocked
                                  ? `Locked #${localLastSeed}`
                                  : `Lock Last #${localLastSeed}`}
                              </button>
                            )}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={localSeed}
                              onChange={(e) => {
                                onLocalSeedLockedChange(false);
                                onLocalSeedChange(
                                  e.target.value.replace(/[^\d]/g, ""),
                                );
                              }}
                              placeholder="Random every run (or enter seed #)"
                              className="flex-1 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs text-white placeholder-white/35 focus:border-indigo-500 focus:outline-none font-mono"
                            />
                            {localSeed && (
                              <button
                                type="button"
                                onClick={() => {
                                  onLocalSeedLockedChange(false);
                                  onLocalSeedChange("");
                                }}
                                title="Reset to random seed"
                                className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 hover:text-white cursor-pointer"
                              >
                                <Dices className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Custom LoRA Adapter */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-white/75 flex items-center justify-between">
                            <span>Custom LoRA (optional)</span>
                            <span className="font-mono text-[10px] text-white/50">
                              Scale: {localLoraScale.toFixed(1)}
                            </span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={localLoraPath}
                              onChange={(e) =>
                                onLocalLoraPathChange(e.target.value)
                              }
                              placeholder="Local .safetensors path or HF repo"
                              className="flex-1 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs text-white placeholder-white/35 focus:border-indigo-500 focus:outline-none"
                            />
                            <input
                              type="range"
                              min={0.2}
                              max={1.5}
                              step={0.1}
                              value={localLoraScale}
                              onChange={(e) =>
                                onLocalLoraScaleChange(Number(e.target.value))
                              }
                              className="w-16 accent-indigo-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Negative Prompt */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-white/75">
                            Negative Prompt (what to avoid)
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                onLocalNegativePromptChange(
                                  QUICK_NEGATIVE_PRESETS[0],
                                )
                              }
                              className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60 hover:text-white cursor-pointer"
                            >
                              + Anti-Glitch Preset
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={localNegativePrompt}
                          onChange={(e) =>
                            onLocalNegativePromptChange(e.target.value)
                          }
                          placeholder="e.g. 'extra fingers, distorted hands, blurry face, plastic skin, watermark'"
                          className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white placeholder-white/35 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Qwen 2.1 Quality & Verification Toggles */}
                      {localModel === "qwen-2.1-turbo" && (
                        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/80">
                          <label
                            className="inline-flex items-center gap-1.5 cursor-pointer select-none"
                            title="Rewrites short prompts into richer studio photography instructions"
                          >
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
                          <label
                            className="inline-flex items-center gap-1.5 cursor-pointer select-none"
                            title="Runs an extra vision check after generation to verify accuracy (adds ~20s)"
                          >
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
                        </div>
                      )}

                      {/* Qwen Text Auto-Mask Input (when Brush Mask is not set) */}
                      {localModel === "qwen-2.1-turbo" && !localMaskDataUrl && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2">
                          <span className="text-[11px] font-medium text-indigo-300 shrink-0">
                            🎯 Text Auto-Mask:
                          </span>
                          <input
                            type="text"
                            value={localAutoMask}
                            onChange={(e) =>
                              onLocalAutoMaskChange(e.target.value)
                            }
                            placeholder="e.g. 'the shirt' or 'the background' — repaints ONLY this object"
                            className="flex-1 bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </form>
              )
            ) : !publicId ? (
              /* Local-only uploaded image can be promoted to Cloud Photoshop in 1 click */
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/75">
                <span>
                  This photo stayed <strong className="text-emerald-300">100% private on your Mac</strong>. Upload it to Cloudinary if you&apos;d like to run Cloud Photoshop layers on it.
                </span>
                <div className="flex items-center gap-2">
                  {onPromoteLocalToCloud && (
                    <button
                      type="button"
                      disabled={promotingToCloud}
                      onClick={() => void onPromoteLocalToCloud()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-60"
                    >
                      {promotingToCloud ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      {promotingToCloud ? "Uploading..." : "Upload to Cloud Tools"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEngineChange("local")}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 transition cursor-pointer"
                  >
                    Back to Local AI
                  </button>
                </div>
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
              {engine === "local" ? "Tools" : "Layers"}
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
                /* Local AI Session Summary Card + Zero-Credit Local Tools */
                <div className="glass-card border border-emerald-500/20 bg-emerald-500/[0.04] p-4 space-y-3">
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

                  {localLastSeed && (
                    <div className="flex items-center justify-between rounded-lg bg-black/35 border border-white/10 px-2.5 py-1.5 text-[11px]">
                      <span className="font-mono text-white/65">
                        Seed #{localLastSeed}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextLock = !localSeedLocked;
                          onLocalSeedLockedChange(nextLock);
                          onLocalSeedChange(nextLock ? String(localLastSeed) : "");
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium cursor-pointer",
                          localSeedLocked
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-white/10 text-white/75 hover:text-white",
                        )}
                      >
                        {localSeedLocked ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                        {localSeedLocked ? "Locked" : "Lock Seed"}
                      </button>
                    </div>
                  )}

                  {/* Quick Local-Only Actions (Zero Cloudinary Credits) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isLocalGenerating || !localConnected}
                      onClick={() => onRunLocalUpscale("2x")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-black/35 px-2.5 py-2 text-[11px] font-medium text-white/80 hover:border-amber-500/40 hover:bg-amber-500/10 transition cursor-pointer disabled:opacity-40"
                    >
                      <ZoomIn className="h-3.5 w-3.5 text-amber-400" />
                      2× Upscale
                    </button>
                    <button
                      type="button"
                      disabled={isLocalGenerating || !localConnected}
                      onClick={onRunLocalCutout}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-black/35 px-2.5 py-2 text-[11px] font-medium text-white/80 hover:border-pink-500/40 hover:bg-pink-500/10 transition cursor-pointer disabled:opacity-40"
                    >
                      <Scissors className="h-3.5 w-3.5 text-pink-400" />
                      PNG Cutout
                    </button>
                  </div>

                  {localConnected && (
                    <button
                      type="button"
                      onClick={onOpenGallery}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer"
                    >
                      <Images className="h-3.5 w-3.5 text-emerald-400" />
                      Open Saved Mac Library ({galleryCount})
                    </button>
                  )}
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

      {/* Interactive Brush Mask Editor Modal (lazy-loaded) */}
      <Suspense fallback={null}>
        {brushMaskOpen && maskSourceImageUrl && (
          <BrushMaskEditor
            sourceImageUrl={maskSourceImageUrl}
            initialMaskDataUrl={localMaskDataUrl}
            onSave={(maskData, previewData) => {
              onSaveBrushMask(maskData, previewData);
              setBrushMaskOpen(false);
            }}
            onClose={() => setBrushMaskOpen(false)}
          />
        )}
      </Suspense>
    </main>
  );
}
