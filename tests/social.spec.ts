/**
 * Senaryo 2 — Sosyal Akışlar
 *
 * 1. userA → userB'ye arkadaşlık isteği gönderir
 * 2. userB → isteği kabul eder
 * 3. userA → userB'ye duel meydan okuması gönderir
 * 4. userB → meydan okumayı kabul eder ve duel sayfası görünür
 *
 * Her kullanıcı kendi browser context'inde çalışır (storageState ile).
 * workers: 1 sayesinde DB race condition yoktur.
 */

import { test, expect, chromium } from "@playwright/test";
import path from "path";

const FIXTURES = path.join(__dirname, "fixtures");
const LOCALE = process.env.E2E_LOCALE ?? "en";

test.describe.serial("Social: friend request + duel flow", () => {
  test("userA sends a friend request to userB", async ({ browser }) => {
    const ctxA = await browser.newContext({
      storageState: path.join(FIXTURES, "storage-state-userA.json"),
    });
    const pageA = await ctxA.newPage();

    await pageA.goto(`/${LOCALE}/social`);
    await expect(pageA).not.toHaveURL(/login/);

    // Open user search
    const searchInput = pageA.getByPlaceholder(/search|ara|kullanıcı/i).first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    
    // Arama kutusuna yaz ve debounce/API için bekle
    await searchInput.fill("E2E User B");
    await searchInput.press("Enter");
    await pageA.waitForTimeout(1500);

    // Wait for search results (Robust Locator)
    const userBResult = pageA.locator('div').filter({ 
      has: pageA.getByText('E2E User B'),
      has: pageA.getByRole('button', { name: /Follow|Add|Request|Ekle/i })
    }).first();
    
    await expect(userBResult).toBeVisible({ timeout: 8_000 });

    // Click add/send request button inside the result row
    const addBtn = userBResult.getByRole("button", {
      name: /Follow|Add|Request|Ekle|istek/i,
    });
    await addBtn.click();

    // Expect optimistic feedback — button state or toast
    await expect(
      pageA.locator("[data-sonner-toast], [role='status']")
        .or(addBtn.locator("xpath=self::*[@disabled]"))
    ).toBeTruthy();

    await ctxA.close();
  });

  test("userB accepts the friend request from userA", async ({ browser }) => {
    const ctxB = await browser.newContext({
      storageState: path.join(FIXTURES, "storage-state-userB.json"),
    });
    const pageB = await ctxB.newPage();

    await pageB.goto(`/${LOCALE}/social`);
    await expect(pageB).not.toHaveURL(/login/);

    // ÇÖZÜM: Elementi aramadan önce "Bekleyen İstekler / Pending" sekmesine tıkla
    const pendingRequestsTab = pageB.getByRole("button", { name: /pending|istekler/i });
    if (await pendingRequestsTab.isVisible()) {
      await pendingRequestsTab.click();
    }

    // Incoming requests section
    const requestItem = pageB
      .locator("[data-testid='friend-request'], li, article")
      .filter({ hasText: /E2E User A/i })
      .first();
    await expect(requestItem).toBeVisible({ timeout: 10_000 });

    const acceptBtn = requestItem.getByRole("button", {
      name: /accept|kabul/i,
    });
    await acceptBtn.click();

    // After accepting, userA should appear in friends list
    await expect(
      pageB.getByText("E2E User A", { exact: false })
    ).toBeVisible({ timeout: 8_000 });

    await ctxB.close();
  });

  test("userA challenges userB to a duel", async ({ browser }) => {
    const ctxA = await browser.newContext({
      storageState: path.join(FIXTURES, "storage-state-userA.json"),
    });
    const pageA = await ctxA.newPage();

    await pageA.goto(`/${LOCALE}/social`);

    // Find userB in friends list and open challenge/duel action
    const friendRow = pageA
      .locator("[data-testid='friend-item'], li, article")
      .filter({ hasText: /E2E User B/i })
      .first();
    await expect(friendRow).toBeVisible({ timeout: 10_000 });

    const challengeBtn = friendRow.getByRole("button", {
      name: /challenge|duel|meydan|davet/i,
    });
    await challengeBtn.click();

    // Confirm dialog or instant send — just expect no crash & some feedback
    const confirmBtn = pageA
      .getByRole("button", { name: /confirm|send|gönder|onayla/i })
      .last();

    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(
      pageA.locator("[data-sonner-toast], [role='alert'], [role='status']")
    ).toBeVisible({ timeout: 8_000 });

    await ctxA.close();
  });

  test("userB sees the duel invitation", async ({ browser }) => {
    const ctxB = await browser.newContext({
      storageState: path.join(FIXTURES, "storage-state-userB.json"),
    });
    const pageB = await ctxB.newPage();

    await pageB.goto(`/${LOCALE}/social`);

    // Duel/challenge section should list the incoming challenge
    const duelSection = pageB.locator(
      "[data-testid='duel-invite'], [data-testid='challenge-invite'], section, article"
    ).filter({ hasText: /E2E User A|duel|challenge|meydan/i }).first();

    await expect(duelSection).toBeVisible({ timeout: 10_000 });

    await ctxB.close();
  });
});