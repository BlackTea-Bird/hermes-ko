# 기여 안내 / Contributing

이 프로젝트의 목표는 Hermes Desktop에서 짧고 자연스럽고 일관된 한국어 경험을 제공하는 것입니다.

## 번역 스타일

- 버튼과 메뉴는 가능한 한 짧은 명사형 또는 동작형으로 작성합니다.
- 사용자에게 직접 안내하는 문장은 일관된 존댓말을 사용합니다.
- `Hermes`, `API`, `MCP`, `SSH`, `URL`, `JSON` 같은 제품명·표준 약어는 유지합니다.
- `gateway`, `profile`, `session`, `workspace`, `plugin`, `provider`는 각각 `게이트웨이`, `프로필`, `세션`, `작업 공간`, `플러그인`, `제공업체`로 통일합니다.
- 템플릿 문자열의 변수, 함수 매개변수, 키 이름은 변경하지 않습니다.
- 원문의 의미를 추가하거나 보안 경고의 강도를 낮추지 않습니다.

## 변경 절차

1. `src/i18n/ko.ts`의 해당 문구를 수정합니다.
2. `npm ci` 후 `npm test`를 실행합니다.
3. UI 문구 변경 이유와 확인한 화면을 커밋 또는 PR 설명에 기록합니다.
4. 업스트림 기준을 변경했다면 `upstream-lock.json`도 함께 갱신합니다.

## English summary

Keep UI labels concise, preserve identifiers and template variables, use the established Korean terminology above, and run `npm test` before submitting a change. Changes to the pinned upstream revision must include a review of newly added or changed translation keys.
