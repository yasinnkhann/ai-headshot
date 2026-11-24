import { useMemo, useState } from "react";
import type { UploadStatus, HeadshotPreset } from "../types";
import type { CloudinaryUploadResult } from "../cloudinary/UploadWidget";
import {
  ALL_PRESETS,
  buildCustomPreset,
  buildOriginalPreview,
  getPresetById,
} from "../lib/transformations";
import type { CloudinaryImage } from "@cloudinary/url-gen/index";

export function useHeadshot() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [customPreset, setCustomPreset] = useState<HeadshotPreset | null>(null);

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
    // Auto-select the first preset so the transformation preview starts
    setSelectedPresetId("corporate-executive");
    setUploadStatus("success");
    setUploadError(null);
  };

  const handleUploadError = (error: Error) => {
    setUploadStatus("error");
    setUploadError(error.message);
  };

  const resetUpload = () => {
    setPublicId(null);
    setSelectedPresetId(null);
    setCustomPreset(null);
    setUploadStatus("idle");
    setUploadError(null);
  };

  const generateCustomPreset = (prompt: string) => {
    if (!prompt.trim() || !publicId) return;
    const preset = buildCustomPreset(prompt);
    setCustomPreset(preset);
    setSelectedPresetId("custom-backdrop");
  };

  const originalImage = useMemo(() => {
    if (!publicId) return null;
    return buildOriginalPreview(publicId);
  }, [publicId]);

  const presetImages = useMemo(() => {
    if (!publicId) return [];
    return ALL_PRESETS.map((preset) => ({
      preset,
      image: preset.build(publicId),
    }));
  }, [publicId]);

  const selectedPreset: HeadshotPreset | null = useMemo(() => {
    if (selectedPresetId === "custom-backdrop" && customPreset) {
      return customPreset;
    }
    return selectedPresetId ? (getPresetById(selectedPresetId) ?? null) : null;
  }, [selectedPresetId, customPreset]);

  const selectedImage: CloudinaryImage | null = useMemo(() => {
    if (!publicId || !selectedPreset) return null;
    return selectedPreset.build(publicId);
  }, [publicId, selectedPreset]);

  return {
    uploadError,
    uploadStatus,
    handleUploadError,
    handleUploadStart,
    handleUploadSuccess,
    resetUpload,
    generateCustomPreset,
    customPreset,
    originalImage,
    presetImages,
    hasUpload: Boolean(publicId),
    selectPreset: setSelectedPresetId,
    selectedPresetId,
    selectedImage,
    selectedPreset,
    publicId,
  };
}
