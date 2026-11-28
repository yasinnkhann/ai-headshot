#!/usr/bin/env python3
"""
Local AI Photo Studio Server (Apple Silicon MLX via mflux)
Runs 100% locally on your Mac for $0 with unlimited photo edits.

Start with:
  npm run local-ai
  # or: python3 local-server/server.py
"""

from __future__ import annotations

import base64
import json
import os
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

# Ensure uv tools bin directory is searchable even when launched from GUI/scripts
EXTRA_PATH = str(Path.home() / ".local" / "bin")
if EXTRA_PATH not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{EXTRA_PATH}:{os.environ.get('PATH', '')}"

TMP_DIR = Path(tempfile.gettempdir()) / "ai-photo-studio-local"
TMP_DIR.mkdir(parents=True, exist_ok=True)

JOBS: dict[str, dict[str, Any]] = {}
JOBS_LOCK = threading.Lock()
ACTIVE_PROCESSES: dict[str, subprocess.Popen[str]] = {}
GEN_SEMAPHORE = threading.Semaphore(1)  # Serialize MLX runs so 16GB RAM never thrashes

LOCAL_MODELS = {
    "flux2-klein-4b": {
        "id": "flux2-klein-4b",
        "name": "FLUX.2 Klein 4B (Fast)",
        "description": "Fast 4-step local editing for creative prompts, scene swaps, and restyling (~20-60s on M1 Pro)",
        "binary": "mflux-generate-flux2-edit",
        "default_steps": 4,
        "supports_auto_mask": False,
        "supports_verify": False,
    },
    "qwen-2.1-turbo": {
        "id": "qwen-2.1-turbo",
        "name": "Qwen Image 2.1 Turbo (Max Accuracy)",
        "description": "High-accuracy editing with optional object Auto-Mask & AI prompt enhancement (~1-3 min on M1 Pro)",
        "binary": "mflux-generate-qwen-2.1-edit",
        "default_steps": 8,
        "supports_auto_mask": True,
        "supports_verify": True,
    },
}


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


def decode_input_image(payload: dict[str, Any], dest_path: Path) -> None:
    image_data_url = payload.get("imageDataUrl")
    image_url = payload.get("imageUrl")

    if image_data_url and isinstance(image_data_url, str) and "," in image_data_url:
        _, b64 = image_data_url.split(",", 1)
        dest_path.write_bytes(base64.b64decode(b64))
        return

    if image_url and isinstance(image_url, str) and image_url.startswith(("http://", "https://")):
        req = urllib.request.Request(
            image_url,
            headers={"User-Agent": "AI-Photo-Studio-Local/1.0"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            dest_path.write_bytes(resp.read())
        return

    raise ValueError("Missing valid imageDataUrl or imageUrl")


def parse_progress_line(line: str) -> str | None:
    cleaned = re.sub(r"\x1b\[[0-9;]*[a-zA-Z]", "", line).strip()
    if not cleaned:
        return None
    if "NOTE: Redirects are currently not supported" in cleaned:
        return None
    return cleaned


def run_mflux_job(job_id: str, payload: dict[str, Any]) -> None:
    with GEN_SEMAPHORE:
        with JOBS_LOCK:
            job = JOBS.get(job_id)
            if not job or job["status"] == "cancelled":
                return
            job["status"] = "running"
            job["stage"] = "Preparing input image..."
            job["startedAt"] = time.time()

        input_path = TMP_DIR / f"{job_id}_in.png"
        output_path = TMP_DIR / f"{job_id}_out.png"

        try:
            decode_input_image(payload, input_path)

            model_id = payload.get("model", "flux2-klein-4b")
            if model_id not in LOCAL_MODELS:
                model_id = "flux2-klein-4b"
            spec = LOCAL_MODELS[model_id]
            binary = find_binary(spec["binary"])
            if not binary:
                raise RuntimeError(
                    f"'{spec['binary']}' not found. Run: uv tool install --python 3.12 --upgrade mflux"
                )

            prompt = str(payload.get("prompt", "")).strip()
            if not prompt:
                raise ValueError("Prompt cannot be empty")

            steps = int(payload.get("steps") or spec["default_steps"])
            quantize = int(payload.get("quantize") or 4)
            resolution = int(payload.get("resolution") or 768)

            cli_model = (
                "flux2-klein-4b"
                if model_id == "flux2-klein-4b"
                else "qwen-image-2.1-turbo"
            )
            cmd: list[str] = [
                binary,
                "--model",
                cli_model,
                "--quantize",
                str(quantize),
                "--low-ram",
                "--image-paths",
                str(input_path),
                "--prompt",
                prompt,
                "--steps",
                str(steps),
                "--output",
                str(output_path),
            ]

            if model_id == "flux2-klein-4b":
                cmd.append("--small-decoder")
                if resolution:
                    # Keep resolution bounded so 16GB M1 Pro stays snappy
                    cmd.extend(["--width", str(resolution), "--height", str(resolution)])
            else:
                cmd.extend(["--output-resolution", str(resolution)])
                auto_mask = str(payload.get("autoMask") or "").strip()
                if auto_mask:
                    cmd.extend(["--auto-mask", auto_mask])
                strength = payload.get("strength")
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

            seed = payload.get("seed")
            if seed is not None and str(seed).strip().isdigit():
                cmd.extend(["--seed", str(int(seed))])

            with JOBS_LOCK:
                job["stage"] = f"Running {spec['name']} locally on Apple Silicon..."
                job["logs"].append(f"Launching {spec['binary']} ({steps} steps, {quantize}-bit MLX)...")

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
                    if len(job["logs"]) > 40:
                        job["logs"] = job["logs"][-40:]
                    lower = cleaned.lower()
                    if "downloading" in lower or "fetching" in lower:
                        job["stage"] = "First-time model download from Hugging Face (cached locally forever)..."
                    elif "step" in lower or "%" in cleaned:
                        job["stage"] = cleaned[:110]
                    elif "decoding" in lower or "vae" in lower:
                        job["stage"] = "Decoding high-resolution image..."

            ret = proc.wait()
            ACTIVE_PROCESSES.pop(job_id, None)

            with JOBS_LOCK:
                if job["status"] == "cancelled":
                    return

            if ret != 0 or not output_path.exists():
                with JOBS_LOCK:
                    tail = " | ".join(job["logs"][-4:])
                raise RuntimeError(f"mflux exited with code {ret}. {tail}")

            out_bytes = output_path.read_bytes()
            data_url = "data:image/png;base64," + base64.b64encode(out_bytes).decode("ascii")

            with JOBS_LOCK:
                job["status"] = "done"
                job["stage"] = "Complete"
                job["imageDataUrl"] = data_url
                job["finishedAt"] = time.time()

        except Exception as exc:
            ACTIVE_PROCESSES.pop(job_id, None)
            with JOBS_LOCK:
                if job_id in JOBS and JOBS[job_id]["status"] != "cancelled":
                    JOBS[job_id]["status"] = "error"
                    JOBS[job_id]["error"] = str(exc)
                    JOBS[job_id]["finishedAt"] = time.time()
        finally:
            for p in (input_path, output_path):
                try:
                    if p.exists():
                        p.unlink()
                except OSError:
                    pass


def parse_prompt_with_ollama(prompt: str) -> list[dict[str, Any]] | None:
    ollama_ok, models = check_ollama()
    if not ollama_ok or not models:
        return None

    preferred = next((m for m in models if "llama3" in m), models[0])
    system_prompt = (
        "You convert a user's photo editing instruction into a JSON array of Photoshop layers. "
        "Allowed layer types:\n"
        '1. {"type":"remove","prompt":"object to erase"}\n'
        '2. {"type":"replace","from":"existing object","to":"new object"}\n'
        '3. {"type":"recolor","target":"object","color":"color name or hex"}\n'
        '4. {"type":"background_replace","prompt":"new background scene"}\n'
        '5. {"type":"expand","aspectRatio":"16:9"|"9:16"|"4:5"|"1:1"|"3:2"}\n'
        '6. {"type":"restore"}\n'
        '7. {"type":"upscale"}\n'
        '8. {"type":"cutout"}\n'
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
                return parsed
    except Exception:
        return None
    return None


class StudioHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        # Keep terminal clean and informative
        print(f"[Local AI] {self.address_string()} - {format % args}")

    def _send_cors_headers(self) -> None:
        origin = self.headers.get("Origin") or "*"
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            available_models = []
            for key, spec in LOCAL_MODELS.items():
                available_models.append(
                    {
                        "id": key,
                        "name": spec["name"],
                        "description": spec["description"],
                        "installed": find_binary(spec["binary"]) is not None,
                        "defaultSteps": spec["default_steps"],
                        "supportsAutoMask": spec["supports_auto_mask"],
                        "supportsVerify": spec["supports_verify"],
                    }
                )
            ollama_ok, ollama_models = check_ollama()
            self._send_json(
                200,
                {
                    "ok": True,
                    "mfluxInstalled": any(m["installed"] for m in available_models),
                    "models": available_models,
                    "ollama": {"connected": ollama_ok, "models": ollama_models},
                    "busy": len(ACTIVE_PROCESSES) > 0,
                },
            )
            return

        if self.path.startswith("/jobs/"):
            job_id = self.path.split("/jobs/", 1)[1].split("?")[0].strip("/")
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
                    "stage": job.get("stage", ""),
                    "elapsed": round(now - started, 1),
                    "logs": job.get("logs", [])[-12:],
                    "imageDataUrl": job.get("imageDataUrl"),
                    "error": job.get("error"),
                }
            self._send_json(200, resp)
            return

        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path == "/edit":
            try:
                payload = self._read_json()
            except Exception as exc:
                self._send_json(400, {"error": f"Invalid JSON: {exc}"})
                return

            if not payload.get("prompt", "").strip():
                self._send_json(400, {"error": "Prompt is required"})
                return

            job_id = uuid.uuid4().hex[:12]
            with JOBS_LOCK:
                JOBS[job_id] = {
                    "status": "queued",
                    "stage": "Queued for Apple Silicon GPU...",
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

        if self.path.startswith("/jobs/") and self.path.endswith("/cancel"):
            job_id = self.path.removeprefix("/jobs/").removesuffix("/cancel").strip("/")
            with JOBS_LOCK:
                if job_id in JOBS:
                    JOBS[job_id]["status"] = "cancelled"
                    JOBS[job_id]["stage"] = "Cancelled by user"
                    JOBS[job_id]["finishedAt"] = time.time()
            proc = ACTIVE_PROCESSES.pop(job_id, None)
            if proc and proc.poll() is None:
                proc.terminate()
            self._send_json(200, {"ok": True, "cancelled": job_id})
            return

        if self.path == "/parse-prompt":
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
    print(f"✨ AI Photo Studio Local MLX Server listening on http://{HOST}:{PORT}")
    print(f"   mflux-generate-flux2-edit:    {find_binary('mflux-generate-flux2-edit') or 'NOT FOUND'}")
    print(f"   mflux-generate-qwen-2.1-edit: {find_binary('mflux-generate-qwen-2.1-edit') or 'NOT FOUND'}")
    ollama_ok, ollama_models = check_ollama()
    print(f"   Ollama smart parser:          {'connected (' + ', '.join(ollama_models[:3]) + ')' if ollama_ok else 'not running'}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Local AI server.")
        server.server_close()


if __name__ == "__main__":
    main()
