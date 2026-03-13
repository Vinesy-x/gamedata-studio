# GameData Studio

RPG/MMO 游戏数值管理工具 — Excel Add-in

---

## 功能特性

- **多版本数据导出** — 支持 `[min, max)` 版本区间筛选，行/列双向版本控制
- **增量导出** — 哈希比对，仅导出有变更的表，并行分块上传支持大表（数万行）
- **多线路 roads 控制** — roads_0 总开关 + roads_N 地区专属线路，支持条件启用
- **协同导出** — 网页端用户在 StudioConfig 表中触发，桌面端自动执行导出 + Git 推送
- **数据校验引擎** — 8 条规则：版本格式、数据类型、数组分隔符、版本覆盖、必填字段、Excel 引用错误等
- **自定义校验分隔符** — 可为每种数组类型（int[]、int[][] 等）单独配置分隔符
- **导出预览 + 数据清洗** — 高亮显示排除行/被覆盖行，可视化筛选效果
- **Git 自动推送** — 导出后自动 add/commit/push，提交模板可自定义
- **表名对照超链接** — 功能表名自动带超链接，点击直接跳转到对应工作表
- **自动更新** — 通过 GitHub Pages 分发，打开即最新版本

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
2. 首次使用点击「初始化工作簿」，自动创建 StudioConfig 配置表和表名对照
3. 在「管理」选项卡中添加/管理数据表和版本模板
4. 在「导出」选项卡中配置版本参数，点击「开始导出」
5. 在「校验」选项卡中检查数据格式（支持自定义类型分隔符）
6. 在「预览」选项卡中预览导出结果和数据清洗

### 协同导出

适用于网页端 Excel 用户无法直接运行加载项的场景：

1. 桌面端打开工作簿，加载项自动启动协同监听（默认开启）
2. 网页端用户打开 **StudioConfig** 工作表
3. 在 `#输出版本#` 填写版本名，`#输出版本号#` 填写版本号
4. 在 `#操作人#` 栏写入名字 → 触发导出
5. 桌面端自动执行导出 + Git 推送，结果回写到 `#工作状态#` 和 `#导出结果#`

```
StudioConfig 协同区域：
┌──────────────┬──────────────┐
│ #协同导出#    │              │
│ #输出版本#    │ 国内          │  ← 选择版本
│ #输出版本号#  │ 7.5          │  ← 填写版本号
│ #操作人#      │ {写入名字}    │  ← 触发导出
│ #工作状态#    │ 导出完成      │  ← 自动回写
│ #导出结果#    │ 3 张表已更新  │  ← 自动回写
└──────────────┴──────────────┘
```

---

## 数据表结构

每张数据表是一个独立的工作表，布局如下：

```
           │ A (版本区间) │ B~J (roads) │ #配置区域# │ 字段1=int │ 字段2=string │ ...
───────────┼──────────────┼─────────────┼────────────┼───────────┼──────────────┤
version_c  │              │             │            │  1.0~2.0  │    3.0       │  (可选，列版本)
version_r  │   1.0        │  1  0  1    │            │           │              │  (行版本+线路)
描述行      │              │             │            │  ID       │  名称         │
数据行      │   1.0        │  1  1  1    │            │  1001     │  火球术       │
数据行      │   2.0~3.0    │  1  0  1    │            │  1002     │  冰冻术       │
```

- **版本区间**：左闭右开 `[min, max)`。`1.0` = 从 1.0 起永久生效，`1.0~2.5` = 仅 1.0 至 2.5 前，空值 = 几乎不导出
- **线路控制**：roads_0 为总开关，roads_N 为地区专属。1=启用，0/空=禁用，版本区间=条件启用
- **字段定义**：`[前缀_]字段名=类型`，前缀 `key_` = 主键，`language_` = 多语言。类型：int, float, string, int[], float[], string[], int[][], float[][]
- **重复Key**：同 Key 多行时保留版本号更高的行（后面的覆盖前面的）

---

## 校验规则

| 规则 | 说明 |
|------|------|
| 版本区间格式 | 检测行/列版本区间格式是否合法 |
| 版本区间分隔符 | 检测是否误用横线 `-` 代替波浪号 `~` |
| 数据类型 | 按字段定义校验数据值，支持自定义数组分隔符 |
| 数组分隔符 | 数组字段应使用配置的分隔符（默认 `\|` 和 `;`），而非逗号 |
| 版本覆盖完整性 | 同 Key 多行的版本区间是否连续无间隙 |
| 同Key版本顺序 | 同 Key 多行是否按版本号递增排列 |
| 必填字段 | 主键等必填字段是否存在空值 |
| Roads 一致性 | roads_0=0 时 roads_N 不应为 1 |

点击校验结果可自动定位到问题单元格。同时会检测 Excel 引用错误（#REF!、#N/A、#VALUE! 等）。

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
  ├── 文件读写通过本地服务器 API
  │   http://localhost:9876/api/write-file   (分块上传)
  │   http://localhost:9876/api/read-file
  │
  └── Git 操作通过本地服务器 API
      http://localhost:9876/api/git-push     (自动推送)
```

- **加载项 UI**：从 GitHub Pages 加载（HTTPS），自动获取最新版本
- **文件服务器**：本地后台运行（`file-server.ps1` / `file-server.py`），负责文件读写和 Git 操作
- **Windows 安装发现**：通过网络共享文件夹（`\\localhost\GameDataStudioCatalog`）让 Excel 发现加载项
- **协同导出**：通过 OneDrive 同步 StudioConfig 工作表实现网页端触发、桌面端执行

---

## 项目结构

```
src/
  engine/      核心导出引擎 (ConfigLoader, VersionFilter, DataFilter, ExportJob, ExportWriter)
  taskpane/    React 侧边栏 UI
  utils/       工具函数 (ExcelHelper, ErrorHandler, Logger)
  types/       TypeScript 类型定义
  v2/          配置存储 (StudioConfigStore, ConfigManager, TableRegistry)
  v3/          校验引擎 (ValidationEngine) & 协同监听 (CollaborationMonitor)
  git/         Git 命令生成 (GitHandler) & 执行 (GitExecutor)
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
