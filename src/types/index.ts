import type { CloudinaryImage } from "@cloudinary/url-gen/assets/CloudinaryImage";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export type PresetCategory = "style";

export type ExportFormat = "jpg" | "png" | "webp";

export type AspectRatio = "4:5" | "1:1";

export type PortraitFilter = "none" | "enhance" | "bw" | "warm";

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
  category: "Original" | "Executive" | "Formal" | "Tech" | "Smart Casual" | "Clinical";
  prompt?: string;
}

export interface HeadshotPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  /** Transformation chain for signed export (no public_id) */
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

export interface MicroTuningSettings {
  /** 0 to 100: Softens minor blemishes while preserving natural texture */
  skinSoftening: number;
  /** -50 (Cool Daylight) to +50 (Golden Amber) */
  warmth: number;
  /** -25 to +25: Fine-tunes overall facial exposure */
  exposure: number;
  /** -20 to +30: Portrait depth and contrast */
  contrast: number;
  /** 0 to 100: Edge falloff darkening to focus on subject */
  vignette: number;
  /** 0 to 100: Eye crispness and iris catchlight enhancement */
  eyeClarity: number;
}

export const DEFAULT_MICRO_TUNING: MicroTuningSettings = {
  skinSoftening: 0,
  warmth: 0,
  exposure: 0,
  contrast: 0,
  vignette: 0,
  eyeClarity: 0,
};

