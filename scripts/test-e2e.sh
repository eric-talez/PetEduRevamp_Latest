#!/usr/bin/env bash
# Playwright 반응형 E2E 회귀 테스트 실행 래퍼.
# 사용:
#   ./scripts/test-e2e.sh                                      # 전체 실행
#   ./scripts/test-e2e.sh --project=desktop                    # 특정 viewport 만
#   ./scripts/test-e2e.sh tests/e2e/specs/public.spec.ts       # 특정 spec 만
#   ./scripts/test-e2e.sh --update-snapshots                   # 시각 baseline 갱신
#
# 환경 변수:
#   E2E_BASE_URL        baseURL (기본값: http://localhost:5000)
#   PLAYWRIGHT_BROWSERS_PATH  Chromium 캐시 경로 (스크립트가 자동 설정)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$ROOT_DIR/.cache/ms-playwright}"

# 서버가 떠 있지 않으면 친절히 안내 (테스트 webServer 자동기동 대신
# Replit 의 'Start application' 워크플로 사용을 가정한다)
BASE_URL="${E2E_BASE_URL:-http://localhost:5000}"
if ! curl -sf -o /dev/null --max-time 3 "$BASE_URL/api/auth/csrf"; then
  echo "[test-e2e] '$BASE_URL' 에 연결할 수 없습니다." >&2
  echo "[test-e2e] 'Start application' 워크플로를 먼저 실행하세요 (npm run dev)." >&2
  exit 2
fi

exec npx playwright test "$@"
