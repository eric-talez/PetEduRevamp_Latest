import { APIRequestContext, Page, request } from "@playwright/test";

type Role = "pet-owner" | "trainer" | "institute-admin" | "admin";

/**
 * Playwright 의 use.baseURL 과 동일한 규칙으로 baseURL 을 결정한다.
 * (브라우저 컨텍스트 내부 옵션에 의존해 `as any` 캐스팅하는 것을 피하기 위함)
 */
function resolveBaseURL(): string {
  if (process.env.E2E_BASE_URL) return process.env.E2E_BASE_URL;
  const port = process.env.PORT || "5000";
  return `http://localhost:${port}`;
}

/**
 * /api/auth/quick-login (CSRF 보호) 으로 시드된 테스트 계정에 로그인 후
 * 받은 쿠키를 Playwright 브라우저 컨텍스트에 주입한다.
 *
 * 주의: quick-login 엔드포인트는 시드 사용자
 *  - pet-owner   → test_owner
 *  - trainer     → test_trainer
 *  - institute-admin → institute01
 *  - admin       → admin
 * 로 자동 매핑된다. (server/auth/index.ts 참조)
 */
export async function quickLogin(page: Page, role: Role): Promise<boolean> {
  const baseURL = resolveBaseURL();
  const ctx: APIRequestContext = await request.newContext({ baseURL });
  try {
    const csrfRes = await ctx.get("/api/auth/csrf");
    if (!csrfRes.ok()) return false;
    const { csrfToken } = await csrfRes.json();

    const res = await ctx.post("/api/auth/quick-login", {
      headers: { "x-csrf-token": csrfToken, "Content-Type": "application/json" },
      data: { role },
    });
    if (!res.ok()) return false;

    const cookies = await ctx.storageState();
    await page.context().addCookies(cookies.cookies);
    return true;
  } catch {
    return false;
  } finally {
    await ctx.dispose();
  }
}
