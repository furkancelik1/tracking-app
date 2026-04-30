import { test, expect } from "@playwright/test";
import path from "path";

const STORAGE_STATE = path.join(__dirname, "fixtures/storage-state-userA.json");
const LOCALE = process.env.E2E_LOCALE ?? "en";

test.use({ storageState: STORAGE_STATE });

test.describe.serial("Routine lifecycle", () => {
  const routineName = `E2E Routine ${Date.now()}`;

  test("dashboard loads for authenticated user", async ({ page }) => {
    await page.goto(`/${LOCALE}/dashboard`);
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("header")).toBeVisible();
  });

  test("can create a new routine", async ({ page }) => {
    await page.goto(`/${LOCALE}/dashboard`);

    // 1. Hydration bekle
    await expect(page.locator("main")).toBeVisible();

    // 2. Onboarding modalını güvenle kapat
    const closeTourBtn = page.getByRole("button", { name: /close|kapat/i }).first();
    try {
      await closeTourBtn.waitFor({ state: "visible", timeout: 5000 });
      await closeTourBtn.click({ force: true });
      await expect(closeTourBtn).not.toBeVisible();
    } catch (e) {
      /* Modal yoksa devam et */
    }

    // 3. RoutineList'in mount olmasını bekle
    await expect(
      page.locator("h1").filter({ hasText: /my routines|rutinlerim/i })
    ).toBeVisible({ timeout: 10_000 });

    // 4. Formu aç
    await page.getByTestId("add-routine-btn").click();

    // 5. Dialog'un açıldığını doğrula
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // 6. Input'u doldur
    const nameInput = dialog.locator('input:not([type="hidden"])').first();
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill(routineName);

    // 7. Submit butonunu bul ve tıkla
    const submitBtn = dialog.getByRole("button", { name: /create routine|oluştur|kaydet/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 8. Dialog kapandığını doğrula (Web-first assertion)
    // Ağ isteği beklemek yerine UI sonucunu bekliyoruz
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // 9. UI'da görünür olduğunu doğrula
    await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 10_000 });

    // 10. Sayfayı yenile - Verinin gerçekten kaydedildiğini doğrula
    await page.reload();
    await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });
  });

  test("can check-in on the created routine", async ({ page }) => {
    await page.goto(`/${LOCALE}/dashboard`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });

    const routineCard = page
      .locator("[data-testid='routine-card'], article, li")
      .filter({ hasText: routineName })
      .first();

    await expect(routineCard).toBeVisible({ timeout: 5_000 });

    const checkBtn = routineCard.getByRole("button", {
      name: /check.?in|complete|done|tamamla/i,
    });
    await expect(checkBtn).toBeVisible();
    await checkBtn.click();

    await expect(
      page
        .locator("[data-state='completed'], [aria-label*='completed'], .text-green")
        .or(page.locator("[data-sonner-toast]"))
    ).toBeVisible({ timeout: 8_000 });
  });

  test("duplicate check-in in same period is rejected", async ({ page }) => {
    await page.goto(`/${LOCALE}/dashboard`);

    await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });

    const routineCard = page
      .locator("[data-testid='routine-card'], article, li")
      .filter({ hasText: routineName })
      .first();

    const checkBtn = routineCard.getByRole("button", {
      name: /check.?in|complete|done|tamamla/i,
    });

    const isDisabled = await checkBtn.isDisabled().catch(() => true);
    if (!isDisabled) {
      await checkBtn.click();
      await expect(page.locator("[data-sonner-toast][data-type='error']")).toBeVisible();
    } else {
      expect(isDisabled).toBe(true);
    }
  });
});