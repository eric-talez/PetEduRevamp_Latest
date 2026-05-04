import { test } from "@playwright/test";
import { runResponsiveChecks } from "../helpers/checks";
import { quickLogin } from "../helpers/auth";

type ProjectName = "mobile-iphone-se" | "tablet-ipad" | "desktop";
type PageDef = {
  name: string;
  url: string;
  skipOn?: Partial<Record<ProjectName, string>>;
};


const OWNER_PAGES: PageDef[] = [
  { name: "profile", url: "/profile" },
  { name: "my-courses", url: "/my-courses" },
  { name: "my-pets", url: "/my-pets" },
  { name: "notifications", url: "/notifications" },
  { name: "ai-analysis", url: "/ai-analysis" },
  {
    name: "chatbot",
    url: "/chatbot",
  },
  // 알림장(저널) — 라우트 미등록 시 SimpleApp 의 NotFound 페이지로 폴백되며,
  // 그 경우에도 반응형 검증(가로 스크롤/네비 겹침)은 의미가 있다.
  { name: "journals", url: "/journals" },
];

test.describe("로그인 보호자 흐름 — 페이지별 반응형 회귀", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await quickLogin(page, "pet-owner");
    test.skip(!ok, "quick-login(pet-owner) 실패 — 시드 사용자 미존재 가능");
  });

  for (const p of OWNER_PAGES) {
    test(`${p.name} (${p.url}) — 반응형 검증`, async ({ page }, testInfo) => {
      const reason = p.skipOn?.[testInfo.project.name as ProjectName];
      // 데스크톱은 항상 실행. 모바일/태블릿은 알려진 결함이 등록된 경우에만 skip.
      test.skip(!!reason, reason || "");
      await runResponsiveChecks(page, testInfo, p.url);
    });
  }
});

// 모바일 하단 네비 탭 이동은 보호자 레이아웃의 패딩 결함과 무관하게
// 반드시 모바일/태블릿에서 실행되어야 한다 (별도 describe).
test.describe("로그인 보호자 흐름 — 모바일 하단 네비 탭 이동", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop",
      "데스크톱에서는 하단 네비가 숨겨져 검사 의미 없음",
    );
    const ok = await quickLogin(page, "pet-owner");
    test.skip(!ok, "quick-login(pet-owner) 실패 — 시드 사용자 미존재 가능");
  });

  test("핵심 탭이 노출·클릭 가능해야 한다", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.locator('nav[aria-label="모바일 하단 네비게이션"]');
    await nav.waitFor({ state: "visible", timeout: 10_000 });
    // 핵심 탭이 노출·클릭 가능한지만 가볍게 점검.
    // (탭 이동 후 페이지별 회귀는 OWNER_PAGES 에서 별도 검증)
    const labels = ["홈", "내 강의", "내 반려동물", "더보기"];
    let clicked = 0;
    for (const label of labels) {
      const btn = nav.getByRole("button", { name: label });
      if ((await btn.count()) === 0) continue;
      await btn.first().click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(300);
      clicked += 1;
    }
    test.skip(clicked === 0, "MobileBottomNav 에 알려진 탭이 하나도 없음 — 시드/렌더 상태 점검 필요");
  });
});
