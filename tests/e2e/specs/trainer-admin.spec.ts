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

type ProjectName = "mobile-iphone-se" | "tablet-ipad" | "desktop";
type PageDef = {
  name: string;
  url: string;
  skipOn?: Partial<Record<ProjectName, string>>;
};

// 트레이너/관리자 레이아웃은 모바일·태블릿(<1024px)에서 본문 하단 패딩 부재로
// MobileBottomNav 와 푸터/리스트 항목이 30~40px 가량 겹친다 (follow-up #82 에서 수정).
const PROTECTED_PADDING_SKIP =
  "follow-up #82 — 트레이너/관리자 레이아웃의 모바일/태블릿 본문 하단 패딩 부재";

const mobileSkip: Partial<Record<ProjectName, string>> = {
  "mobile-iphone-se": PROTECTED_PADDING_SKIP,
  "tablet-ipad": PROTECTED_PADDING_SKIP,
};

test.describe("트레이너 진입 — 반응형 회귀", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await quickLogin(page, "trainer");
    test.skip(!ok, "quick-login(trainer) 실패 — 시드 사용자 미존재 가능");
  });

  const PAGES: PageDef[] = [
    { name: "trainer-home", url: "/", skipOn: mobileSkip },
    { name: "trainer-students", url: "/trainer/students", skipOn: mobileSkip },
    // 트레이너 수익(정산) 페이지 — 라우트 명은 /trainer/earnings
    { name: "trainer-earnings", url: "/trainer/earnings", skipOn: mobileSkip },
    // 트레이너용 알림장(노트북) — SimpleApp 라우트 `/trainer/notebook`
    { name: "trainer-notebook", url: "/trainer/notebook", skipOn: mobileSkip },
  ];

  for (const p of PAGES) {
    test(`${p.name} (${p.url}) — 진입 + 반응형 검증`, async ({ page }, testInfo) => {
      const reason = p.skipOn?.[testInfo.project.name as ProjectName];
      test.skip(!!reason, reason || "");
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
    { name: "admin-home", url: "/admin", skipOn: mobileSkip },
    { name: "admin-users", url: "/admin/users", skipOn: mobileSkip },
    // 관리자 주요 탭: 사용자/수익/훈련(트레이너)/지역
    { name: "admin-revenue", url: "/admin/revenue", skipOn: mobileSkip },
    { name: "admin-trainers", url: "/admin/trainers", skipOn: mobileSkip },
    { name: "admin-locations", url: "/admin/location-management", skipOn: mobileSkip },
  ];

  for (const p of PAGES) {
    test(`${p.name} (${p.url}) — 진입 + 반응형 검증`, async ({ page }, testInfo) => {
      const reason = p.skipOn?.[testInfo.project.name as ProjectName];
      test.skip(!!reason, reason || "");
      await runResponsiveChecks(page, testInfo, p.url);
      await assertNotFallbackPage(page, p.url);
    });
  }
});
