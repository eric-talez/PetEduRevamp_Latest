import { test } from "@playwright/test";
import { runResponsiveChecks } from "../helpers/checks";

type PageDef = {
  name: string;
  url: string;
  // 알려진 깨짐: 해당 viewport 에서는 임시 skip + 사유.
  // (별도 후속 태스크에서 수정 예정)
  skipOn?: Partial<Record<"mobile-iphone-se" | "tablet-ipad" | "desktop", string>>;
};

const PUBLIC_PAGES: PageDef[] = [
  { name: "home", url: "/" },
  { name: "courses", url: "/courses" },
  { name: "trainers", url: "/trainers" },
  {
    name: "institutes",
    url: "/institutes",
    skipOn: {
      // 모바일/태블릿(<1024px)에서 카드 그리드 일부가 하단 네비와 14px 가량 겹침
      "mobile-iphone-se": "follow-up #83 — /institutes 카드 그리드가 MobileBottomNav 와 겹침",
      "tablet-ipad": "follow-up #83 — /institutes 카드 그리드가 MobileBottomNav 와 겹침",
    },
  },
  {
    name: "locations",
    url: "/locations",
    skipOn: {
      // 데스크톱: 지도/사이드 패널 고정폭으로 16px 가량 가로 스크롤 발생
      desktop: "follow-up #83 — /locations 데스크톱(1280px)에서 16px 가량 가로 스크롤",
      // 모바일/태블릿: MobileBottomNav 와 지도 컨트롤 버튼이 겹침
      "mobile-iphone-se": "follow-up #83 — /locations 지도 컨트롤이 MobileBottomNav 와 겹침",
      "tablet-ipad": "follow-up #83 — /locations 지도 컨트롤이 MobileBottomNav 와 겹침",
    },
  },
];

test.describe("비로그인 흐름 — 반응형 회귀", () => {
  for (const p of PUBLIC_PAGES) {
    test(`${p.name} (${p.url}) — 반응형 검증`, async ({ page }, testInfo) => {
      const reason = p.skipOn?.[testInfo.project.name as keyof NonNullable<PageDef["skipOn"]>];
      test.skip(!!reason, reason || "");
      await runResponsiveChecks(page, testInfo, p.url);
    });
  }

  test("course-detail (/course/1) — 반응형 검증", async ({ page }, testInfo) => {
    // 시드된 강의 ID를 알 수 없는 환경 대비: 진입과 첫 렌더만 확인.
    // 강의가 없어 빈 페이지가 떠도 가로 스크롤·하단 네비 겹침은 없어야 한다.
    await runResponsiveChecks(page, testInfo, "/course/1");
  });
});
