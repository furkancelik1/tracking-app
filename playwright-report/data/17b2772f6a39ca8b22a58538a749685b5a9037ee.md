# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: monetization.spec.ts >> Stats page — PRO user (ProGate bypassed) >> PRO badge is visible in nav dropdown
- Location: tests\monetization.spec.ts:117:7

# Error details

```
Test timeout of 35000ms exceeded.
```

```
Error: locator.click: Test timeout of 35000ms exceeded.
Call log:
  - waiting for locator('header button .rounded-full, header button [class*=\'Avatar\']').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - heading "My Statistics" [level=1] [ref=e7]
        - paragraph [ref=e8]: Analyze your habit data and visualize your progress.
      - button "Share Weekly Summary" [ref=e9] [cursor=pointer]:
        - img
        - text: Share Weekly Summary
    - generic [ref=e10]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: Total Completions
          - img [ref=e16]
        - generic [ref=e19]:
          - generic [ref=e21]: "0"
          - paragraph [ref=e22]: Last 30 days
      - generic [ref=e24]:
        - generic [ref=e25]:
          - generic [ref=e26]: Current Streak
          - img [ref=e28]
        - generic [ref=e30]:
          - generic [ref=e32]: 0 days
          - paragraph [ref=e33]: "Longest: 0 days"
      - generic [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]: Monthly Success Rate
          - img [ref=e39]
        - generic [ref=e42]:
          - generic [ref=e44]: "%0"
          - paragraph [ref=e45]: Active day rate in last 30 days
      - generic [ref=e47]:
        - generic [ref=e48]:
          - generic [ref=e49]: Active Routines
          - img [ref=e51]
        - generic [ref=e53]:
          - generic [ref=e55]: "0"
          - paragraph [ref=e56]: Avg. 0/day
    - tablist [ref=e58]:
      - tab "Son 7 GÃ¼n" [ref=e59] [cursor=pointer]
      - tab "Son 30 GÃ¼n" [selected] [ref=e60] [cursor=pointer]
      - tab "TÃ¼m Zamanlar" [ref=e61] [cursor=pointer]
    - generic [ref=e62]:
      - generic [ref=e64]:
        - generic [ref=e66]:
          - generic [ref=e67]:
            - generic [ref=e68]: Aktivite Trendi
            - generic [ref=e69]: Son 30 günlük tamamlama grafiği
          - generic [ref=e70]:
            - generic [ref=e71]:
              - paragraph [ref=e72]: "0"
              - paragraph [ref=e73]: Toplam
            - generic [ref=e74]:
              - paragraph [ref=e75]: "0.0"
              - paragraph [ref=e76]: Ort/gün
        - application [ref=e81]:
          - generic [ref=e85]:
            - generic [ref=e86]:
              - generic [ref=e88]: 31 Mar
              - generic [ref=e90]: 04 Nis
              - generic [ref=e92]: 08 Nis
              - generic [ref=e94]: 12 Nis
              - generic [ref=e96]: 16 Nis
              - generic [ref=e98]: 20 Nis
              - generic [ref=e100]: 24 Nis
              - generic [ref=e102]: 28 Nis
            - generic [ref=e103]:
              - generic [ref=e105]: "0"
              - generic [ref=e107]: "1"
              - generic [ref=e109]: "2"
              - generic [ref=e111]: "3"
              - generic [ref=e113]: "4"
      - generic [ref=e115]:
        - generic [ref=e118]:
          - generic [ref=e119]: Kategori Dağılımı
          - generic [ref=e120]: Son 30 günde tamamlamalar
        - generic [ref=e122]: Henüz kategori verisi yok
    - generic [ref=e123]:
      - generic [ref=e124]:
        - generic [ref=e125]:
          - img [ref=e126]
          - generic [ref=e130]: Completion Rate
        - generic [ref=e131]:
          - paragraph [ref=e132]: "%0"
          - paragraph [ref=e133]: Rate of days with at least 1 completion in last 30 days
      - generic [ref=e134]:
        - generic [ref=e135]:
          - img [ref=e136]
          - generic [ref=e138]: Peak Day
        - generic [ref=e139]:
          - paragraph [ref=e140]: Pazartesi
          - paragraph [ref=e141]: Most active day with 0 completions
      - generic [ref=e142]:
        - generic [ref=e143]:
          - img [ref=e144]
          - generic [ref=e146]: Daily Average
        - generic [ref=e147]:
          - paragraph [ref=e148]: "0"
          - paragraph [ref=e149]: Average routines completed per day
    - generic [ref=e151]:
      - generic [ref=e153]: Yıllık Aktivite
      - generic [ref=e155]:
        - img [ref=e157]
        - paragraph [ref=e159]: Henüz çok başındasın, ilk kareyi boyamaya ne dersin?
        - paragraph [ref=e160]: Rutinlerini tamamladıkça bu harita yeşillenecek. Her gün bir kare, her kare bir adım!
    - generic [ref=e164]:
      - generic [ref=e165]:
        - generic [ref=e166]: Weekly Consistency
        - generic [ref=e167]: Completion distribution by day of week
      - generic [ref=e169]: No weekday data yet
  - region "Notifications alt+T"
  - generic [ref=e175] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e176]:
      - img [ref=e177]
    - generic [ref=e180]:
      - button "Open issues overlay" [ref=e181]:
        - generic [ref=e182]:
          - generic [ref=e183]: "0"
          - generic [ref=e184]: "1"
        - generic [ref=e185]: Issue
      - button "Collapse issues badge" [ref=e186]:
        - img [ref=e187]
  - alert [ref=e189]
  - generic [ref=e190]: "0"
```

# Test source

```ts
  22  | test.describe("Stats page — FREE user (ProGate active)", () => {
  23  |   test.use({ storageState: path.join(FIXTURES, "storage-state-freeUser.json") });
  24  | 
  25  |   test("advanced analytics section is gated with blur overlay", async ({ page }) => {
  26  |     await page.goto(`/${LOCALE}/stats`);
  27  |     await expect(page).not.toHaveURL(/login/);
  28  | 
  29  |     // ProGate overlay must be visible
  30  |     await expect(
  31  |       page.getByText("Upgrade to Pro", { exact: false })
  32  |     ).toBeVisible({ timeout: 15_000 });
  33  | 
  34  |     await expect(
  35  |       page.getByText("This feature is exclusive to Zenith Pro members.", { exact: false })
  36  |     ).toBeVisible();
  37  |   });
  38  | 
  39  |   test("'Upgrade Now' button is visible and enabled", async ({ page }) => {
  40  |     await page.goto(`/${LOCALE}/stats`);
  41  | 
  42  |     const upgradeBtn = page.getByRole("button", { name: /upgrade now/i });
  43  |     await expect(upgradeBtn).toBeVisible({ timeout: 15_000 });
  44  |     await expect(upgradeBtn).toBeEnabled();
  45  |   });
  46  | 
  47  |   test("'Upgrade Now' click triggers Stripe checkout request", async ({ page }) => {
  48  |     await page.goto(`/${LOCALE}/stats`);
  49  | 
  50  |     // Intercept the checkout POST — return a fake URL to avoid real Stripe redirect
  51  |     await page.route("/api/v1/stripe/checkout", async (route) => {
  52  |       await route.fulfill({
  53  |         status: 200,
  54  |         contentType: "application/json",
  55  |         body: JSON.stringify({
  56  |           success: true,
  57  |           data: { url: "https://checkout.stripe.com/pay/cs_test_fake" },
  58  |         }),
  59  |       });
  60  |     });
  61  | 
  62  |     const upgradeBtn = page.getByRole("button", { name: /upgrade now/i });
  63  |     await expect(upgradeBtn).toBeVisible({ timeout: 15_000 });
  64  | 
  65  |     // Catch the navigation that would follow the redirect
  66  |     const [request] = await Promise.all([
  67  |       page.waitForRequest("/api/v1/stripe/checkout"),
  68  |       upgradeBtn.click(),
  69  |     ]);
  70  | 
  71  |     expect(request.method()).toBe("POST");
  72  |   });
  73  | 
  74  |   test("basic summary cards are visible to FREE users (heatmap not gated)", async ({
  75  |     page,
  76  |   }) => {
  77  |     await page.goto(`/${LOCALE}/stats`);
  78  | 
  79  |     // Summary cards above the ProGate should always render
  80  |     await expect(
  81  |       page.locator("[data-testid='stats-card'], .grid .rounded-xl, .grid [class*='Card']").first()
  82  |     ).toBeVisible({ timeout: 15_000 });
  83  |   });
  84  | });
  85  | 
  86  | // ── PRO user tests ───────────────────────────────────────────────────────────
  87  | 
  88  | test.describe("Stats page — PRO user (ProGate bypassed)", () => {
  89  |   test.use({ storageState: path.join(FIXTURES, "storage-state-proUser.json") });
  90  | 
  91  |   test("advanced analytics section renders without overlay", async ({ page }) => {
  92  |     await page.goto(`/${LOCALE}/stats`);
  93  |     await expect(page).not.toHaveURL(/login/);
  94  | 
  95  |     // ProGate overlay must NOT exist
  96  |     await expect(
  97  |       page.getByText("Upgrade to Pro", { exact: false })
  98  |     ).not.toBeVisible({ timeout: 10_000 });
  99  | 
  100 |     await expect(
  101 |       page.getByRole("button", { name: /upgrade now/i })
  102 |     ).not.toBeVisible();
  103 |   });
  104 | 
  105 |   test("advanced charts are accessible to PRO user", async ({ page }) => {
  106 |     await page.goto(`/${LOCALE}/stats`);
  107 | 
  108 |     // Radar chart or routine success list should be visible (not blurred)
  109 |     // These are inside the ProGate children — present & interactive for PRO
  110 |     const advancedSection = page.locator(
  111 |       "[data-testid='consistency-radar'], [data-testid='routine-success-list'], svg.recharts-surface, canvas"
  112 |     ).first();
  113 | 
  114 |     await expect(advancedSection).toBeVisible({ timeout: 15_000 });
  115 |   });
  116 | 
  117 |   test("PRO badge is visible in nav dropdown", async ({ page }) => {
  118 |     await page.goto(`/${LOCALE}/stats`);
  119 | 
  120 |     // Open user dropdown in nav
  121 |     const avatarBtn = page.locator("header button .rounded-full, header button [class*='Avatar']").first();
> 122 |     await avatarBtn.click();
      |                     ^ Error: locator.click: Test timeout of 35000ms exceeded.
  123 | 
  124 |     await expect(
  125 |       page.getByText("PRO", { exact: true })
  126 |     ).toBeVisible({ timeout: 5_000 });
  127 |   });
  128 | });
  129 | 
```