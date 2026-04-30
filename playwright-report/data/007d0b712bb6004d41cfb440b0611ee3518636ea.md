# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: routine.spec.ts >> Routine lifecycle >> can create a new routine
- Location: tests\routine.spec.ts:18:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog').locator('input:not([type="hidden"])').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('dialog').locator('input:not([type="hidden"])').first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "Zenith ZENITH" [ref=e5] [cursor=pointer]:
          - /url: /en/dashboard
          - img "Zenith" [ref=e7]
          - generic [ref=e8]: ZENITH
        - navigation [ref=e9]:
          - link "My Routines" [ref=e10] [cursor=pointer]:
            - /url: /en/dashboard
          - link "Marketplace" [ref=e11] [cursor=pointer]:
            - /url: /en/marketplace
          - link "Social" [ref=e12] [cursor=pointer]:
            - /url: /en/social
          - link "Leaderboard" [ref=e13] [cursor=pointer]:
            - /url: /en/leaderboard
          - link "Settings" [ref=e14] [cursor=pointer]:
            - /url: /en/settings
        - generic [ref=e15]:
          - button "Add Routine" [active] [ref=e16] [cursor=pointer]:
            - img
            - generic [ref=e17]: New
          - button "Shop" [ref=e18] [cursor=pointer]:
            - img
            - generic [ref=e19]: "50"
          - button "Badges" [ref=e20] [cursor=pointer]:
            - img
          - button "English" [ref=e22] [cursor=pointer]:
            - img
            - generic [ref=e23]: 🇺🇸 EN
          - button "EU" [ref=e24] [cursor=pointer]:
            - generic [ref=e26]: EU
    - main [ref=e27]:
      - paragraph [ref=e28]: “The obstacle is the way.”
      - generic [ref=e34]:
        - application [ref=e37]
        - generic:
          - generic: 0%
      - generic [ref=e41]:
        - generic [ref=e43]:
          - generic [ref=e44]:
            - generic [ref=e45]:
              - img [ref=e47]
              - generic [ref=e49]:
                - generic [ref=e50]: Level 1
                - generic [ref=e51]: â€¢ Apprentice
            - generic [ref=e52]:
              - img [ref=e53]
              - generic [ref=e55]: 100 XP remaining
          - generic [ref=e58]:
            - generic [ref=e59]:
              - text: "0"
              - generic [ref=e60]: / 100 XP
            - generic [ref=e61]: 0%
        - button "AI Coach" [ref=e63] [cursor=pointer]:
          - img
      - generic [ref=e64]:
        - generic [ref=e65]:
          - generic [ref=e66]:
            - heading "My Routines" [level=1] [ref=e67]
            - paragraph [ref=e68]: Track your daily habits
          - button "+ Add Routine" [ref=e69] [cursor=pointer]
        - generic [ref=e70]:
          - generic [ref=e71]: ✓
          - generic [ref=e72]:
            - paragraph [ref=e73]: No routines yet
            - paragraph [ref=e74]: Start tracking by adding your first routine.
          - button "Add First Routine" [ref=e75] [cursor=pointer]
  - region "Notifications alt+T"
  - generic [ref=e80] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e81]:
      - img [ref=e82]
    - generic [ref=e85]:
      - button "Open issues overlay" [ref=e86]:
        - generic [ref=e87]:
          - generic [ref=e88]: "0"
          - generic [ref=e89]: "1"
        - generic [ref=e90]: Issue
      - button "Collapse issues badge" [ref=e91]:
        - img [ref=e92]
  - alert [ref=e94]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import path from "path";
  3   | 
  4   | const STORAGE_STATE = path.join(__dirname, "fixtures/storage-state-userA.json");
  5   | const LOCALE = process.env.E2E_LOCALE ?? "en";
  6   | 
  7   | test.use({ storageState: STORAGE_STATE });
  8   | 
  9   | test.describe.serial("Routine lifecycle", () => {
  10  |   const routineName = `E2E Routine ${Date.now()}`;
  11  | 
  12  |   test("dashboard loads for authenticated user", async ({ page }) => {
  13  |     await page.goto(`/${LOCALE}/dashboard`);
  14  |     await expect(page).not.toHaveURL(/login/);
  15  |     await expect(page.locator("header")).toBeVisible();
  16  |   });
  17  | 
  18  |   test("can create a new routine", async ({ page }) => {
  19  |     await page.goto(`/${LOCALE}/dashboard`);
  20  | 
  21  |     // 1. Hydration bekle
  22  |     await expect(page.locator("main")).toBeVisible();
  23  | 
  24  |     // 2. Onboarding modalını güvenle kapat
  25  |     const closeTourBtn = page.getByRole("button", { name: /close|kapat/i }).first();
  26  |     try {
  27  |       await closeTourBtn.waitFor({ state: "visible", timeout: 5000 });
  28  |       await closeTourBtn.click({ force: true });
  29  |       await expect(closeTourBtn).not.toBeVisible();
  30  |     } catch (e) {
  31  |       /* Modal yoksa devam et */
  32  |     }
  33  | 
  34  |     // 3. Formu aç
  35  |     await page.getByTestId("add-routine-btn").click();
  36  | 
  37  |     // 4. Input'u doldur (Sadece dialog içindekini hedefle)
  38  |     const nameInput = page.getByRole("dialog").locator('input:not([type="hidden"])').first();
> 39  |     await expect(nameInput).toBeVisible({ timeout: 10_000 });
      |                             ^ Error: expect(locator).toBeVisible() failed
  40  |     await nameInput.fill(routineName);
  41  | 
  42  |     // --- KRİTİK DÜZELTME ---
  43  |     // POST /api/routines isteğini yakala. Status 200 VEYA 201 kabul et.
  44  |     // .catch() ile yutmuyoruz; timeout olursa test patlasın ki sahte yeşil görmeyelim.
  45  |     const createRoutinePromise = page.waitForResponse(
  46  |       (response) =>
  47  |         /\/api\/v1\/routines(\?|$|\/)/.test(response.url()) &&
  48  |         response.request().method() === "POST" &&
  49  |         response.status() >= 200 &&
  50  |         response.status() < 300,
  51  |       { timeout: 15_000 }
  52  |     );
  53  | 
  54  |     // 5. Kaydet
  55  |     await page
  56  |       .getByRole("button", { name: /save|create|kaydet|oluştur/i })
  57  |       .last()
  58  |       .click();
  59  | 
  60  |     // Sunucu yanıtını bekle - başarısız olursa test burada düşsün
  61  |     const response = await createRoutinePromise;
  62  |     expect(response.ok()).toBeTruthy();
  63  | 
  64  |     // 6. UI'da görünür olduğunu doğrula
  65  |     await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 10_000 });
  66  | 
  67  |     // 7. Sayfayı yenile - routine'in GERÇEKTEN persist edildiğini doğrula
  68  |     // (Optimistic UI ile false-positive'i engeller)
  69  |     await page.reload();
  70  |     await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });
  71  |   });
  72  | 
  73  |   test("can check-in on the created routine", async ({ page }) => {
  74  |     await page.goto(`/${LOCALE}/dashboard`);
  75  | 
  76  |     // networkidle yerine domcontentloaded + explicit wait kullan
  77  |     await page.waitForLoadState("domcontentloaded");
  78  | 
  79  |     // Önce ismin görünmesini bekle (API senkronizasyonu için kritik)
  80  |     await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });
  81  | 
  82  |     const routineCard = page
  83  |       .locator("[data-testid='routine-card'], article, li")
  84  |       .filter({ hasText: routineName })
  85  |       .first();
  86  | 
  87  |     await expect(routineCard).toBeVisible({ timeout: 5_000 });
  88  | 
  89  |     const checkBtn = routineCard.getByRole("button", {
  90  |       name: /check.?in|complete|done|tamamla/i,
  91  |     });
  92  |     await expect(checkBtn).toBeVisible();
  93  |     await checkBtn.click();
  94  | 
  95  |     await expect(
  96  |       page
  97  |         .locator("[data-state='completed'], [aria-label*='completed'], .text-green")
  98  |         .or(page.locator("[data-sonner-toast]"))
  99  |     ).toBeVisible({ timeout: 8_000 });
  100 |   });
  101 | 
  102 |   test("duplicate check-in in same period is rejected", async ({ page }) => {
  103 |     await page.goto(`/${LOCALE}/dashboard`);
  104 | 
  105 |     await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });
  106 | 
  107 |     const routineCard = page
  108 |       .locator("[data-testid='routine-card'], article, li")
  109 |       .filter({ hasText: routineName })
  110 |       .first();
  111 | 
  112 |     const checkBtn = routineCard.getByRole("button", {
  113 |       name: /check.?in|complete|done|tamamla/i,
  114 |     });
  115 | 
  116 |     const isDisabled = await checkBtn.isDisabled().catch(() => true);
  117 |     if (!isDisabled) {
  118 |       await checkBtn.click();
  119 |       await expect(page.locator("[data-sonner-toast][data-type='error']")).toBeVisible();
  120 |     } else {
  121 |       expect(isDisabled).toBe(true);
  122 |     }
  123 |   });
  124 | });
```