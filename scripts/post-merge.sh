#!/bin/bash
# Post-merge setup script.
# - npm install
# - Playwright Chromium 브라우저를 프로젝트 캐시에 설치 (E2E 회귀 테스트용)
#   tests/e2e/specs/public.spec.ts 등은 Chromium 이 없으면 실행 자체가 불가능.
#   네트워크/CDN 일시 장애에 대비해 최대 3회 재시도한다.
set -e

npm install

# Playwright Chromium 설치는 ~280MB 다운로드라 종종 일시 실패가 난다.
# 재시도 + 타임아웃으로 보호한다. 캐시는 프로젝트 루트의 .cache/ms-playwright 사용.
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$PWD/.cache/ms-playwright}"
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"

install_chromium() {
  # --with-deps 는 sudo 가 필요할 수 있어 Replit 환경에서는 실패. 브라우저만 설치.
  # (시스템 라이브러리는 replit.nix 에 선언되어 있어 별도 설치 불필요)
  # CI(GitHub Actions) 에서는 e2e-public-responsive.yml 잡이 --with-deps 로 따로 설치한다.
  timeout 180 npx --yes playwright install chromium
}

attempt=1
max_attempts=3
until install_chromium; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[post-merge] Playwright Chromium 설치가 ${max_attempts}회 모두 실패했습니다." >&2
    exit 1
  fi
  echo "[post-merge] Playwright Chromium 설치 ${attempt}회차 실패, 재시도..." >&2
  attempt=$((attempt + 1))
  sleep 5
done

echo "[post-merge] 완료: npm install + Playwright Chromium 설치 OK"
