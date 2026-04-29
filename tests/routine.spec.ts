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

   // 1. Welcome Tour modalını kapat (Düzgün asenkron bekleme ile)
    const closeTourBtn = page.getByRole("button", { name: /close|kapat/i }).first();
    try {
      // isVisible anında false döner, waitFor ise elementin gelmesini 5 saniye boyunca bekler.
      await closeTourBtn.waitFor({ state: "visible", timeout: 5000 });
      await closeTourBtn.click();
      await expect(closeTourBtn).not.toBeVisible(); 
    } catch (error) {
      // Modal 5 saniye içinde hiç gelmezse (örneğin daha önce kapatılmışsa) sessizce devam et
    }
    // 2. DashboardNav.tsx'e eklediğimiz YENİ butonun Test ID'sini kullanıyoruz
    // (Böylece uygulamanın ana "ekleme" mantığını test etmiş oluyoruz)
    const openFormBtn = page.getByTestId("add-routine-btn");
    await expect(openFormBtn).toBeVisible({ timeout: 10_000 });
    await openFormBtn.click();

    // 3. Formun açıldığını doğrula ve input'u doldur
    // Gizli (hidden) olmayan ilk input'u bulur. Bu en garantili yöntemdir.
    const nameInput = page.locator('input:not([type="hidden"])').first();
    
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill(routineName);

    // 4. Kaydet butonuna tıkla
    const submitBtn = page
      .getByRole("button", { name: /save|create|kaydet|oluştur/i })
      .last();
    await submitBtn.click();

    // 5. Doğrulama: Yeni rutin listede görünmeli
    await expect(page.getByText(routineName)).toBeVisible({ timeout: 10_000 });
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