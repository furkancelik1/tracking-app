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

Locator: getByRole('button', { name: /add|create|new|rutin ekle/i }).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('button', { name: /add|create|new|rutin ekle/i }).first()

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
  30  |     // Open create-routine dialog/form — look for common trigger patterns
  31  |     const addBtn = page
  32  |       .getByRole("button", { name: /add|create|new|rutin ekle/i })
  33  |       .first();
> 34  |     await expect(addBtn).toBeVisible({ timeout: 10_000 });
      |                          ^ Error: expect(locator).toBeVisible() failed
  35  |     await addBtn.click();
  36  | 
  37  |     // Fill in the routine name field
  38  |     const nameInput = page.getByLabel(/name|ad|isim/i).first();
  39  |     await expect(nameInput).toBeVisible({ timeout: 5_000 });
  40  |     await nameInput.fill(routineName);
  41  | 
  42  |     // Submit the form
  43  |     const submitBtn = page
  44  |       .getByRole("button", { name: /save|create|kaydet|oluştur/i })
  45  |       .last();
  46  |     await submitBtn.click();
  47  | 
  48  |     // New routine should appear in the list
  49  |     await expect(
  50  |       page.getByText(routineName, { exact: false })
  51  |     ).toBeVisible({ timeout: 10_000 });
  52  |   });
  53  | 
  54  |   test("can check-in on the created routine", async ({ page }) => {
  55  |     await page.goto(`/${LOCALE}/dashboard`);
  56  | 
  57  |     // Find the routine card by name
  58  |     const routineCard = page
  59  |       .locator("[data-testid='routine-card'], article, li")
  60  |       .filter({ hasText: routineName })
  61  |       .first();
  62  |     await expect(routineCard).toBeVisible({ timeout: 10_000 });
  63  | 
  64  |     // Click the check-in / complete button inside the card
  65  |     const checkBtn = routineCard.getByRole("button", {
  66  |       name: /check.?in|complete|done|tamamla/i,
  67  |     });
  68  |     await checkBtn.click();
  69  | 
  70  |     // Expect a success indicator: completed state, toast, or XP gain
  71  |     await expect(
  72  |       page.locator("[data-state='completed'], [aria-label*='completed'], .text-green, [class*='complete']")
  73  |         .or(page.locator(".toaster, [data-sonner-toast]"))
  74  |     ).toBeVisible({ timeout: 8_000 });
  75  |   });
  76  | 
  77  |   test("duplicate check-in in same period is rejected", async ({ page }) => {
  78  |     await page.goto(`/${LOCALE}/dashboard`);
  79  | 
  80  |     const routineCard = page
  81  |       .locator("[data-testid='routine-card'], article, li")
  82  |       .filter({ hasText: routineName })
  83  |       .first();
  84  |     await expect(routineCard).toBeVisible({ timeout: 10_000 });
  85  | 
  86  |     const checkBtn = routineCard.getByRole("button", {
  87  |       name: /check.?in|complete|done|tamamla/i,
  88  |     });
  89  | 
  90  |     // Button should be disabled or show "already done" state
  91  |     const isDisabled = await checkBtn.isDisabled().catch(() => true);
  92  |     if (!isDisabled) {
  93  |       // If still clickable, a second click should produce an error toast
  94  |       await checkBtn.click();
  95  |       await expect(
  96  |         page.locator("[data-sonner-toast][data-type='error'], [role='alert']")
  97  |       ).toBeVisible({ timeout: 6_000 });
  98  |     } else {
  99  |       expect(isDisabled).toBe(true);
  100 |     }
  101 |   });
  102 | });
  103 | 
```