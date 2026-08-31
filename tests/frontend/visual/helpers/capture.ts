import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { freezeTime } from "./fakeClock.js";
import { getDynamicMasks } from "./mask.js";
import { assertNoHorizontalOverflow } from "./responsive.js";
import {
  dismissCookieBanner,
  gotoAuthenticated,
  seedTheme,
  setupAuthenticatedState,
} from "./auth.js";
import { installDefaultMocks } from "./mockApi.js";
import {
  getCurrentProject,
  skipUnlessMatrix,
  type VisualTheme,
  type VisualViewport,
} from "./project.js";

const pageErrors = new WeakMap<Page, string[]>();

export async function prepareVisualPage(
  page: Page,
  testInfo: TestInfo,
  options?: { authenticated?: boolean },
): Promise<void> {
  const { theme } = getCurrentProject(testInfo);
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.warn(`[visual] pageerror: ${error.message}`);
  });
  await freezeTime(page);
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent =
      "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }";
    const inject = () => {
      if (!document.head) {
        return false;
      }
      document.head.appendChild(style);
      return true;
    };
    if (!inject()) {
      const observer = new MutationObserver(() => {
        if (inject()) {
          observer.disconnect();
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    }
  });
  await seedTheme(page, theme);
  await dismissCookieBanner(page);
  await installDefaultMocks(page);
  if (options?.authenticated) {
    await setupAuthenticatedState(page);
  }
}

async function waitForVisualAssets(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );
  });
}

export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("#login-shell").waitFor({ state: "detached", timeout: 10_000 });
  const bootErrors = pageErrors.get(page);
  if (bootErrors?.length) {
    throw new Error(`App failed to boot: ${bootErrors.join("; ")}`);
  }
  await waitForVisualAssets(page);
}

export async function capturePageScreenshot(
  page: Page,
  _testInfo: TestInfo,
  name: string,
  options?: { locator?: Locator; fullPage?: boolean; waitFor?: string },
): Promise<void> {
  await waitForAppReady(page);
  if (options?.waitFor) {
    await page.locator(options.waitFor).first().waitFor({ state: "visible", timeout: 15_000 });
  }
  await waitForVisualAssets(page);
  await page
    .locator('[aria-label="Switch to light mode"], [aria-label="Switch to dark mode"]')
    .first()
    .waitFor({ state: "visible", timeout: 5_000 })
    .catch(() => undefined);
  if (!options?.locator) {
    await assertNoHorizontalOverflow(page);
  }
  const masks = await getDynamicMasks(page);
  const target = options?.locator ?? page;
  await expect(target).toHaveScreenshot(`${name}.png`, {
    mask: masks,
    fullPage: options?.locator ? false : (options?.fullPage ?? true),
    animations: "disabled",
    timeout: 15_000,
  });
}

export async function openAuthenticatedPage(
  page: Page,
  testInfo: TestInfo,
  url: string,
  matrix: { themes?: VisualTheme[]; viewports?: VisualViewport[] },
): Promise<void> {
  skipUnlessMatrix(testInfo, matrix);
  await prepareVisualPage(page, testInfo, { authenticated: true });
  await gotoAuthenticated(page, url);
  await expect(page).not.toHaveURL(/\/login/);
  await page.locator("header nav").first().waitFor({ state: "visible", timeout: 15_000 });
}

export async function openPublicPage(
  page: Page,
  testInfo: TestInfo,
  url: string,
  matrix: { themes?: VisualTheme[]; viewports?: VisualViewport[] },
): Promise<void> {
  skipUnlessMatrix(testInfo, matrix);
  await prepareVisualPage(page, testInfo, { authenticated: false });
  await page.goto(url, { waitUntil: "domcontentloaded" });
}
