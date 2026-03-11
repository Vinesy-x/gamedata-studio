@echo off
chcp 65001 >nul
:: GameData Studio — Windows 一键安装脚本
:: 使用方法: 双击运行

echo =========================================
echo   GameData Studio 安装程序
echo =========================================
echo.

set MANIFEST_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/manifest-online.xml
set WEF_DIR=%LOCALAPPDATA%\Microsoft\Office\16.0\Wef
set MANIFEST_FILE=%WEF_DIR%\manifest.xml

:: 创建 wef 目录
if not exist "%WEF_DIR%" (
    echo 创建加载项目录...
    mkdir "%WEF_DIR%"
)

:: 下载 manifest
echo 下载 GameData Studio 配置文件...
powershell -Command "Invoke-WebRequest -Uri '%MANIFEST_URL%' -OutFile '%MANIFEST_FILE%'"

if not exist "%MANIFEST_FILE%" (
    echo 下载失败，请检查网络连接。
    pause
    exit /b 1
)

echo.
echo 安装完成！
echo.
echo 使用方法：
echo   1. 退出并重新打开 Excel
echo   2. 打开任意工作簿
echo   3. 在「开始」选项卡中找到 GameData Studio 按钮
echo   4. 点击按钮打开侧边栏
echo.
echo 卸载方法：
echo   删除文件: %MANIFEST_FILE%
echo =========================================
pause
