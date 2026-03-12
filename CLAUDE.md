# GameData Studio — 开发指南

## 项目类型
Office Web Add-in (Excel 侧边栏), React + TypeScript + Office JS API

## 核心命令
- `npm start` — 启动开发服务器 (https://localhost:3000)
- `npm test` — 运行单元测试 (Jest)
- `npm run build` — 生产构建
- `npm run lint` — TypeScript 类型检查
- `git config core.hooksPath scripts/hooks` — 启用 git hooks（克隆后需执行一次）

## 版本管理
- `git push` 时 pre-push hook 自动递增 patch 版本（package.json + installer/setup.iss）

## Windows 安装包
- 安装 [Inno Setup](https://jrsoftware.org/isdl.php)
- 运行 `installer/prepare.bat` 准备文件
- 运行 `iscc installer/setup.iss` 生成安装包
- 输出：`installer/output/GameDataStudio-Setup-x.x.x.exe`

## 项目结构
- `src/engine/` — 核心导出引擎（ConfigLoader, VersionFilter, DataFilter, DataLoader, ExportJob, ExportWriter）
- `src/taskpane/` — React 侧边栏 UI
- `src/utils/` — 工具函数（ExcelHelper, ErrorHandler, Logger）
- `src/git/` — Git 操作
- `src/types/` — TypeScript 类型定义
- `docs/` — 产品方案和技术规格文档
- `docs/vba/` — 原始 VBA 源码（移植参考）

## 关键设计决策
- 标记文字定位：所有配置区域通过 `#xxx#` 标记文本查找，不依赖固定行列号
- 版本区间：左闭右开 `[min, max)`，空值→`[0, 0.1)`，纯数字→`[N, 99)`
- 重复Key处理：同Key保留后面的行（版本更高的覆盖旧的）
- 文件系统：使用 File System Access API（`showDirectoryPicker`）访问输出目录
- Git v1.0：生成命令供用户手动执行，不自动执行

## VBA Bug 修正
- `clsDataTable.ApplyFilters` 列筛选中 `includeRow = False` 应为 `includeCol = False`，已在 DataFilter.ts 中修正
