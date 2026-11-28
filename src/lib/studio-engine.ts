import type { CloudinaryImage } from "@cloudinary/url-gen/index";
import { cld } from "../cloudinary/config";
import { fill, pad } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { generativeFill } from "@cloudinary/url-gen/qualifiers/background";
import { format, quality } from "@cloudinary/url-gen/actions/delivery";
import { auto as autoQuality } from "@cloudinary/url-gen/qualifiers/quality";
import { auto } from "@cloudinary/url-gen/qualifiers/format";
import {
  backgroundRemoval,
  enhance,
  generativeBackgroundReplace,
  generativeRecolor,
  generativeRemove,
  generativeReplace,
  generativeRestore,
  grayscale,
  sepia,
  upscale,
} from "@cloudinary/url-gen/actions/effect";
import type {
  AspectRatio,
  ExportFormat,
  PhotoLayer,
  PortraitFilter,
  SamplePhoto,
  StudioPreset,
} from "../types";

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: "portrait-man",
    label: "Portrait Selfie",
    category: "Portrait",
    publicId: "samples/people/smiling-man",
    secureUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/samples/people/smiling-man.jpg",
    width: 849,
    height: 565,
    suggestedPrompts: [
      "Replace the shirt with a tailored charcoal wool blazer",
      "Put me in a modern executive office with warm bookshelves",
      "Turn this into a dramatic 35mm Leica street portrait in Tokyo at dusk",
    ],
  },
  {
    id: "street-bike",
    label: "Lifestyle & Street",
    category: "Lifestyle",
    publicId: "samples/people/bicycle",
    secureUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/samples/people/bicycle.jpg",
    width: 1200,
    height: 800,
    suggestedPrompts: [
      "Recolor the bicycle to matte crimson red",
      "Swap background to a golden hour Parisian cobblestone street",
      "Expand to 16:9 widescreen cinematic frame",
    ],
  },
  {
    id: "product-shoe",
    label: "Product Shot",
    category: "Product",
    publicId: "samples/ecommerce/shoes",
    secureUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/samples/ecommerce/shoes.png",
    width: 1200,
    height: 800,
    suggestedPrompts: [
      "Place on a sleek dark obsidian stone pedestal with dramatic rim lighting",
      "Recolor the sneaker to vibrant electric cobalt blue",
      "Remove the background for a clean transparent PNG cutout",
    ],
  },
];

export const CURATED_STUDIO_PRESETS: StudioPreset[] = [
  // HEADSHOTS & PORTRAITS
  {
    id: "corporate-executive",
    name: "Corporate Executive",
    description: "Modern boardroom office with soft portrait lighting bokeh",
    category: "headshots",
    badge: "Portrait",
    cloudLayers: [
      {
        type: "background_replace",
        label: "Backdrop: Executive Office",
        prompt:
          "modern corporate executive office with bookshelves and professional soft portrait lighting bokeh",
      },
    ],
    localPrompt:
      "Keep the person's face and identity identical. Place them in a modern corporate executive office with warm bookshelves and shallow depth of field portrait lighting.",
  },
  {
    id: "studio-minimal",
    name: "Studio Minimalist",
    description: "Clean neutral grey studio backdrop with crisp rim lighting",
    category: "headshots",
    badge: "Portrait",
    cloudLayers: [
      {
        type: "background_replace",
        label: "Backdrop: Minimal Studio",
        prompt:
          "minimalist neutral grey photo studio backdrop soft rim lighting",
      },
    ],
    localPrompt:
      "Keep the subject's exact face and identity. Place against a clean neutral charcoal grey studio backdrop with soft key lighting and subtle hair rim light.",
  },
  {
    id: "executive-blazer",
    name: "Tailored Charcoal Blazer",
    description: "Swap casual top for a tailored charcoal blazer & crisp shirt",
    category: "headshots",
    badge: "Wardrobe",
    cloudLayers: [
      {
        type: "replace",
        label: "Replace shirt → Charcoal Blazer",
        from: "shirt",
        to: "tailored modern charcoal grey wool blazer jacket with crisp white collared dress shirt",
      },
    ],
    localPrompt:
      "Change only the person's outfit to a tailored modern charcoal grey wool blazer with a crisp white collared shirt. Keep their face, hair, expression, and background unchanged.",
    localAutoMask: "shirt or jacket",
  },
  {
    id: "tech-turtleneck",
    name: "Founder Turtleneck",
    description: "Minimalist black knit turtleneck for modern tech portraits",
    category: "headshots",
    badge: "Wardrobe",
    cloudLayers: [
      {
        type: "replace",
        label: "Replace shirt → Black Turtleneck",
        from: "shirt",
        to: "sleek fitted black knit turtleneck sweater",
      },
    ],
    localPrompt:
      "Change only the person's top to a sleek fitted black turtleneck knit sweater. Preserve their exact facial features, expression, and lighting.",
    localAutoMask: "shirt or top",
  },

  // CREATIVE & CINEMATIC
  {
    id: "cyberpunk-tokyo",
    name: "Neon Tokyo Night",
    description: "Rain-slicked cyberpunk alley with glowing magenta & cyan bokeh",
    category: "creative",
    badge: "Cinematic",
    cloudLayers: [
      {
        type: "background_replace",
        label: "Backdrop: Neon Tokyo Night",
        prompt:
          "rainy Tokyo street at night with glowing neon signs cinematic shallow depth of field reflections",
      },
    ],
    localPrompt:
      "Place the subject seamlessly in a rainy Tokyo street at night with glowing neon signs, realistic wet reflections, and cinematic 35mm bokeh while preserving their exact identity.",
  },
  {
    id: "golden-coast",
    name: "Amalfi Golden Hour",
    description: "Mediterranean coastal terrace bathed in warm sunset glow",
    category: "creative",
    badge: "Travel",
    cloudLayers: [
      {
        type: "background_replace",
        label: "Backdrop: Coastal Sunset",
        prompt:
          "Mediterranean coastal terrace overlooking the ocean at golden hour sunset warm cinematic bokeh",
      },
    ],
    localPrompt:
      "Place the subject on a Mediterranean coastal terrace overlooking the sea at warm golden hour sunset with natural backlit sun flare. Preserve subject identity completely.",
  },
  {
    id: "ghibli-editorial",
    name: "Film Noir Editorial",
    description: "High-contrast 1960s architectural loft with dramatic shadows",
    category: "creative",
    badge: "Editorial",
    cloudLayers: [
      {
        type: "background_replace",
        label: "Backdrop: Architectural Loft",
        prompt:
          "dramatic modern concrete architectural studio with high contrast window blinds shadows moody lighting",
      },
    ],
    localPrompt:
      "Transform the scene into a moody high-fashion editorial photograph in a brutalist concrete loft with dramatic window light shadows while preserving the exact subject.",
  },

  // PRODUCT STUDIO
  {
    id: "obsidian-pedestal",
    name: "Dark Obsidian Podium",
    description: "Apple-keynote style dark stone pedestal with rim lighting",
    category: "product",
    badge: "Product",
    cloudLayers: [
      {
        type: "background_replace",
        label: "Backdrop: Obsidian Pedestal",
        prompt:
          "sleek matte black obsidian stone pedestal dark luxury product photography studio dramatic rim lighting",
      },
    ],
    localPrompt:
      "Place the main product on a sleek matte black obsidian stone pedestal in a luxury commercial studio with dramatic rim lighting and subtle reflection.",
  },
  {
    id: "sunlit-marble",
    name: "Sunlit Marble Studio",
    description: "Warm cream travertine surface with soft botanical shadows",
    category: "product",
    badge: "Product",
    cloudLayers: [
      {
        type: "background_replace",
        label: "Backdrop: Sunlit Marble",
        prompt:
          "warm cream travertine marble tabletop with soft natural morning sunlight and palm leaf shadows minimalist commercial studio",
      },
    ],
    localPrompt:
      "Place the subject on a warm cream travertine marble tabletop with soft natural morning sunlight and subtle leaf shadows in a clean commercial studio.",
  },

  // QUICK FIXES
  {
    id: "ai-restore",
    name: "AI Photo Restore",
    description: "Repair blur, compression noise, and low-quality artifacts",
    category: "fixes",
    badge: "Restore",
    cloudLayers: [
      {
        type: "restore",
        label: "AI Restore & Sharpen",
      },
    ],
    localPrompt:
      "Restore and sharpen this photograph to crisp high-definition photographic clarity, fixing blur and compression artifacts without changing any faces or objects.",
  },
  {
    id: "magic-expand-16-9",
    name: "Magic Expand (16:9)",
    description: "AI seamlessly extends your photo into cinematic widescreen",
    category: "fixes",
    badge: "Uncrop",
    cloudLayers: [
      {
        type: "expand",
        label: "Magic Expand → 16:9",
        aspectRatio: "16:9",
      },
    ],
    localPrompt:
      "Outpaint and extend the scene seamlessly on the left and right edges into a natural cinematic 16:9 widescreen photograph while keeping the original center untouched.",
  },
  {
    id: "transparent-cutout",
    name: "Instant PNG Cutout",
    description: "Cleanly isolate the main subject on a transparent background",
    category: "fixes",
    badge: "Cutout",
    cloudLayers: [
      {
        type: "cutout",
        label: "Transparent Background Cutout",
      },
    ],
    localPrompt:
      "Isolate the main subject cleanly against a pure solid white studio backdrop with sharp hair and edge detail.",
  },
];

export function getStudioDimensions(aspectRatio: AspectRatio): {
  width: number;
  height: number;
} | null {
  switch (aspectRatio) {
    case "4:5":
      return { width: 800, height: 1000 };
    case "1:1":
      return { width: 900, height: 900 };
    case "16:9":
      return { width: 1280, height: 720 };
    case "9:16":
      return { width: 720, height: 1280 };
    case "3:2":
      return { width: 1200, height: 800 };
    case "original":
    default:
      return null;
  }
}

export function estimateLayerCredits(layers: PhotoLayer[]): number {
  let total = 0;
  for (const layer of layers) {
    if (!layer.enabled) continue;
    switch (layer.type) {
      case "background_replace":
        total += 0.23;
        break;
      case "replace":
        total += 0.12;
        break;
      case "restore":
        total += 0.1;
        break;
      case "remove":
      case "recolor":
      case "expand":
        total += 0.05;
        break;
      case "upscale":
        total += 0.05;
        break;
      case "cutout":
        total += 0.1;
        break;
    }
  }
  return Math.round(total * 100) / 100;
}

function applyCloudinaryFilter(
  img: CloudinaryImage,
  filter: PortraitFilter = "none",
): CloudinaryImage {
  if (filter === "enhance") return img.effect(enhance());
  if (filter === "bw") return img.effect(grayscale());
  if (filter === "warm") return img.effect(sepia());
  return img;
}

export function buildOriginalStudioPreview(
  publicId: string,
  aspectRatio: AspectRatio = "original",
): CloudinaryImage {
  const img = cld.image(publicId);
  const dims = getStudioDimensions(aspectRatio);
  if (dims) {
    img.resize(fill().width(dims.width).height(dims.height).gravity(autoGravity()));
  }
  return img.delivery(format(auto())).delivery(quality(autoQuality()));
}

export function buildStudioImage(
  publicId: string,
  layers: PhotoLayer[],
  aspectRatio: AspectRatio = "original",
  filter: PortraitFilter = "none",
  exportFormat?: ExportFormat,
): CloudinaryImage {
  let img = cld.image(publicId);
  let hasExpandLayer = false;
  let hasCutoutLayer = false;

  for (const layer of layers) {
    if (!layer.enabled) continue;

    switch (layer.type) {
      case "remove":
        if (layer.prompt.trim()) {
          img = img.effect(
            generativeRemove().prompt(layer.prompt.trim()).removeShadow(true),
          );
        }
        break;

      case "replace":
        if (layer.from.trim() && layer.to.trim()) {
          img = img.effect(
            generativeReplace().from(layer.from.trim()).to(layer.to.trim()),
          );
        }
        break;

      case "recolor":
        if (layer.target.trim() && layer.color.trim()) {
          // Strip leading # for Cloudinary hex colors or keep color name clean
          const cleanColor = layer.color.trim().replace(/^#/, "");
          img = img.effect(
            generativeRecolor(layer.target.trim(), cleanColor as never),
          );
        }
        break;

      case "background_replace":
        if (layer.prompt.trim()) {
          img = img.effect(
            generativeBackgroundReplace().prompt(layer.prompt.trim()),
          );
        }
        break;

      case "cutout":
        hasCutoutLayer = true;
        img = img.effect(backgroundRemoval());
        break;

      case "restore":
        img = img.effect(generativeRestore());
        break;

      case "upscale":
        img = img.effect(upscale());
        break;

      case "expand": {
        const expandDims = getStudioDimensions(layer.aspectRatio);
        if (expandDims) {
          hasExpandLayer = true;
          const genFillBg = layer.prompt?.trim()
            ? generativeFill().prompt(layer.prompt.trim())
            : generativeFill();
          img = img.resize(
            pad()
              .width(expandDims.width)
              .height(expandDims.height)
              .background(genFillBg),
          );
        }
        break;
      }
    }
  }

  img = applyCloudinaryFilter(img, filter);

  if (!hasExpandLayer) {
    const dims = getStudioDimensions(aspectRatio);
    if (dims) {
      img = img.resize(
        fill().width(dims.width).height(dims.height).gravity(autoGravity()),
      );
    }
  }

  if (exportFormat) {
    img = img.delivery(format(exportFormat));
  } else if (hasCutoutLayer) {
    img = img.delivery(format("png"));
  } else {
    img = img.delivery(format(auto()));
  }

  return img.delivery(quality(autoQuality()));
}

const KNOWN_COLORS = new Set([
  "red",
  "crimson",
  "burgundy",
  "maroon",
  "pink",
  "rose",
  "magenta",
  "coral",
  "orange",
  "amber",
  "gold",
  "yellow",
  "lime",
  "green",
  "emerald",
  "olive",
  "sage",
  "forest green",
  "teal",
  "turquoise",
  "cyan",
  "blue",
  "navy",
  "navy blue",
  "cobalt",
  "royal blue",
  "sky blue",
  "indigo",
  "purple",
  "violet",
  "lavender",
  "plum",
  "brown",
  "tan",
  "beige",
  "camel",
  "cream",
  "ivory",
  "white",
  "silver",
  "grey",
  "gray",
  "charcoal",
  "black",
]);

function looksLikeColor(phrase: string): string | null {
  const cleaned = phrase
    .toLowerCase()
    .replace(/^(a |an |the |bright |dark |light |deep |matte |metallic |vibrant |pastel )/g, "")
    .trim();
  if (/^#?[0-9a-f]{6}$/i.test(cleaned)) {
    return cleaned.replace(/^#/, "");
  }
  if (KNOWN_COLORS.has(cleaned)) {
    return cleaned.replace(/\s+/g, "");
  }
  // Check if single trailing word is a color (e.g. "emerald green")
  const words = cleaned.split(/\s+/);
  if (words.length <= 2 && KNOWN_COLORS.has(words[words.length - 1])) {
    return words[words.length - 1];
  }
  return null;
}

function makeLayerId(): string {
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Deterministic zero-latency natural-language parser for Cloud Mode.
 * Splits compound commands ("remove the trash can and put me in Tokyo")
 * into structured non-destructive Cloudinary Photoshop layers.
 */
export function parsePromptToLayers(rawPrompt: string): PhotoLayer[] {
  const trimmed = rawPrompt.trim();
  if (!trimmed) return [];

  // Split compound sentences on ";", ", and ", " and then ", or " then "
  const segments = trimmed
    .split(/\s*(?:;|,\s*and\s+|\band\s+then\b|\bthen\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const layers: PhotoLayer[] = [];

  for (const seg of segments) {
    const lower = seg.toLowerCase();

    // 1. Cutout / transparent background
    if (
      /\b(remove|delete|erase|strip)\s+(the\s+)?background\b/i.test(lower) ||
      /\b(transparent\s+background|cutout|cut\s*out|png\s+sticker)\b/i.test(lower)
    ) {
      layers.push({
        id: makeLayerId(),
        type: "cutout",
        label: "Transparent Cutout",
        enabled: true,
      });
      continue;
    }

    // 2. Restore / fix blurry
    if (
      /\b(restore|unblur|deblur|fix\s+blur|fix\s+old|denoise)\b/i.test(lower)
    ) {
      layers.push({
        id: makeLayerId(),
        type: "restore",
        label: "AI Restore & Sharpen",
        enabled: true,
      });
      continue;
    }

    // 3. Upscale
    if (/\b(upscale|super\s*res|higher\s+resolution|enhance\s+resolution)\b/i.test(lower)) {
      layers.push({
        id: makeLayerId(),
        type: "upscale",
        label: "AI Super Upscale",
        enabled: true,
      });
      continue;
    }

    // 4. Magic Expand / Uncrop
    if (/\b(expand|uncrop|outpaint|extend|widescreen)\b/i.test(lower)) {
      let ratio: Exclude<AspectRatio, "original"> = "16:9";
      if (/9\s*:\s*16|vertical|story|tiktok|reel/i.test(lower)) ratio = "9:16";
      else if (/1\s*:\s*1|square/i.test(lower)) ratio = "1:1";
      else if (/4\s*:\s*5|portrait/i.test(lower)) ratio = "4:5";
      else if (/3\s*:\s*2/i.test(lower)) ratio = "3:2";
      layers.push({
        id: makeLayerId(),
        type: "expand",
        label: `Magic Expand → ${ratio}`,
        aspectRatio: ratio,
        enabled: true,
      });
      continue;
    }

    // 5. Magic Eraser (Remove / Erase / Delete <X>)
    const removeMatch = seg.match(
      /^(?:please\s+)?(?:remove|erase|delete|get\s+rid\s+of|clean\s+up)\s+(?:the\s+|my\s+|a\s+|an\s+)?(.+)$/i,
    );
    if (removeMatch && !/background/i.test(removeMatch[1])) {
      const target = removeMatch[1].trim();
      layers.push({
        id: makeLayerId(),
        type: "remove",
        label: `Erase: ${target}`,
        prompt: target,
        enabled: true,
      });
      continue;
    }

    // 6. Recolor (<recolor/color/turn/make> <target> <to/into> <color>)
    const recolorExplicit = seg.match(
      /^(?:please\s+)?(?:recolor|color|dye|paint)\s+(?:the\s+|my\s+)?(.+?)\s+(?:to|into)\s+(.+)$/i,
    );
    if (recolorExplicit) {
      const target = recolorExplicit[1].trim();
      const colorRaw = recolorExplicit[2].trim();
      const colorVal = looksLikeColor(colorRaw) ?? colorRaw;
      layers.push({
        id: makeLayerId(),
        type: "recolor",
        label: `Recolor ${target} → ${colorRaw}`,
        target,
        color: colorVal,
        enabled: true,
      });
      continue;
    }

    // 7. Replace / Change / Swap <X> with/to/into/for <Y>
    const replaceMatch = seg.match(
      /^(?:please\s+)?(?:replace|change|swap|turn|switch|make)\s+(?:the\s+|my\s+)?(.+?)\s+(?:with|to|into|for)\s+(?:a\s+|an\s+|the\s+)?(.+)$/i,
    );
    if (replaceMatch) {
      const from = replaceMatch[1].trim();
      const to = replaceMatch[2].trim();

      // If targeting background explicitly → background_replace
      if (/^(?:the\s+)?(?:background|backdrop|scene|setting)$/i.test(from)) {
        layers.push({
          id: makeLayerId(),
          type: "background_replace",
          label: `Backdrop: ${to.slice(0, 34)}`,
          prompt: to,
          enabled: true,
        });
        continue;
      }

      // If destination is a pure color → cheaper, cleaner recolor!
      const colorMatch = looksLikeColor(to);
      if (colorMatch) {
        layers.push({
          id: makeLayerId(),
          type: "recolor",
          label: `Recolor ${from} → ${to}`,
          target: from,
          color: colorMatch,
          enabled: true,
        });
        continue;
      }

      layers.push({
        id: makeLayerId(),
        type: "replace",
        label: `Replace ${from} → ${to.slice(0, 26)}`,
        from,
        to,
        enabled: true,
      });
      continue;
    }

    // 8. Default: Background / Scene replacement
    const cleanBg = seg
      .replace(
        /^(?:please\s+)?(?:put\s+(?:me|this|it|them)\s+(?:in|on|at)\s+|place\s+(?:me|this|it)\s+(?:in|on|at)\s+|move\s+(?:me|this)\s+to\s+|set\s+background\s+to\s+|background\s*:\s*)/i,
        "",
      )
      .trim();

    layers.push({
      id: makeLayerId(),
      type: "background_replace",
      label: `Backdrop: ${cleanBg.slice(0, 34)}`,
      prompt: cleanBg || seg,
      enabled: true,
    });
  }

  return layers;
}

/** Converts parsed JSON layers returned from local Ollama into valid PhotoLayers */
export function normalizeParsedLayers(
  rawList: Array<Record<string, unknown>>,
): PhotoLayer[] {
  const result: PhotoLayer[] = [];
  for (const item of rawList) {
    const type = String(item.type || "");
    if (type === "remove" && typeof item.prompt === "string" && item.prompt.trim()) {
      result.push({
        id: makeLayerId(),
        type: "remove",
        label: `Erase: ${item.prompt.trim()}`,
        prompt: item.prompt.trim(),
        enabled: true,
      });
    } else if (
      type === "replace" &&
      typeof item.from === "string" &&
      typeof item.to === "string" &&
      item.from.trim() &&
      item.to.trim()
    ) {
      result.push({
        id: makeLayerId(),
        type: "replace",
        label: `Replace ${item.from.trim()} → ${item.to.trim().slice(0, 26)}`,
        from: item.from.trim(),
        to: item.to.trim(),
        enabled: true,
      });
    } else if (
      type === "recolor" &&
      typeof item.target === "string" &&
      typeof item.color === "string" &&
      item.target.trim() &&
      item.color.trim()
    ) {
      result.push({
        id: makeLayerId(),
        type: "recolor",
        label: `Recolor ${item.target.trim()} → ${item.color.trim()}`,
        target: item.target.trim(),
        color: item.color.trim(),
        enabled: true,
      });
    } else if (
      type === "background_replace" &&
      typeof item.prompt === "string" &&
      item.prompt.trim()
    ) {
      result.push({
        id: makeLayerId(),
        type: "background_replace",
        label: `Backdrop: ${item.prompt.trim().slice(0, 34)}`,
        prompt: item.prompt.trim(),
        enabled: true,
      });
    } else if (type === "expand") {
      const ar = String(item.aspectRatio || "16:9");
      const valid = (["4:5", "1:1", "16:9", "9:16", "3:2"].includes(ar)
        ? ar
        : "16:9") as Exclude<AspectRatio, "original">;
      result.push({
        id: makeLayerId(),
        type: "expand",
        label: `Magic Expand → ${valid}`,
        aspectRatio: valid,
        enabled: true,
      });
    } else if (type === "restore") {
      result.push({
        id: makeLayerId(),
        type: "restore",
        label: "AI Restore & Sharpen",
        enabled: true,
      });
    } else if (type === "upscale") {
      result.push({
        id: makeLayerId(),
        type: "upscale",
        label: "AI Super Upscale",
        enabled: true,
      });
    } else if (type === "cutout") {
      result.push({
        id: makeLayerId(),
        type: "cutout",
        label: "Transparent Cutout",
        enabled: true,
      });
    }
  }
  return result;
}
