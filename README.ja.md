# Hermes Desktop 韓国語ローカライズ

[![Verify localization](https://github.com/BlackTea-Bird/hermes-ko/actions/workflows/verify.yml/badge.svg)](https://github.com/BlackTea-Bird/hermes-ko/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-NousResearch%2Fhermes--agent-2563eb)](https://github.com/NousResearch/hermes-agent)

[한국어](README.md) | [English](README.en.md) | **日本語** | [中文](README.zh-CN.md)

Nous Research の **Hermes Desktop** 向け非公式韓国語ローカライズです。完全な韓国語カタログ、慎重に変更を適用するスクリプト、再現可能な互換性検証を提供します。

## 主な特徴

- Hermes Desktop の翻訳契約全体に対応する韓国語文言
- `ko`、`ko-KR`、`한국어` のロケール別名
- 翻訳パスと TypeScript 互換性の自動検査
- 想定したアップストリームのブロックだけを編集する冪等な PowerShell スクリプト
- 明示したアップストリームコミットに固定した検証

## クイックスタート

Git、Node.js 22.22 以降、npm、Windows PowerShell 5.1 以降が必要です。他の OS では PowerShell 7（`pwsh`）をご利用ください。

```powershell
git clone https://github.com/NousResearch/hermes-agent.git
git clone https://github.com/BlackTea-Bird/hermes-ko.git hermes-desktop-korean

powershell -NoProfile -File .\hermes-desktop-korean\scripts\apply-localization.ps1 `
  -HermesRepo .\hermes-agent
```

ファイルを変更せず対象を確認するには `-WhatIf` を追加してください。

```powershell
powershell -NoProfile -File .\hermes-desktop-korean\scripts\apply-localization.ps1 `
  -HermesRepo .\hermes-agent `
  -WhatIf
```

続いてアップストリームのルートで Desktop の依存関係を導入し、検査とビルドを行います。

```powershell
cd .\hermes-agent
npm run install:desktop
npm run typecheck --workspace apps/desktop
npm run dist:win --workspace apps/desktop
```

完成した Desktop の言語選択で **한국어** を選べます。

> 出所を確認できない非公式バイナリは配布しません。監査可能なアップストリームソースへ翻訳を適用し、ローカルでビルドします。

## 検証

```powershell
npm ci
npm test
```

検証ツールは固定したアップストリームと比較し、英語カタログの全オブジェクトパス、Settings のラベルと説明、`Translations` 契約の TypeScript 診断、検証対象コミットを確認します。既存のチェックアウトを使う場合は次を実行します。

```powershell
npm run verify -- --upstream C:\path\to\hermes-agent
```

## 構成

```text
src/i18n/ko.ts                  韓国語翻訳カタログ
scripts/apply-localization.ps1  アップストリーム適用スクリプト
scripts/verify-localization.mjs 翻訳パス・型検証ツール
upstream-lock.json              固定アップストリームリビジョン
.github/workflows/verify.yml    継続的検証
```

## 翻訳と貢献

Desktop UI の文言は簡潔にし、製品名と標準技術用語を保持してください。テンプレート変数、関数引数、キー名は変更せず、セキュリティ警告を弱めたり原文にない意味を追加したりしないでください。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

## 互換性の基準

翻訳は [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent) の [`upstream-lock.json`](upstream-lock.json) に記録されたコミットに対して検証します。アップストリーム変更時、スクリプトは想定外の編集をせず停止する場合があります。新しい基準に対して翻訳とスクリプトをご確認ください。

## 表記のお願い

このリポジトリや派生物を公開する際は、可能であれば **@Bum-Boo** と[元のリポジトリ](https://github.com/Bum-Boo/hermes-desktop-korean)をご紹介いただけると幸いです。これは謝意表記のお願いであり、ライセンス条件の追加・変更ではありません。

## ライセンスと告知

[MIT License](LICENSE) で提供します。Hermes Agent も MIT ライセンスです。Hermes および関連商標は各権利者に帰属します。本プロジェクトは独立したコミュニティ翻訳で、Nous Research の公式配布物ではありません。派生元の詳細は [NOTICE](NOTICE) をご確認ください。
