#!/bin/bash
# GameData Studio — Mac install script
# Usage: bash install-mac.sh

set -e

MANIFEST_URL="https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/manifest-local.xml"
SERVER_URL="https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/file-server.py"
WEF_DIR="$HOME/Library/Containers/com.microsoft.Excel/Data/Documents/wef"
MANIFEST_FILE="$WEF_DIR/manifest.xml"
DATA_DIR="$HOME/.gamedata-studio"
SERVER_FILE="$DATA_DIR/file-server.py"

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

# Download manifest
echo "Downloading manifest..."
curl -sL "$MANIFEST_URL" -o "$MANIFEST_FILE"
if [ ! -f "$MANIFEST_FILE" ]; then
  echo "ERROR: Download failed. Check your network."
  exit 1
fi

# Download file server
echo "Downloading file server..."
curl -sL "$SERVER_URL" -o "$SERVER_FILE"

echo ""
echo "Install complete!"
echo ""
echo "Usage:"
echo "  1. Start the file server (keep it running):"
echo "     python3 ~/.gamedata-studio/file-server.py"
echo ""
echo "  2. Restart Excel"
echo "  3. Find GameData Studio in the Home tab"
echo ""
echo "Uninstall:"
echo "  rm $MANIFEST_FILE"
echo "  rm -rf $DATA_DIR"
echo "========================================="
