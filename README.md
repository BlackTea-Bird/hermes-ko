# Hermes Desktop 한국어 번역

[![Verify localization](https://github.com/BlackTea-Bird/hermes-ko/actions/workflows/verify.yml/badge.svg)](https://github.com/BlackTea-Bird/hermes-ko/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-NousResearch%2Fhermes--agent-2563eb)](https://github.com/NousResearch/hermes-agent)

**한국어** | [English](README.en.md) | [日本語](README.ja.md) | [中文](README.zh-CN.md)

Nous Research의 **Hermes Desktop**을 위한 비공식 한국어 현지화 프로젝트입니다. 전체 한국어 번역 카탈로그와 신중하게 변경 사항을 적용하는 스크립트, 재현 가능한 호환성 검증 도구를 제공합니다.

> 현재 호환 기준: Hermes Agent **v0.21.1** / Desktop **hermes@0.17.2** / upstream `45a6101f3657` (2026-09-11 검증)

## 주요 기능

- Hermes Desktop 번역 계약 전체에 대응하는 한국어 문구
- `ko`, `ko-KR`, `한국어` 언어 별칭 지원
- 번역 키 범위와 TypeScript 호환성 자동 검사
- 예상한 업스트림 블록만 수정하는 멱등성 PowerShell 적용 스크립트
- 명시적인 업스트림 커밋을 기준으로 한 검증
- v0.21.1의 세션 가져오기, 로컬 모델, 연결 관리, Goal·Loop·Heartbeat 제어, 암호·로그인 보관함, 플러그인 관리, Telegram QR 연결 UI 번역

## 빠른 시작

Git, Node.js 22.22 이상, npm, Windows PowerShell 5.1 이상이 필요합니다. 다른 운영체제에서는 PowerShell 7(`pwsh`)을 사용해 주세요.

```powershell
git clone https://github.com/NousResearch/hermes-agent.git
git clone https://github.com/BlackTea-Bird/hermes-ko.git hermes-desktop-korean

powershell -NoProfile -File .\hermes-desktop-korean\scripts\apply-localization.ps1 `
  -HermesRepo .\hermes-agent
```

파일을 변경하지 않고 대상을 미리 확인하려면 `-WhatIf`를 추가해 주세요.

```powershell
powershell -NoProfile -File .\hermes-desktop-korean\scripts\apply-localization.ps1 `
  -HermesRepo .\hermes-agent `
  -WhatIf
```

그다음 업스트림 저장소 루트에서 Desktop 의존성을 설치하고 검사한 뒤 빌드해 주세요.

```powershell
cd .\hermes-agent
npm run install:desktop
npm run typecheck --workspace apps/desktop
npm run dist:win --workspace apps/desktop
```

완성된 Desktop 빌드의 언어 선택기에서 **한국어**를 선택할 수 있습니다.

> 이 저장소는 출처를 확인할 수 없는 비공식 실행 파일을 배포하지 않습니다. 검토 가능한 업스트림 소스에 번역을 적용한 뒤 로컬에서 직접 빌드하는 방식입니다.

## 번역 검증

```powershell
npm ci
npm test
```

검증 도구는 고정된 업스트림 소스와 대조하여 다음 항목을 확인합니다.

1. 영어 카탈로그의 모든 객체 경로가 한국어 카탈로그에 존재하는지
2. 설정 필드 이름과 설명의 세부 키가 모두 번역되었는지
3. 최신 `Translations` 계약에 대한 TypeScript 진단이 없는지
4. 검증에 사용한 Hermes Agent 커밋이 무엇인지

이미 내려받은 업스트림 저장소를 사용하면 원격 원본 파일을 가져오지 않고도 검사할 수 있습니다.

```powershell
npm run verify -- --upstream C:\path\to\hermes-agent
```

v0.21.1 기준 검증 결과는 Desktop 번역 경로 `3,854/3,854`, 설정 필드 이름 `127/127`, 설정 설명 `43/43`, TypeScript 진단 `0`입니다. 제품명, 프로토콜, 명령, URL처럼 번역하지 않는 편이 정확한 항목은 영문 표기를 유지합니다.

### 새 업스트림 버전 동기화

관리자는 다음 명령으로 새 영문 카탈로그에서 추가·삭제·타입 변경된 항목을 동기화할 수 있습니다. 공개 UI 문구만 한국어 초벌 번역 서비스로 보내며, 생성 결과는 반드시 사람이 검수해야 합니다.

```powershell
npm run update-locale -- --upstream C:\path\to\hermes-agent
npm run verify -- --upstream C:\path\to\hermes-agent --report-non-hangul
```

## 저장소 구조

```text
src/i18n/ko.ts                  한국어 번역 카탈로그
scripts/apply-localization.ps1  업스트림 소스 적용 스크립트
scripts/update-localization.mjs 새 업스트림 번역 계약 동기화 도구
scripts/verify-localization.mjs 번역 키·타입 검증 도구
upstream-lock.json              고정된 업스트림 리비전
.github/workflows/verify.yml    지속적 검증
```

## 번역 원칙 및 기여

- 짧고 바로 이해되는 Desktop UI 문장을 사용합니다.
- 제품명과 표준 기술 용어는 유지하고, 동작과 설명은 한국어로 옮깁니다.
- 템플릿 변수, 함수 매개변수, 키 이름은 원문 계약 그대로 보존합니다.
- 보안 경고의 강도를 낮추거나 원문에 없는 의미를 추가하지 않습니다.

자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고해 주세요.

## 기준 버전

현재 번역은 [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent)의 [`upstream-lock.json`](upstream-lock.json)에 기록된 커밋을 기준으로 검증합니다. 업스트림이 변경되면 적용 스크립트가 예상 블록을 찾지 못하고 중단될 수 있으므로, 새 기준에 맞춰 번역과 스크립트를 검토해 주세요.

## 출처 표기 부탁

이 저장소를 소개하거나 파생 작업을 공개하실 때에는 가능하면 **@Bum-Boo**와 [원본 저장소](https://github.com/Bum-Boo/hermes-desktop-korean)를 함께 언급해 주시면 감사하겠습니다. 이는 감사의 뜻으로 드리는 요청이며, 아래 MIT 라이선스의 의무를 추가하거나 변경하지 않습니다.

## 라이선스 및 고지

이 프로젝트는 [MIT License](LICENSE)로 배포됩니다. 원본 Hermes Agent 역시 MIT 라이선스이며, Hermes 및 관련 상표는 각 권리자에게 있습니다. 이 저장소는 Nous Research의 공식 배포판이 아닌 독립적인 커뮤니티 현지화입니다. 자세한 파생 출처는 [NOTICE](NOTICE)를 확인해 주세요.
