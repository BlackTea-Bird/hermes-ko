# Korean localization for Hermes Desktop

[![Verify localization](https://github.com/BlackTea-Bird/hermes-ko/actions/workflows/verify.yml/badge.svg)](https://github.com/BlackTea-Bird/hermes-ko/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-NousResearch%2Fhermes--agent-2563eb)](https://github.com/NousResearch/hermes-agent)

[한국어](README.md) | **English** | [日本語](README.ja.md) | [中文](README.zh-CN.md)

An unofficial, source-based Korean localization for **Hermes Desktop** by Nous Research. It provides the complete Korean catalog, a cautious integration script, and reproducible compatibility checks.

## Highlights

- Korean copy for the complete Hermes Desktop translation contract
- Locale aliases for `ko`, `ko-KR`, and `한국어`
- Automated translation-path and TypeScript compatibility checks
- Idempotent PowerShell integration that edits only expected upstream blocks
- Validation pinned to an explicit upstream commit

## Quick start

Requirements: Git, Node.js 22.22 or newer, npm, and Windows PowerShell 5.1 or newer. On other platforms, use PowerShell 7 (`pwsh`).

```powershell
git clone https://github.com/NousResearch/hermes-agent.git
git clone https://github.com/BlackTea-Bird/hermes-ko.git hermes-desktop-korean

powershell -NoProfile -File .\hermes-desktop-korean\scripts\apply-localization.ps1 `
  -HermesRepo .\hermes-agent
```

Add `-WhatIf` to preview the target without changing files:

```powershell
powershell -NoProfile -File .\hermes-desktop-korean\scripts\apply-localization.ps1 `
  -HermesRepo .\hermes-agent `
  -WhatIf
```

Then install Desktop dependencies, validate, and build from the upstream repository root:

```powershell
cd .\hermes-agent
npm run install:desktop
npm run typecheck --workspace apps/desktop
npm run dist:win --workspace apps/desktop
```

The resulting Desktop build exposes **한국어** in the language picker.

> This repository does not distribute opaque, unofficial binaries. Apply the localization to auditable upstream source and build it locally.

## Verification

```powershell
npm ci
npm test
```

The verifier compares the catalog with the pinned upstream source and checks:

1. every English catalog object path exists in Korean;
2. nested Settings labels and descriptions are translated;
3. the current `Translations` contract has no TypeScript diagnostics; and
4. the exact Hermes Agent commit used for validation.

To use an existing upstream checkout without fetching remote raw files:

```powershell
npm run verify -- --upstream C:\path\to\hermes-agent
```

## Repository layout

```text
src/i18n/ko.ts                  Korean translation catalog
scripts/apply-localization.ps1  Upstream source integration script
scripts/verify-localization.mjs Translation-path and type verifier
upstream-lock.json              Pinned upstream revision
.github/workflows/verify.yml    Continuous verification
```

## Translation and contributions

Keep Desktop UI copy concise, preserve product names and standard technical terms, and never alter template variables, function parameters, or key names. Do not weaken security warnings or add meaning absent from the source. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Compatibility baseline

The localization is validated against the commit recorded in [`upstream-lock.json`](upstream-lock.json) from [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent). If upstream changes, the integration script may stop rather than edit an unexpected block; review the translation and script against the new baseline.

## Attribution request

If you share this repository or publish derivative work, a courteous mention of **@Bum-Boo** and the [original repository](https://github.com/Bum-Boo/hermes-desktop-korean) would be appreciated. This is a request for acknowledgement, not an additional or modified license condition.

## License and notice

Released under the [MIT License](LICENSE). Hermes Agent is also MIT-licensed. Hermes and related trademarks belong to their respective owners. This is an independent community localization, not an official Nous Research release. See [NOTICE](NOTICE) for derivative-source attribution.
