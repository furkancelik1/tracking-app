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
  33  | 
  34  |     // Wait for search results
  35  |     const userBResult = pageA
  36  |       .locator("[data-testid='user-search-result'], li, [role='option']")
  37  |       .filter({ hasText: /E2E User B/i })
  38  |       .first();
> 39  |     await expect(userBResult).toBeVisible({ timeout: 8_000 });
      |                               ^ Error: expect(locator).toBeVisible() failed
  40  | 
  41  |     // Click add/send request button inside the result row
  42  |     const addBtn = userBResult.getByRole("button", {
  43  |       name: /add|request|ekle|istek/i,
  44  |     });
  45  |     await addBtn.click();
  46  | 
  47  |     // Expect optimistic feedback — button state or toast
  48  |     await expect(
  49  |       pageA.locator("[data-sonner-toast], [role='status']")
  50  |         .or(addBtn.locator("xpath=self::*[@disabled]"))
  51  |     ).toBeTruthy();
  52  | 
  53  |     await ctxA.close();
  54  |   });
  55  | 
  56  |   test("userB accepts the friend request from userA", async ({ browser }) => {
  57  |     const ctxB = await browser.newContext({
  58  |       storageState: path.join(FIXTURES, "storage-state-userB.json"),
  59  |     });
  60  |     const pageB = await ctxB.newPage();
  61  | 
  62  |     await pageB.goto(`/${LOCALE}/social`);
  63  |     await expect(pageB).not.toHaveURL(/login/);
  64  | 
  65  |     // Incoming requests section
  66  |     const requestItem = pageB
  67  |       .locator("[data-testid='friend-request'], li, article")
  68  |       .filter({ hasText: /E2E User A/i })
  69  |       .first();
  70  |     await expect(requestItem).toBeVisible({ timeout: 10_000 });
  71  | 
  72  |     const acceptBtn = requestItem.getByRole("button", {
  73  |       name: /accept|kabul/i,
  74  |     });
  75  |     await acceptBtn.click();
  76  | 
  77  |     // After accepting, userA should appear in friends list
  78  |     await expect(
  79  |       pageB.getByText("E2E User A", { exact: false })
  80  |     ).toBeVisible({ timeout: 8_000 });
  81  | 
  82  |     await ctxB.close();
  83  |   });
  84  | 
  85  |   test("userA challenges userB to a duel", async ({ browser }) => {
  86  |     const ctxA = await browser.newContext({
  87  |       storageState: path.join(FIXTURES, "storage-state-userA.json"),
  88  |     });
  89  |     const pageA = await ctxA.newPage();
  90  | 
  91  |     await pageA.goto(`/${LOCALE}/social`);
  92  | 
  93  |     // Find userB in friends list and open challenge/duel action
  94  |     const friendRow = pageA
  95  |       .locator("[data-testid='friend-item'], li, article")
  96  |       .filter({ hasText: /E2E User B/i })
  97  |       .first();
  98  |     await expect(friendRow).toBeVisible({ timeout: 10_000 });
  99  | 
  100 |     const challengeBtn = friendRow.getByRole("button", {
  101 |       name: /challenge|duel|meydan|davet/i,
  102 |     });
  103 |     await challengeBtn.click();
  104 | 
  105 |     // Confirm dialog or instant send — just expect no crash & some feedback
  106 |     const confirmBtn = pageA
  107 |       .getByRole("button", { name: /confirm|send|gönder|onayla/i })
  108 |       .last();
  109 | 
  110 |     if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
  111 |       await confirmBtn.click();
  112 |     }
  113 | 
  114 |     await expect(
  115 |       pageA.locator("[data-sonner-toast], [role='alert'], [role='status']")
  116 |     ).toBeVisible({ timeout: 8_000 });
  117 | 
  118 |     await ctxA.close();
  119 |   });
  120 | 
  121 |   test("userB sees the duel invitation", async ({ browser }) => {
  122 |     const ctxB = await browser.newContext({
  123 |       storageState: path.join(FIXTURES, "storage-state-userB.json"),
  124 |     });
  125 |     const pageB = await ctxB.newPage();
  126 | 
  127 |     await pageB.goto(`/${LOCALE}/social`);
  128 | 
  129 |     // Duel/challenge section should list the incoming challenge
  130 |     const duelSection = pageB.locator(
  131 |       "[data-testid='duel-invite'], [data-testid='challenge-invite'], section, article"
  132 |     ).filter({ hasText: /E2E User A|duel|challenge|meydan/i }).first();
  133 | 
  134 |     await expect(duelSection).toBeVisible({ timeout: 10_000 });
  135 | 
  136 |     await ctxB.close();
  137 |   });
  138 | });
  139 | 
```