import type {
  LocalAiHealth,
  LocalEditJobStatus,
  LocalModelId,
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
  imageDataUrl?: string;
  imageUrl?: string;
  prompt: string;
  model: LocalModelId;
  autoMask?: string;
  strength?: number;
  steps?: number;
  resolution?: number;
  enhancePrompt?: boolean;
  verify?: boolean;
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
