#!/usr/bin/env bash
set -euo pipefail

LABEL="com.yasinkhan.alterx-local"
LEGACY_LABEL="com.yasinkhan.ai-photo-studio"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
LEGACY_PLIST_PATH="$HOME/Library/LaunchAgents/${LEGACY_LABEL}.plist"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_PATH="${SCRIPT_DIR}/server.py"
LOG_DIR="$HOME/Library/Logs/Alterx"
PYTHON_BIN="$(command -v python3 || echo /opt/homebrew/bin/python3)"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

# Clean up legacy launch daemon if present
launchctl bootout "gui/$(id -u)/${LEGACY_LABEL}" 2>/dev/null || true
rm -f "$LEGACY_PLIST_PATH"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${PYTHON_BIN}</string>
    <string>${SERVER_PATH}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>PYTHONUNBUFFERED</key>
    <string>1</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/server.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/server.err.log</string>
</dict>
</plist>
EOF

# Unload any previous instance before loading fresh
launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

echo "✅ Installed and started macOS LaunchAgent: ${LABEL}"
echo "   Server: ${SERVER_PATH}"
echo "   Plist:  ${PLIST_PATH}"
echo "   Logs:   ${LOG_DIR}/server.out.log"
