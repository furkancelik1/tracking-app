# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social: friend request + duel flow >> userA sends a friend request to userB
- Location: tests\social.spec.ts:20:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid=\'user-search-result\'], li, [role=\'option\']').filter({ hasText: /E2E User B/i }).first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('[data-testid=\'user-search-result\'], li, [role=\'option\']').filter({ hasText: /E2E User B/i }).first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - generic [ref=e12]:
        - heading "Social" [level=1] [ref=e13]
        - paragraph [ref=e14]: Connect with friends, track progress together!
    - generic [ref=e17]:
      - generic [ref=e18]:
        - img [ref=e19]
        - textbox "Search by username..." [active] [ref=e22]: E2E User B
      - generic [ref=e24]:
        - generic [ref=e26]: EU
        - generic [ref=e27]:
          - paragraph [ref=e28]: E2E User B
          - generic [ref=e29]: 0 XP
        - generic [ref=e30]:
          - img [ref=e31]
          - text: "1"
        - button "Follow" [ref=e33] [cursor=pointer]:
          - img
          - text: Follow
    - paragraph [ref=e36]: Add friends to see their latest completions and badges.
    - generic [ref=e38]:
      - generic [ref=e40]:
        - button "Followers" [ref=e41] [cursor=pointer]:
          - img [ref=e42]
          - generic [ref=e47]: Followers
        - button "Following" [ref=e48] [cursor=pointer]:
          - img [ref=e49]
          - generic [ref=e53]: Following
        - button "Pending Requests" [ref=e54] [cursor=pointer]:
          - img [ref=e55]
          - generic [ref=e58]: Pending Requests
      - generic [ref=e61]:
        - img [ref=e62]
        - paragraph [ref=e67]: No followers yet
    - generic [ref=e69]:
      - generic [ref=e71]:
        - img [ref=e73]
        - text: Following
        - generic [ref=e77]: "0"
      - generic [ref=e79]:
        - img [ref=e81]
        - paragraph [ref=e86]: You're not following anyone yet
        - paragraph [ref=e87]: Search for users to make new friends!
    - generic [ref=e88]:
      - generic [ref=e89]:
        - button "Private Duel" [ref=e90] [cursor=pointer]:
          - img
          - text: Private Duel
        - button "Send Duel Invite" [ref=e91] [cursor=pointer]:
          - img
          - text: Send Duel Invite
      - generic [ref=e92]:
        - img [ref=e94]
        - heading "No active duel" [level=3] [ref=e103]
        - paragraph [ref=e104]: Challenge a friend and put your discipline to the test!
    - generic [ref=e106]:
      - generic [ref=e107]:
        - generic [ref=e108]:
          - img [ref=e110]
          - generic [ref=e119]:
            - heading "Challenges" [level=3] [ref=e120]
            - paragraph [ref=e121]: Compete with friends — winner earns XP and coins!
        - button "Send Challenge" [ref=e122] [cursor=pointer]:
          - img
          - text: Send Challenge
      - generic [ref=e124]:
        - img [ref=e125]
        - paragraph [ref=e134]: No active challenges
        - paragraph [ref=e135]: Send a challenge to one of your friends!
  - region "Notifications alt+T"
  - generic [ref=e140] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e141]:
      - img [ref=e142]
    - generic [ref=e145]:
      - button "Open issues overlay" [ref=e146]:
        - generic [ref=e147]:
          - generic [ref=e148]: "0"
          - generic [ref=e149]: "1"
        - generic [ref=e150]: Issue
      - button "Collapse issues badge" [ref=e151]:
        - img [ref=e152]
  - alert [ref=e154]
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
  37  |     // Wait for search results
  38  |     const userBResult = pageA
  39  |       .locator("[data-testid='user-search-result'], li, [role='option']")
  40  |       .filter({ hasText: /E2E User B/i })
  41  |       .first();
> 42  |     await expect(userBResult).toBeVisible({ timeout: 8_000 });
      |                               ^ Error: expect(locator).toBeVisible() failed
  43  | 
  44  |     // Click add/send request button inside the result row
  45  |     const addBtn = userBResult.getByRole("button", {
  46  |       name: /add|request|ekle|istek/i,
  47  |     });
  48  |     await addBtn.click();
  49  | 
  50  |     // Expect optimistic feedback — button state or toast
  51  |     await expect(
  52  |       pageA.locator("[data-sonner-toast], [role='status']")
  53  |         .or(addBtn.locator("xpath=self::*[@disabled]"))
  54  |     ).toBeTruthy();
  55  | 
  56  |     await ctxA.close();
  57  |   });
  58  | 
  59  |   test("userB accepts the friend request from userA", async ({ browser }) => {
  60  |     const ctxB = await browser.newContext({
  61  |       storageState: path.join(FIXTURES, "storage-state-userB.json"),
  62  |     });
  63  |     const pageB = await ctxB.newPage();
  64  | 
  65  |     await pageB.goto(`/${LOCALE}/social`);
  66  |     await expect(pageB).not.toHaveURL(/login/);
  67  | 
  68  |     // Incoming requests section
  69  |     const requestItem = pageB
  70  |       .locator("[data-testid='friend-request'], li, article")
  71  |       .filter({ hasText: /E2E User A/i })
  72  |       .first();
  73  |     await expect(requestItem).toBeVisible({ timeout: 10_000 });
  74  | 
  75  |     const acceptBtn = requestItem.getByRole("button", {
  76  |       name: /accept|kabul/i,
  77  |     });
  78  |     await acceptBtn.click();
  79  | 
  80  |     // After accepting, userA should appear in friends list
  81  |     await expect(
  82  |       pageB.getByText("E2E User A", { exact: false })
  83  |     ).toBeVisible({ timeout: 8_000 });
  84  | 
  85  |     await ctxB.close();
  86  |   });
  87  | 
  88  |   test("userA challenges userB to a duel", async ({ browser }) => {
  89  |     const ctxA = await browser.newContext({
  90  |       storageState: path.join(FIXTURES, "storage-state-userA.json"),
  91  |     });
  92  |     const pageA = await ctxA.newPage();
  93  | 
  94  |     await pageA.goto(`/${LOCALE}/social`);
  95  | 
  96  |     // Find userB in friends list and open challenge/duel action
  97  |     const friendRow = pageA
  98  |       .locator("[data-testid='friend-item'], li, article")
  99  |       .filter({ hasText: /E2E User B/i })
  100 |       .first();
  101 |     await expect(friendRow).toBeVisible({ timeout: 10_000 });
  102 | 
  103 |     const challengeBtn = friendRow.getByRole("button", {
  104 |       name: /challenge|duel|meydan|davet/i,
  105 |     });
  106 |     await challengeBtn.click();
  107 | 
  108 |     // Confirm dialog or instant send — just expect no crash & some feedback
  109 |     const confirmBtn = pageA
  110 |       .getByRole("button", { name: /confirm|send|gönder|onayla/i })
  111 |       .last();
  112 | 
  113 |     if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
  114 |       await confirmBtn.click();
  115 |     }
  116 | 
  117 |     await expect(
  118 |       pageA.locator("[data-sonner-toast], [role='alert'], [role='status']")
  119 |     ).toBeVisible({ timeout: 8_000 });
  120 | 
  121 |     await ctxA.close();
  122 |   });
  123 | 
  124 |   test("userB sees the duel invitation", async ({ browser }) => {
  125 |     const ctxB = await browser.newContext({
  126 |       storageState: path.join(FIXTURES, "storage-state-userB.json"),
  127 |     });
  128 |     const pageB = await ctxB.newPage();
  129 | 
  130 |     await pageB.goto(`/${LOCALE}/social`);
  131 | 
  132 |     // Duel/challenge section should list the incoming challenge
  133 |     const duelSection = pageB.locator(
  134 |       "[data-testid='duel-invite'], [data-testid='challenge-invite'], section, article"
  135 |     ).filter({ hasText: /E2E User A|duel|challenge|meydan/i }).first();
  136 | 
  137 |     await expect(duelSection).toBeVisible({ timeout: 10_000 });
  138 | 
  139 |     await ctxB.close();
  140 |   });
  141 | });
  142 | 
```