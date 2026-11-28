import type { MicroTuningSettings } from "../types";
import { DEFAULT_MICRO_TUNING } from "../types";

export interface MicroTuningPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  settings: MicroTuningSettings;
}

export const MICRO_TUNING_PRESETS: MicroTuningPreset[] = [
  {
    id: "natural",
    label: "Natural",
    icon: "🌱",
    description: "Default neutral lighting with zero adjustments",
    settings: { ...DEFAULT_MICRO_TUNING },
  },
  {
    id: "executive-glow",
    label: "Studio Polish",
    icon: "✨",
    description: "Subtle skin softening, eye catchlights, and balanced studio contrast",
    settings: {
      skinSoftening: 25,
      warmth: 6,
      exposure: 5,
      contrast: 10,
      saturation: 6,
      vignette: 18,
      eyeClarity: 30,
    },
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    icon: "🌅",
    description: "Warm amber sunlight with rich golden tones",
    settings: {
      skinSoftening: 30,
      warmth: 35,
      exposure: 6,
      contrast: 8,
      saturation: 15,
      vignette: 22,
      eyeClarity: 20,
    },
  },
  {
    id: "moody-editorial",
    label: "Moody Editorial",
    icon: "🕶️",
    description: "Cooler film tones, sharp clarity, and dramatic vignette",
    settings: {
      skinSoftening: 10,
      warmth: -18,
      exposure: -4,
      contrast: 22,
      saturation: -12,
      vignette: 45,
      eyeClarity: 40,
    },
  },
  {
    id: "crisp-bw",
    label: "Noir B&W",
    icon: "🎞️",
    description: "High-contrast Leica-style monochrome look",
    settings: {
      skinSoftening: 10,
      warmth: 0,
      exposure: 2,
      contrast: 26,
      saturation: -100,
      vignette: 35,
      eyeClarity: 35,
    },
  },
];

export function hasActiveMicroTuning(settings: MicroTuningSettings): boolean {
  return (
    settings.skinSoftening !== 0 ||
    settings.warmth !== 0 ||
    settings.exposure !== 0 ||
    settings.contrast !== 0 ||
    settings.saturation !== 0 ||
    settings.vignette !== 0 ||
    settings.eyeClarity !== 0
  );
}

export function getMicroTuningCssFilter(settings: MicroTuningSettings): string {
  const brightnessVal = 1 + settings.exposure / 100;
  const contrastVal = 1 + (settings.contrast + settings.eyeClarity * 0.15) / 100;
  const warmthSepia = settings.warmth > 0 ? settings.warmth * 0.005 : 0;
  const warmthHue = settings.warmth < 0 ? settings.warmth * 0.35 : 0;
  const rawSaturation =
    1 + settings.saturation / 100 + (settings.warmth > 0 ? settings.warmth * 0.003 : 0);
  const saturateVal = Math.max(0, rawSaturation);

  const filters: string[] = [
    `brightness(${brightnessVal.toFixed(3)})`,
    `contrast(${contrastVal.toFixed(3)})`,
    `saturate(${saturateVal.toFixed(3)})`,
  ];

  if (warmthSepia > 0) {
    filters.push(`sepia(${warmthSepia.toFixed(3)})`);
  }
  if (warmthHue !== 0) {
    filters.push(`hue-rotate(${warmthHue.toFixed(1)}deg)`);
  }

  return filters.join(" ");
}

export function getVignetteOverlayStyle(
  settings: MicroTuningSettings,
): React.CSSProperties {
  if (settings.vignette <= 0) return { display: "none" };
  const opacity = (settings.vignette * 0.0075).toFixed(3);
  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0, 0, 0, ${opacity}) 100%)`,
    borderRadius: "inherit",
    zIndex: 5,
  };
}

/**
 * Applies vignette onto a 2D canvas after ctx.filter + drawImage
 */
export function applyMicroTuningToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: MicroTuningSettings,
) {
  if (!hasActiveMicroTuning(settings)) return;

  if (settings.vignette > 0) {
    const opacity = settings.vignette * 0.0075;
    const gradient = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      width * 0.35,
      width * 0.5,
      height * 0.45,
      width * 0.8,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${opacity})`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
