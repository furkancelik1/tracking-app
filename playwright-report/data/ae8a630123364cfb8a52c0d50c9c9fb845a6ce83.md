# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social: friend request + duel flow >> userA sends a friend request to userB
- Location: tests\social.spec.ts:20:7

# Error details

```
Error: locator.click: Error: strict mode violation: locator('div').filter({ has: getByRole('button', { name: /Follow|Add|Request|Ekle/i }) }).first().getByRole('button', { name: /Follow|Add|Request|Ekle|istek/i }) resolved to 4 elements:
    1) <button class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:text-accent-foreground h-9 rounded-md px-3 shrink-0 gap-1.5 border-[#D6FF00]/35 bg-[#D6FF00] text-black hover:bg-[#c8f000]">…</button> aka getByRole('button', { name: 'Follow', exact: true })
    2) <button type="button" class="flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors touch-manipulation sm:gap-1.5 sm:rounded-lg sm:px-2 sm:text-sm bg-[#D6FF00] text-black shadow-[0_0_24px_rgba(214,255,0,0.2)]">…</button> aka getByRole('button', { name: 'Followers' })
    3) <button type="button" class="flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors touch-manipulation sm:gap-1.5 sm:rounded-lg sm:px-2 sm:text-sm text-zinc-500 hover:text-white">…</button> aka getByRole('button', { name: 'Following' })
    4) <button type="button" class="flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors touch-manipulation sm:gap-1.5 sm:rounded-lg sm:px-2 sm:text-sm text-zinc-500 hover:text-white">…</button> aka getByRole('button', { name: 'Pending Requests' })

Call log:
  - waiting for locator('div').filter({ has: getByRole('button', { name: /Follow|Add|Request|Ekle/i }) }).first().getByRole('button', { name: /Follow|Add|Request|Ekle|istek/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - img [ref=e8]
      - paragraph [ref=e11]: ZENITH
    - generic [ref=e12]:
      - generic [ref=e13]:
        - img [ref=e15]
        - generic [ref=e20]:
          - heading "Social" [level=1] [ref=e21]
          - paragraph [ref=e22]: Connect with friends, track progress together!
      - generic [ref=e25]:
        - generic [ref=e26]:
          - img [ref=e27]
          - textbox "Search by username..." [active] [ref=e30]: E2E User B
        - generic [ref=e32]:
          - generic [ref=e34]: EU
          - generic [ref=e35]:
            - paragraph [ref=e36]: E2E User B
            - generic [ref=e37]: 0 XP
          - generic [ref=e38]:
            - img [ref=e39]
            - text: "1"
          - button "Follow" [ref=e41] [cursor=pointer]:
            - img
            - text: Follow
      - paragraph [ref=e44]: Add friends to see their latest completions and badges.
      - generic [ref=e46]:
        - generic [ref=e48]:
          - button "Followers" [ref=e49] [cursor=pointer]:
            - img [ref=e50]
            - generic [ref=e55]: Followers
          - button "Following" [ref=e56] [cursor=pointer]:
            - img [ref=e57]
            - generic [ref=e61]: Following
          - button "Pending Requests" [ref=e62] [cursor=pointer]:
            - img [ref=e63]
            - generic [ref=e66]: Pending Requests
        - generic [ref=e69]:
          - img [ref=e70]
          - paragraph [ref=e75]: No followers yet
      - generic [ref=e77]:
        - generic [ref=e79]:
          - img [ref=e81]
          - text: Following
          - generic [ref=e85]: "0"
        - generic [ref=e87]:
          - img [ref=e89]
          - paragraph [ref=e94]: You're not following anyone yet
          - paragraph [ref=e95]: Search for users to make new friends!
      - generic [ref=e96]:
        - generic [ref=e97]:
          - button "Private Duel" [ref=e98] [cursor=pointer]:
            - img
            - text: Private Duel
          - button "Send Duel Invite" [ref=e99] [cursor=pointer]:
            - img
            - text: Send Duel Invite
        - generic [ref=e100]:
          - img [ref=e102]
          - heading "No active duel" [level=3] [ref=e111]
          - paragraph [ref=e112]: Challenge a friend and put your discipline to the test!
      - generic [ref=e114]:
        - generic [ref=e115]:
          - generic [ref=e116]:
            - img [ref=e118]
            - generic [ref=e127]:
              - heading "Challenges" [level=3] [ref=e128]
              - paragraph [ref=e129]: Compete with friends — winner earns XP and coins!
          - button "Send Challenge" [ref=e130] [cursor=pointer]:
            - img
            - text: Send Challenge
        - generic [ref=e132]:
          - img [ref=e133]
          - paragraph [ref=e142]: No active challenges
          - paragraph [ref=e143]: Send a challenge to one of your friends!
  - region "Notifications alt+T"
  - generic [ref=e148] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e149]:
      - img [ref=e150]
    - generic [ref=e153]:
      - button "Open issues overlay" [ref=e154]:
        - generic [ref=e155]:
          - generic [ref=e156]: "0"
          - generic [ref=e157]: "1"
        - generic [ref=e158]: Issue
      - button "Collapse issues badge" [ref=e159]:
        - img [ref=e160]
  - alert [ref=e162]
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
  32  |     
  33  |     // Arama kutusuna yaz ve debounce/API için bekle
  34  |     await searchInput.fill("E2E User B");
  35  |     await searchInput.press("Enter");
  36  |     await pageA.waitForTimeout(1500);
  37  | 
  38  |     // Wait for search results (Robust Locator)
  39  |     const userBResult = pageA.locator('div').filter({ 
  40  |       has: pageA.getByText('E2E User B'),
  41  |       has: pageA.getByRole('button', { name: /Follow|Add|Request|Ekle/i })
  42  |     }).first();
  43  |     
  44  |     await expect(userBResult).toBeVisible({ timeout: 8_000 });
  45  | 
  46  |     // Click add/send request button inside the result row
  47  |     const addBtn = userBResult.getByRole("button", {
  48  |       name: /Follow|Add|Request|Ekle|istek/i,
  49  |     });
> 50  |     await addBtn.click();
      |                  ^ Error: locator.click: Error: strict mode violation: locator('div').filter({ has: getByRole('button', { name: /Follow|Add|Request|Ekle/i }) }).first().getByRole('button', { name: /Follow|Add|Request|Ekle|istek/i }) resolved to 4 elements:
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
  70  |     // ÇÖZÜM: Elementi aramadan önce "Bekleyen İstekler / Pending" sekmesine tıkla
  71  |     const pendingRequestsTab = pageB.getByRole("button", { name: /pending|istekler/i });
  72  |     if (await pendingRequestsTab.isVisible()) {
  73  |       await pendingRequestsTab.click();
  74  |     }
  75  | 
  76  |     // Incoming requests section
  77  |     const requestItem = pageB
  78  |       .locator("[data-testid='friend-request'], li, article")
  79  |       .filter({ hasText: /E2E User A/i })
  80  |       .first();
  81  |     await expect(requestItem).toBeVisible({ timeout: 10_000 });
  82  | 
  83  |     const acceptBtn = requestItem.getByRole("button", {
  84  |       name: /accept|kabul/i,
  85  |     });
  86  |     await acceptBtn.click();
  87  | 
  88  |     // After accepting, userA should appear in friends list
  89  |     await expect(
  90  |       pageB.getByText("E2E User A", { exact: false })
  91  |     ).toBeVisible({ timeout: 8_000 });
  92  | 
  93  |     await ctxB.close();
  94  |   });
  95  | 
  96  |   test("userA challenges userB to a duel", async ({ browser }) => {
  97  |     const ctxA = await browser.newContext({
  98  |       storageState: path.join(FIXTURES, "storage-state-userA.json"),
  99  |     });
  100 |     const pageA = await ctxA.newPage();
  101 | 
  102 |     await pageA.goto(`/${LOCALE}/social`);
  103 | 
  104 |     // Find userB in friends list and open challenge/duel action
  105 |     const friendRow = pageA
  106 |       .locator("[data-testid='friend-item'], li, article")
  107 |       .filter({ hasText: /E2E User B/i })
  108 |       .first();
  109 |     await expect(friendRow).toBeVisible({ timeout: 10_000 });
  110 | 
  111 |     const challengeBtn = friendRow.getByRole("button", {
  112 |       name: /challenge|duel|meydan|davet/i,
  113 |     });
  114 |     await challengeBtn.click();
  115 | 
  116 |     // Confirm dialog or instant send — just expect no crash & some feedback
  117 |     const confirmBtn = pageA
  118 |       .getByRole("button", { name: /confirm|send|gönder|onayla/i })
  119 |       .last();
  120 | 
  121 |     if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
  122 |       await confirmBtn.click();
  123 |     }
  124 | 
  125 |     await expect(
  126 |       pageA.locator("[data-sonner-toast], [role='alert'], [role='status']")
  127 |     ).toBeVisible({ timeout: 8_000 });
  128 | 
  129 |     await ctxA.close();
  130 |   });
  131 | 
  132 |   test("userB sees the duel invitation", async ({ browser }) => {
  133 |     const ctxB = await browser.newContext({
  134 |       storageState: path.join(FIXTURES, "storage-state-userB.json"),
  135 |     });
  136 |     const pageB = await ctxB.newPage();
  137 | 
  138 |     await pageB.goto(`/${LOCALE}/social`);
  139 | 
  140 |     // Duel/challenge section should list the incoming challenge
  141 |     const duelSection = pageB.locator(
  142 |       "[data-testid='duel-invite'], [data-testid='challenge-invite'], section, article"
  143 |     ).filter({ hasText: /E2E User A|duel|challenge|meydan/i }).first();
  144 | 
  145 |     await expect(duelSection).toBeVisible({ timeout: 10_000 });
  146 | 
  147 |     await ctxB.close();
  148 |   });
  149 | });
```