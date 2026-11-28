#!/usr/bin/env python3
"""
Local AI Photo Studio Server (Apple Silicon MLX via mflux)
Runs 100% locally on your Mac for $0 with unlimited photo edits,
brush masking, multi-photo compositing, 4K upscaling, local cutouts,
and an auto-saved local gallery in ~/Pictures/AI-Photo-Studio.

Start with:
  npm run local-ai
  # or: python3 local-server/server.py
"""

from __future__ import annotations

import base64
import json
import os
import random
import re
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HOST = os.environ.get("LOCAL_AI_HOST", "127.0.0.1")
PORT = int(os.environ.get("LOCAL_AI_PORT", "8787"))

# Ensure uv tools & homebrew bins are searchable even when launched via LaunchAgent
for extra in (
    str(Path.home() / ".local" / "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
):
    if extra not in os.environ.get("PATH", ""):
        os.environ["PATH"] = f"{extra}:{os.environ.get('PATH', '')}"

TMP_DIR = Path(tempfile.gettempdir()) / "alterx-local"
TMP_DIR.mkdir(parents=True, exist_ok=True)

GALLERY_DIR = Path(
    os.environ.get(
        "ALTERX_GALLERY_DIR",
        os.environ.get(
            "AI_STUDIO_GALLERY_DIR",
            str(Path.home() / "Pictures" / "Alterx"),
        ),
    )
)
GALLERY_DIR.mkdir(parents=True, exist_ok=True)

# Automatically migrate legacy photos from AI-Photo-Studio so no user images are lost
LEGACY_GALLERY_DIR = Path.home() / "Pictures" / "AI-Photo-Studio"
if LEGACY_GALLERY_DIR.exists() and LEGACY_GALLERY_DIR != GALLERY_DIR:
    try:
        for legacy_file in LEGACY_GALLERY_DIR.glob("*.*"):
            dest = GALLERY_DIR / legacy_file.name
            if not dest.exists():
                shutil.copy2(legacy_file, dest)
    except Exception as e:
        print(f"[Alterx Local] Could not migrate legacy gallery images: {e}")

LAUNCH_AGENT_PLISTS = [
    Path.home() / "Library" / "LaunchAgents" / "com.yasinkhan.alterx-local.plist",
    Path.home() / "Library" / "LaunchAgents" / "com.yasinkhan.ai-photo-studio.plist",
]

JOBS: dict[str, dict[str, Any]] = {}
JOBS_LOCK = threading.Lock()
ACTIVE_PROCESSES: dict[str, subprocess.Popen[str]] = {}
GEN_SEMAPHORE = threading.Semaphore(1)  # Serialize MLX runs so 16GB RAM never thrashes

LOCAL_MODELS = {
    "flux2-klein-4b": {
        "id": "flux2-klein-4b",
        "name": "FLUX.2 Klein 4B (Fast)",
        "description": "Fast 4-step local editing & multi-photo compositing (~20-60s on M1 Pro)",
        "binary": "mflux-generate-flux2-edit",
        "default_steps": 4,
        "supports_auto_mask": False,
        "supports_brush_mask": False,
        "supports_verify": False,
        "supports_strength": False,
        "supports_multi_image": True,
    },
    "qwen-2.1-turbo": {
        "id": "qwen-2.1-turbo",
        "name": "Qwen Image 2.1 Turbo (Max Accuracy)",
        "description": "High-accuracy editing with brush masking, Auto-Mask, multi-photo refs & AI verify (~1-2 min)",
        "binary": "mflux-generate-qwen-2.1-edit",
        "default_steps": 8,
        "supports_auto_mask": True,
        "supports_brush_mask": True,
        "supports_verify": True,
        "supports_strength": True,
        "supports_multi_image": True,
    },
}

STYLE_DIRECTIVES: dict[str, str] = {
    "identity": "Strictly preserve the subject's exact facial geometry, skin texture, eye shape, and identity.",
    "portrait": "Shot on 85mm f/1.4 prime lens, natural studio key lighting, crisp catchlights, editorial portrait photography.",
    "cinematic": "Anamorphic 35mm cinematic film still, subtle halation, rich natural shadows, volumetric depth, realistic color grading.",
    "storyboard": "Clean cinematic storyboard illustration frame, expressive ink lines, balanced visual storytelling composition.",
    "illustration": "High-craft digital concept art illustration, painterly brushwork, cohesive lighting and rich detail.",
}

TQDM_PROGRESS_RE = re.compile(
    r"(\d{1,3})%\|[^|]*\|\s*(\d+)/(\d+)\s*\[[^\]]*<([^,\]]+)"
)
SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]+$")


def find_binary(name: str) -> str | None:
    found = shutil.which(name)
    if found:
        return found
    candidate = Path.home() / ".local" / "bin" / name
    if candidate.exists():
        return str(candidate)
    return None


def check_ollama() -> tuple[bool, list[str]]:
    try:
        req = urllib.request.Request("http://127.0.0.1:11434/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m.get("name", "") for m in data.get("models", []) if m.get("name")]
            return True, models
    except Exception:
        return False, []


def decode_image_source(source: str, dest_path: Path) -> None:
    if source.startswith("data:") and "," in source:
        _, b64 = source.split(",", 1)
        dest_path.write_bytes(base64.b64decode(b64))
        return

    if source.startswith(("http://", "https://")):
        req = urllib.request.Request(
            source,
            headers={"User-Agent": "Alterx-Local/2.0"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            dest_path.write_bytes(resp.read())
        return

    raise ValueError("Unsupported image source format")


def decode_input_image(payload: dict[str, Any], dest_path: Path) -> None:
    image_data_url = payload.get("imageDataUrl")
    image_url = payload.get("imageUrl")

    if image_data_url and isinstance(image_data_url, str) and "," in image_data_url:
        decode_image_source(image_data_url, dest_path)
        return

    if image_url and isinstance(image_url, str) and image_url.startswith(("http://", "https://")):
        decode_image_source(image_url, dest_path)
        return

    raise ValueError("Missing valid imageDataUrl or imageUrl")


def parse_progress_line(line: str) -> str | None:
    cleaned = re.sub(r"\x1b\[[0-9;]*[a-zA-Z]", "", line).strip()
    if not cleaned:
        return None
    if "NOTE: Redirects are currently not supported" in cleaned:
        return None
    return cleaned


def save_to_gallery(
    job_id: str,
    image_bytes: bytes,
    meta: dict[str, Any],
) -> dict[str, Any]:
    stamp = time.strftime("%Y%m%d-%H%M%S")
    item_id = f"{stamp}_{job_id}"
    img_path = GALLERY_DIR / f"{item_id}.png"
    meta_path = GALLERY_DIR / f"{item_id}.json"

    img_path.write_bytes(image_bytes)
    record = {
        "id": item_id,
        "filename": img_path.name,
        "createdAt": int(time.time() * 1000),
        **meta,
    }
    meta_path.write_text(json.dumps(record, indent=2), encoding="utf-8")
    return record


def list_gallery_items(limit: int = 80) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if not GALLERY_DIR.exists():
        return items

    for meta_file in sorted(GALLERY_DIR.glob("*.json"), reverse=True):
        try:
            data = json.loads(meta_file.read_text(encoding="utf-8"))
            item_id = str(data.get("id") or meta_file.stem)
            img_file = GALLERY_DIR / f"{item_id}.png"
            if not img_file.exists():
                continue
            data["id"] = item_id
            data["imageUrl"] = f"http://{HOST}:{PORT}/gallery/{item_id}/image"
            items.append(data)
            if len(items) >= limit:
                break
        except Exception:
            continue
    return items


def delete_gallery_item(item_id: str) -> bool:
    if not SAFE_ID_RE.match(item_id):
        return False
    removed = False
    for ext in (".png", ".json"):
        p = GALLERY_DIR / f"{item_id}{ext}"
        if p.exists():
            try:
                p.unlink()
                removed = True
            except OSError:
                pass
    return removed


def count_gallery_items() -> int:
    if not GALLERY_DIR.exists():
        return 0
    return sum(1 for _ in GALLERY_DIR.glob("*.png"))


def update_job_progress(job: dict[str, Any], cleaned: str) -> None:
    lower = cleaned.lower()
    m = TQDM_PROGRESS_RE.search(cleaned)

    if "downloading" in lower or "fetching" in lower:
        job["phase"] = "download"
        if m:
            pct, cur, total, eta = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4).strip()
            job["progress"] = pct
            job["step"] = cur
            job["totalSteps"] = total
            job["eta"] = None if eta == "?" else eta
            job["stage"] = f"Downloading model weights ({cur}/{total} files) — cached locally forever..."
        else:
            job["stage"] = "First-time model download from Hugging Face (cached locally forever)..."
        return

    if "enhancing" in lower or "rewriting" in lower:
        job["phase"] = "enhancing"
        job["stage"] = "Auto-enhancing prompt with Qwen3-VL..."
        return

    if "verifying" in lower or "verify" in lower and ("pass" in lower or "fail" in lower or "check" in lower):
        job["phase"] = "verifying"
        job["stage"] = "AI Self-Verify inspecting output quality..."
        return

    if "decoding" in lower or "vae" in lower:
        job["phase"] = "decoding"
        job["progress"] = max(job.get("progress") or 0, 96)
        job["eta"] = "00:05"
        job["stage"] = "Decoding high-resolution image..."
        return

    if m:
        pct, cur, total, eta = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4).strip()
        job["phase"] = "generating"
        job["progress"] = pct
        job["step"] = cur
        job["totalSteps"] = total
        job["eta"] = None if eta == "?" else eta
        job["stage"] = f"Rendering step {cur}/{total} on Apple Silicon GPU..."
    elif "step" in lower or "%" in cleaned:
        job["stage"] = cleaned[:110]


def run_mflux_job(job_id: str, payload: dict[str, Any]) -> None:
    with GEN_SEMAPHORE:
        with JOBS_LOCK:
            job = JOBS.get(job_id)
            if not job or job["status"] == "cancelled":
                return
            job["status"] = "running"
            job["phase"] = "preparing"
            job["progress"] = 2
            job["stage"] = "Preparing input image..."
            job["startedAt"] = time.time()

        input_path = TMP_DIR / f"{job_id}_in.png"
        output_path = TMP_DIR / f"{job_id}_out.png"
        temp_files: list[Path] = [input_path, output_path]

        try:
            decode_input_image(payload, input_path)

            operation = str(payload.get("operation") or "edit").strip().lower()
            raw_seed = payload.get("seed")
            if raw_seed is not None and str(raw_seed).strip().isdigit():
                seed_val = int(str(raw_seed).strip())
            else:
                seed_val = random.randint(1, 2_147_483_647)

            with JOBS_LOCK:
                job["seed"] = seed_val

            prompt = str(payload.get("prompt") or "").strip()
            negative_prompt = str(payload.get("negativePrompt") or "").strip()
            style_mode = str(payload.get("styleMode") or "").strip().lower()
            lora_path = str(payload.get("loraPath") or "").strip()
            lora_scale = payload.get("loraScale")
            auto_mask = str(payload.get("autoMask") or "").strip()
            mask_data_url = payload.get("maskDataUrl")
            ref_images = payload.get("referenceImages") or []
            if not isinstance(ref_images, list):
                ref_images = []

            model_id = str(payload.get("model") or "flux2-klein-4b")
            resolution = int(payload.get("resolution") or 768)
            strength = payload.get("strength")
            quantize = int(payload.get("quantize") or 4)
            cmd: list[str] = []
            launch_label = ""
            saved_prompt = prompt

            if operation == "upscale":
                binary = find_binary("mflux-upscale-seedvr2")
                if not binary:
                    raise RuntimeError(
                        "'mflux-upscale-seedvr2' not found. Run: uv tool install --python 3.12 --upgrade mflux"
                    )
                scale = str(payload.get("upscaleFactor") or "2x").strip() or "2x"
                softness = float(payload.get("softness") or 0.0)
                softness = max(0.0, min(1.0, softness))
                cmd = [
                    binary,
                    "--model",
                    "seedvr2-3b",
                    "--quantize",
                    str(quantize),
                    "--low-ram",
                    "--image-path",
                    str(input_path),
                    "--resolution",
                    scale,
                    "--softness",
                    f"{softness:.2f}",
                    "--seed",
                    str(seed_val),
                    "--output",
                    str(output_path),
                ]
                model_id = "seedvr2-3b"
                saved_prompt = f"Local AI Super-Upscale ({scale})"
                launch_label = f"SeedVR2 3B Super-Resolution ({scale}, {quantize}-bit MLX)"

            elif operation == "cutout":
                binary = find_binary("mflux-generate-fibo-edit")
                if not binary:
                    raise RuntimeError(
                        "'mflux-generate-fibo-edit' not found. Run: uv tool install --python 3.12 --upgrade mflux"
                    )
                steps = int(payload.get("steps") or 8)
                cmd = [
                    binary,
                    "--model",
                    "fibo-edit-rmbg",
                    "--quantize",
                    str(quantize),
                    "--low-ram",
                    "--image-path",
                    str(input_path),
                    "--steps",
                    str(steps),
                    "--seed",
                    str(seed_val),
                    "--output",
                    str(output_path),
                ]
                model_id = "fibo-edit-rmbg"
                saved_prompt = "Local AI Transparent PNG Cutout"
                launch_label = f"FIBO RMBG Cutout ({steps} steps, {quantize}-bit MLX)"

            else:
                # Standard local edit (FLUX.2 Klein 4B or Qwen 2.1 Turbo)
                if not prompt:
                    raise ValueError("Prompt cannot be empty")
                if model_id not in LOCAL_MODELS:
                    model_id = "flux2-klein-4b"
                spec = LOCAL_MODELS[model_id]
                binary = find_binary(spec["binary"])
                if not binary:
                    raise RuntimeError(
                        f"'{spec['binary']}' not found. Run: uv tool install --python 3.12 --upgrade mflux"
                    )

                effective_prompt = prompt
                if style_mode and style_mode in STYLE_DIRECTIVES:
                    effective_prompt = f"{prompt}. {STYLE_DIRECTIVES[style_mode]}"

                # Decode optional additional reference images for multi-photo compositing
                image_paths_args: list[str] = [str(input_path)]
                for idx, ref_src in enumerate(ref_images[:3]):
                    if isinstance(ref_src, str) and ref_src.strip():
                        ref_path = TMP_DIR / f"{job_id}_ref_{idx}.png"
                        decode_image_source(ref_src.strip(), ref_path)
                        temp_files.append(ref_path)
                        image_paths_args.append(str(ref_path))

                steps = int(payload.get("steps") or spec["default_steps"])
                cli_model = (
                    "flux2-klein-4b"
                    if model_id == "flux2-klein-4b"
                    else "qwen-image-2.1-turbo"
                )
                cmd = [
                    binary,
                    "--model",
                    cli_model,
                    "--quantize",
                    str(quantize),
                    "--low-ram",
                    "--image-paths",
                    *image_paths_args,
                    "--prompt",
                    effective_prompt,
                    "--steps",
                    str(steps),
                    "--seed",
                    str(seed_val),
                    "--output",
                    str(output_path),
                ]

                if negative_prompt:
                    cmd.extend(["--negative-prompt", negative_prompt])

                if lora_path:
                    scale_str = "1.0"
                    if lora_scale is not None:
                        try:
                            scale_str = f"{max(0.1, min(2.0, float(lora_scale))):.2f}"
                        except (TypeError, ValueError):
                            pass
                    cmd.extend(["--lora", lora_path, scale_str])

                if model_id == "flux2-klein-4b":
                    cmd.append("--small-decoder")
                    if resolution:
                        cmd.extend(["--width", str(resolution), "--height", str(resolution)])
                else:
                    cmd.extend(["--output-resolution", str(resolution)])
                    # On Qwen 2.1 Turbo, guidance > 1 is required for --negative-prompt to take effect
                    if negative_prompt:
                        cmd.extend(["--guidance", "2.5"])

                    if mask_data_url and isinstance(mask_data_url, str) and "," in mask_data_url:
                        mask_path = TMP_DIR / f"{job_id}_mask.png"
                        decode_image_source(mask_data_url, mask_path)
                        temp_files.append(mask_path)
                        cmd.extend(["--mask-image", str(mask_path)])
                    elif auto_mask:
                        cmd.extend(["--auto-mask", auto_mask])

                    if strength is not None:
                        try:
                            s_val = max(0.1, min(1.0, float(strength)))
                            if s_val < 0.99:
                                cmd.extend(["--strength", f"{s_val:.2f}"])
                        except (TypeError, ValueError):
                            pass
                    if payload.get("enhancePrompt"):
                        cmd.append("--enhance-prompt")
                    if payload.get("verify"):
                        cmd.append("--verify")

                launch_label = f"{spec['name']} ({steps} steps, seed {seed_val}, {quantize}-bit MLX)"

            with JOBS_LOCK:
                job["stage"] = f"Running {launch_label}..."
                job["logs"].append(f"Launching {launch_label}...")

            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            ACTIVE_PROCESSES[job_id] = proc

            assert proc.stdout is not None
            for raw_line in proc.stdout:
                cleaned = parse_progress_line(raw_line)
                if not cleaned:
                    continue
                with JOBS_LOCK:
                    if job["status"] == "cancelled":
                        break
                    job["logs"].append(cleaned)
                    if len(job["logs"]) > 50:
                        job["logs"] = job["logs"][-50:]
                    update_job_progress(job, cleaned)

            ret = proc.wait()
            ACTIVE_PROCESSES.pop(job_id, None)

            with JOBS_LOCK:
                if job["status"] == "cancelled":
                    return

            if ret != 0 or not output_path.exists():
                with JOBS_LOCK:
                    tail = " | ".join(job["logs"][-5:])
                raise RuntimeError(f"mflux exited with code {ret}. {tail}")

            out_bytes = output_path.read_bytes()
            data_url = "data:image/png;base64," + base64.b64encode(out_bytes).decode("ascii")
            finished_at = time.time()
            elapsed = round(finished_at - (job.get("startedAt") or finished_at), 1)

            gallery_item = save_to_gallery(
                job_id,
                out_bytes,
                {
                    "prompt": saved_prompt,
                    "negativePrompt": negative_prompt,
                    "model": model_id,
                    "operation": operation,
                    "seed": seed_val,
                    "strength": strength if strength is not None else 1.0,
                    "resolution": resolution,
                    "styleMode": style_mode,
                    "loraPath": lora_path,
                    "autoMask": auto_mask,
                    "hadBrushMask": bool(mask_data_url),
                    "referenceCount": len(ref_images),
                    "elapsed": elapsed,
                },
            )
            gallery_item["imageUrl"] = f"http://{HOST}:{PORT}/gallery/{gallery_item['id']}/image"

            with JOBS_LOCK:
                job["status"] = "done"
                job["phase"] = "done"
                job["progress"] = 100
                job["eta"] = "00:00"
                job["stage"] = "Complete"
                job["imageDataUrl"] = data_url
                job["galleryItem"] = gallery_item
                job["finishedAt"] = finished_at

        except Exception as exc:
            ACTIVE_PROCESSES.pop(job_id, None)
            with JOBS_LOCK:
                if job_id in JOBS and JOBS[job_id]["status"] != "cancelled":
                    JOBS[job_id]["status"] = "error"
                    JOBS[job_id]["phase"] = "error"
                    JOBS[job_id]["error"] = str(exc)
                    JOBS[job_id]["finishedAt"] = time.time()
        finally:
            for p in temp_files:
                try:
                    if p.exists():
                        p.unlink()
                except OSError:
                    pass


def parse_prompt_with_ollama(prompt: str) -> list[dict[str, Any]] | None:
    ollama_ok, models = check_ollama()
    if not ollama_ok or not models:
        return None

    lower = prompt.lower()
    fantasy_kws = [
        "jedi",
        "sith",
        "lightsaber",
        "superhero",
        "cyborg",
        "anime",
        "pixar",
        "warrior",
        "knight",
        "robot",
    ]
    if any(k in lower for k in fantasy_kws):
        return []

    preferred = next((m for m in models if "llama3" in m), models[0])
    system_prompt = (
        "You convert a user's photo editing instruction into a JSON array of Photoshop layers. "
        "Allowed layer types (MAXIMUM 2 layers):\n"
        '1. {"type":"remove","prompt":"object to erase"}\n'
        '2. {"type":"replace","from":"visible clothing or item","to":"new clothing or item"}\n'
        '3. {"type":"recolor","target":"visible clothing or item","color":"color name or hex"}\n'
        '4. {"type":"background_replace","prompt":"new background scene"}\n'
        '5. {"type":"expand","aspectRatio":"16:9"|"9:16"|"4:5"|"1:1"|"3:2"}\n'
        '6. {"type":"restore"}\n'
        '7. {"type":"upscale"}\n'
        '8. {"type":"cutout"}\n'
        "CRITICAL RULES:\n"
        "- NEVER use placeholder words like 'existing object' or 'object'. 'from' MUST be a specific clothing item like 'shirt', 'jacket', 'tie', 'glasses'.\n"
        "- NEVER invent objects that do not already exist in the photo (no lightsabers, swords, wings).\n"
        "- NEVER combine 'cutout' and 'background_replace' (they are mutually exclusive).\n"
        "- Return at most 2 layers.\n"
        "Return ONLY valid JSON array, no markdown, no explanation."
    )
    body = json.dumps(
        {
            "model": preferred,
            "prompt": f"{system_prompt}\n\nUser instruction: {prompt}\nJSON:",
            "stream": False,
            "format": "json",
        }
    ).encode("utf-8")

    try:
        req = urllib.request.Request(
            "http://127.0.0.1:11434/api/generate",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            parsed = json.loads(data.get("response", "[]"))
            if isinstance(parsed, dict) and "layers" in parsed:
                parsed = parsed["layers"]
            if isinstance(parsed, list):
                cleaned: list[dict[str, Any]] = []
                for item in parsed[:3]:
                    if not isinstance(item, dict):
                        continue
                    if item.get("type") == "replace":
                        f = str(item.get("from", "")).lower().strip()
                        if not f or f in ("existing object", "object", "item", "something"):
                            continue
                    cleaned.append(item)
                return cleaned
    except Exception:
        return None
    return None


ALLOWED_ORIGIN_PATTERNS = [
    re.compile(r"^https://alterx\.vercel\.app$"),
    re.compile(r"^https://alterx-[a-z0-9-]+-yasinnkhanns-projects\.vercel\.app$"),
    re.compile(r"^http://localhost(:\d+)?$"),
    re.compile(r"^http://127\.0\.0\.1(:\d+)?$"),
]

EXTRA_ALLOWED_ORIGINS = {
    o.strip().rstrip("/")
    for o in os.environ.get("ALTERX_ALLOWED_ORIGINS", "").split(",")
    if o.strip()
}


def is_allowed_origin(origin: str | None) -> bool:
    if not origin:
        return True
    cleaned = origin.strip().rstrip("/")
    if cleaned in EXTRA_ALLOWED_ORIGINS:
        return True
    return any(p.match(cleaned) for p in ALLOWED_ORIGIN_PATTERNS)


class StudioHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        print(f"[Alterx Local] {self.address_string()} - {format % args}")

    def _check_origin(self) -> bool:
        origin = self.headers.get("Origin")
        if not is_allowed_origin(origin):
            raw = json.dumps({"error": "Origin not allowed"}).encode("utf-8")
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return False
        return True

    def _send_cors_headers(self) -> None:
        origin = self.headers.get("Origin")
        if origin and is_allowed_origin(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Vary", "Origin")

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _send_bytes(self, status: int, content_type: str, data: bytes) -> None:
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_OPTIONS(self) -> None:
        if not self._check_origin():
            return
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        if not self._check_origin():
            return
        path = self.path.split("?", 1)[0]

        if path == "/health":
            available_models = []
            for model_id, spec in LOCAL_MODELS.items():
                available_models.append(
                    {
                        "id": model_id,
                        "name": spec["name"],
                        "description": spec["description"],
                        "installed": find_binary(spec["binary"]) is not None,
                        "defaultSteps": spec["default_steps"],
                        "supportsAutoMask": spec["supports_auto_mask"],
                        "supportsBrushMask": spec["supports_brush_mask"],
                        "supportsVerify": spec["supports_verify"],
                        "supportsStrength": spec["supports_strength"],
                        "supportsMultiImage": spec["supports_multi_image"],
                    }
                )
            ollama_ok, ollama_models = check_ollama()
            self._send_json(
                200,
                {
                    "ok": True,
                    "mfluxInstalled": any(m["installed"] for m in available_models),
                    "models": available_models,
                    "upscalerInstalled": find_binary("mflux-upscale-seedvr2") is not None,
                    "cutoutInstalled": find_binary("mflux-generate-fibo-edit") is not None,
                    "galleryDir": str(GALLERY_DIR),
                    "galleryCount": count_gallery_items(),
                    "autoStartInstalled": any(p.exists() for p in LAUNCH_AGENT_PLISTS),
                    "ollama": {"connected": ollama_ok, "models": ollama_models},
                    "busy": len(ACTIVE_PROCESSES) > 0,
                },
            )
            return

        if path == "/gallery":
            self._send_json(
                200,
                {
                    "dir": str(GALLERY_DIR),
                    "items": list_gallery_items(),
                },
            )
            return

        if path.startswith("/gallery/") and path.endswith("/image"):
            item_id = path.removeprefix("/gallery/").removesuffix("/image").strip("/")
            if not SAFE_ID_RE.match(item_id):
                self._send_json(400, {"error": "Invalid gallery ID"})
                return
            img_path = GALLERY_DIR / f"{item_id}.png"
            if not img_path.exists():
                self._send_json(404, {"error": "Image not found"})
                return
            self._send_bytes(200, "image/png", img_path.read_bytes())
            return

        if path.startswith("/jobs/"):
            job_id = path.split("/jobs/", 1)[1].strip("/")
            with JOBS_LOCK:
                job = JOBS.get(job_id)
                if not job:
                    self._send_json(404, {"error": "Job not found"})
                    return
                now = job.get("finishedAt") or time.time()
                started = job.get("startedAt") or job.get("createdAt") or now
                resp = {
                    "jobId": job_id,
                    "status": job["status"],
                    "phase": job.get("phase", "queued"),
                    "stage": job.get("stage", ""),
                    "progress": job.get("progress"),
                    "step": job.get("step"),
                    "totalSteps": job.get("totalSteps"),
                    "eta": job.get("eta"),
                    "seed": job.get("seed"),
                    "elapsed": round(now - started, 1),
                    "logs": job.get("logs", [])[-14:],
                    "imageDataUrl": job.get("imageDataUrl"),
                    "galleryItem": job.get("galleryItem"),
                    "error": job.get("error"),
                }
            self._send_json(200, resp)
            return

        self._send_json(404, {"error": "Not found"})

    def do_DELETE(self) -> None:
        if not self._check_origin():
            return
        path = self.path.split("?", 1)[0]
        if path.startswith("/gallery/"):
            item_id = path.removeprefix("/gallery/").strip("/")
            if delete_gallery_item(item_id):
                self._send_json(200, {"ok": True, "deleted": item_id})
            else:
                self._send_json(404, {"error": "Gallery item not found"})
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if not self._check_origin():
            return
        path = self.path.split("?", 1)[0]

        if path == "/edit":
            try:
                payload = self._read_json()
            except Exception as exc:
                self._send_json(400, {"error": f"Invalid JSON: {exc}"})
                return

            operation = str(payload.get("operation") or "edit").strip().lower()
            if operation == "edit" and not str(payload.get("prompt", "")).strip():
                self._send_json(400, {"error": "Prompt is required"})
                return

            job_id = uuid.uuid4().hex[:12]
            with JOBS_LOCK:
                JOBS[job_id] = {
                    "status": "queued",
                    "phase": "queued",
                    "stage": "Queued for Apple Silicon GPU...",
                    "progress": 0,
                    "step": None,
                    "totalSteps": None,
                    "eta": None,
                    "seed": None,
                    "logs": [],
                    "createdAt": time.time(),
                }

            thread = threading.Thread(
                target=run_mflux_job,
                args=(job_id, payload),
                daemon=True,
            )
            thread.start()
            self._send_json(202, {"jobId": job_id})
            return

        if path.startswith("/jobs/") and path.endswith("/cancel"):
            job_id = path.removeprefix("/jobs/").removesuffix("/cancel").strip("/")
            with JOBS_LOCK:
                if job_id in JOBS:
                    JOBS[job_id]["status"] = "cancelled"
                    JOBS[job_id]["phase"] = "cancelled"
                    JOBS[job_id]["stage"] = "Cancelled by user"
                    JOBS[job_id]["finishedAt"] = time.time()
            proc = ACTIVE_PROCESSES.pop(job_id, None)
            if proc and proc.poll() is None:
                proc.terminate()
            self._send_json(200, {"ok": True, "cancelled": job_id})
            return

        if path == "/gallery/open-folder":
            try:
                subprocess.Popen(["open", str(GALLERY_DIR)])
                self._send_json(200, {"ok": True, "dir": str(GALLERY_DIR)})
            except Exception as exc:
                self._send_json(500, {"error": str(exc)})
            return

        if path == "/parse-prompt":
            try:
                payload = self._read_json()
            except Exception:
                self._send_json(400, {"error": "Invalid JSON"})
                return
            prompt = str(payload.get("prompt", "")).strip()
            layers = parse_prompt_with_ollama(prompt)
            self._send_json(200, {"layers": layers})
            return

        self._send_json(404, {"error": "Not found"})


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def main() -> None:
    server = ReusableThreadingHTTPServer((HOST, PORT), StudioHandler)
    print(f"✨ Alterx Local MLX Server listening on http://{HOST}:{PORT}")
    print(f"   mflux-generate-flux2-edit:    {find_binary('mflux-generate-flux2-edit') or 'NOT FOUND'}")
    print(f"   mflux-generate-qwen-2.1-edit: {find_binary('mflux-generate-qwen-2.1-edit') or 'NOT FOUND'}")
    print(f"   mflux-upscale-seedvr2:        {find_binary('mflux-upscale-seedvr2') or 'NOT FOUND'}")
    print(f"   mflux-generate-fibo-edit:     {find_binary('mflux-generate-fibo-edit') or 'NOT FOUND'}")
    print(f"   Auto-saved gallery folder:    {GALLERY_DIR}")
    ollama_ok, ollama_models = check_ollama()
    print(f"   Ollama smart parser:          {'connected (' + ', '.join(ollama_models) + ')' if ollama_ok else 'offline'}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Alterx Local MLX Server...")
        server.server_close()


if __name__ == "__main__":
    main()
