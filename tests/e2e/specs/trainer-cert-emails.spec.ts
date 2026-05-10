import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { quickLogin } from "../helpers/auth";

/**
 * 트레이너 수료증 발송 내역 화면 (`/trainer/email-certificates`) e2e.
 *
 * 검증 포인트
 *  - 트레이너로 진입하면 NotFound 폴백이 아닌 본 화면이 렌더된다.
 *  - 응답에 본인(`trainerId === 본인`)이 아닌 발송 건이 섞여있더라도 렌더되는 행은
 *    백엔드(`GET /api/trainer/email-logs/certificates`) 가 본인 건만 반환한다는
 *    가정이 유지된다 — UI 가 응답 그대로 표시하므로 노출되는 모든 행의
 *    payload.trainerId 가 본인이어야 한다.
 *  - 실패 건의 "관리자에게 재발송 요청" 버튼 클릭 시
 *      · 성공 토스트 ("관리자에게 재발송을 요청했습니다") 가 노출된다.
 *      · 요청이 진행되는 동안 동일 버튼이 비활성화 된다 (in-flight 중복 클릭 방지).
 *
 * 실패 건이 dev DB 에 없을 수 있으므로, 본 스펙은 `/api/auth/quick-login` 으로
 * 받은 트레이너 세션 쿠키를 그대로 재사용해 직접 데이터를 시드한다.
 *
 * 세 가지 사전 조건이 충족되지 않으면 (트레이너 quick-login 실패, 시드 API
 * 미존재 등) 테스트는 skip 처리되어 전체 e2e 그린을 깨지 않는다.
 */

import { request as pwRequest } from "@playwright/test";

const BASE_URL =
  process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || "5000"}`;

interface TrainerSession {
  ctx: APIRequestContext;
  csrfToken: string;
  trainerId: number;
}

async function loginTrainerApi(): Promise<TrainerSession | null> {
  const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
  try {
    const csrfRes = await ctx.get("/api/auth/csrf");
    if (!csrfRes.ok()) return null;
    const { csrfToken } = await csrfRes.json();

    const loginRes = await ctx.post("/api/auth/quick-login", {
      headers: {
        "x-csrf-token": csrfToken,
        "Content-Type": "application/json",
      },
      data: { role: "trainer" },
    });
    if (!loginRes.ok()) return null;

    const meRes = await ctx.get("/api/auth/me");
    if (!meRes.ok()) return null;
    const me = await meRes.json();
    // /api/auth/me 는 표준화 응답 (success → { success, data, ... }) 또는 raw user 를
    // 반환할 수 있다. 양쪽 모두 처리한다.
    const trainerId =
      me?.id ?? me?.user?.id ?? me?.data?.id ?? me?.data?.user?.id;
    if (typeof trainerId !== "number") return null;

    return { ctx, csrfToken, trainerId };
  } catch {
    await ctx.dispose().catch(() => undefined);
    return null;
  }
}

/**
 * dev DB 에 본인 코스의 실패한 수료증 발송 로그를 삽입한다.
 * 시드 전용 admin 엔드포인트가 없는 환경에서는 null 을 반환하고 테스트를 skip 한다.
 *
 * 시도 순서:
 *   1) `/api/test/seed-email-log` (있으면 사용)
 *   2) admin 권한으로 직접 emailLogs row 작성 — 본 스펙에서는 시도하지 않음 (권한 분리)
 */
async function seedFailedCertLog(
  session: TrainerSession,
): Promise<{ id: number; recipient: string } | null> {
  const recipient = `e2e-cert-${Date.now()}@example.com`;
  try {
    const res = await session.ctx.post("/api/test/seed-email-log", {
      headers: {
        "x-csrf-token": session.csrfToken,
        "Content-Type": "application/json",
      },
      data: {
        templateKey: "course_completion_certificate",
        status: "failed",
        recipient,
        payload: {
          trainerId: session.trainerId,
          courseId: 9999,
          courseTitle: "E2E 코스",
          name: "E2E 보호자",
          petName: "테스트독",
          certificateNo: `E2E-${Date.now()}`,
        },
        lastError: "SMTP timeout (e2e seed)",
      },
    });
    if (!res.ok()) return null;
    const body = await res.json();
    const id = body?.id ?? body?.log?.id;
    if (typeof id !== "number") return null;
    return { id, recipient };
  } catch {
    return null;
  }
}

test.describe("트레이너 수료증 발송 내역 화면", () => {
  let session: TrainerSession | null = null;

  test.beforeAll(async () => {
    session = await loginTrainerApi();
  });

  test.afterAll(async () => {
    if (session) await session.ctx.dispose().catch(() => undefined);
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!session, "trainer quick-login 실패 — 시드 사용자 미존재 가능");
    const ok = await quickLogin(page, "trainer");
    test.skip(!ok, "브라우저 컨텍스트 trainer quick-login 실패");
  });

  test("페이지가 NotFound 폴백 없이 본 화면을 렌더한다", async ({ page }) => {
    await page.goto("/trainer/email-certificates");

    // 헤더 확인
    await expect(
      page.getByRole("heading", { name: "수료증 이메일 발송 내역" }),
    ).toBeVisible();

    // SimpleApp NotFound 폴백 헤딩이 보이면 라우팅이 깨진 것
    await expect(
      page.getByRole("heading", { name: "길을 잃으셨나요?" }),
    ).toHaveCount(0);

    // 컨테이너 testid
    await expect(page.getByTestId("page-trainer-cert-emails")).toBeVisible();
  });

  test("본인 코스 외 발송 건은 표시되지 않는다 — payload.trainerId 일치", async ({
    page,
  }) => {
    if (!session) test.skip();
    // 응답에서 노출되는 행의 trainerId 가 모두 본인인지 검증한다.
    const apiRes = await session!.ctx.get(
      "/api/trainer/email-logs/certificates",
    );
    expect(apiRes.ok()).toBeTruthy();
    const body = await apiRes.json();
    const logs: Array<{ payload?: { trainerId?: number } }> = body.logs || [];
    for (const l of logs) {
      // trainerId 가 비어있는 레거시 행은 허용. 값이 있을 때는 반드시 본인이어야 한다.
      if (l.payload && l.payload.trainerId != null) {
        expect(l.payload.trainerId).toBe(session!.trainerId);
      }
    }

    // 페이지가 같은 데이터를 그대로 표시하는지 행 수와 비교
    await page.goto("/trainer/email-certificates");
    await expect(page.getByTestId("page-trainer-cert-emails")).toBeVisible();
    const rows = page.locator('[data-testid^="row-cert-log-"]');
    // 최대 비교 — 백엔드 total 과 화면 행 수가 같다 (페이징 미적용)
    await expect(rows).toHaveCount(logs.length);
  });

  test("실패 건의 재발송 요청 버튼 → 성공 토스트, 클릭 중 비활성화", async ({
    page,
  }) => {
    if (!session) test.skip();
    const seeded = await seedFailedCertLog(session!);
    test.skip(
      !seeded,
      "실패 수료증 로그 시드 엔드포인트(/api/test/seed-email-log) 가 없습니다",
    );

    await page.goto("/trainer/email-certificates");
    await expect(page.getByTestId("page-trainer-cert-emails")).toBeVisible();

    const button = page.getByTestId(`button-request-resend-${seeded!.id}`);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    // 응답을 의도적으로 지연시켜 in-flight 비활성화 상태를 관찰한다.
    await page.route(
      `**/api/trainer/email-logs/${seeded!.id}/request-resend`,
      async (route) => {
        await new Promise((r) => setTimeout(r, 600));
        await route.continue();
      },
    );

    await button.click();
    // in-flight 동안 disabled + "요청 중..." 라벨
    await expect(button).toBeDisabled();
    await expect(button).toContainText("요청 중...");

    // 성공 토스트 (스크린리더 aria-live span 과 토스트 타이틀이 동일 텍스트를
    // 가질 수 있어 exact 매칭으로 토스트 타이틀만 선택)
    await expect(
      page.getByText("관리자에게 재발송을 요청했습니다", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    // 요청 종료 후 다시 활성화
    await expect(button).toBeEnabled();
    await expect(button).toContainText("관리자에게 재발송 요청");
  });
});
