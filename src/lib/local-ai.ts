import type {
  LocalAiHealth,
  LocalEditJobStatus,
  LocalGalleryItem,
  LocalModelId,
  LocalOperation,
  LocalStyleMode,
} from "../types";

export const LOCAL_AI_BASE_URL =
  import.meta.env.VITE_LOCAL_AI_URL || "http://127.0.0.1:8787";

export async function checkLocalAiHealth(): Promise<LocalAiHealth | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${LOCAL_AI_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as LocalAiHealth;
  } catch {
    return null;
  }
}

export interface LocalEditRequest {
  operation?: LocalOperation;
  imageDataUrl?: string;
  imageUrl?: string;
  referenceImages?: string[];
  maskDataUrl?: string;
  prompt?: string;
  negativePrompt?: string;
  model: LocalModelId;
  autoMask?: string;
  strength?: number;
  steps?: number;
  resolution?: number;
  seed?: number;
  styleMode?: LocalStyleMode;
  loraPath?: string;
  loraScale?: number;
  enhancePrompt?: boolean;
  verify?: boolean;
  upscaleFactor?: string;
  softness?: number;
}

export async function startLocalEdit(
  request: LocalEditRequest,
): Promise<{ jobId: string }> {
  const res = await fetch(`${LOCAL_AI_BASE_URL}/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = (await res.json()) as { jobId?: string; error?: string };
  if (!res.ok || !data.jobId) {
    throw new Error(data.error || `Local AI server error (${res.status})`);
  }
  return { jobId: data.jobId };
}

export async function pollLocalJob(jobId: string): Promise<LocalEditJobStatus> {
  const res = await fetch(`${LOCAL_AI_BASE_URL}/jobs/${jobId}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch job status (${res.status})`);
  }
  return (await res.json()) as LocalEditJobStatus;
}

export async function cancelLocalJob(jobId: string): Promise<void> {
  try {
    await fetch(`${LOCAL_AI_BASE_URL}/jobs/${jobId}/cancel`, {
      method: "POST",
    });
  } catch {
    // Ignore cancellation network errors
  }
}

export async function fetchLocalGallery(): Promise<{
  dir: string;
  items: LocalGalleryItem[];
} | null> {
  try {
    const res = await fetch(`${LOCAL_AI_BASE_URL}/gallery`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as { dir: string; items: LocalGalleryItem[] };
  } catch {
    return null;
  }
}

export async function deleteLocalGalleryItem(itemId: string): Promise<boolean> {
  try {
    const res = await fetch(`${LOCAL_AI_BASE_URL}/gallery/${itemId}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function openLocalGalleryFolder(): Promise<boolean> {
  try {
    const res = await fetch(`${LOCAL_AI_BASE_URL}/gallery/open-folder`, {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function parsePromptWithLocalOllama(
  prompt: string,
): Promise<Array<Record<string, unknown>> | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${LOCAL_AI_BASE_URL}/parse-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      layers?: Array<Record<string, unknown>> | null;
    };
    return data.layers ?? null;
  } catch {
    return null;
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Play a soft, pleasant Web Audio chime when a local GPU render completes */
export function playCompletionChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5 soft major triad
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.38);
    });
  } catch {
    // Ignore autoplay/audio restriction errors
  }
}

/** Send a native OS notification if the user granted permission and tab is in background */
export function notifyRenderComplete(label: string): void {
  try {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      document.hidden
    ) {
      new Notification("Alterx — Render Ready", {
        body: label || "Your Apple Silicon GPU edit is complete!",
      });
    }
  } catch {
    // Ignore notification errors
  }
}
