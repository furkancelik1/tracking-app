# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: routine.spec.ts >> Routine lifecycle >> duplicate check-in in same period is rejected
- Location: tests\routine.spec.ts:115:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-sonner-toast][data-type=\'error\']')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('[data-sonner-toast][data-type=\'error\']')

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
            - generic [ref=e19]: "60"
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
          - generic: 100%
      - generic [ref=e46]:
        - generic [ref=e48]:
          - generic [ref=e49]:
            - generic [ref=e50]:
              - img [ref=e52]
              - generic [ref=e54]:
                - generic [ref=e55]: Level 1
                - generic [ref=e56]: â€¢ Apprentice
            - generic [ref=e57]:
              - img [ref=e58]
              - generic [ref=e60]: 90 XP remaining
          - generic [ref=e64]:
            - generic [ref=e65]:
              - text: "10"
              - generic [ref=e66]: / 100 XP
            - generic [ref=e67]: 10%
        - button "AI Coach" [ref=e69] [cursor=pointer]:
          - img
      - generic [ref=e70]:
        - generic [ref=e71]:
          - generic [ref=e72]:
            - heading "My Routines" [level=1] [ref=e73]
            - paragraph [ref=e74]: Track your daily habits
          - button "+ Add Routine" [ref=e75] [cursor=pointer]
        - generic [ref=e77]:
          - generic [ref=e78]: Today's progress
          - generic [ref=e79]: 1/1 completed
        - generic [ref=e84]:
          - generic [ref=e85]:
            - button "E2E Routine 1777563197788 Genel Medium 0 min" [ref=e86] [cursor=pointer]:
              - img [ref=e88]
              - generic [ref=e91]:
                - paragraph [ref=e92]: E2E Routine 1777563197788
                - paragraph [ref=e93]: Genel
                - generic [ref=e94]:
                  - generic [ref=e95]:
                    - img [ref=e96]
                    - text: Medium
                  - generic [ref=e98]:
                    - img [ref=e99]
                    - text: 0 min
            - button [ref=e102] [cursor=pointer]:
              - img
          - generic [ref=e103]:
            - generic [ref=e104]:
              - img [ref=e105]
              - generic [ref=e107]: 1 days
            - generic [ref=e108]: Daily
            - generic [ref=e109]: Completed 1 times total
          - button "Undo" [ref=e110] [cursor=pointer]:
            - img
            - text: Undo
        - generic:
          - generic:
            - generic:
              - img
            - generic:
              - paragraph: Rozet KazandÄ±n!
              - paragraph: First Step
  - region "Notifications alt+T"
  - generic [ref=e115] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e116]:
      - img [ref=e117]
    - generic [ref=e120]:
      - button "Open issues overlay" [ref=e121]:
        - generic [ref=e122]:
          - generic [ref=e123]: "0"
          - generic [ref=e124]: "1"
        - generic [ref=e125]: Issue
      - button "Collapse issues badge" [ref=e126]:
        - img [ref=e127]
  - alert [ref=e129]
```

# Test source

```ts
  32  |     }
  33  | 
  34  |     // 3. RoutineList'in mount olmasını bekle — dynamic import yüzünden
  35  |     // event listener, bileşen mount olmadan önce register edilmez.
  36  |     // "My Routines" h1'i görününce listener hazır demektir.
  37  |     await expect(
  38  |       page.locator("h1").filter({ hasText: /my routines|rutinlerim/i })
  39  |     ).toBeVisible({ timeout: 10_000 });
  40  | 
  41  |     // 4. Formu aç
  42  |     await page.getByTestId("add-routine-btn").click();
  43  | 
  44  |     // 5. Dialog'un açıldığını doğrula, tüm lokatörleri dialog scope'unda tut
  45  |     const dialog = page.getByRole("dialog");
  46  |     await expect(dialog).toBeVisible({ timeout: 10_000 });
  47  | 
  48  |     // 6. Input'u doldur — dialog scope'unda ara, page-level tarama yok
  49  |     const nameInput = dialog.locator('input:not([type="hidden"])').first();
  50  |     await expect(nameInput).toBeVisible({ timeout: 5_000 });
  51  |     await nameInput.fill(routineName);
  52  | 
  53  |     // --- KRİTİK DÜZELTME ---
  54  |     // POST /api/v1/routines isteğini yakala. Status 200 VEYA 201 kabul et.
  55  |     // .catch() ile yutmuyoruz; timeout olursa test patlasın ki sahte yeşil görmeyelim.
  56  |     const createRoutinePromise = page.waitForResponse(
  57  |       (response) =>
  58  |         /\/api\/v1\/routines(\?|$|\/)/.test(response.url()) &&
  59  |         response.request().method() === "POST" &&
  60  |         response.status() >= 200 &&
  61  |         response.status() < 300,
  62  |       { timeout: 15_000 }
  63  |     );
  64  | 
  65  |     // 7. Submit butonunu dialog scope'unda bul — .last() deterministik değil
  66  |     const submitBtn = dialog.getByRole("button", { name: /create routine|oluştur|kaydet/i });
  67  |     await expect(submitBtn).toBeEnabled();
  68  |     await submitBtn.click();
  69  | 
  70  |     // Sunucu yanıtını bekle - başarısız olursa test burada düşsün
  71  |     const response = await createRoutinePromise;
  72  |     expect(response.ok()).toBeTruthy();
  73  | 
  74  |     // Dialog kapandığını doğrula — kapanmazsa submit başarısız demektir
  75  |     await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  76  | 
  77  |     // 8. UI'da görünür olduğunu doğrula
  78  |     await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 10_000 });
  79  | 
  80  |     // 9. Sayfayı yenile - routine'in GERÇEKTEN persist edildiğini doğrula
  81  |     // (Optimistic UI ile false-positive'i engeller)
  82  |     await page.reload();
  83  |     await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });
  84  |   });
  85  | 
  86  |   test("can check-in on the created routine", async ({ page }) => {
  87  |     await page.goto(`/${LOCALE}/dashboard`);
  88  | 
  89  |     // networkidle yerine domcontentloaded + explicit wait kullan
  90  |     await page.waitForLoadState("domcontentloaded");
  91  | 
  92  |     // Önce ismin görünmesini bekle (API senkronizasyonu için kritik)
  93  |     await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });
  94  | 
  95  |     const routineCard = page
  96  |       .locator("[data-testid='routine-card'], article, li")
  97  |       .filter({ hasText: routineName })
  98  |       .first();
  99  | 
  100 |     await expect(routineCard).toBeVisible({ timeout: 5_000 });
  101 | 
  102 |     const checkBtn = routineCard.getByRole("button", {
  103 |       name: /check.?in|complete|done|tamamla/i,
  104 |     });
  105 |     await expect(checkBtn).toBeVisible();
  106 |     await checkBtn.click();
  107 | 
  108 |     await expect(
  109 |       page
  110 |         .locator("[data-state='completed'], [aria-label*='completed'], .text-green")
  111 |         .or(page.locator("[data-sonner-toast]"))
  112 |     ).toBeVisible({ timeout: 8_000 });
  113 |   });
  114 | 
  115 |   test("duplicate check-in in same period is rejected", async ({ page }) => {
  116 |     await page.goto(`/${LOCALE}/dashboard`);
  117 | 
  118 |     await expect(page.getByText(routineName).first()).toBeVisible({ timeout: 15_000 });
  119 | 
  120 |     const routineCard = page
  121 |       .locator("[data-testid='routine-card'], article, li")
  122 |       .filter({ hasText: routineName })
  123 |       .first();
  124 | 
  125 |     const checkBtn = routineCard.getByRole("button", {
  126 |       name: /check.?in|complete|done|tamamla/i,
  127 |     });
  128 | 
  129 |     const isDisabled = await checkBtn.isDisabled().catch(() => true);
  130 |     if (!isDisabled) {
  131 |       await checkBtn.click();
> 132 |       await expect(page.locator("[data-sonner-toast][data-type='error']")).toBeVisible();
      |                                                                            ^ Error: expect(locator).toBeVisible() failed
  133 |     } else {
  134 |       expect(isDisabled).toBe(true);
  135 |     }
  136 |   });
  137 | });
```