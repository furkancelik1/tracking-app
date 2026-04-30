import { test, expect } from "@playwright/test";
import path from "path";

const STORAGE_STATE = path.join(__dirname, "fixtures/storage-state-userA.json");
const LOCALE = process.env.E2E_LOCALE ?? "en";

test.use({ storageState: STORAGE_STATE });

test("DEBUG — can create a new routine (ölçüm modu)", async ({ page }) => {
  const routineName = `E2E Debug ${Date.now()}`;

  // Tüm POST isteklerini logla
  page.on("request", (req) => {
    if (req.method() === "POST") {
      const isServerAction = !!req.headers()["next-action"];
      console.log(
        `[POST REQUEST] url=${req.url()} method=${req.method()} serverAction=${isServerAction}`
      );
    }
  });

  // Tüm POST response'larını logla
  page.on("response", (res) => {
    if (res.request().method() === "POST") {
      console.log(
        `[POST RESPONSE] url=${res.url()} status=${res.status()}`
      );
    }
  });

  // Browser console error / warning'leri logla
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  // Runtime JS hatalarını logla
  page.on("pageerror", (err) => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  await page.goto(`/${LOCALE}/dashboard`);
  await expect(page.locator("main")).toBeVisible();

  // Onboarding modal varsa kapat
  const closeTourBtn = page.getByRole("button", { name: /close|kapat/i }).first();
  try {
    await closeTourBtn.waitFor({ state: "visible", timeout: 5000 });
    await closeTourBtn.click({ force: true });
    await expect(closeTourBtn).not.toBeVisible();
  } catch {
    /* Modal yoksa devam et */
  }

  // RoutineList mount olana kadar bekle
  await expect(
    page.locator("h1").filter({ hasText: /my routines|rutinlerim/i })
  ).toBeVisible({ timeout: 10_000 });

  // Dialog'u aç
  await page.getByTestId("add-routine-btn").click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  // Routine adını doldur
  const nameInput = dialog.locator('input:not([type="hidden"])').first();
  await expect(nameInput).toBeVisible({ timeout: 5_000 });
  await nameInput.fill(routineName);

  // Submit butonunu bul ve durumunu logla
  const submitBtn = dialog.getByRole("button", { name: /create routine|oluştur|kaydet/i });
  const isEnabled = await submitBtn.isEnabled().catch(() => false);
  console.log(`[SUBMIT BTN] enabled=${isEnabled}`);

  // Click — waitForResponse yok, sadece 5 sn bekleyip ne olduğunu gözlemle
  await submitBtn.click();
  await page.waitForTimeout(5000);

  const dialogVisible = await dialog.isVisible().catch(() => false);
  console.log(`[AFTER CLICK] dialog still visible=${dialogVisible}`);
});
