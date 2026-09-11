# Hermes Desktop 韩语本地化

[![Verify localization](https://github.com/Bum-Boo/hermes-desktop-korean/actions/workflows/verify.yml/badge.svg)](https://github.com/Bum-Boo/hermes-desktop-korean/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-NousResearch%2Fhermes--agent-2563eb)](https://github.com/NousResearch/hermes-agent)

[한국어](README.md) | [English](README.en.md) | [日本語](README.ja.md) | **中文**

这是 Nous Research **Hermes Desktop** 的非官方韩语本地化项目，提供完整的韩语目录、谨慎的集成脚本和可复现的兼容性检查。

## 主要特点

- 覆盖 Hermes Desktop 完整翻译契约的韩语文案
- 支持 `ko`、`ko-KR` 和 `한국어` 区域设置别名
- 自动检查翻译路径覆盖和 TypeScript 兼容性
- 仅编辑预期上游代码块的幂等 PowerShell 脚本
- 针对明确上游提交固定验证基线

## 快速开始

需要 Git、Node.js 22.22 或更高版本、npm，以及 Windows PowerShell 5.1 或更高版本。其他操作系统请使用 PowerShell 7（`pwsh`）。

```powershell
git clone https://github.com/NousResearch/hermes-agent.git
git clone https://github.com/Bum-Boo/hermes-desktop-korean.git

powershell -NoProfile -File .\hermes-desktop-korean\scripts\apply-localization.ps1 `
  -HermesRepo .\hermes-agent
```

如需在不修改文件的情况下预览目标，请添加 `-WhatIf`：

```powershell
powershell -NoProfile -File .\hermes-desktop-korean\scripts\apply-localization.ps1 `
  -HermesRepo .\hermes-agent `
  -WhatIf
```

随后在上游仓库根目录安装 Desktop 依赖、检查并构建：

```powershell
cd .\hermes-agent
npm run install:desktop
npm run typecheck --workspace apps/desktop
npm run dist:win --workspace apps/desktop
```

构建后的 Desktop 可在语言选择器中选择 **한국어**。

> 本仓库不分发来源不透明的非官方二进制文件。请将本地化应用到可审查的上游源码并在本地构建。

## 验证

```powershell
npm ci
npm test
```

验证器会与固定的上游源码比较，检查英语目录的全部对象路径、Settings 标签和说明、`Translations` 契约的 TypeScript 诊断，以及用于验证的确切提交。若使用已有的上游检出目录：

```powershell
npm run verify -- --upstream C:\path\to\hermes-agent
```

## 仓库结构

```text
src/i18n/ko.ts                  韩语翻译目录
scripts/apply-localization.ps1  上游源码集成脚本
scripts/verify-localization.mjs 翻译路径与类型验证器
upstream-lock.json              固定的上游修订版本
.github/workflows/verify.yml    持续验证
```

## 翻译与贡献

请保持 Desktop UI 文案简洁，保留产品名称和标准技术术语，且不要修改模板变量、函数参数或键名。请勿削弱安全警告或添加原文没有的含义。详情请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 兼容性基线

本地化针对 [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent) 的 [`upstream-lock.json`](upstream-lock.json) 所记录提交进行验证。上游变化后，集成脚本可能会停止而不是编辑意外代码块；请根据新基线复核翻译与脚本。

## 署名请求

如果您分享本仓库或发布衍生作品，烦请在方便时提及 **@Bum-Boo** 和[原始仓库](https://github.com/Bum-Boo/hermes-desktop-korean)。这是致谢请求，并非附加或修改许可证条件。

## 许可证与声明

本项目采用 [MIT License](LICENSE)。Hermes Agent 同样采用 MIT 许可证。Hermes 及相关商标归各自权利人所有。本项目是独立的社区本地化，并非 Nous Research 官方发行版。衍生来源说明请参阅 [NOTICE](NOTICE)。
