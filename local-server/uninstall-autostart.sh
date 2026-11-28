#!/usr/bin/env bash
set -euo pipefail

LABEL="com.yasinkhan.alterx-local"
LEGACY_LABEL="com.yasinkhan.ai-photo-studio"

launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootout "gui/$(id -u)/${LEGACY_LABEL}" 2>/dev/null || true

rm -f "$HOME/Library/LaunchAgents/${LABEL}.plist"
rm -f "$HOME/Library/LaunchAgents/${LEGACY_LABEL}.plist"

echo "🗑️  Removed Alterx macOS LaunchAgent"
