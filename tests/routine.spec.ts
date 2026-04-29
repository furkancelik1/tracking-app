/**
 * Senaryo 1 — Rutin Yaşam Döngüsü
 *
 * 1. Rutin oluştur (form aç → doldur → kaydet)
 * 2. Rutin check-in yap ve tamamlandığını doğrula
 * 3. Spam-click güvenliği: aynı rutin aynı periyotta 2× check-in kabul etmemeli
 */

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
    // Nav header should be visible
    await expect(page.locator("header")).toBeVisible();
  });

  test("can create a new routine", async ({ page }) => {
    await page.goto(`/${LOCALE}/dashboard`);

    // 1. Eğer "Welcome Tour" açık kalırsa kapat
    const closeTourBtn = page.getByRole("button", { name: /close|kapat/i }).first();
    if (await closeTourBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeTourBtn.click();
      // Animasyonun bitip modalın ekrandan tamamen kaybolmasını bekle
      await expect(closeTourBtn).not.toBeVisible(); 
    }

    // 2. ÖNEMLİ: Formu açmak için "Ekle" butonuna veya "Add Your First Routine" linkine TIKLA
    const openFormBtn = page
      .getByRole("link", { name: /add your first routine|ilk rutini/i })
      .or(page.getByTestId("add-routine-btn"))
      .first();
    
    await expect(openFormBtn).toBeVisible({ timeout: 10_000 });
    await openFormBtn.click(); // EKSİK OLAN KISIM BURASIYDI: Formu açar.

    // 3. Form açıldıktan sonra input'u bul ve doldur
    const nameInput = page.getByPlaceholder(/routine name|rutin adı/i)
      .or(page.getByRole("textbox", { name: /^name$|^ad$|^isim$/i }))
      .first();
      
    await expect(nameInput).toBeVisible({ timeout: 7_000 });
    await nameInput.fill(routineName);

    // 4. Submit the form
    const submitBtn = page
      .getByRole("button", { name: /save|create|kaydet|oluştur/i })
      .last();
    await submitBtn.click();

    // 5. New routine should appear in the list
    await expect(
      page.getByText(routineName, { exact: false })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("can check-in on the created routine", async ({ page }) => {
    await page.goto(`/${LOCALE}/dashboard`);

    // Find the routine card by name
    const routineCard = page
      .locator("[data-testid='routine-card'], article, li")
      .filter({ hasText: routineName })
      .first();
    await expect(routineCard).toBeVisible({ timeout: 10_000 });

    // Click the check-in / complete button inside the card
    const checkBtn = routineCard.getByRole("button", {
      name: /check.?in|complete|done|tamamla/i,
    });
    await checkBtn.click();

    // Expect a success indicator: completed state, toast, or XP gain
    await expect(
      page.locator("[data-state='completed'], [aria-label*='completed'], .text-green, [class*='complete']")
        .or(page.locator(".toaster, [data-sonner-toast]"))
    ).toBeVisible({ timeout: 8_000 });
  });

  test("duplicate check-in in same period is rejected", async ({ page }) => {
    await page.goto(`/${LOCALE}/dashboard`);

    const routineCard = page
      .locator("[data-testid='routine-card'], article, li")
      .filter({ hasText: routineName })
      .first();
    await expect(routineCard).toBeVisible({ timeout: 10_000 });

    const checkBtn = routineCard.getByRole("button", {
      name: /check.?in|complete|done|tamamla/i,
    });

    // Button should be disabled or show "already done" state
    const isDisabled = await checkBtn.isDisabled().catch(() => true);
    if (!isDisabled) {
      // If still clickable, a second click should produce an error toast
      await checkBtn.click();
      await expect(
        page.locator("[data-sonner-toast][data-type='error'], [role='alert']")
      ).toBeVisible({ timeout: 6_000 });
    } else {
      expect(isDisabled).toBe(true);
    }
  });
});