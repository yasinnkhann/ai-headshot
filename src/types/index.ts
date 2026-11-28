import type { CloudinaryImage } from "@cloudinary/url-gen/assets/CloudinaryImage";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export type EditEngine = "local" | "cloud";

export type LocalModelId = "flux2-klein-4b" | "qwen-2.1-turbo";

export type LocalOperation = "edit" | "upscale" | "cutout";

export type LocalStyleMode =
  | ""
  | "identity"
  | "portrait"
  | "cinematic"
  | "storyboard"
  | "illustration";

export type ExportFormat = "jpg" | "png" | "webp";

export type AspectRatio = "original" | "4:5" | "1:1" | "16:9" | "9:16" | "3:2";

export type PortraitFilter = "none" | "enhance" | "bw" | "warm";

export type PresetCategory =
  | "headshots"
  | "creative"
  | "product"
  | "fixes";

export type WardrobeId =
  | "original"
  | "charcoal-blazer"
  | "navy-suit"
  | "black-turtleneck"
  | "linen-shirt"
  | "white-coat";

export interface WardrobeOption {
  id: WardrobeId;
  label: string;
  tagline: string;
  category:
    | "Original"
    | "Executive"
    | "Formal"
    | "Tech"
    | "Smart Casual"
    | "Clinical";
  prompt?: string;
}

/** Non-destructive Photoshop-style AI edit layer (Cloud Mode) */
export type PhotoLayer =
  | {
      id: string;
      type: "background_replace";
      label: string;
      prompt: string;
      enabled: boolean;
    }
  | {
      id: string;
      type: "replace";
      label: string;
      from: string;
      to: string;
      enabled: boolean;
    }
  | {
      id: string;
      type: "remove";
      label: string;
      prompt: string;
      enabled: boolean;
    }
  | {
      id: string;
      type: "recolor";
      label: string;
      target: string;
      color: string;
      enabled: boolean;
    }
  | {
      id: string;
      type: "expand";
      label: string;
      aspectRatio: Exclude<AspectRatio, "original">;
      prompt?: string;
      enabled: boolean;
    }
  | {
      id: string;
      type: "restore";
      label: string;
      enabled: boolean;
    }
  | {
      id: string;
      type: "upscale";
      label: string;
      enabled: boolean;
    }
  | {
      id: string;
      type: "cutout";
      label: string;
      enabled: boolean;
    };

export type DistributiveOmit<T, K extends keyof never> = T extends unknown
  ? Omit<T, K>
  : never;

export type PhotoLayerInput = DistributiveOmit<PhotoLayer, "id" | "enabled">;

export interface StudioPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  badge: string;
  /** Default layers applied when clicked in Cloud Mode */
  cloudLayers: PhotoLayerInput[];
  /** Natural-language prompt used when clicked in Local AI Mode */
  localPrompt: string;
  /** Optional target object for Qwen Auto-Mask in Local AI Mode */
  localAutoMask?: string;
}

export interface SamplePhoto {
  id: string;
  label: string;
  category: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  suggestedPrompts: string[];
}

export interface EditHistoryItem {
  id: string;
  label: string;
  engine: EditEngine;
  url: string;
  aspectRatio: AspectRatio;
  filter: PortraitFilter;
  layers?: PhotoLayer[];
  prompt?: string;
  localModel?: LocalModelId;
  seed?: number;
  timestamp: number;
}

export interface LocalReferenceImage {
  id: string;
  name: string;
  dataUrl: string;
}

export interface LocalGalleryItem {
  id: string;
  filename: string;
  imageUrl: string;
  createdAt: number;
  prompt: string;
  negativePrompt?: string;
  model: string;
  operation: LocalOperation;
  seed?: number;
  strength?: number;
  resolution?: number;
  styleMode?: string;
  loraPath?: string;
  autoMask?: string;
  hadBrushMask?: boolean;
  referenceCount?: number;
  elapsed?: number;
}

export interface LocalModelInfo {
  id: LocalModelId;
  name: string;
  description: string;
  installed: boolean;
  defaultSteps: number;
  supportsAutoMask: boolean;
  supportsBrushMask?: boolean;
  supportsVerify: boolean;
  supportsStrength?: boolean;
  supportsMultiImage?: boolean;
}

export interface LocalAiHealth {
  ok: boolean;
  mfluxInstalled: boolean;
  models: LocalModelInfo[];
  upscalerInstalled?: boolean;
  cutoutInstalled?: boolean;
  galleryDir?: string;
  galleryCount?: number;
  autoStartInstalled?: boolean;
  ollama: {
    connected: boolean;
    models: string[];
  };
  busy: boolean;
}

export interface LocalEditJobStatus {
  jobId: string;
  status: "queued" | "running" | "done" | "error" | "cancelled";
  phase?:
    | "queued"
    | "preparing"
    | "download"
    | "enhancing"
    | "generating"
    | "verifying"
    | "decoding"
    | "done"
    | "error"
    | "cancelled";
  stage: string;
  progress?: number | null;
  step?: number | null;
  totalSteps?: number | null;
  eta?: string | null;
  seed?: number | null;
  elapsed: number;
  logs: string[];
  imageDataUrl?: string | null;
  galleryItem?: LocalGalleryItem | null;
  error?: string | null;
}

export interface MicroTuningSettings {
  /** 0 to 100: Softens minor blemishes / grain */
  skinSoftening: number;
  /** -50 (Cool Daylight) to +50 (Golden Amber) */
  warmth: number;
  /** -25 to +25: Overall exposure */
  exposure: number;
  /** -20 to +30: Image depth and contrast */
  contrast: number;
  /** -50 (Muted/B&W) to +50 (Vivid) */
  saturation: number;
  /** 0 to 100: Edge falloff darkening to focus on subject */
  vignette: number;
  /** 0 to 100: Detail & eye catchlight clarity */
  eyeClarity: number;
}

export const DEFAULT_MICRO_TUNING: MicroTuningSettings = {
  skinSoftening: 0,
  warmth: 0,
  exposure: 0,
  contrast: 0,
  saturation: 0,
  vignette: 0,
  eyeClarity: 0,
};

/** Legacy types preserved for backwards compatibility */
export interface HeadshotPreset {
  id: string;
  name: string;
  description: string;
  category: "style";
  transformationChain: string;
  build: (
    publicId: string,
    aspectRatio?: AspectRatio,
    filter?: PortraitFilter,
    wardrobe?: WardrobeId,
  ) => CloudinaryImage;
}

export interface GeneratedHeadshotItem {
  id: string;
  presetId: string;
  presetName: string;
  aspectRatio: AspectRatio;
  filter: PortraitFilter;
  wardrobe?: WardrobeId;
  url: string;
  timestamp: number;
}
