import type { CloudinaryImage } from "@cloudinary/url-gen/index";
import { cld } from "../cloudinary/config";
import { fill } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { format, quality } from "@cloudinary/url-gen/actions/delivery";
import { auto as autoQuality } from "@cloudinary/url-gen/qualifiers/quality";
import { auto } from "@cloudinary/url-gen/qualifiers/format";
import type {
  AspectRatio,
  ExportFormat,
  HeadshotPreset,
  PortraitFilter,
  WardrobeId,
  WardrobeOption,
} from "../types";
import {
  generativeBackgroundReplace,
  generativeReplace,
  enhance,
  grayscale,
  sepia,
} from "@cloudinary/url-gen/actions/effect";

export const WARDROBE_OPTIONS: WardrobeOption[] = [
  {
    id: "original",
    label: "Current Outfit",
    tagline: "Keep what you are wearing",
    category: "Original",
  },
  {
    id: "charcoal-blazer",
    label: "Executive Blazer",
    tagline: "Charcoal wool blazer & crisp shirt",
    category: "Executive",
    prompt: "tailored modern charcoal grey wool blazer jacket with crisp white collared dress shirt",
  },
  {
    id: "navy-suit",
    label: "Navy Suit & Tie",
    tagline: "Navy suit jacket and silk tie",
    category: "Formal",
    prompt: "professional formal navy blue suit jacket with white dress shirt and patterned silk tie",
  },
  {
    id: "black-turtleneck",
    label: "Tech Turtleneck",
    tagline: "Sleek minimalist black knit",
    category: "Tech",
    prompt: "sleek fitted black turtleneck knit sweater",
  },
  {
    id: "linen-shirt",
    label: "Casual Linen Shirt",
    tagline: "Relaxed light blue linen button-down",
    category: "Smart Casual",
    prompt: "relaxed tailored light blue linen button-down collared shirt",
  },
  {
    id: "white-coat",
    label: "Clinical Lab Coat",
    tagline: "Physician & medical white coat",
    category: "Clinical",
    prompt: "professional medical physician white lab coat with collared dress shirt",
  },
];

export function getWardrobeById(id: WardrobeId): WardrobeOption | undefined {
  return WARDROBE_OPTIONS.find((w) => w.id === id);
}

function applyWardrobe(img: CloudinaryImage, wardrobe: WardrobeId = "original") {
  if (wardrobe === "original") return img;
  const opt = getWardrobeById(wardrobe);
  if (!opt || !opt.prompt) return img;
  return img.effect(generativeReplace().from("shirt").to(opt.prompt));
}

export function getDimensions(aspectRatio: AspectRatio = "4:5") {
  return aspectRatio === "1:1"
    ? { width: 800, height: 800 }
    : { width: 600, height: 750 };
}

function applyFilter(img: CloudinaryImage, filter: PortraitFilter = "none") {
  if (filter === "enhance") {
    return img.effect(enhance());
  }
  if (filter === "bw") {
    return img.effect(grayscale());
  }
  if (filter === "warm") {
    return img.effect(sepia());
  }
  return img;
}

function finalizeImage(
  img: CloudinaryImage,
  aspectRatio: AspectRatio = "4:5",
  filter: PortraitFilter = "none",
) {
  const { width, height } = getDimensions(aspectRatio);
  const withFilter = applyFilter(img, filter);
  return withFilter
    .resize(fill().width(width).height(height).gravity(autoGravity()))
    .delivery(format(auto()))
    .delivery(quality(autoQuality()));
}

export const HEADSHOT_PRESETS: HeadshotPreset[] = [
  {
    id: "corporate-executive",
    name: "Corporate Executive",
    description: "Modern office setting with bookshelves & professional lighting",
    category: "style",
    build: (
      publicId,
      aspectRatio = "4:5",
      filter = "none",
      wardrobe = "original",
    ) =>
      finalizeImage(
        applyWardrobe(
          cld
            .image(publicId)
            .effect(
              generativeBackgroundReplace().prompt(
                "modern corporate executive office with bookshelves and professional soft portrait lighting bokeh",
              ),
            ),
          wardrobe,
        ),
        aspectRatio,
        filter,
      ),
    transformationChain:
      "e_gen_background_replace:prompt_modern%20corporate%20executive%20office%20with%20bookshelves%20and%20professional%20soft%20portrait%20lighting%20bokeh/c_fill,w_600,h_750,g_auto/f_auto/q_auto",
  },
  {
    id: "studio-minimal",
    name: "Studio Minimalist",
    description: "Neutral grey studio background with soft rim lighting",
    category: "style",
    transformationChain:
      "e_gen_background_replace:prompt_minimalist%20neutral%20grey%20photo%20studio%20backdrop%20soft%20rim%20lighting/c_fill,w_600,h_750,g_auto/f_auto/q_auto",
    build: (
      publicId,
      aspectRatio = "4:5",
      filter = "none",
      wardrobe = "original",
    ) =>
      finalizeImage(
        applyWardrobe(
          cld
            .image(publicId)
            .effect(
              generativeBackgroundReplace().prompt(
                "minimalist neutral grey photo studio backdrop soft rim lighting",
              ),
            ),
          wardrobe,
        ),
        aspectRatio,
        filter,
      ),
  },
  {
    id: "outdoor-professional",
    name: "Outdoor Professional",
    description: "Golden hour sunlight with lush garden portrait bokeh",
    category: "style",
    transformationChain:
      "e_gen_background_replace:prompt_outdoor%20garden%20with%20trees%20golden%20hour%20sunlight%20natural%20bokeh/c_fill,w_600,h_750,g_auto/f_auto/q_auto",
    build: (
      publicId,
      aspectRatio = "4:5",
      filter = "none",
      wardrobe = "original",
    ) =>
      finalizeImage(
        applyWardrobe(
          cld
            .image(publicId)
            .effect(
              generativeBackgroundReplace().prompt(
                "outdoor garden with trees golden hour sunlight natural bokeh",
              ),
            ),
          wardrobe,
        ),
        aspectRatio,
        filter,
      ),
  },
  {
    id: "urban-business",
    name: "Urban Business",
    description: "City skyline with architectural depth and soft street bokeh",
    category: "style",
    transformationChain:
      "e_gen_background_replace:prompt_city%20street%20with%20modern%20architecture%20urban%20bokeh/c_fill,w_600,h_750,g_auto/f_auto/q_auto",
    build: (
      publicId,
      aspectRatio = "4:5",
      filter = "none",
      wardrobe = "original",
    ) =>
      finalizeImage(
        applyWardrobe(
          cld
            .image(publicId)
            .effect(
              generativeBackgroundReplace().prompt(
                "city street with modern architecture urban bokeh",
              ),
            ),
          wardrobe,
        ),
        aspectRatio,
        filter,
      ),
  },
  {
    id: "executive-suit",
    name: "Executive Suit & Tie",
    description: "Outfit swap to a sharp navy suit jacket and tie",
    category: "style",
    transformationChain:
      "e_gen_replace:from_shirt;to_suit/c_fill,w_600,h_750,g_auto/f_auto/q_auto",
    build: (
      publicId,
      aspectRatio = "4:5",
      filter = "none",
      wardrobe = "original",
    ) =>
      finalizeImage(
        applyWardrobe(
          cld.image(publicId),
          wardrobe === "original" ? "navy-suit" : wardrobe,
        ),
        aspectRatio,
        filter,
      ),
  },
];

export const ALL_PRESETS = HEADSHOT_PRESETS;

export function buildOriginalPreview(
  publicId: string,
  aspectRatio: AspectRatio = "4:5",
  filter: PortraitFilter = "none",
): CloudinaryImage {
  const { width, height } = getDimensions(aspectRatio);
  // Pure original selfie without wardrobe replacement for authentic Before/After comparison
  const img = applyFilter(cld.image(publicId), filter);
  return img
    .resize(fill().width(width).height(height).gravity(autoGravity()))
    .delivery(format(auto()))
    .delivery(quality(autoQuality()));
}

export function buildCustomPreset(prompt: string): HeadshotPreset {
  const sanitizedPrompt = prompt.trim();
  return {
    id: "custom-backdrop",
    name: "Custom Setting",
    description: sanitizedPrompt,
    category: "style",
    transformationChain: `e_gen_background_replace:prompt_${encodeURIComponent(sanitizedPrompt)}/c_fill,w_600,h_750,g_auto/f_auto/q_auto`,
    build: (
      publicId: string,
      aspectRatio: AspectRatio = "4:5",
      filter: PortraitFilter = "none",
      wardrobe: WardrobeId = "original",
    ) =>
      finalizeImage(
        applyWardrobe(
          cld
            .image(publicId)
            .effect(generativeBackgroundReplace().prompt(sanitizedPrompt)),
          wardrobe,
        ),
        aspectRatio,
        filter,
      ),
  };
}

export function getPresetById(id: string): HeadshotPreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}

export function getExportTransformationChain(
  preset: HeadshotPreset,
  publicId: string,
  aspectRatio: AspectRatio = "4:5",
  filter: PortraitFilter = "none",
  wardrobe: WardrobeId = "original",
) {
  const url = preset.build(publicId, aspectRatio, filter, wardrobe).toURL();
  const marker = "/image/upload/";
  const rest = url.split(marker)[1]?.split("?")[0] ?? "";
  const path = rest.replace(/^v\d+\//, "");
  const suffix = `/${publicId}`;
  if (path.endsWith(suffix)) {
    return path.slice(0, -suffix.length);
  }
  return preset.transformationChain;
}

export function getExportUrl(
  publicId: string,
  preset: HeadshotPreset,
  exportFormat: ExportFormat,
  aspectRatio: AspectRatio = "4:5",
  filter: PortraitFilter = "none",
  wardrobe: WardrobeId = "original",
): string {
  const img = preset.build(publicId, aspectRatio, filter, wardrobe);
  img.delivery(format(exportFormat));
  return img.toURL();
}
