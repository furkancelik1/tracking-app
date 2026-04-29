/**
 * Senaryo 3 — Monetizasyon / ProGate Testi
 *
 * FREE kullanıcı:
 *   - /stats sayfasında gelişmiş analitik bölümü bulanık (blur) görünür
 *   - "Upgrade to Pro" başlığı ve "Upgrade Now" butonu görünür
 *   - Stripe checkout URL'sine yönlendirme için istek atılır
 *
 * PRO kullanıcı:
 *   - Aynı bölüm tam olarak görünür, overlay yoktur
 *   - "Upgrade Now" butonu bulunmaz
 */

import { test, expect } from "@playwright/test";
import path from "path";

const FIXTURES = path.join(__dirname, "fixtures");
const LOCALE = process.env.E2E_LOCALE ?? "en";

// ── FREE user tests ──────────────────────────────────────────────────────────

test.describe("Stats page — FREE user (ProGate active)", () => {
  test.use({ storageState: path.join(FIXTURES, "storage-state-freeUser.json") });

  test("advanced analytics section is gated with blur overlay", async ({ page }) => {
    await page.goto(`/${LOCALE}/stats`);
    await expect(page).not.toHaveURL(/login/);

    // ProGate overlay must be visible
    await expect(
      page.getByText("Upgrade to Pro", { exact: false })
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText("This feature is exclusive to Zenith Pro members.", { exact: false })
    ).toBeVisible();
  });

  test("'Upgrade Now' button is visible and enabled", async ({ page }) => {
    await page.goto(`/${LOCALE}/stats`);

    const upgradeBtn = page.getByRole("button", { name: /upgrade now/i });
    await expect(upgradeBtn).toBeVisible({ timeout: 15_000 });
    await expect(upgradeBtn).toBeEnabled();
  });

  test("'Upgrade Now' click triggers Stripe checkout request", async ({ page }) => {
    await page.goto(`/${LOCALE}/stats`);

    // Intercept the checkout POST — return a fake URL to avoid real Stripe redirect
    await page.route("/api/v1/stripe/checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { url: "https://checkout.stripe.com/pay/cs_test_fake" },
        }),
      });
    });

    const upgradeBtn = page.getByRole("button", { name: /upgrade now/i });
    await expect(upgradeBtn).toBeVisible({ timeout: 15_000 });

    // Catch the navigation that would follow the redirect
    const [request] = await Promise.all([
      page.waitForRequest("/api/v1/stripe/checkout"),
      upgradeBtn.click(),
    ]);

    expect(request.method()).toBe("POST");
  });

  test("basic summary cards are visible to FREE users (heatmap not gated)", async ({
    page,
  }) => {
    await page.goto(`/${LOCALE}/stats`);

    // Summary cards above the ProGate should always render
    await expect(
      page.locator("[data-testid='stats-card'], .grid .rounded-xl, .grid [class*='Card']").first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ── PRO user tests ───────────────────────────────────────────────────────────

test.describe("Stats page — PRO user (ProGate bypassed)", () => {
  test.use({
    storageState: path.join(FIXTURES, "storage-state-proUser.json"),
    viewport: { width: 390, height: 844 },
  });

  test("advanced analytics section renders without overlay", async ({ page }) => {
    await page.goto(`/${LOCALE}/stats`);
    await expect(page).not.toHaveURL(/login/);

    // ProGate overlay must NOT exist
    await expect(
      page.getByText("Upgrade to Pro", { exact: false })
    ).not.toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole("button", { name: /upgrade now/i })
    ).not.toBeVisible();
  });

  test("advanced charts are accessible to PRO user", async ({ page }) => {
    await page.goto(`/${LOCALE}/stats`);

    // Radar chart or routine success list should be visible (not blurred)
    // These are inside the ProGate children — present & interactive for PRO
    const advancedSection = page.locator(
      "[data-testid='consistency-radar'], [data-testid='routine-success-list'], svg.recharts-surface, canvas"
    ).first();

    await expect(advancedSection).toBeVisible({ timeout: 15_000 });
  });

  test("PRO badge is visible in nav dropdown", async ({ page }) => {
    await page.goto(`/${LOCALE}/stats`);

    // Open user dropdown in nav
    const avatarBtn = page.getByTestId("user-menu-btn");
    await avatarBtn.click();

    await expect(
      page.getByText("PRO", { exact: true })
    ).toBeVisible({ timeout: 5_000 });
  });
});
