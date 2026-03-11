# GameData Studio

RPG/MMO 游戏数值管理工具 — Excel Add-in

## 项目简介

GameData Studio 是一个 Excel 加载项（Office Web Add-in），为 RPG/MMO 游戏的数值策划团队提供数据导出、配置管理、数据校验等功能。完全离线运行，无网络依赖。

## 版本路线图

| 版本 | 定位 | 核心交付 | 状态 |
|------|------|---------|------|
| v1.0 | **导出工具** | 替代 VBA，导出+Git+网页协作 | 🔨 开发中 |
| v2.0 | **控制面板** | 控制迁移到侧边栏，新表向导 | 📋 方案已确认 |
| v3.0 | **质量保障** | 校验引擎+版本预览+一键全流程 | 📋 方案已确认 |

## 技术栈

- **前端**：React + TypeScript（侧边栏 UI）
- **Excel 交互**：Office JavaScript API
- **文件生成**：ExcelJS
- **Git 操作**：isomorphic-git
- **部署**：Sideload / Microsoft 365 Admin（团队内部分发）
- **网络依赖**：无（完全离线）

## 文档目录

所有文档位于 [`docs/`](./docs/)：

| 文件 | 说明 |
|------|------|
| [功能版本规划.md](./docs/功能版本规划.md) | 三个版本的功能分配总览 |
| [v1.0_产品方案.docx](./docs/v1.0_产品方案.docx) | v1.0 产品方案 |
| [v1.0_技术规格.md](./docs/v1.0_技术规格.md) | v1.0 技术规格（Claude Code 开发参考） |
| [v2.0_技术规格.md](./docs/v2.0_技术规格.md) | v2.0 技术规格（Claude Code 开发参考） |
| [v3.0_技术规格.md](./docs/v3.0_技术规格.md) | v3.0 技术规格（Claude Code 开发参考） |

## 开发方式

本项目使用 **Claude Code** 进行 AI 辅助开发。`docs/` 中的 `.md` 技术规格文档为核心开发参考。
