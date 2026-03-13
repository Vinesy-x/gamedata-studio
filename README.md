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

### Windows（推荐：安装包）

从 [Releases](https://github.com/Vinesy-x/gamedata-studio/releases) 下载最新安装包：

1. **右键** `GameDataStudio-Setup-x.x.x.exe` → **以管理员身份运行**
2. 安装完成后**重启 Excel**
3. **开始** → **加载项** → **更多加载项**（+）→ 切换到 **共享文件夹**（SHARED FOLDER）标签页 → 找到 **GameData Studio** → 点击**添加**

> 安装器会自动完成：
> - 释放文件到 `%APPDATA%\GameDataStudio\`
> - 创建网络共享目录 `\\localhost\GameDataStudioCatalog`
> - 注册信任目录到 Excel
> - 创建开机自启的本地文件服务器

**卸载：** 控制面板 → 添加或删除程序 → GameData Studio

#### Windows 疑难排查

<details>
<summary>安装后「共享文件夹」标签未出现</summary>

1. 确认安装时使用了**管理员权限**（`net share` 命令需要管理员）
2. 手动添加信任目录：
   - Excel → **文件** → **选项** → **信任中心** → **信任中心设置**
   - **受信任的加载项目录** → 添加 `\\localhost\GameDataStudioCatalog`
   - 勾选「显示在菜单中」→ 确定 → **重启 Excel**
3. 运行修复脚本（以管理员身份）：
   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:APPDATA\GameDataStudio\sideload-fix.ps1"
   ```

</details>

<details>
<summary>「插入」标签页没有「获取加载项」按钮</summary>

Office 许可证可能未激活。检查方法：

```powershell
cscript "C:\Program Files\Microsoft Office\Root\Office16\OSPP.VBS" /dstatus
```

如果显示 `grace period expired`，需先激活 Office 许可证（文件 → 账户 → 更新许可证），否则 Web 加载项功能会被完全禁用。

</details>

<details>
<summary>运行诊断脚本</summary>

```powershell
powershell -ExecutionPolicy Bypass -File "$env:APPDATA\GameDataStudio\diagnose-win.ps1"
```

会检查：安装目录、manifest 内容、注册表状态、文件服务器、Excel 版本、WebView2、组策略等。

</details>

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

### 首次添加加载项

**Windows 安装包用户：**

1. 运行安装包后**重启 Excel**
2. 点击 **开始** → **加载项** → **更多加载项**（+）
3. 切换到 **共享文件夹**（SHARED FOLDER）标签页
4. 找到 **GameData Studio**，点击 **添加**
5. 加载项会出现在「开始」选项卡的加载项区域

**Mac 用户：**

1. 运行安装脚本后**重启 Excel**
2. 加载项会直接出现在「开始」选项卡中

> 添加一次后，后续打开 Excel 时加载项会自动出现在「开始」选项卡，无需重复操作。

### 日常使用

1. 点击「开始」选项卡中的 **GameData Studio** 打开侧边栏
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

### 开发模式加载加载项

**Mac：**
```bash
mkdir -p ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef
cp manifest.xml ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/
npm start
# 重启 Excel，Home 标签页出现 GameData Studio
```

**Windows：**
```bash
npx office-addin-dev-certs install    # 首次需安装 HTTPS 证书
npm start
npx office-addin-dev-settings sideload manifest.xml
# 重启 Excel
```

### 构建 Windows 安装包

1. 安装 [Inno Setup](https://jrsoftware.org/isdl.php)
2. 运行 `installer/prepare.bat`
3. 运行 `iscc installer/setup.iss`
4. 输出：`installer/output/GameDataStudio-Setup-x.x.x.exe`

或直接推送代码，GitHub Actions 自动构建并发布到 Releases。

---

## 工作原理

```
Excel (Office JS API)
  │
  ├── UI 加载自 GitHub Pages (HTTPS)
  │   https://vinesy-x.github.io/gamedata-studio/taskpane.html
  │
  └── 文件读写通过本地服务器 API
      http://localhost:9876/api/write-file
      http://localhost:9876/api/read-file
```

- **加载项 UI**：从 GitHub Pages 加载（HTTPS），自动获取最新版本
- **文件服务器**：本地后台运行（`file-server.ps1` / `file-server.py`），负责文件读写 API
- **Windows 安装发现**：通过网络共享文件夹（`\\localhost\GameDataStudioCatalog`）让 Excel 发现加载项

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
docs/          产品方案和技术文档
```

## 技术栈

- Office Web Add-in (Excel)
- React + TypeScript + FluentUI v9
- Office JavaScript API
- 本地文件服务 (Python / PowerShell)

## 系统要求

- **Windows**: Windows 10/11, Excel 2016+（需已激活的 Microsoft 365 或 Office 许可证）, PowerShell 3.0+
- **Mac**: macOS 10.15+, Excel 2016+, Python 3
