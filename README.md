# GameData Studio

RPG/MMO 游戏数值管理工具 — Excel Add-in

---

## 功能特性

- 多版本数据导出，支持 `[min, max)` 版本区间筛选
- 增量导出（哈希比对，仅导出变更的表）
- 版本行/列筛选，支持多线路 roads
- 数据校验引擎（格式、覆盖完整性、重复Key等）
- 导出预览
- Git 命令一键生成
- 自动更新（通过 GitHub Pages）

---

## 安装

### Windows（推荐）

从 [Releases](https://github.com/Vinesy-x/gamedata-studio/releases) 下载最新安装包：

1. 运行 `GameDataStudio-Setup-x.x.x.exe`
2. 重启 Excel
3. 在「开始」选项卡中找到 GameData Studio

文件服务器开机自动后台运行，无需手动操作。

**卸载：** 控制面板 → 添加或删除程序 → GameData Studio

### Mac

```bash
bash -c "$(curl -sL https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/install-mac.sh)"
```

安装完成后重启 Excel 即可。文件服务器通过 LaunchAgent 自动后台运行。

**卸载：**
```bash
launchctl bootout gui/$(id -u)/com.gamedata-studio.server
rm ~/Library/LaunchAgents/com.gamedata-studio.server.plist
rm ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/manifest.xml
rm -rf ~/.gamedata-studio
```

---

## 使用说明

1. 打开 Excel，点击「开始」选项卡中的 GameData Studio
2. 首次使用点击「初始化工作簿」，自动创建配置表和表名对照
3. 在「管理」选项卡中添加/管理数据表和版本模板
4. 在「导出」选项卡中配置版本参数，点击「开始导出」
5. 在「校验」选项卡中检查数据格式
6. 在「预览」选项卡中预览导出结果

---

## 开发

```bash
npm install
npm start        # Dev server (https://localhost:3000)
npm test         # 运行测试
npm run lint     # TypeScript 类型检查
npm run build    # 生产构建
```

克隆后启用 git hooks：

```bash
git config core.hooksPath scripts/hooks
```

每次 `git push` 自动递增 patch 版本号。

### 构建 Windows 安装包

1. 安装 [Inno Setup](https://jrsoftware.org/isdl.php)
2. 运行 `installer/prepare.bat`
3. 运行 `iscc installer/setup.iss`
4. 输出：`installer/output/GameDataStudio-Setup-x.x.x.exe`

或直接推送代码，GitHub Actions 自动构建并发布到 Releases。

---

## 工作原理

文件服务（`file-server.py` / `file-server.ps1`）在本地后台运行，负责：
- 托管加载项 UI 页面（自动从 GitHub Pages 下载最新版本）
- 提供文件读写 API（导出数据到指定目录）

加载项从 `http://localhost:9876` 加载，文件 API 同源，无跨域问题。

---

## 项目结构

```
src/
  engine/      核心导出引擎 (ConfigLoader, VersionFilter, DataFilter, ExportJob, ExportWriter)
  taskpane/    React 侧边栏 UI
  utils/       工具函数 (ExcelHelper, ErrorHandler, Logger)
  types/       TypeScript 类型定义
  v2/          配置存储 (JSON)
  v3/          校验 & 预览引擎
  git/         Git 命令生成
scripts/       安装脚本、文件服务器、git hooks
installer/     Inno Setup 安装包脚本
```

## 技术栈

- Office Web Add-in (Excel)
- React + TypeScript + FluentUI v9
- Office JavaScript API
- 本地文件服务 (Python / PowerShell)

## 系统要求

- **Windows**: Windows 10/11, Excel 2016+, PowerShell 3.0+
- **Mac**: macOS 10.15+, Excel 2016+, Python 3
