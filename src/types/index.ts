import type { CloudinaryImage } from "@cloudinary/url-gen/assets/CloudinaryImage";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export type PresetCategory = "style";

export type ExportFormat = "jpg" | "png" | "webp";

export type AspectRatio = "4:5" | "1:1";

export interface HeadshotPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  /** Transformation chain for signed export (no public_id) */
  transformationChain: string;
  build: (publicId: string, aspectRatio?: AspectRatio) => CloudinaryImage;
}
