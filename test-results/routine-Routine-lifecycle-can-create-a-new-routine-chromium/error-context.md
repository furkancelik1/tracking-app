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

Locator: getByPlaceholder(/routine name|rutin adı/i).or(getByRole('textbox', { name: /^name$|^ad$|^isim$/i })).first()
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 7000ms
  - waiting for getByPlaceholder(/routine name|rutin adı/i).or(getByRole('textbox', { name: /^name$|^ad$|^isim$/i })).first()

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
  30  |     // 1. Eğer "Welcome Tour" açık kalırsa kapat
  31  |     const closeTourBtn = page.getByRole("button", { name: /close|kapat/i }).first();
  32  |     if (await closeTourBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  33  |       await closeTourBtn.click();
  34  |       // Animasyonun bitip modalın ekrandan tamamen kaybolmasını bekle
  35  |       await expect(closeTourBtn).not.toBeVisible(); 
  36  |     }
  37  | 
  38  |     // 2. ÖNEMLİ: Formu açmak için "Ekle" butonuna veya "Add Your First Routine" linkine TIKLA
  39  |     const openFormBtn = page
  40  |       .getByRole("link", { name: /add your first routine|ilk rutini/i })
  41  |       .or(page.getByTestId("add-routine-btn"))
  42  |       .first();
  43  |     
  44  |     await expect(openFormBtn).toBeVisible({ timeout: 10_000 });
  45  |     await openFormBtn.click(); // EKSİK OLAN KISIM BURASIYDI: Formu açar.
  46  | 
  47  |     // 3. Form açıldıktan sonra input'u bul ve doldur
  48  |     const nameInput = page.getByPlaceholder(/routine name|rutin adı/i)
  49  |       .or(page.getByRole("textbox", { name: /^name$|^ad$|^isim$/i }))
  50  |       .first();
  51  |       
> 52  |     await expect(nameInput).toBeVisible({ timeout: 7_000 });
      |                             ^ Error: expect(locator).toBeVisible() failed
  53  |     await nameInput.fill(routineName);
  54  | 
  55  |     // 4. Submit the form
  56  |     const submitBtn = page
  57  |       .getByRole("button", { name: /save|create|kaydet|oluştur/i })
  58  |       .last();
  59  |     await submitBtn.click();
  60  | 
  61  |     // 5. New routine should appear in the list
  62  |     await expect(
  63  |       page.getByText(routineName, { exact: false })
  64  |     ).toBeVisible({ timeout: 10_000 });
  65  |   });
  66  | 
  67  |   test("can check-in on the created routine", async ({ page }) => {
  68  |     await page.goto(`/${LOCALE}/dashboard`);
  69  | 
  70  |     // Find the routine card by name
  71  |     const routineCard = page
  72  |       .locator("[data-testid='routine-card'], article, li")
  73  |       .filter({ hasText: routineName })
  74  |       .first();
  75  |     await expect(routineCard).toBeVisible({ timeout: 10_000 });
  76  | 
  77  |     // Click the check-in / complete button inside the card
  78  |     const checkBtn = routineCard.getByRole("button", {
  79  |       name: /check.?in|complete|done|tamamla/i,
  80  |     });
  81  |     await checkBtn.click();
  82  | 
  83  |     // Expect a success indicator: completed state, toast, or XP gain
  84  |     await expect(
  85  |       page.locator("[data-state='completed'], [aria-label*='completed'], .text-green, [class*='complete']")
  86  |         .or(page.locator(".toaster, [data-sonner-toast]"))
  87  |     ).toBeVisible({ timeout: 8_000 });
  88  |   });
  89  | 
  90  |   test("duplicate check-in in same period is rejected", async ({ page }) => {
  91  |     await page.goto(`/${LOCALE}/dashboard`);
  92  | 
  93  |     const routineCard = page
  94  |       .locator("[data-testid='routine-card'], article, li")
  95  |       .filter({ hasText: routineName })
  96  |       .first();
  97  |     await expect(routineCard).toBeVisible({ timeout: 10_000 });
  98  | 
  99  |     const checkBtn = routineCard.getByRole("button", {
  100 |       name: /check.?in|complete|done|tamamla/i,
  101 |     });
  102 | 
  103 |     // Button should be disabled or show "already done" state
  104 |     const isDisabled = await checkBtn.isDisabled().catch(() => true);
  105 |     if (!isDisabled) {
  106 |       // If still clickable, a second click should produce an error toast
  107 |       await checkBtn.click();
  108 |       await expect(
  109 |         page.locator("[data-sonner-toast][data-type='error'], [role='alert']")
  110 |       ).toBeVisible({ timeout: 6_000 });
  111 |     } else {
  112 |       expect(isDisabled).toBe(true);
  113 |     }
  114 |   });
  115 | });
```