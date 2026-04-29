# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: routine.spec.ts >> Routine lifecycle >> can create a new routine
- Location: tests\routine.spec.ts:27:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('add-routine-btn').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByTestId('add-routine-btn').first()

```

# Page snapshot

```yaml
- generic:
  - generic:
    - banner:
      - generic:
        - link:
          - /url: /en/dashboard
          - generic:
            - img
          - generic: ZENITH
        - navigation:
          - link:
            - /url: /en/dashboard
            - text: My Routines
          - link:
            - /url: /en/marketplace
            - text: Marketplace
          - link:
            - /url: /en/social
            - text: Social
          - link:
            - /url: /en/leaderboard
            - text: Leaderboard
          - link:
            - /url: /en/settings
            - text: Settings
        - generic:
          - button:
            - img
            - generic: "0"
          - button:
            - img
          - generic:
            - button:
              - img
              - generic: 🇺🇸 EN
          - button:
            - generic:
              - generic: EU
    - main:
      - generic:
        - generic:
          - img
        - heading [level=2]: No routines yet
        - paragraph: Start tracking by adding your first routine. You can create daily, weekly, or monthly routines.
        - link:
          - /url: /dashboard
          - text: Add Your First Routine
  - region "Notifications alt+T"
  - generic [ref=e5] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e6]:
      - img [ref=e7]
    - generic [ref=e10]:
      - button "Open issues overlay" [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: "0"
          - generic [ref=e14]: "1"
        - generic [ref=e15]: Issue
      - button "Collapse issues badge" [ref=e16]:
        - img [ref=e17]
  - alert
  - dialog "Welcome! 🌟" [ref=e20]:
    - generic [ref=e21]:
      - button [active] [ref=e22] [cursor=pointer]:
        - img
      - heading "Welcome! 🌟" [level=2] [ref=e24]:
        - img [ref=e25]
        - text: Welcome! 🌟
      - paragraph [ref=e27]: Let us show you how to get the most out of Zenith.
    - generic [ref=e34]:
      - img [ref=e36]
      - generic [ref=e38]:
        - heading "Create Your First Routine" [level=3] [ref=e39]
        - paragraph [ref=e40]: Tap the + button to add a daily, weekly, or monthly habit you want to track.
    - generic [ref=e41]:
      - button "Back" [disabled]:
        - img
        - text: Back
      - button "Next" [ref=e42] [cursor=pointer]:
        - text: Next
        - img
    - paragraph [ref=e44]:
      - img [ref=e45]
      - text: Complete the tour to earn 50 Coins + Explorer badge!
    - button "Close" [ref=e50] [cursor=pointer]:
      - img [ref=e51]
      - generic [ref=e54]: Close
```

# Test source

```ts
  1   | /**
  2   |  * Senaryo 1 — Rutin Yaşam Döngüsü
  3   |  *
  4   |  * 1. Rutin oluştur (form aç → doldur → kaydet)
  5   |  * 2. Rutin check-in yap ve tamamlandığını doğrula
  6   |  * 3. Spam-click güvenliği: aynı rutin aynı periyotta 2× check-in kabul etmemeli
  7   |  */
  8   | 
  9   | import { test, expect } from "@playwright/test";
  10  | import path from "path";
  11  | 
  12  | const STORAGE_STATE = path.join(__dirname, "fixtures/storage-state-userA.json");
  13  | const LOCALE = process.env.E2E_LOCALE ?? "en";
  14  | 
  15  | test.use({ storageState: STORAGE_STATE });
  16  | 
  17  | test.describe.serial("Routine lifecycle", () => {
  18  |   const routineName = `E2E Routine ${Date.now()}`;
  19  | 
  20  |   test("dashboard loads for authenticated user", async ({ page }) => {
  21  |     await page.goto(`/${LOCALE}/dashboard`);
  22  |     await expect(page).not.toHaveURL(/login/);
  23  |     // Nav header should be visible
  24  |     await expect(page.locator("header")).toBeVisible();
  25  |   });
  26  | 
  27  |   test("can create a new routine", async ({ page }) => {
  28  |     await page.goto(`/${LOCALE}/dashboard`);
  29  | 
  30  |     // data-testid ile ikon-buton sorunu aşılır (i18n ve ikon tasarımından bağımsız)
  31  |     const addBtn = page.getByTestId("add-routine-btn").first();
> 32  |     await expect(addBtn).toBeVisible({ timeout: 10_000 });
      |                          ^ Error: expect(locator).toBeVisible() failed
  33  |     await addBtn.click();
  34  | 
  35  |     // Fill in the routine name field
  36  |     const nameInput = page.getByLabel(/name|ad|isim/i).first();
  37  |     await expect(nameInput).toBeVisible({ timeout: 5_000 });
  38  |     await nameInput.fill(routineName);
  39  | 
  40  |     // Submit the form
  41  |     const submitBtn = page
  42  |       .getByRole("button", { name: /save|create|kaydet|oluştur/i })
  43  |       .last();
  44  |     await submitBtn.click();
  45  | 
  46  |     // New routine should appear in the list
  47  |     await expect(
  48  |       page.getByText(routineName, { exact: false })
  49  |     ).toBeVisible({ timeout: 10_000 });
  50  |   });
  51  | 
  52  |   test("can check-in on the created routine", async ({ page }) => {
  53  |     await page.goto(`/${LOCALE}/dashboard`);
  54  | 
  55  |     // Find the routine card by name
  56  |     const routineCard = page
  57  |       .locator("[data-testid='routine-card'], article, li")
  58  |       .filter({ hasText: routineName })
  59  |       .first();
  60  |     await expect(routineCard).toBeVisible({ timeout: 10_000 });
  61  | 
  62  |     // Click the check-in / complete button inside the card
  63  |     const checkBtn = routineCard.getByRole("button", {
  64  |       name: /check.?in|complete|done|tamamla/i,
  65  |     });
  66  |     await checkBtn.click();
  67  | 
  68  |     // Expect a success indicator: completed state, toast, or XP gain
  69  |     await expect(
  70  |       page.locator("[data-state='completed'], [aria-label*='completed'], .text-green, [class*='complete']")
  71  |         .or(page.locator(".toaster, [data-sonner-toast]"))
  72  |     ).toBeVisible({ timeout: 8_000 });
  73  |   });
  74  | 
  75  |   test("duplicate check-in in same period is rejected", async ({ page }) => {
  76  |     await page.goto(`/${LOCALE}/dashboard`);
  77  | 
  78  |     const routineCard = page
  79  |       .locator("[data-testid='routine-card'], article, li")
  80  |       .filter({ hasText: routineName })
  81  |       .first();
  82  |     await expect(routineCard).toBeVisible({ timeout: 10_000 });
  83  | 
  84  |     const checkBtn = routineCard.getByRole("button", {
  85  |       name: /check.?in|complete|done|tamamla/i,
  86  |     });
  87  | 
  88  |     // Button should be disabled or show "already done" state
  89  |     const isDisabled = await checkBtn.isDisabled().catch(() => true);
  90  |     if (!isDisabled) {
  91  |       // If still clickable, a second click should produce an error toast
  92  |       await checkBtn.click();
  93  |       await expect(
  94  |         page.locator("[data-sonner-toast][data-type='error'], [role='alert']")
  95  |       ).toBeVisible({ timeout: 6_000 });
  96  |     } else {
  97  |       expect(isDisabled).toBe(true);
  98  |     }
  99  |   });
  100 | });
  101 | 
```