# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social: friend request + duel flow >> userB accepts the friend request from userA
- Location: tests\social.spec.ts:61:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid=\'friend-request\'], li, article').filter({ hasText: /E2E User A/i }).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('[data-testid=\'friend-request\'], li, article').filter({ hasText: /E2E User A/i }).first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - generic [ref=e12]:
        - heading "Social" [level=1] [ref=e13]
        - paragraph [ref=e14]: Connect with friends, track progress together!
    - generic [ref=e18]:
      - img [ref=e19]
      - textbox "Search by username..." [ref=e22]
    - paragraph [ref=e25]: Add friends to see their latest completions and badges.
    - generic [ref=e27]:
      - generic [ref=e29]:
        - button "Followers" [ref=e30] [cursor=pointer]:
          - img [ref=e31]
          - generic [ref=e36]: Followers
        - button "Following" [ref=e37] [cursor=pointer]:
          - img [ref=e38]
          - generic [ref=e42]: Following
        - button "Pending Requests" [ref=e43] [cursor=pointer]:
          - img [ref=e44]
          - generic [ref=e47]: Pending Requests
      - generic [ref=e50]:
        - img [ref=e51]
        - paragraph [ref=e56]: No followers yet
    - generic [ref=e58]:
      - generic [ref=e60]:
        - img [ref=e62]
        - text: Following
        - generic [ref=e66]: "0"
      - generic [ref=e68]:
        - img [ref=e70]
        - paragraph [ref=e75]: You're not following anyone yet
        - paragraph [ref=e76]: Search for users to make new friends!
    - generic [ref=e77]:
      - generic [ref=e78]:
        - button "Private Duel" [ref=e79] [cursor=pointer]:
          - img
          - text: Private Duel
        - button "Send Duel Invite" [ref=e80] [cursor=pointer]:
          - img
          - text: Send Duel Invite
      - generic [ref=e81]:
        - img [ref=e83]
        - heading "No active duel" [level=3] [ref=e92]
        - paragraph [ref=e93]: Challenge a friend and put your discipline to the test!
    - generic [ref=e95]:
      - generic [ref=e96]:
        - generic [ref=e97]:
          - img [ref=e99]
          - generic [ref=e108]:
            - heading "Challenges" [level=3] [ref=e109]
            - paragraph [ref=e110]: Compete with friends — winner earns XP and coins!
        - button "Send Challenge" [ref=e111] [cursor=pointer]:
          - img
          - text: Send Challenge
      - generic [ref=e113]:
        - img [ref=e114]
        - paragraph [ref=e123]: No active challenges
        - paragraph [ref=e124]: Send a challenge to one of your friends!
  - region "Notifications alt+T"
  - generic [ref=e129] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e130]:
      - img [ref=e131]
    - generic [ref=e134]:
      - button "Open issues overlay" [ref=e135]:
        - generic [ref=e136]:
          - generic [ref=e137]: "0"
          - generic [ref=e138]: "1"
        - generic [ref=e139]: Issue
      - button "Collapse issues badge" [ref=e140]:
        - img [ref=e141]
  - alert [ref=e143]
```

# Test source

```ts
  1   | /**
  2   |  * Senaryo 2 — Sosyal Akışlar
  3   |  *
  4   |  * 1. userA → userB'ye arkadaşlık isteği gönderir
  5   |  * 2. userB → isteği kabul eder
  6   |  * 3. userA → userB'ye duel meydan okuması gönderir
  7   |  * 4. userB → meydan okumayı kabul eder ve duel sayfası görünür
  8   |  *
  9   |  * Her kullanıcı kendi browser context'inde çalışır (storageState ile).
  10  |  * workers: 1 sayesinde DB race condition yoktur.
  11  |  */
  12  | 
  13  | import { test, expect, chromium } from "@playwright/test";
  14  | import path from "path";
  15  | 
  16  | const FIXTURES = path.join(__dirname, "fixtures");
  17  | const LOCALE = process.env.E2E_LOCALE ?? "en";
  18  | 
  19  | test.describe.serial("Social: friend request + duel flow", () => {
  20  |   test("userA sends a friend request to userB", async ({ browser }) => {
  21  |     const ctxA = await browser.newContext({
  22  |       storageState: path.join(FIXTURES, "storage-state-userA.json"),
  23  |     });
  24  |     const pageA = await ctxA.newPage();
  25  | 
  26  |     await pageA.goto(`/${LOCALE}/social`);
  27  |     await expect(pageA).not.toHaveURL(/login/);
  28  | 
  29  |     // Open user search
  30  |     const searchInput = pageA.getByPlaceholder(/search|ara|kullanıcı/i).first();
  31  |     await expect(searchInput).toBeVisible({ timeout: 10_000 });
  32  |     await searchInput.fill("E2E User B");
  33  |     // Debounce geçmesi ve API yanıtı için bekle
  34  |     await searchInput.press("Enter");
  35  |     await pageA.waitForTimeout(1500);
  36  | 
  37  |     // Wait for search results (Robust Locator)
  38  |       const userBResult = pageA.locator('div').filter({ 
  39  |         has: pageA.getByText('E2E User B')
  40  |       }).filter({
  41  |         has: pageA.getByRole('button', { name: /Follow|Add|Request|Ekle/i })
  42  |       }).first();
  43  |       
  44  |       await expect(userBResult).toBeVisible({ timeout: 8_000 });
  45  | 
  46  |     // Click add/send request button inside the result row
  47  |     const addBtn = userBResult.getByRole("button", {
  48  |       name: /add|request|ekle|istek/i,
  49  |     });
  50  |     await addBtn.click();
  51  | 
  52  |     // Expect optimistic feedback — button state or toast
  53  |     await expect(
  54  |       pageA.locator("[data-sonner-toast], [role='status']")
  55  |         .or(addBtn.locator("xpath=self::*[@disabled]"))
  56  |     ).toBeTruthy();
  57  | 
  58  |     await ctxA.close();
  59  |   });
  60  | 
  61  |   test("userB accepts the friend request from userA", async ({ browser }) => {
  62  |     const ctxB = await browser.newContext({
  63  |       storageState: path.join(FIXTURES, "storage-state-userB.json"),
  64  |     });
  65  |     const pageB = await ctxB.newPage();
  66  | 
  67  |     await pageB.goto(`/${LOCALE}/social`);
  68  |     await expect(pageB).not.toHaveURL(/login/);
  69  | 
  70  |     // Incoming requests section
  71  |     const requestItem = pageB
  72  |       .locator("[data-testid='friend-request'], li, article")
  73  |       .filter({ hasText: /E2E User A/i })
  74  |       .first();
> 75  |     await expect(requestItem).toBeVisible({ timeout: 10_000 });
      |                               ^ Error: expect(locator).toBeVisible() failed
  76  | 
  77  |     const acceptBtn = requestItem.getByRole("button", {
  78  |       name: /accept|kabul/i,
  79  |     });
  80  |     await acceptBtn.click();
  81  | 
  82  |     // After accepting, userA should appear in friends list
  83  |     await expect(
  84  |       pageB.getByText("E2E User A", { exact: false })
  85  |     ).toBeVisible({ timeout: 8_000 });
  86  | 
  87  |     await ctxB.close();
  88  |   });
  89  | 
  90  |   test("userA challenges userB to a duel", async ({ browser }) => {
  91  |     const ctxA = await browser.newContext({
  92  |       storageState: path.join(FIXTURES, "storage-state-userA.json"),
  93  |     });
  94  |     const pageA = await ctxA.newPage();
  95  | 
  96  |     await pageA.goto(`/${LOCALE}/social`);
  97  | 
  98  |     // Find userB in friends list and open challenge/duel action
  99  |     const friendRow = pageA
  100 |       .locator("[data-testid='friend-item'], li, article")
  101 |       .filter({ hasText: /E2E User B/i })
  102 |       .first();
  103 |     await expect(friendRow).toBeVisible({ timeout: 10_000 });
  104 | 
  105 |     const challengeBtn = friendRow.getByRole("button", {
  106 |       name: /challenge|duel|meydan|davet/i,
  107 |     });
  108 |     await challengeBtn.click();
  109 | 
  110 |     // Confirm dialog or instant send — just expect no crash & some feedback
  111 |     const confirmBtn = pageA
  112 |       .getByRole("button", { name: /confirm|send|gönder|onayla/i })
  113 |       .last();
  114 | 
  115 |     if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
  116 |       await confirmBtn.click();
  117 |     }
  118 | 
  119 |     await expect(
  120 |       pageA.locator("[data-sonner-toast], [role='alert'], [role='status']")
  121 |     ).toBeVisible({ timeout: 8_000 });
  122 | 
  123 |     await ctxA.close();
  124 |   });
  125 | 
  126 |   test("userB sees the duel invitation", async ({ browser }) => {
  127 |     const ctxB = await browser.newContext({
  128 |       storageState: path.join(FIXTURES, "storage-state-userB.json"),
  129 |     });
  130 |     const pageB = await ctxB.newPage();
  131 | 
  132 |     await pageB.goto(`/${LOCALE}/social`);
  133 | 
  134 |     // Duel/challenge section should list the incoming challenge
  135 |     const duelSection = pageB.locator(
  136 |       "[data-testid='duel-invite'], [data-testid='challenge-invite'], section, article"
  137 |     ).filter({ hasText: /E2E User A|duel|challenge|meydan/i }).first();
  138 | 
  139 |     await expect(duelSection).toBeVisible({ timeout: 10_000 });
  140 | 
  141 |     await ctxB.close();
  142 |   });
  143 | });
  144 | 
```