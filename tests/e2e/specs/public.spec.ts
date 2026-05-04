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
  },
  {
    name: "locations",
    url: "/locations",
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
