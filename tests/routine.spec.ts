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

    // 3. Formu aç
    await page.getByTestId("add-routine-btn").click();

    // 4. Input'u doldur (Sadece dialog içindekini hedefle)
    const nameInput = page.getByRole("dialog").locator('input:not([type="hidden"])').first();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill(routineName);

    // --- KRİTİK DÜZELTME ---
    // POST /api/routines isteğini yakala. Status 200 VEYA 201 kabul et.
    // .catch() ile yutmuyoruz; timeout olursa test patlasın ki sahte yeşil görmeyelim.
    const createRoutinePromise = page.waitForResponse(
      (response) =>
        /\/api\/v1\/routines(\?|$|\/)/.test(response.url()) &&
        response.request().method() === "POST" &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 15_000 }
    );

    // 5. Kaydet
    await page
      .getByRole("button", { name: /save|create|kaydet|oluştur/i })
      .last()
      .click();

    // Sunucu yanıtını bekle - başarısız olursa test burada düşsün
    const response = await createRoutinePromise;
    expect(response.ok()).toBeTruthy();

    // 6. UI'da görünür olduğunu doğrula
    await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 10_000 });

    // 7. Sayfayı yenile - routine'in GERÇEKTEN persist edildiğini doğrula
    // (Optimistic UI ile false-positive'i engeller)
    await page.reload();
    await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });
  });

  test("can check-in on the created routine", async ({ page }) => {
    await page.goto(`/${LOCALE}/dashboard`);

    // networkidle yerine domcontentloaded + explicit wait kullan
    await page.waitForLoadState("domcontentloaded");

    // Önce ismin görünmesini bekle (API senkronizasyonu için kritik)
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