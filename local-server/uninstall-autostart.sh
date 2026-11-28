#!/usr/bin/env bash
set -euo pipefail

LABEL="com.yasinkhan.ai-photo-studio"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"

launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
rm -f "$PLIST_PATH"

echo "🗑️  Removed macOS LaunchAgent: ${LABEL}"
