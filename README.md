# GameData Studio

RPG/MMO 游戏数值管理工具 — Excel Add-in

---

## 安装教程

### Mac

```bash
bash -c "$(curl -sL https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/install-mac.sh)"
```

安装完成后：
1. 启动文件服务（每次使用前需运行）：
   ```bash
   python3 ~/.gamedata-studio/file-server.py
   ```
2. 重启 Excel
3. 在「开始」选项卡中找到 GameData Studio

### Windows

1. 下载并运行 [`install-windows.bat`](https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/install-windows.bat)
2. 双击启动文件服务（每次使用前需运行）：
   `%USERPROFILE%\.gamedata-studio\start-file-server.bat`
3. 重启 Excel
4. 在「开始」选项卡中找到 GameData Studio

### 卸载

**Mac：**
```bash
rm ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/manifest.xml
rm -rf ~/.gamedata-studio
```

**Windows：**
```cmd
reg delete "HKCU\Software\Microsoft\Office\16.0\WEF\Developer\a1b2c3d4-e5f6-7890-abcd-ef1234567890" /f
rd /s /q "%USERPROFILE%\.gamedata-studio"
```

---

## 使用说明

1. 确保文件服务正在运行（终端/命令行窗口保持打开）
2. 打开 Excel，点击「加载项」→ 选择 GameData Studio
3. 首次使用点击「初始化工作簿」，自动创建配置表和表名对照
4. 在「管理」选项卡中添加/管理数据表
5. 在「导出」选项卡中配置版本参数，点击「开始导出」
6. 在「校验」选项卡中检查数据格式
7. 在「预览」选项卡中预览导出结果

---

## 工作原理

文件服务（`file-server.py` / `file-server.ps1`）在本地运行，同时负责：
- 托管加载项 UI 页面（自动从 GitHub 下载最新版本）
- 提供文件读写 API（导出数据到指定目录）

加载项从 `http://localhost:9876` 加载，文件 API 同源，无跨域问题。

---

## 技术栈

- Office Web Add-in (Excel)
- React + TypeScript + FluentUI v9
- Office JavaScript API
- 本地文件服务 (Python / PowerShell)
