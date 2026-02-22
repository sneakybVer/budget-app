#!/usr/bin/env bash
# Build the Savings Tracker macOS launcher app from source.
#
# Usage (from repo root):
#   bash scripts/mac/build-launcher.sh
#
# The compiled .app is placed in ~/Applications by default.
# Override by setting APP_DEST, e.g.:
#   APP_DEST="$HOME/Desktop" bash scripts/mac/build-launcher.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$SCRIPT_DIR/launcher.applescript"
APP_DEST="${APP_DEST:-"$HOME/Applications"}"
APP_NAME="Savings Tracker"
APP_PATH="$APP_DEST/$APP_NAME.app"

mkdir -p "$APP_DEST"

echo "Compiling $SOURCE → $APP_PATH"
osacompile -o "$APP_PATH" "$SOURCE"

echo "Done — $APP_PATH created."
echo "Tip: drag it to your Dock or pin it to Finder Favourites."
