import { useMemo, useState } from "react";
import type {
  UploadStatus,
  HeadshotPreset,
  AspectRatio,
  PortraitFilter,
  GeneratedHeadshotItem,
} from "../types";
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
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [activeFilter, setActiveFilter] = useState<PortraitFilter>("none");
  const [gallery, setGallery] = useState<GeneratedHeadshotItem[]>([]);

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
    setAspectRatio("4:5");
    setActiveFilter("none");
    setGallery([]);
    setUploadStatus("idle");
    setUploadError(null);
  };

  const generateCustomPreset = (prompt: string) => {
    if (!prompt.trim() || !publicId) return;
    const preset = buildCustomPreset(prompt);
    setCustomPreset(preset);
    setSelectedPresetId("custom-backdrop");
  };

  const addToGallery = (item: Omit<GeneratedHeadshotItem, "id" | "timestamp">) => {
    setGallery((prev) => {
      // Avoid duplicate URLs in gallery
      if (prev.some((g) => g.url === item.url)) return prev;
      const newItem: GeneratedHeadshotItem = {
        ...item,
        id: `headshot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      };
      return [newItem, ...prev];
    });
  };

  const removeFromGallery = (id: string) => {
    setGallery((prev) => prev.filter((item) => item.id !== id));
  };

  const restoreGalleryItem = (item: GeneratedHeadshotItem) => {
    setSelectedPresetId(item.presetId);
    setAspectRatio(item.aspectRatio);
    setActiveFilter(item.filter);
  };

  const originalImage = useMemo(() => {
    if (!publicId) return null;
    return buildOriginalPreview(publicId, aspectRatio, activeFilter);
  }, [publicId, aspectRatio, activeFilter]);

  const presetImages = useMemo(() => {
    if (!publicId) return [];
    return ALL_PRESETS.map((preset) => ({
      preset,
      image: preset.build(publicId, aspectRatio, activeFilter),
    }));
  }, [publicId, aspectRatio, activeFilter]);

  const selectedPreset: HeadshotPreset | null = useMemo(() => {
    if (selectedPresetId === "custom-backdrop" && customPreset) {
      return customPreset;
    }
    return selectedPresetId ? (getPresetById(selectedPresetId) ?? null) : null;
  }, [selectedPresetId, customPreset]);

  const selectedImage: CloudinaryImage | null = useMemo(() => {
    if (!publicId || !selectedPreset) return null;
    return selectedPreset.build(publicId, aspectRatio, activeFilter);
  }, [publicId, selectedPreset, aspectRatio, activeFilter]);

  return {
    uploadError,
    uploadStatus,
    handleUploadError,
    handleUploadStart,
    handleUploadSuccess,
    resetUpload,
    generateCustomPreset,
    customPreset,
    aspectRatio,
    setAspectRatio,
    activeFilter,
    setActiveFilter,
    gallery,
    addToGallery,
    removeFromGallery,
    restoreGalleryItem,
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
