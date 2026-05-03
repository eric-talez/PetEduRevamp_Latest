import { expect, test } from "@playwright/test";

/**
 * 시각 회귀 (선택적). 모바일/데스크톱에서 핵심 4개 화면의 baseline 스크린샷을 만들고
 * threshold 를 느슨하게 잡아 큰 레이아웃 변경만 잡히도록 한다.
 *
 * baseline 이 없으면 첫 실행에서 자동 생성되며 그린이다. CI 에서는 변경 시
 * `npx playwright test --update-snapshots` 로 재생성한다.
 */
const VISUAL_PAGES = [
  { name: "home", url: "/" },
  { name: "courses", url: "/courses" },
  { name: "trainers", url: "/trainers" },
  // 마이페이지 (비로그인 상태에서는 로그인 안내/리다이렉트가 그려지므로
  // baseline 자체는 안정적으로 캡처 가능)
  { name: "my-page", url: "/profile" },
];

test.describe("시각 회귀 (선택적)", () => {
  for (const p of VISUAL_PAGES) {
    test(`${p.name} 시각 회귀`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name === "tablet-ipad",
        "태블릿 baseline 은 운영 비용을 줄이기 위해 제외",
      );
      await page.goto(p.url, { waitUntil: "domcontentloaded" });
      try {
        await page.waitForLoadState("networkidle", { timeout: 10_000 });
      } catch {}
      // 캐러셀/애니메이션이 자리 잡도록 충분히 settle
      await page.waitForTimeout(1500);
      // threshold 를 매우 느슨하게: 15% 픽셀 차이까지 허용 — 큰 레이아웃 변경만 검출.
      // 모바일 viewport 의 캐러셀/광고 배너 등 동적 영역으로 인한 잡음 방지가 목적.
      await expect(page).toHaveScreenshot(`${p.name}-${testInfo.project.name}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.15,
        animations: "disabled",
        caret: "hide",
      });
    });
  }
});
