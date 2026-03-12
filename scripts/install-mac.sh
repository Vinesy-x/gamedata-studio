#!/bin/bash
# GameData Studio — Mac install script
# Usage: bash install-mac.sh

set -e

MANIFEST_URL="https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/manifest-local.xml"
SERVER_URL="https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/file-server.py"
PLIST_URL="https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/com.gamedata-studio.server.plist"
WEF_DIR="$HOME/Library/Containers/com.microsoft.Excel/Data/Documents/wef"
MANIFEST_FILE="$WEF_DIR/manifest.xml"
DATA_DIR="$HOME/.gamedata-studio"
SERVER_FILE="$DATA_DIR/file-server.py"
PLIST_NAME="com.gamedata-studio.server"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENTS/$PLIST_NAME.plist"

echo "========================================="
echo "  GameData Studio Install"
echo "========================================="
echo ""

# Check Excel
if [ ! -d "$HOME/Library/Containers/com.microsoft.Excel" ]; then
  echo "ERROR: Excel for Mac not found. Please install Microsoft Excel first."
  exit 1
fi

# Check Python 3
if ! command -v python3 &>/dev/null; then
  echo "ERROR: Python 3 not found. Please install Python 3 first."
  exit 1
fi

# Create directories
mkdir -p "$WEF_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$LAUNCH_AGENTS"

# Step 1: Download manifest
echo "[1/4] Downloading manifest..."
curl -sL "$MANIFEST_URL" -o "$MANIFEST_FILE"
if [ ! -f "$MANIFEST_FILE" ]; then
  echo "ERROR: Download failed. Check your network."
  exit 1
fi
echo "      OK"

# Step 2: Download file server
echo "[2/4] Downloading file server..."
curl -sL "$SERVER_URL" -o "$SERVER_FILE"
echo "      OK"

# Step 3: Install LaunchAgent (auto-start on login)
echo "[3/4] Setting up auto-start..."

# Stop existing service if running
launchctl bootout "gui/$(id -u)/$PLIST_NAME" 2>/dev/null || true

# Download and patch plist
curl -sL "$PLIST_URL" -o "$PLIST_FILE"
sed -i '' "s|FILE_SERVER_PATH|$SERVER_FILE|g" "$PLIST_FILE"
sed -i '' "s|LOG_PATH|$DATA_DIR|g" "$PLIST_FILE"
echo "      OK"

# Step 4: Start file server now
echo "[4/4] Starting file server..."
launchctl bootstrap "gui/$(id -u)" "$PLIST_FILE" 2>/dev/null || true
sleep 1

# Verify
if curl -s http://localhost:9876/ >/dev/null 2>&1 || curl -s https://localhost:9876/ >/dev/null 2>&1; then
  echo "      OK (running on port 9876)"
else
  echo "      Warning: server may still be starting up"
fi

echo ""
echo "========================================="
echo "  Install complete!"
echo "========================================="
echo ""
echo "  File server runs automatically in background."
echo "  Just restart Excel and find GameData Studio in Home tab."
echo ""
echo "Uninstall:"
echo "  launchctl bootout gui/$(id -u)/$PLIST_NAME"
echo "  rm $PLIST_FILE"
echo "  rm $MANIFEST_FILE"
echo "  rm -rf $DATA_DIR"
echo "========================================="
