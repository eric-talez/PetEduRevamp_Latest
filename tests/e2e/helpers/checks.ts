import { expect, Page, TestInfo } from "@playwright/test";

/**
 * 페이지 진입 후 공통 안정화: 네트워크 idle + 짧은 지연.
 * (Vite/스플래시 화면이 있어 곧바로 측정하면 흔들림이 큼)
 */
export async function settle(page: Page, ms = 500): Promise<void> {
  try {
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  } catch {
    // 일부 페이지는 socket 등으로 지속 트래픽이 있어 idle에 도달하지 않음 — 무시
  }
  await page.waitForTimeout(ms);
}

/**
 * 가로 스크롤 발생 여부를 검출한다.
 * documentElement.scrollWidth가 viewport 너비를 초과하면 가로 스크롤이 생긴다.
 * 일부 픽셀 정밀도 문제로 1~2px 정도의 오차는 허용한다.
 */
export async function expectNoHorizontalScroll(
  page: Page,
  testInfo: TestInfo,
  context: string,
): Promise<void> {
  const measure = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  const overflow = measure.scrollWidth - measure.innerWidth;
  if (overflow > 2) {
    await attachScreenshot(page, testInfo, `horizontal-scroll-${slug(context)}`);
  }
  expect(
    overflow,
    `[${context}] 가로 스크롤 발생: scrollWidth=${measure.scrollWidth}, innerWidth=${measure.innerWidth}`,
  ).toBeLessThanOrEqual(2);
}

/**
 * 모바일 하단 네비(MobileBottomNav)가 본문 마지막 인터랙션 요소(button/a)와 겹치는지 확인한다.
 * 데스크톱(viewport >= 1024)에서는 하단 네비가 숨겨지므로 검사를 건너뛴다.
 */
export async function expectNoBottomNavOverlap(
  page: Page,
  testInfo: TestInfo,
  context: string,
): Promise<void> {
  const innerWidth = await page.evaluate(() => window.innerWidth);
  if (innerWidth >= 1024) {
    return; // 데스크톱은 하단 네비 미표시
  }

  const nav = page.locator('nav[aria-label="모바일 하단 네비게이션"]');
  if ((await nav.count()) === 0) {
    return; // 비로그인 일부 라우트에서 미렌더되는 경우가 있을 수 있음
  }
  const navBox = await nav.boundingBox();
  if (!navBox) return;

  // 본문 영역(<main>) 중 하단에 가까운 인터랙션 요소를 후보로 본다.
  const candidates = await page
    .locator('main button:visible, main a:visible')
    .all();

  let worstOverlap = 0;
  let worstSelector = "";
  for (const el of candidates) {
    const box = await el.boundingBox();
    if (!box) continue;
    // 화면 안에 있고, 네비 영역과 수직으로 겹치는지 본다
    if (box.y + box.height <= navBox.y) continue;
    if (box.y >= navBox.y + navBox.height) continue;
    const overlap = Math.min(box.y + box.height, navBox.y + navBox.height) -
      Math.max(box.y, navBox.y);
    if (overlap > worstOverlap) {
      worstOverlap = overlap;
      worstSelector = (await el.evaluate((n) => {
        const tag = n.tagName.toLowerCase();
        const id = (n as HTMLElement).id ? `#${(n as HTMLElement).id}` : "";
        const cls = (n as HTMLElement).className?.toString().split(" ").slice(0, 2).join(".");
        return `${tag}${id}${cls ? "." + cls : ""}`;
      })) as string;
    }
  }

  if (worstOverlap > 4) {
    await attachScreenshot(page, testInfo, `bottom-nav-overlap-${slug(context)}`);
  }
  expect(
    worstOverlap,
    `[${context}] 하단 네비와 본문 인터랙션 요소가 ${worstOverlap}px 겹침 (selector=${worstSelector})`,
  ).toBeLessThanOrEqual(4);
}

/**
 * TopBar/Sidebar 가시성·간섭 점검.
 * - 모든 viewport에서 TopBar(<header>)는 보여야 한다.
 * - 데스크톱(>=1024px)에서는 사이드바 컨테이너가 본문과 겹치지 않아야 한다 (ml 보정 적용 확인).
 */
export async function expectTopBarAndSidebar(
  page: Page,
  testInfo: TestInfo,
  context: string,
): Promise<void> {
  const header = page.locator("header").first();
  await expect(header, `[${context}] TopBar(header)가 보여야 합니다`).toBeVisible();

  const innerWidth = await page.evaluate(() => window.innerWidth);
  if (innerWidth < 1024) return;

  const sidebar = page.locator('aside[aria-label="사이드바 메뉴"]');
  if ((await sidebar.count()) === 0) return;
  const sidebarBox = await sidebar.boundingBox();
  const main = page.locator("main#main-content");
  const mainBox = await main.boundingBox();
  if (!sidebarBox || !mainBox) return;

  if (mainBox.x + 1 < sidebarBox.x + sidebarBox.width) {
    await attachScreenshot(page, testInfo, `sidebar-overlap-${slug(context)}`);
  }
  expect(
    mainBox.x + 1,
    `[${context}] 데스크톱에서 사이드바와 본문이 겹치고 있음 (sidebar right=${sidebarBox.x + sidebarBox.width}, main left=${mainBox.x})`,
  ).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width);
}

/**
 * 한 페이지에 대해 viewport 회귀 체크 묶음을 실행한다.
 */
export async function runResponsiveChecks(
  page: Page,
  testInfo: TestInfo,
  url: string,
): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await settle(page);
  await expectNoHorizontalScroll(page, testInfo, url);
  await expectTopBarAndSidebar(page, testInfo, url);
  await expectNoBottomNavOverlap(page, testInfo, url);
}

async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  try {
    const buf = await page.screenshot({ fullPage: true });
    await testInfo.attach(name, { body: buf, contentType: "image/png" });
  } catch {
    // 스크린샷 첨부 실패는 무시
  }
}

function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 80);
}
