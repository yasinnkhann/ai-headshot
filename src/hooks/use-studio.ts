import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  SamplePhoto,
  StudioPreset,
  UploadStatus,
} from "../types";
import { DEFAULT_MICRO_TUNING } from "../types";
import type { CloudinaryUploadResult } from "../cloudinary/UploadWidget";
import {
  buildOriginalStudioPreview,
  buildStudioImage,
  estimateLayerCredits,
  normalizeParsedLayers,
  parsePromptToLayers,
} from "../lib/studio-engine";
import {
  cancelLocalJob,
  checkLocalAiHealth,
  parsePromptWithLocalOllama,
  pollLocalJob,
  startLocalEdit,
} from "../lib/local-ai";

export function useStudio() {
  // Base source photo state (supports BOTH Cloudinary uploads AND pure local-only files!)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  // Engine & local AI health
  const [engine, setEngine] = useState<EditEngine>("cloud");
  const [localHealth, setLocalHealth] = useState<LocalAiHealth | null>(null);
  const [localModel, setLocalModel] = useState<LocalModelId>("flux2-klein-4b");
  const [localResolution, setLocalResolution] = useState<number>(768);
  const [localAutoMask, setLocalAutoMask] = useState<string>("");
  const [localEnhancePrompt, setLocalEnhancePrompt] = useState<boolean>(false);
  const [localVerify, setLocalVerify] = useState<boolean>(false);
  const [localJob, setLocalJob] = useState<LocalEditJobStatus | null>(null);
  const [localResultUrl, setLocalResultUrl] = useState<string | null>(null);
  const [localBaseUrl, setLocalBaseUrl] = useState<string | null>(null);
  const [localLastPrompt, setLocalLastPrompt] = useState<string>("");
  const [chainLocalEdits, setChainLocalEdits] = useState<boolean>(true);

  // Cloud Photoshop layer stack
  const [layers, setLayers] = useState<PhotoLayer[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("original");
  const [activeFilter, setActiveFilter] = useState<PortraitFilter>("none");
  const [microTuning, setMicroTuning] =
    useState<MicroTuningSettings>(DEFAULT_MICRO_TUNING);

  // Unified version history across both Cloud and Local edits
  const [history, setHistory] = useState<EditHistoryItem[]>([]);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeJobIdRef = useRef<string | null>(null);

  // Check local Mac mflux server availability on mount & every 15s
  const refreshLocalHealth = useCallback(async () => {
    const health = await checkLocalAiHealth();
    setLocalHealth(health);
    return health;
  }, []);

  useEffect(() => {
    let active = true;
    checkLocalAiHealth().then((health) => {
      if (!active) return;
      setLocalHealth(health);
      // Automatically prefer Unlimited Local AI when the user's Mac server is running!
      if (health?.ok && health.mfluxInstalled) {
        setEngine("local");
      }
    });

    const interval = setInterval(() => {
      checkLocalAiHealth().then((health) => {
        if (active) setLocalHealth(health);
      });
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const hasPhoto = Boolean(publicId || originalUrl);

  const handleUploadStart = () => {
    setUploadStatus("uploading");
    setUploadError(null);
  };

  const handleUploadSuccess = (result: CloudinaryUploadResult) => {
    if (result.resource_type !== "image") {
      setUploadStatus("error");
      setUploadError("Please upload an image file (JPG, PNG, or WEBP).");
      return;
    }
    setPublicId(result.public_id);
    setOriginalUrl(result.secure_url);
    setLocalBaseUrl(result.secure_url);
    setLocalResultUrl(null);
    setLocalJob(null);
    setLayers([]);
    setAspectRatio("original");
    setActiveFilter("none");
    setMicroTuning(DEFAULT_MICRO_TUNING);
    setHistory([]);
    setUploadStatus("success");
    setUploadError(null);
  };

  /** Allows uploading a local photo directly into Unlimited Local Mode without even touching Cloudinary */
  const handleLocalOnlyUpload = (dataUrl: string) => {
    setPublicId(null);
    setOriginalUrl(dataUrl);
    setLocalBaseUrl(dataUrl);
    setLocalResultUrl(null);
    setLocalJob(null);
    setLayers([]);
    setAspectRatio("original");
    setActiveFilter("none");
    setMicroTuning(DEFAULT_MICRO_TUNING);
    setHistory([]);
    setEngine("local");
    setUploadStatus("success");
    setUploadError(null);
  };

  const handleUploadError = (error: Error) => {
    setUploadStatus("error");
    setUploadError(error.message);
  };

  const loadSamplePhoto = (sample: SamplePhoto, initialPreset?: StudioPreset) => {
    setPublicId(sample.publicId);
    setOriginalUrl(sample.secureUrl);
    setLocalBaseUrl(sample.secureUrl);
    setLocalResultUrl(null);
    setLocalJob(null);
    setAspectRatio("original");
    setActiveFilter("none");
    setMicroTuning(DEFAULT_MICRO_TUNING);
    setHistory([]);
    setUploadStatus("success");
    setUploadError(null);

    if (initialPreset) {
      const presetLayers = initialPreset.cloudLayers.map((l, idx) => ({
        ...l,
        id: `preset-${Date.now()}-${idx}`,
        enabled: true,
      })) as PhotoLayer[];
      setLayers(presetLayers);
      setEngine("cloud");
    } else {
      setLayers([]);
    }
  };

  const resetStudio = () => {
    if (activeJobIdRef.current) {
      cancelLocalJob(activeJobIdRef.current);
      activeJobIdRef.current = null;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setPublicId(null);
    setOriginalUrl(null);
    setLocalBaseUrl(null);
    setLocalResultUrl(null);
    setLocalJob(null);
    setLocalLastPrompt("");
    setLayers([]);
    setAspectRatio("original");
    setActiveFilter("none");
    setMicroTuning(DEFAULT_MICRO_TUNING);
    setHistory([]);
    setUploadStatus("idle");
    setUploadError(null);
  };

  // --- CLOUD LAYER STACK ACTIONS ---
  const addLayer = (layer: PhotoLayerInput) => {
    const full = {
      ...layer,
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      enabled: true,
    } as PhotoLayer;

    setLayers((prev) => {
      // Auto-deactivate conflicting layers
      let next = prev;
      if (full.type === "background_replace" || full.type === "cutout") {
        next = next.map((l) =>
          l.type === "background_replace" || l.type === "cutout"
            ? { ...l, enabled: false }
            : l,
        );
      } else if (full.type === "expand") {
        next = next.map((l) =>
          l.type === "expand" ? { ...l, enabled: false } : l,
        );
      }
      return [...next, full];
    });
    setEngine("cloud");
  };

  const toggleLayer = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)),
    );
  };

  const removeLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  };

  const clearLayers = () => {
    setLayers([]);
  };

  const applySmartCloudPrompt = async (prompt: string) => {
    if (!prompt.trim()) return;
    setEngine("cloud");

    // Try local Ollama smart parser first if connected, otherwise instant built-in parser
    let parsed: PhotoLayer[] = [];
    if (localHealth?.ollama?.connected) {
      const ollamaLayers = await parsePromptWithLocalOllama(prompt);
      if (ollamaLayers && ollamaLayers.length > 0) {
        parsed = normalizeParsedLayers(ollamaLayers);
      }
    }
    if (parsed.length === 0) {
      parsed = parsePromptToLayers(prompt);
    }

    // Filter out invalid generic placeholder layers
    const cleanParsed = parsed.filter((l) => {
      if (l.type === "replace") {
        const fromLower = l.from.toLowerCase().trim();
        if (
          !fromLower ||
          fromLower === "existing object" ||
          fromLower === "object" ||
          fromLower === "item" ||
          !l.to.trim()
        ) {
          return false;
        }
      }
      return true;
    });

    if (cleanParsed.length > 0) {
      setLayers((prev) => {
        const hasBg = cleanParsed.some(
          (l) => l.type === "background_replace" || l.type === "cutout",
        );
        const hasExpand = cleanParsed.some((l) => l.type === "expand");

        let next = prev;
        if (hasBg) {
          next = next.map((l) =>
            l.type === "background_replace" || l.type === "cutout"
              ? { ...l, enabled: false }
              : l,
          );
        }
        if (hasExpand) {
          next = next.map((l) =>
            l.type === "expand" ? { ...l, enabled: false } : l,
          );
        }
        return [...next, ...cleanParsed];
      });
    }
  };

  // --- LOCAL MAC AI (mflux) ACTIONS ---
  const runLocalAiPrompt = async (
    prompt: string,
    overrideAutoMask?: string,
  ) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    const sourceImage =
      chainLocalEdits && localResultUrl
        ? localResultUrl
        : localBaseUrl || originalUrl;
    if (!sourceImage) return;

    // Cancel any prior job
    if (activeJobIdRef.current) {
      await cancelLocalJob(activeJobIdRef.current);
      activeJobIdRef.current = null;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    setEngine("local");
    setLocalLastPrompt(cleanPrompt);
    setLocalJob({
      jobId: "starting",
      status: "queued",
      stage: "Connecting to your Mac's Apple Silicon GPU...",
      elapsed: 0,
      logs: [],
    });

    try {
      const isDataUrl = sourceImage.startsWith("data:");
      const effectiveAutoMask =
        overrideAutoMask !== undefined ? overrideAutoMask : localAutoMask;

      const { jobId } = await startLocalEdit({
        imageDataUrl: isDataUrl ? sourceImage : undefined,
        imageUrl: !isDataUrl ? sourceImage : undefined,
        prompt: cleanPrompt,
        model: localModel,
        autoMask:
          localModel === "qwen-2.1-turbo" && effectiveAutoMask.trim()
            ? effectiveAutoMask.trim()
            : undefined,
        resolution: localResolution,
        enhancePrompt: localModel === "qwen-2.1-turbo" && localEnhancePrompt,
        verify: localModel === "qwen-2.1-turbo" && localVerify,
      });

      activeJobIdRef.current = jobId;

      const poll = async () => {
        if (activeJobIdRef.current !== jobId) return;
        try {
          const status = await pollLocalJob(jobId);
          if (activeJobIdRef.current !== jobId) return;
          setLocalJob(status);

          if (status.status === "done" && status.imageDataUrl) {
            activeJobIdRef.current = null;
            setLocalResultUrl(status.imageDataUrl);
            addToHistory({
              label: cleanPrompt.slice(0, 38),
              engine: "local",
              url: status.imageDataUrl,
              aspectRatio,
              filter: activeFilter,
              prompt: cleanPrompt,
              localModel,
            });
            return;
          }

          if (status.status === "error" || status.status === "cancelled") {
            activeJobIdRef.current = null;
            return;
          }

          pollTimerRef.current = setTimeout(poll, 1000);
        } catch (err) {
          activeJobIdRef.current = null;
          setLocalJob({
            jobId,
            status: "error",
            stage: "Connection lost",
            elapsed: 0,
            logs: [],
            error:
              err instanceof Error
                ? err.message
                : "Lost connection to local mflux server",
          });
        }
      };

      pollTimerRef.current = setTimeout(poll, 700);
    } catch (err) {
      setLocalJob({
        jobId: "failed",
        status: "error",
        stage: "Could not start local edit",
        elapsed: 0,
        logs: [],
        error:
          err instanceof Error
            ? err.message
            : "Local AI server is not running. Start it with: npm run local-ai",
      });
    }
  };

  const cancelActiveLocalJob = async () => {
    const id = activeJobIdRef.current;
    activeJobIdRef.current = null;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (id) {
      await cancelLocalJob(id);
    }
    setLocalJob(null);
  };

  const applyPreset = (preset: StudioPreset) => {
    if (engine === "local" && localHealth?.ok && localHealth.mfluxInstalled) {
      runLocalAiPrompt(preset.localPrompt, preset.localAutoMask ?? "");
    } else {
      const nextLayers = preset.cloudLayers.map((l, idx) => ({
        ...l,
        id: `preset-${Date.now()}-${idx}`,
        enabled: true,
      })) as PhotoLayer[];
      // Replace conflicting backdrop if preset sets a backdrop, otherwise append
      const setsBackdrop = nextLayers.some(
        (l) => l.type === "background_replace" || l.type === "cutout",
      );
      setLayers((prev) =>
        setsBackdrop
          ? [
              ...prev.filter(
                (l) => l.type !== "background_replace" && l.type !== "cutout",
              ),
              ...nextLayers,
            ]
          : [...prev, ...nextLayers],
      );
      setEngine("cloud");
    }
  };

  // --- HISTORY MANAGEMENT ---
  const addToHistory = useCallback(
    (item: Omit<EditHistoryItem, "id" | "timestamp">) => {
      setHistory((prev) => {
        if (prev.some((h) => h.url === item.url)) return prev;
        const entry: EditHistoryItem = {
          ...item,
          id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
        };
        return [entry, ...prev].slice(0, 24);
      });
    },
    [],
  );

  const restoreHistoryItem = (item: EditHistoryItem) => {
    setAspectRatio(item.aspectRatio);
    setActiveFilter(item.filter);
    if (item.engine === "local") {
      setEngine("local");
      setLocalResultUrl(item.url);
      if (item.prompt) setLocalLastPrompt(item.prompt);
      if (item.localModel) setLocalModel(item.localModel);
    } else {
      setEngine("cloud");
      if (item.layers) setLayers(item.layers);
    }
  };

  const removeHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  // --- DERIVED IMAGE URLS ---
  const originalPreviewUrl = useMemo(() => {
    if (publicId) {
      return buildOriginalStudioPreview(publicId, aspectRatio).toURL();
    }
    return originalUrl;
  }, [publicId, originalUrl, aspectRatio]);

  const cloudResultUrl = useMemo(() => {
    if (!publicId) return null;
    const activeLayers = layers.filter((l) => l.enabled);
    if (
      activeLayers.length === 0 &&
      activeFilter === "none" &&
      aspectRatio === "original"
    ) {
      return originalUrl;
    }
    return buildStudioImage(
      publicId,
      layers,
      aspectRatio,
      activeFilter,
    ).toURL();
  }, [publicId, layers, aspectRatio, activeFilter, originalUrl]);

  const activeResultUrl =
    engine === "local"
      ? localResultUrl || originalPreviewUrl
      : cloudResultUrl || originalPreviewUrl;

  const hasCloudEdits = useMemo(
    () =>
      layers.some((l) => l.enabled) ||
      activeFilter !== "none" ||
      aspectRatio !== "original",
    [layers, activeFilter, aspectRatio],
  );

  const estimatedCredits = useMemo(
    () => estimateLayerCredits(layers),
    [layers],
  );

  return {
    // Source & upload
    uploadStatus,
    uploadError,
    publicId,
    originalUrl,
    originalPreviewUrl,
    hasPhoto,
    handleUploadStart,
    handleUploadSuccess,
    handleLocalOnlyUpload,
    handleUploadError,
    loadSamplePhoto,
    resetStudio,

    // Engine & Local Mac AI
    engine,
    setEngine,
    localHealth,
    refreshLocalHealth,
    localModel,
    setLocalModel,
    localResolution,
    setLocalResolution,
    localAutoMask,
    setLocalAutoMask,
    localEnhancePrompt,
    setLocalEnhancePrompt,
    localVerify,
    setLocalVerify,
    localJob,
    localResultUrl,
    localLastPrompt,
    chainLocalEdits,
    setChainLocalEdits,
    runLocalAiPrompt,
    cancelActiveLocalJob,

    // Cloud Layers & Settings
    layers,
    addLayer,
    toggleLayer,
    removeLayer,
    clearLayers,
    applySmartCloudPrompt,
    applyPreset,
    hasCloudEdits,
    estimatedCredits,
    cloudResultUrl,
    activeResultUrl,

    // Styling & Micro-Tuning
    aspectRatio,
    setAspectRatio,
    activeFilter,
    setActiveFilter,
    microTuning,
    setMicroTuning,

    // History
    history,
    addToHistory,
    restoreHistoryItem,
    removeHistoryItem,
  };
}
