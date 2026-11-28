#!/usr/bin/env bash
# Alterx Local Mac AI Engine Quickstart
# Runs FLUX.2 Klein 4B & Qwen 2.1 Turbo directly on Apple Silicon GPU for $0 unlimited edits.

set -euo pipefail

echo "==========================================="
echo "  ✦ Alterx Local Mac AI Quickstart Engine  "
echo "==========================================="
echo ""

# 1. Architecture check
ARCH="$(uname -m)"
OS="$(uname -s)"

if [ "$OS" != "Darwin" ]; then
  echo "❌ Alterx Local AI requires macOS (Apple Silicon). Detected: $OS"
  echo "👉 Tip: Use Cloud Photoshop mode in the web app — it works on any device with zero setup!"
  exit 1
fi

if [ "$ARCH" != "arm64" ]; then
  echo "⚠️ Warning: Apple Silicon (M1/M2/M3/M4/M5) recommended for GPU acceleration. Detected: $ARCH"
fi

# 2. Check Python 3
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 not found. Please install Python 3 (e.g. 'brew install python3') and re-run."
  exit 1
fi

PYTHON_VER="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
echo "✅ Python $PYTHON_VER found: $(which python3)"

# 3. Check mflux
if ! command -v mflux-generate-flux2-edit &>/dev/null && [ ! -f "$HOME/.local/bin/mflux-generate-flux2-edit" ]; then
  echo "📦 mflux not detected in PATH. Checking pip/uv..."
  if command -v uv &>/dev/null; then
    echo "⚡ Installing mflux via uv tool..."
    uv tool install mflux || true
  elif command -v pip3 &>/dev/null; then
    echo "⚡ Installing mflux via pip3..."
    pip3 install --user mflux || true
  fi
fi

# 4. Resolve local-server path
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_FILE="${SCRIPT_DIR}/server.py"

if [ ! -f "$SERVER_FILE" ]; then
  echo "❌ server.py not found at $SERVER_FILE."
  exit 1
fi

echo ""
echo "🚀 Starting Alterx Local AI bridge on http://127.0.0.1:8787..."
echo "📂 Your rendered photos will auto-save to: ~/Pictures/Alterx"
echo "🌐 Open https://alterx.vercel.app to start creating!"
echo ""

exec python3 "$SERVER_FILE"
