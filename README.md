# GameData Studio

RPG/MMO 游戏数值管理工具 — Excel Add-in

## 项目概述

GameData Studio 是一个 Excel 加载项（Add-in），为游戏数值策划团队提供数据管理、版本控制、AI 辅助设计等能力。策划在 Excel 中编辑游戏数值数据，Add-in 侧边栏提供导出、校验、预览、AI 分析等增强功能。

## 版本路线图

| 版本 | 定位 | 状态 |
|------|------|------|
| v1.0 | 导出工具 — 完整替代 VBA 宏 | 🔨 开发中 |
| v2.0 | 工作台 — 控制迁移 + 校验 + AI + 远程协作 | 📋 方案已确认 |
| v3.0 | 数值设计平台 — 规则引擎 + AI 执行者 | 📋 方案已确认 |

## 文档目录

```
docs/
├── v1.0_产品方案.docx          # v1.0 产品功能方案
├── v1.0_技术规格.md            # v1.0 技术规格（供 Claude Code 开发参考）
├── v2.0_产品功能方案.docx      # v2.0 产品功能方案（已确认终版）
├── v2.0_技术规格.md            # v2.0 技术规格（供 Claude Code 开发参考）
└── v3.0_产品功能方案.docx      # v3.0 产品功能方案（已确认版）
```

## 技术栈

- **Add-in 前端**：React + TypeScript
- **Excel 交互**：Office JavaScript API
- **导出引擎**：TypeScript（移植自 VBA）
- **代理服务**（v2.0+）：Node.js，承担 AI 转发 + 指令中转 + 用户管理
- **AI**（v2.0+）：Claude API

## 三个版本的演进

```
v1.0  在 Excel 里用 Add-in 替代 VBA 按钮
v2.0  在 Add-in 里用 Excel 编辑数据，用云服务连接团队
v3.0  策划在规则层设计，AI 在数据层执行，Excel 只是呈现结果
```
