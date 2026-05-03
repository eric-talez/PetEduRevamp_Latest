# 모바일·태블릿 반응형 E2E 회귀 테스트

Playwright 기반 viewport 회귀 테스트입니다.

## 실행

먼저 `Start application` 워크플로(또는 `npm run dev`)로 서버가 5000 포트에서 떠 있어야 합니다.

```bash
# 모든 viewport (mobile-iphone-se, tablet-ipad, desktop) × 모든 시나리오
./scripts/test-e2e.sh

# 특정 viewport 만
./scripts/test-e2e.sh --project=desktop

# 특정 spec 만
./scripts/test-e2e.sh tests/e2e/specs/public.spec.ts

# 시각 회귀 baseline 갱신
./scripts/test-e2e.sh --update-snapshots

# HTML 리포트 보기
PLAYWRIGHT_BROWSERS_PATH=$PWD/.cache/ms-playwright npx playwright show-report
```

> ℹ️ `package.json` 직접 수정이 환경 가드로 차단되어 있어 `npm run test:e2e`
> 형태의 스크립트는 추가하지 못했습니다. 동등한 진입점으로 `./scripts/test-e2e.sh`
> 를 사용하세요. 이 래퍼는 `PLAYWRIGHT_BROWSERS_PATH` 와 baseURL 헬스체크,
> 인자 전달까지 처리합니다.

브라우저는 `PLAYWRIGHT_BROWSERS_PATH=$PWD/.cache/ms-playwright` 에 캐시되어 있습니다.

## 워크플로 통합

E2E 테스트는 dev 서버(`Start application` 워크플로)가 먼저 떠 있어야 하므로,
Replit 의 `Project` parallel 워크플로에 자동 포함시키지 않습니다. 일상 개발
흐름은 다음과 같습니다:

1. `Start application` 워크플로로 dev 서버를 띄운다.
2. 별도 터미널 또는 워크플로 패널에서 `./scripts/test-e2e.sh` 를 실행한다.
3. 결과 HTML 리포트는 `playwright-report/`, 실패 스크린샷·trace 는
   `test-results/` 에 저장된다(둘 다 .gitignore 처리됨). 실패 viewport·페이지
   컨텍스트는 콘솔과 HTML 리포트 양쪽에 그대로 노출된다.

`Check and Fix` 워크플로에도 의도적으로 통합하지 않습니다 — `npm run dev` 를
포함하는 장기 실행 워크플로이므로 회귀 테스트가 dev 서버 기동을 막아 개발자
피드백 루프를 망가뜨리기 때문입니다.

## 무엇을 검증하나

`tests/e2e/helpers/checks.ts`에 정의된 헬퍼들이 viewport 별로:

- 가로 스크롤 발생 (document.scrollWidth > innerWidth) — 2px 이상 오차 시 실패
- `MobileBottomNav`(`nav[aria-label="모바일 하단 네비게이션"]`)와 본문 인터랙션 요소의 bounding box 겹침 — 4px 이상 시 실패
- TopBar(`<header>`) 가시성, 데스크톱에서 Sidebar–본문 간섭

실패 시 페이지 풀 스크린샷이 자동으로 첨부됩니다.

## 시각 회귀

`tests/e2e/specs/visual.spec.ts`는 핵심 화면(홈, 강의 목록, 트레이너 목록, 마이페이지=/profile)에 대해 `toHaveScreenshot` baseline 을 사용합니다. 첫 실행에서 baseline 이 자동 생성되며, 의도된 디자인 변경 후에는 `./scripts/test-e2e.sh --update-snapshots` 로 재생성합니다. threshold 는 `maxDiffPixelRatio: 0.15` 로 매우 느슨하게 잡혀(모바일 캐러셀/배너 잡음 방지 목적) 큰 레이아웃 변경만 잡힙니다.

## 인증

보호자/트레이너/관리자 흐름은 `server/auth/index.ts` 의 `/api/auth/quick-login` 을 통해 시드 사용자(test_owner / test_trainer / institute01 / admin) 로 로그인합니다. 시드가 없는 환경에서는 해당 테스트는 자동 skip 됩니다.
