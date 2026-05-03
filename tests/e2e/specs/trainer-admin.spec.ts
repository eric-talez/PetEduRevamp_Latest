import { expect, test } from "@playwright/test";
import { runResponsiveChecks } from "../helpers/checks";
import { quickLogin } from "../helpers/auth";

/**
 * 페이지가 SimpleApp 의 NotFound 폴백이 아닌 의도한 화면을 렌더하는지 점검.
 * NotFound 페이지에는 "404"/"페이지를 찾을 수 없" 같은 텍스트가 노출된다.
 */
async function assertNotFallbackPage(page: import("@playwright/test").Page, context: string) {
  // SimpleApp 의 NotFound 페이지 고유 헤딩(`길을 잃으셨나요?`)으로만 식별 — 본문에 우연히
   // 포함될 수 있는 "404"/"페이지를 찾을 수 없" 텍스트와 충돌하지 않도록 좁힘.
  const notFound = page.getByRole("heading", { name: "길을 잃으셨나요?" });
  await expect(
    notFound,
    `[${context}] NotFound 폴백이 아닌 의도한 페이지가 렌더되어야 함`,
  ).toHaveCount(0);
}

type PageDef = {
  name: string;
  url: string;
};

test.describe("트레이너 진입 — 반응형 회귀", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await quickLogin(page, "trainer");
    test.skip(!ok, "quick-login(trainer) 실패 — 시드 사용자 미존재 가능");
  });

  const PAGES: PageDef[] = [
    { name: "trainer-home", url: "/" },
    { name: "trainer-students", url: "/trainer/students" },
    // 트레이너 수익(정산) 페이지 — 라우트 명은 /trainer/earnings
    { name: "trainer-earnings", url: "/trainer/earnings" },
    // 트레이너용 알림장(노트북) — SimpleApp 라우트 `/trainer/notebook`
    { name: "trainer-notebook", url: "/trainer/notebook" },
  ];

  for (const p of PAGES) {
    test(`${p.name} (${p.url}) — 진입 + 반응형 검증`, async ({ page }, testInfo) => {
      await runResponsiveChecks(page, testInfo, p.url);
      await assertNotFallbackPage(page, p.url);
    });
  }
});

test.describe("관리자 진입 — 반응형 회귀", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await quickLogin(page, "admin");
    test.skip(!ok, "quick-login(admin) 실패 — 시드 사용자 미존재 가능");
  });

  const PAGES: PageDef[] = [
    { name: "admin-home", url: "/admin" },
    { name: "admin-users", url: "/admin/users" },
    // 관리자 주요 탭: 사용자/수익/훈련(트레이너)/지역
    { name: "admin-revenue", url: "/admin/revenue" },
    { name: "admin-trainers", url: "/admin/trainers" },
    { name: "admin-locations", url: "/admin/location-management" },
  ];

  for (const p of PAGES) {
    test(`${p.name} (${p.url}) — 진입 + 반응형 검증`, async ({ page }, testInfo) => {
      await runResponsiveChecks(page, testInfo, p.url);
      await assertNotFallbackPage(page, p.url);
    });
  }
});
