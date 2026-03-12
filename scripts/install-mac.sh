#!/bin/bash
# GameData Studio — Mac 一键安装脚本
# 使用方法: 双击运行 或 终端执行 bash install-mac.sh

set -e

MANIFEST_URL="https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/manifest-online.xml"
WEF_DIR="$HOME/Library/Containers/com.microsoft.Excel/Data/Documents/wef"
MANIFEST_FILE="$WEF_DIR/manifest.xml"

echo "========================================="
echo "  GameData Studio 安装程序"
echo "========================================="
echo ""

# 检查 Excel 是否已安装
if [ ! -d "$HOME/Library/Containers/com.microsoft.Excel" ]; then
  echo "❌ 未检测到 Excel for Mac，请先安装 Microsoft Excel。"
  exit 1
fi

# 创建 wef 目录
if [ ! -d "$WEF_DIR" ]; then
  echo "📁 创建加载项目录..."
  mkdir -p "$WEF_DIR"
fi

# 下载 manifest
echo "📥 下载 GameData Studio 配置文件..."
curl -sL "$MANIFEST_URL" -o "$MANIFEST_FILE"

if [ ! -f "$MANIFEST_FILE" ]; then
  echo "❌ 下载失败，请检查网络连接。"
  exit 1
fi

echo ""
echo "✅ 安装完成！"
echo ""
echo "使用方法："
echo "  1. 退出并重新打开 Excel"
echo "  2. 打开任意工作簿"
echo "  3. 在「开始」选项卡中找到 GameData Studio 按钮"
echo "  4. 点击按钮打开侧边栏"
echo ""
echo "卸载方法："
echo "  删除文件: $MANIFEST_FILE"
echo "========================================="
