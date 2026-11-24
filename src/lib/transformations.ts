import type { CloudinaryImage } from "@cloudinary/url-gen/index";
import { cld } from "../cloudinary/config";
import { fill } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { format, quality } from "@cloudinary/url-gen/actions/delivery";
import { auto as autoQuality } from "@cloudinary/url-gen/qualifiers/quality";
import { auto } from "@cloudinary/url-gen/qualifiers/format";
import type { AspectRatio, ExportFormat, HeadshotPreset } from "../types";
import {
  generativeBackgroundReplace,
  generativeReplace,
} from "@cloudinary/url-gen/actions/effect";

export function getDimensions(aspectRatio: AspectRatio = "4:5") {
  return aspectRatio === "1:1"
    ? { width: 800, height: 800 }
    : { width: 600, height: 750 };
}

function finalizeImage(img: CloudinaryImage, aspectRatio: AspectRatio = "4:5") {
  const { width, height } = getDimensions(aspectRatio);
  return img
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
    build: (publicId, aspectRatio = "4:5") =>
      finalizeImage(
        cld
          .image(publicId)
          .effect(
            generativeBackgroundReplace().prompt(
              "modern corporate executive office with bookshelves and professional soft portrait lighting bokeh",
            ),
          ),
        aspectRatio,
      ),
    transformationChain:
      "e_gen_background_replace:prompt_modern%20corporate%20executive%20office%20with%20bookshelves%20and%20professional%20soft%20portrait%20lighting%20bokeh/c_fill,w_600,h_750,g_auto/f_auto/q_auto",
  },
  {
    id: "outdoor-professional",
    name: "Outdoor Professional",
    description: "Golden hour sunlight with lush garden portrait bokeh",
    category: "style",
    transformationChain:
      "e_gen_background_replace:prompt_outdoor%20garden%20with%20trees%20golden%20hour%20sunlight%20natural%20bokeh/c_fill,w_600,h_750,g_auto/f_auto/q_auto",
    build: (publicId, aspectRatio = "4:5") =>
      finalizeImage(
        cld
          .image(publicId)
          .effect(
            generativeBackgroundReplace().prompt(
              "outdoor garden with trees golden hour sunlight natural bokeh",
            ),
          ),
        aspectRatio,
      ),
  },
  {
    id: "urban-business",
    name: "Urban Business",
    description: "City skyline with architectural depth and soft street bokeh",
    category: "style",
    transformationChain:
      "e_gen_background_replace:prompt_city%20street%20with%20modern%20architecture%20urban%20bokeh/c_fill,w_600,h_750,g_auto/f_auto/q_auto",
    build: (publicId, aspectRatio = "4:5") =>
      finalizeImage(
        cld
          .image(publicId)
          .effect(
            generativeBackgroundReplace().prompt(
              "city street with modern architecture urban bokeh",
            ),
          ),
        aspectRatio,
      ),
  },
  {
    id: "executive-suit",
    name: "Executive Suit & Tie",
    description: "Outfit swap to a sharp navy suit jacket and tie",
    category: "style",
    transformationChain:
      "e_gen_replace:from_shirt;to_suit/c_fill,w_600,h_750,g_auto/f_auto/q_auto",
    build: (publicId, aspectRatio = "4:5") =>
      finalizeImage(
        cld
          .image(publicId)
          .effect(
            generativeReplace()
              .from("shirt")
              .to("professional formal navy suit jacket with white dress shirt and tie"),
          ),
        aspectRatio,
      ),
  },
];

export const ALL_PRESETS = HEADSHOT_PRESETS;

export function buildOriginalPreview(
  publicId: string,
  aspectRatio: AspectRatio = "4:5",
): CloudinaryImage {
  const { width, height } = getDimensions(aspectRatio);
  return cld
    .image(publicId)
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
    build: (publicId: string, aspectRatio: AspectRatio = "4:5") =>
      finalizeImage(
        cld
          .image(publicId)
          .effect(generativeBackgroundReplace().prompt(sanitizedPrompt)),
        aspectRatio,
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
) {
  const url = preset.build(publicId, aspectRatio).toURL();
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
): string {
  const img = preset.build(publicId, aspectRatio);
  img.delivery(format(exportFormat));
  return img.toURL();
}
