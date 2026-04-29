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

Locator: locator('dialog input, [role="dialog"] input, input').first()
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 7000ms
  - waiting for locator('dialog input, [role="dialog"] input, input').first()

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
            - generic: New
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
  30  |     // 1. Eğer "Welcome Tour" açık kalırsa kapat ve kaybolmasını bekle
  31  |     const closeTourBtn = page.getByRole("button", { name: /close|kapat/i }).first();
  32  |     if (await closeTourBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  33  |       await closeTourBtn.click();
  34  |       await expect(closeTourBtn).not.toBeVisible(); 
  35  |     }
  36  |     // 2. Formu açmak için doğrudan "+" veya "Add" butonunu hedefle
  37  |     const openFormBtn = page.getByTestId("add-routine-btn")
  38  |       .or(page.getByRole("button", { name: /add|ekle|\+/i }))
  39  |       .first();
  40  |       
  41  |     await expect(openFormBtn).toBeVisible({ timeout: 10_000 });
  42  |     await openFormBtn.click(); 
  43  | 
  44  |     // 3. Form (Modal) açıldıktan sonra ilk input alanını bul ve doldur
  45  |     const nameInput = page.locator('dialog input, [role="dialog"] input, input').first();
  46  |       
> 47  |     await expect(nameInput).toBeVisible({ timeout: 7_000 });
      |                             ^ Error: expect(locator).toBeVisible() failed
  48  |     await nameInput.fill(routineName);
  49  |     // 4. Kaydet butonuna tıkla
  50  |     const submitBtn = page
  51  |       .getByRole("button", { name: /save|create|kaydet|oluştur/i })
  52  |       .last();
  53  |     await submitBtn.click();
  54  | 
  55  |     // 5. Yeni rutinin listede göründüğünü onayla
  56  |     await expect(
  57  |       page.getByText(routineName, { exact: false })
  58  |     ).toBeVisible({ timeout: 10_000 });
  59  |   });
  60  | 
  61  |   test("can check-in on the created routine", async ({ page }) => {
  62  |     await page.goto(`/${LOCALE}/dashboard`);
  63  | 
  64  |     // Find the routine card by name
  65  |     const routineCard = page
  66  |       .locator("[data-testid='routine-card'], article, li")
  67  |       .filter({ hasText: routineName })
  68  |       .first();
  69  |     await expect(routineCard).toBeVisible({ timeout: 10_000 });
  70  | 
  71  |     // Click the check-in / complete button inside the card
  72  |     const checkBtn = routineCard.getByRole("button", {
  73  |       name: /check.?in|complete|done|tamamla/i,
  74  |     });
  75  |     await checkBtn.click();
  76  | 
  77  |     // Expect a success indicator: completed state, toast, or XP gain
  78  |     await expect(
  79  |       page.locator("[data-state='completed'], [aria-label*='completed'], .text-green, [class*='complete']")
  80  |         .or(page.locator(".toaster, [data-sonner-toast]"))
  81  |     ).toBeVisible({ timeout: 8_000 });
  82  |   });
  83  | 
  84  |   test("duplicate check-in in same period is rejected", async ({ page }) => {
  85  |     await page.goto(`/${LOCALE}/dashboard`);
  86  | 
  87  |     const routineCard = page
  88  |       .locator("[data-testid='routine-card'], article, li")
  89  |       .filter({ hasText: routineName })
  90  |       .first();
  91  |     await expect(routineCard).toBeVisible({ timeout: 10_000 });
  92  | 
  93  |     const checkBtn = routineCard.getByRole("button", {
  94  |       name: /check.?in|complete|done|tamamla/i,
  95  |     });
  96  | 
  97  |     // Button should be disabled or show "already done" state
  98  |     const isDisabled = await checkBtn.isDisabled().catch(() => true);
  99  |     if (!isDisabled) {
  100 |       // If still clickable, a second click should produce an error toast
  101 |       await checkBtn.click();
  102 |       await expect(
  103 |         page.locator("[data-sonner-toast][data-type='error'], [role='alert']")
  104 |       ).toBeVisible({ timeout: 6_000 });
  105 |     } else {
  106 |       expect(isDisabled).toBe(true);
  107 |     }
  108 |   });
  109 | });
```