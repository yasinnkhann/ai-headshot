import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AspectRatio,
  CloudinaryUploadResult,
  EditEngine,
  EditHistoryItem,
  LocalAiHealth,
  LocalEditJobStatus,
  LocalGalleryItem,
  LocalModelId,
  LocalOperation,
  LocalReferenceImage,
  LocalStyleMode,
  MicroTuningSettings,
  PhotoLayer,
  PhotoLayerInput,
  PortraitFilter,
  SamplePhoto,
  StudioPreset,
  UploadStatus,
} from "../types";
import { DEFAULT_MICRO_TUNING } from "../types";
import {
  dataUrlToFile,
  uploadImageToCloudinary,
} from "../cloudinary/upload-direct";
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
  deleteLocalGalleryItem,
  fetchLocalGallery,
  fileToDataUrl,
  notifyRenderComplete,
  openLocalGalleryFolder,
  parsePromptWithLocalOllama,
  playCompletionChime,
  pollLocalJob,
  startLocalEdit,
} from "../lib/local-ai";

const DEFAULT_PAGE_TITLE = "Alterx";
const LOCAL_KNOWN_STORAGE_KEY = "alterx_local_enabled";

function readLocalKnown(): boolean {
  try {
    return window.localStorage.getItem(LOCAL_KNOWN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeLocalKnown(): void {
  try {
    window.localStorage.setItem(LOCAL_KNOWN_STORAGE_KEY, "1");
  } catch {
    // Ignore storage errors in private browsing
  }
}

export function useStudio() {
  // Base source photo state (supports BOTH Cloudinary uploads AND pure local-only files!)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [activeSamplePrompts, setActiveSamplePrompts] = useState<string[]>([]);
  const [promotingToCloud, setPromotingToCloud] = useState<boolean>(false);

  // Engine & local AI health
  const [engine, setEngine] = useState<EditEngine>("cloud");
  const [localHealth, setLocalHealth] = useState<LocalAiHealth | null>(null);
  const [checkingLocal, setCheckingLocal] = useState<boolean>(false);
  const [localModel, setLocalModel] = useState<LocalModelId>("qwen-2.1-turbo");
  const [localResolution, setLocalResolution] = useState<number>(768);
  const [localStrength, setLocalStrength] = useState<number>(1.0);
  const [localAutoMask, setLocalAutoMask] = useState<string>("");
  const [localMaskDataUrl, setLocalMaskDataUrl] = useState<string | null>(null);
  const [localMaskPreviewUrl, setLocalMaskPreviewUrl] = useState<string | null>(
    null,
  );
  const [localReferenceImages, setLocalReferenceImages] = useState<
    LocalReferenceImage[]
  >([]);
  const [localNegativePrompt, setLocalNegativePrompt] = useState<string>("");
  const [localStyleMode, setLocalStyleMode] = useState<LocalStyleMode>("");
  const [localLoraPath, setLocalLoraPath] = useState<string>("");
  const [localLoraScale, setLocalLoraScale] = useState<number>(1.0);
  const [localSeed, setLocalSeed] = useState<string>("");
  const [localSeedLocked, setLocalSeedLocked] = useState<boolean>(false);
  const [localLastSeed, setLocalLastSeed] = useState<number | null>(null);
  const [localEnhancePrompt, setLocalEnhancePrompt] = useState<boolean>(true);
  const [localVerify, setLocalVerify] = useState<boolean>(false);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(true);

  const [localJob, setLocalJob] = useState<LocalEditJobStatus | null>(null);
  const [localResultUrl, setLocalResultUrl] = useState<string | null>(null);
  const [localPreviousResultUrl, setLocalPreviousResultUrl] = useState<
    string | null
  >(null);
  const [localLastSourceUrl, setLocalLastSourceUrl] = useState<string | null>(
    null,
  );
  const [localBaseUrl, setLocalBaseUrl] = useState<string | null>(null);
  const [localLastPrompt, setLocalLastPrompt] = useState<string>("");
  const [localLastOperation, setLocalLastOperation] =
    useState<LocalOperation>("edit");
  const [chainLocalEdits, setChainLocalEdits] = useState<boolean>(true);

  // Auto-saved persistent Local Studio Library (~/Pictures/AI-Photo-Studio)
  const [galleryItems, setGalleryItems] = useState<LocalGalleryItem[]>([]);
  const [galleryDir, setGalleryDir] = useState<string | undefined>(undefined);
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false);

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
  const soundAlertsRef = useRef<boolean>(soundAlertsEnabled);

  useEffect(() => {
    soundAlertsRef.current = soundAlertsEnabled;
  }, [soundAlertsEnabled]);

  const refreshGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const data = await fetchLocalGallery();
      if (data) {
        setGalleryItems(data.items);
        setGalleryDir(data.dir);
      }
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  // Lazy + Remember local AI health check:
  // - Never probes 127.0.0.1 for first-time visitors (zero scary PNA prompts / console errors)
  // - Auto-connects on mount only for returning Mac users who previously connected
  // - Never hijacks users back to Local mode on tab focus
  const refreshLocalHealth = useCallback(
    async (opts?: { switchToLocal?: boolean }) => {
      setCheckingLocal(true);
      try {
        const health = await checkLocalAiHealth();
        setLocalHealth(health);
        if (health?.ok && health.mfluxInstalled) {
          writeLocalKnown();
          setGalleryDir(health.galleryDir);
          void refreshGallery();
          if (opts?.switchToLocal) {
            setEngine("local");
          }
        }
        return health;
      } finally {
        setCheckingLocal(false);
      }
    },
    [refreshGallery],
  );

  const tryConnectLocal = useCallback(async (): Promise<boolean> => {
    const health = await refreshLocalHealth({ switchToLocal: true });
    return Boolean(health?.ok && health.mfluxInstalled);
  }, [refreshLocalHealth]);

  useEffect(() => {
    if (!readLocalKnown()) return;
    let active = true;
    checkLocalAiHealth().then((health) => {
      if (!active) return;
      setLocalHealth(health);
      if (health?.ok && health.mfluxInstalled) {
        setEngine("local");
        setGalleryDir(health.galleryDir);
        void refreshGallery();
      }
    });
    return () => {
      active = false;
    };
  }, [refreshGallery]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      document.title = DEFAULT_PAGE_TITLE;
    };
  }, []);

  // Live Chrome Tab Title progress & ETA while rendering locally
  useEffect(() => {
    if (
      localJob &&
      (localJob.status === "queued" || localJob.status === "running")
    ) {
      const pct =
        typeof localJob.progress === "number" ? `${localJob.progress}%` : "...";
      const etaPart = localJob.eta ? ` · ~${localJob.eta}` : "";
      const prefix =
        localJob.phase === "download" ? `DL ${pct}` : `${pct}${etaPart}`;
      document.title = `(${prefix}) ${DEFAULT_PAGE_TITLE}`;
    } else {
      document.title = DEFAULT_PAGE_TITLE;
    }
  }, [localJob]);

  const hasPhoto = Boolean(publicId || originalUrl);

  const resetLocalEditState = () => {
    setLocalResultUrl(null);
    setLocalPreviousResultUrl(null);
    setLocalLastSourceUrl(null);
    setLocalJob(null);
    setLocalMaskDataUrl(null);
    setLocalMaskPreviewUrl(null);
    setLocalReferenceImages([]);
    setLocalLastSeed(null);
    setLocalLastOperation("edit");
  };

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
    setActiveSamplePrompts([]);
    resetLocalEditState();
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
    setActiveSamplePrompts([]);
    resetLocalEditState();
    setLayers([]);
    setAspectRatio("original");
    setActiveFilter("none");
    setMicroTuning(DEFAULT_MICRO_TUNING);
    setHistory([]);
    setEngine("local");
    setUploadStatus("success");
    setUploadError(null);
  };

  /** Promote a locally-opened private photo to Cloudinary on-demand when the user wants Cloud Photoshop tools */
  const promoteLocalPhotoToCloud = async () => {
    if (publicId || !originalUrl || promotingToCloud) return;
    setPromotingToCloud(true);
    setUploadError(null);
    try {
      const file = await dataUrlToFile(originalUrl, "alterx-photo");
      const result = await uploadImageToCloudinary(file);
      setPublicId(result.public_id);
      setOriginalUrl(result.secure_url);
      if (!localResultUrl) {
        setLocalBaseUrl(result.secure_url);
      }
      setEngine("cloud");
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Could not upload photo to Cloud Photoshop.",
      );
    } finally {
      setPromotingToCloud(false);
    }
  };

  const handleUploadError = (error: Error) => {
    setUploadStatus("error");
    setUploadError(error.message);
  };

  const loadSamplePhoto = (sample: SamplePhoto, preset?: StudioPreset) => {
    setPublicId(sample.publicId);
    setOriginalUrl(sample.secureUrl);
    setLocalBaseUrl(sample.secureUrl);
    setActiveSamplePrompts(sample.suggestedPrompts || []);
    resetLocalEditState();
    setAspectRatio("original");
    setActiveFilter("none");
    setMicroTuning(DEFAULT_MICRO_TUNING);
    setHistory([]);
    setUploadStatus("success");
    setUploadError(null);

    if (preset) {
      if (engine === "local" && localHealth?.ok && localHealth.mfluxInstalled) {
        setLayers([]);
        setTimeout(() => {
          void runLocalAiPrompt(preset.localPrompt, {
            overrideAutoMask: preset.localAutoMask ?? "",
            overrideSourceUrl: sample.secureUrl,
          });
        }, 50);
      } else {
        setEngine("cloud");
        setLayers(
          preset.cloudLayers.map((l, idx) => ({
            ...l,
            id: `preset-${Date.now()}-${idx}`,
            enabled: true,
          })) as PhotoLayer[],
        );
      }
    } else {
      setLayers([]);
    }
  };

  const resetStudio = () => {
    if (activeJobIdRef.current) {
      void cancelLocalJob(activeJobIdRef.current);
      activeJobIdRef.current = null;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setPublicId(null);
    setOriginalUrl(null);
    setLocalBaseUrl(null);
    setActiveSamplePrompts([]);
    resetLocalEditState();
    setLayers([]);
    setHistory([]);
    setAspectRatio("original");
    setActiveFilter("none");
    setMicroTuning(DEFAULT_MICRO_TUNING);
    setUploadStatus("idle");
    setUploadError(null);
  };

  // --- BRUSH MASK & MULTI-IMAGE REFERENCE ACTIONS ---
  const saveLocalBrushMask = (maskDataUrl: string, previewDataUrl: string) => {
    setLocalMaskDataUrl(maskDataUrl);
    setLocalMaskPreviewUrl(previewDataUrl);
    // Brush masking is supported by Qwen 2.1 Turbo — auto-select it so it works immediately
    setLocalModel("qwen-2.1-turbo");
  };

  const clearLocalBrushMask = () => {
    setLocalMaskDataUrl(null);
    setLocalMaskPreviewUrl(null);
  };

  const addLocalReferenceFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 3);
    const additions: LocalReferenceImage[] = [];
    for (const file of arr) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataUrl(file);
      additions.push({
        id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        dataUrl,
      });
    }
    if (additions.length > 0) {
      setLocalReferenceImages((prev) => [...prev, ...additions].slice(0, 3));
    }
  };

  const addLocalReferenceFromUrl = (name: string, url: string) => {
    setLocalReferenceImages((prev) =>
      [
        ...prev,
        {
          id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          dataUrl: url,
        },
      ].slice(0, 3),
    );
  };

  const removeLocalReferenceImage = (id: string) => {
    setLocalReferenceImages((prev) => prev.filter((r) => r.id !== id));
  };

  const clearLocalReferenceImages = () => {
    setLocalReferenceImages([]);
  };

  // --- CLOUD LAYER STACK ACTIONS ---
  const addLayer = (layer: PhotoLayerInput) => {
    const full = {
      ...layer,
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      enabled: true,
    } as PhotoLayer;

    setLayers((prev) => {
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
  const executeLocalJob = async (opts: {
    operation: LocalOperation;
    prompt: string;
    sourceImage: string;
    overrideAutoMask?: string;
    forceNewSeed?: boolean;
    upscaleFactor?: string;
  }) => {
    // Cancel any prior job
    if (activeJobIdRef.current) {
      await cancelLocalJob(activeJobIdRef.current);
      activeJobIdRef.current = null;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    setEngine("local");
    setLocalLastSourceUrl(opts.sourceImage);
    setLocalLastOperation(opts.operation);
    if (opts.operation === "edit") {
      setLocalLastPrompt(opts.prompt);
    }

    setLocalJob({
      jobId: "starting",
      status: "queued",
      phase: "queued",
      progress: 0,
      stage: "Connecting to your Mac's Apple Silicon GPU...",
      elapsed: 0,
      logs: [],
    });

    try {
      const isDataUrl = opts.sourceImage.startsWith("data:");
      const effectiveAutoMask =
        opts.overrideAutoMask !== undefined
          ? opts.overrideAutoMask
          : localAutoMask;

      let seedToSend: number | undefined;
      if (!opts.forceNewSeed) {
        if (localSeedLocked && localLastSeed) {
          seedToSend = localLastSeed;
        } else if (localSeed.trim() && /^\d+$/.test(localSeed.trim())) {
          seedToSend = Number(localSeed.trim());
        }
      }

      const { jobId } = await startLocalEdit({
        operation: opts.operation,
        imageDataUrl: isDataUrl ? opts.sourceImage : undefined,
        imageUrl: !isDataUrl ? opts.sourceImage : undefined,
        referenceImages:
          opts.operation === "edit" && localReferenceImages.length > 0
            ? localReferenceImages.map((r) => r.dataUrl)
            : undefined,
        maskDataUrl:
          opts.operation === "edit" &&
          localModel === "qwen-2.1-turbo" &&
          localMaskDataUrl
            ? localMaskDataUrl
            : undefined,
        prompt: opts.prompt,
        negativePrompt:
          opts.operation === "edit" && localNegativePrompt.trim()
            ? localNegativePrompt.trim()
            : undefined,
        model: localModel,
        autoMask:
          opts.operation === "edit" &&
          localModel === "qwen-2.1-turbo" &&
          !localMaskDataUrl &&
          effectiveAutoMask.trim()
            ? effectiveAutoMask.trim()
            : undefined,
        strength:
          opts.operation === "edit" && localModel === "qwen-2.1-turbo"
            ? localStrength
            : undefined,
        resolution: localResolution,
        seed: seedToSend,
        styleMode:
          opts.operation === "edit" && localStyleMode
            ? localStyleMode
            : undefined,
        loraPath:
          opts.operation === "edit" && localLoraPath.trim()
            ? localLoraPath.trim()
            : undefined,
        loraScale:
          opts.operation === "edit" && localLoraPath.trim()
            ? localLoraScale
            : undefined,
        enhancePrompt:
          opts.operation === "edit" &&
          localModel === "qwen-2.1-turbo" &&
          localEnhancePrompt,
        verify:
          opts.operation === "edit" &&
          localModel === "qwen-2.1-turbo" &&
          localVerify,
        upscaleFactor: opts.upscaleFactor,
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
            setLocalPreviousResultUrl(opts.sourceImage);
            setLocalResultUrl(status.imageDataUrl);
            if (typeof status.seed === "number") {
              setLocalLastSeed(status.seed);
            }
            if (opts.operation === "edit" && localMaskDataUrl) {
              // Clear one-shot brush mask so follow-ups don't accidentally reuse an old silhouette
              setLocalMaskDataUrl(null);
              setLocalMaskPreviewUrl(null);
            }

            const historyLabel =
              opts.operation === "upscale"
                ? `Upscale ${opts.upscaleFactor || "2x"}`
                : opts.operation === "cutout"
                  ? "Local PNG Cutout"
                  : opts.prompt.slice(0, 38);

            addToHistory({
              label: historyLabel,
              engine: "local",
              url: status.imageDataUrl,
              aspectRatio,
              filter: activeFilter,
              prompt: opts.prompt,
              localModel,
              seed: typeof status.seed === "number" ? status.seed : undefined,
            });

            if (status.galleryItem) {
              setGalleryItems((prev) => [
                status.galleryItem!,
                ...prev.filter((g) => g.id !== status.galleryItem!.id),
              ]);
            } else {
              void refreshGallery();
            }

            if (soundAlertsRef.current) {
              playCompletionChime();
              notifyRenderComplete(historyLabel);
            }
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
            phase: "error",
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
        phase: "error",
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

  const runLocalAiPrompt = async (
    prompt: string,
    options?: {
      overrideAutoMask?: string;
      overrideSourceUrl?: string;
      forceNewSeed?: boolean;
    },
  ) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    const sourceImage =
      options?.overrideSourceUrl ||
      (chainLocalEdits && localResultUrl
        ? localResultUrl
        : localBaseUrl || originalUrl);
    if (!sourceImage) return;

    await executeLocalJob({
      operation: "edit",
      prompt: cleanPrompt,
      sourceImage,
      overrideAutoMask: options?.overrideAutoMask,
      forceNewSeed: options?.forceNewSeed,
    });
  };

  /** Retry the last prompt against the exact same source image using a brand new random seed */
  const regenerateLocalEdit = async () => {
    if (!localLastPrompt.trim()) return;
    const retrySource = localLastSourceUrl || localBaseUrl || originalUrl;
    if (!retrySource) return;
    setLocalSeedLocked(false);
    setLocalSeed("");
    await executeLocalJob({
      operation: "edit",
      prompt: localLastPrompt,
      sourceImage: retrySource,
      forceNewSeed: true,
    });
  };

  const runLocalUpscale = async (scale = "2x") => {
    const sourceImage = localResultUrl || localBaseUrl || originalUrl;
    if (!sourceImage) return;
    await executeLocalJob({
      operation: "upscale",
      prompt: `Local AI Super-Upscale (${scale})`,
      sourceImage,
      upscaleFactor: scale,
      forceNewSeed: true,
    });
  };

  const runLocalCutout = async () => {
    const sourceImage = localResultUrl || localBaseUrl || originalUrl;
    if (!sourceImage) return;
    await executeLocalJob({
      operation: "cutout",
      prompt: "Local AI Transparent PNG Cutout",
      sourceImage,
      forceNewSeed: true,
    });
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

  // --- LOCAL GALLERY ACTIONS ---
  const loadGalleryItemIntoStudio = (item: LocalGalleryItem) => {
    setPublicId(null);
    setOriginalUrl(item.imageUrl);
    setLocalBaseUrl(item.imageUrl);
    setLocalResultUrl(item.imageUrl);
    setLocalPreviousResultUrl(null);
    setLocalLastSourceUrl(item.imageUrl);
    setLocalLastPrompt(item.prompt || "");
    setLocalLastOperation(item.operation || "edit");
    if (
      item.model === "flux2-klein-4b" ||
      item.model === "qwen-2.1-turbo"
    ) {
      setLocalModel(item.model);
    }
    if (typeof item.seed === "number") {
      setLocalLastSeed(item.seed);
    }
    if (item.negativePrompt) {
      setLocalNegativePrompt(item.negativePrompt);
    }
    setLocalMaskDataUrl(null);
    setLocalMaskPreviewUrl(null);
    setLayers([]);
    setEngine("local");
    setUploadStatus("success");
    setUploadError(null);
  };

  const deleteGalleryEntry = async (itemId: string) => {
    const ok = await deleteLocalGalleryItem(itemId);
    if (ok) {
      setGalleryItems((prev) => prev.filter((item) => item.id !== itemId));
    }
  };

  const openGalleryInFinder = async () => {
    await openLocalGalleryFolder();
  };

  const requestDesktopNotifications = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore
      }
    }
  };

  const applyPreset = (preset: StudioPreset) => {
    if (engine === "local" && localHealth?.ok && localHealth.mfluxInstalled) {
      void runLocalAiPrompt(preset.localPrompt, {
        overrideAutoMask: preset.localAutoMask ?? "",
      });
    } else {
      const nextLayers = preset.cloudLayers.map((l, idx) => ({
        ...l,
        id: `preset-${Date.now()}-${idx}`,
        enabled: true,
      })) as PhotoLayer[];
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
      if (typeof item.seed === "number") setLocalLastSeed(item.seed);
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

  const isLocalGenerating =
    localJob?.status === "queued" || localJob?.status === "running";

  return {
    // Source & upload
    uploadStatus,
    uploadError,
    publicId,
    originalUrl,
    originalPreviewUrl,
    hasPhoto,
    activeSamplePrompts,
    promotingToCloud,
    promoteLocalPhotoToCloud,
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
    checkingLocal,
    isLocalGenerating,
    refreshLocalHealth,
    tryConnectLocal,
    localModel,
    setLocalModel,
    localResolution,
    setLocalResolution,
    localStrength,
    setLocalStrength,
    localAutoMask,
    setLocalAutoMask,
    localMaskDataUrl,
    localMaskPreviewUrl,
    saveLocalBrushMask,
    clearLocalBrushMask,
    localReferenceImages,
    addLocalReferenceFiles,
    addLocalReferenceFromUrl,
    removeLocalReferenceImage,
    clearLocalReferenceImages,
    localNegativePrompt,
    setLocalNegativePrompt,
    localStyleMode,
    setLocalStyleMode,
    localLoraPath,
    setLocalLoraPath,
    localLoraScale,
    setLocalLoraScale,
    localSeed,
    setLocalSeed,
    localSeedLocked,
    setLocalSeedLocked,
    localLastSeed,
    localEnhancePrompt,
    setLocalEnhancePrompt,
    localVerify,
    setLocalVerify,
    soundAlertsEnabled,
    setSoundAlertsEnabled,
    requestDesktopNotifications,
    localJob,
    localResultUrl,
    localPreviousResultUrl,
    localLastPrompt,
    localLastOperation,
    chainLocalEdits,
    setChainLocalEdits,
    runLocalAiPrompt,
    regenerateLocalEdit,
    runLocalUpscale,
    runLocalCutout,
    cancelActiveLocalJob,

    // Auto-saved Local Gallery
    galleryItems,
    galleryDir,
    galleryLoading,
    refreshGallery,
    loadGalleryItemIntoStudio,
    deleteGalleryEntry,
    openGalleryInFinder,

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
