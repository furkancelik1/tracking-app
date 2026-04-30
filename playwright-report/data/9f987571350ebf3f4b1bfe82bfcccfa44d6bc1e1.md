# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: routine.spec.ts >> Routine lifecycle >> can check-in on the created routine
- Location: tests\routine.spec.ts:61:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('E2E Routine 1777560116248').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('E2E Routine 1777560116248').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
          - button "Add Routine" [ref=e16] [cursor=pointer]:
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
  10  |   // Değişken tüm testler için describe bloğunun başında tanımlanır
  11  |   const routineName = `E2E Routine ${Date.now()}`;
  12  | 
  13  |   test("dashboard loads for authenticated user", async ({ page }) => {
  14  |     await page.goto(`/${LOCALE}/dashboard`);
  15  |     await expect(page).not.toHaveURL(/login/);
  16  |     await expect(page.locator("header")).toBeVisible();
  17  |   });
  18  | 
  19  |   test("can create a new routine", async ({ page }) => {
  20  |     await page.goto(`/${LOCALE}/dashboard`);
  21  | 
  22  |     // 1. Hydration bekle
  23  |     await expect(page.locator("main")).toBeVisible();
  24  | 
  25  |     // 2. Onboarding modalını güvenle kapat
  26  |     const closeTourBtn = page.getByRole("button", { name: /close|kapat/i }).first();
  27  |     try {
  28  |       await closeTourBtn.waitFor({ state: "visible", timeout: 5000 });
  29  |       await closeTourBtn.click({ force: true });
  30  |       await expect(closeTourBtn).not.toBeVisible(); 
  31  |     } catch (e) { /* Modal yoksa devam et */ }
  32  | 
  33  |     // 3. Formu aç
  34  |     await page.getByTestId("add-routine-btn").click();
  35  | 
  36  |     // 4. Input'u doldur (Sadece dialog içindekini hedefle)
  37  |     const nameInput = page.getByRole("dialog").locator('input:not([type="hidden"])').first();
  38  |     await expect(nameInput).toBeVisible({ timeout: 10_000 });
  39  |     await nameInput.fill(routineName);
  40  | 
  41  |     // --- KRİTİK DÜZELTME: API YANITINI BEKLEME ---
  42  |     // Kaydet butonuna basmadan önce API dinleyicisini başlatıyoruz
  43  |     const createRoutinePromise = page.waitForResponse(
  44  |       (response) => response.url().includes('/api') && response.status() === 200,
  45  |       { timeout: 15_000 }
  46  |     ).catch(() => console.log('API yanıtı zaman aşımına uğradı, UI üzerinden devam ediliyor.'));
  47  | 
  48  |     // 5. Kaydet
  49  |     await page.getByRole("button", { name: /save|create|kaydet|oluştur/i }).last().click();
  50  | 
  51  |     // Sunucunun kaydetme işlemini tamamen bitirmesini bekle
  52  |     await createRoutinePromise;
  53  | 
  54  |     // 6. Doğrula
  55  |     await expect(page.getByText(routineName)).toBeVisible({ timeout: 10_000 });
  56  | 
  57  |     // Next.js Router Cache'in kendini yenilemesi için küçük bir güvenlik tamponu (1 saniye)
  58  |     await page.waitForTimeout(1000); 
  59  |   });
  60  | 
  61  |   test("can check-in on the created routine", async ({ page }) => {
  62  |     await page.goto(`/${LOCALE}/dashboard`);
  63  | 
  64  |     // Önce ismin görünmesini bekle (API senkronizasyonu için kritik)
> 65  |     await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });
      |                                                       ^ Error: expect(locator).toBeVisible() failed
  66  | 
  67  |     const routineCard = page
  68  |       .locator("[data-testid='routine-card'], article, li")
  69  |       .filter({ hasText: routineName })
  70  |       .first();
  71  | 
  72  |     const checkBtn = routineCard.getByRole("button", { name: /check.?in|complete|done|tamamla/i });
  73  |     await checkBtn.click();
  74  | 
  75  |     await expect(
  76  |       page.locator("[data-state='completed'], [aria-label*='completed'], .text-green")
  77  |         .or(page.locator("[data-sonner-toast]"))
  78  |     ).toBeVisible({ timeout: 8_000 });
  79  |   });
  80  | 
  81  |   test("duplicate check-in in same period is rejected", async ({ page }) => {
  82  |     await page.goto(`/${LOCALE}/dashboard`);
  83  | 
  84  |     // Elementin ekranda olduğunu garantilemek için bekle
  85  |     await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });
  86  | 
  87  |     const routineCard = page
  88  |       .locator("[data-testid='routine-card'], article, li")
  89  |       .filter({ hasText: routineName })
  90  |       .first();
  91  | 
  92  |     const checkBtn = routineCard.getByRole("button", { name: /check.?in|complete|done|tamamla/i });
  93  | 
  94  |     const isDisabled = await checkBtn.isDisabled().catch(() => true);
  95  |     if (!isDisabled) {
  96  |       await checkBtn.click();
  97  |       await expect(page.locator("[data-sonner-toast][data-type='error']")).toBeVisible();
  98  |     } else {
  99  |       expect(isDisabled).toBe(true);
  100 |     }
  101 |   });
  102 | });
```