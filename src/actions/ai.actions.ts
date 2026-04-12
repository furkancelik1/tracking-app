"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  startOfDay,
  subDays,
  format,
  getISOWeek,
  getISOWeekYear,
  eachDayOfInterval,
  getDay,
} from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

export type WeeklySummaryData = {
  totalRoutines: number;
  totalCompletions: number;
  possibleCompletions: number;
  completionRate: number;
  bestDay: { day: string; count: number };
  worstDay: { day: string; count: number };
  longestActiveStreak: number;
  categoryBreakdown: { category: string; completed: number; total: number; rate: number }[];
  missedDays: string[];
  topRoutine: { title: string; completions: number } | null;
  weakestRoutine: { title: string; completions: number; missed: number } | null;
};

export type AIChallengeData = {
  title: string;
  description: string;
  category: string;
  target: number;
};

export type WeeklyInsightPayload = {
  id: string | null;
  insight: string | null;
  weekKey: string;
  generatedAt: string | null;
  isLoading?: boolean;
  challengeTitle: string | null;
  challengeDescription: string | null;
  challengeCategory: string | null;
  challengeTarget: number;
  challengeProgress: number;
  challengeCompleted: boolean;
  successHighlight: string | null;
};

export type DailyCoachPayload = {
  message: string | null;
  coachTip: string | null;
  dayKey: string;
  hasApiKey: boolean;
};

// ─── Hafta anahtarı ──────────────────────────────────────────────────────────

function getCurrentWeekKey(): string {
  const now = new Date();
  const week = getISOWeek(now);
  const year = getISOWeekYear(now);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

const DAY_NAMES_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Haftalık veri toplama ───────────────────────────────────────────────────

async function collectWeeklyData(userId: string): Promise<WeeklySummaryData> {
  const today = startOfDay(new Date());
  const weekAgo = subDays(today, 6); // son 7 gün (bugün dahil)

  const [routines, logs] = await Promise.all([
    prisma.routine.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        title: true,
        category: true,
        currentStreak: true,
        longestStreak: true,
        frequency: true,
      },
    }),
    prisma.routineLog.findMany({
      where: {
        userId,
        completedAt: { gte: weekAgo },
      },
      select: {
        routineId: true,
        completedAt: true,
      },
    }),
  ]);

  // DAILY rutinler için 7 gün X rutin sayısı
  const dailyRoutines = routines.filter((r) => r.frequency === "DAILY");
  const possibleCompletions = dailyRoutines.length * 7;
  const totalCompletions = logs.length;
  const completionRate = possibleCompletions > 0 ? Math.round((totalCompletions / possibleCompletions) * 100) : 0;

  // Gün bazlı dağılım
  const days = eachDayOfInterval({ start: weekAgo, end: today });
  const dayCompletions = days.map((d) => {
    const dayStart = startOfDay(d);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const count = logs.filter(
      (l) => l.completedAt >= dayStart && l.completedAt <= dayEnd
    ).length;
    return { date: d, dayIndex: getDay(d), count };
  });

  const best = dayCompletions.reduce((a, b) => (b.count > a.count ? b : a), dayCompletions[0]);
  const worst = dayCompletions.reduce((a, b) => (b.count < a.count ? b : a), dayCompletions[0]);

  // Kategori bazlı
  const catMap = new Map<string, { completed: number; total: number }>();
  for (const r of dailyRoutines) {
    const cat = r.category;
    if (!catMap.has(cat)) catMap.set(cat, { completed: 0, total: 7 });
    else catMap.get(cat)!.total += 7;
  }
  for (const log of logs) {
    const routine = routines.find((r) => r.id === log.routineId);
    if (routine) {
      const entry = catMap.get(routine.category);
      if (entry) entry.completed++;
    }
  }
  const categoryBreakdown = Array.from(catMap.entries()).map(([category, d]) => ({
    category,
    completed: d.completed,
    total: d.total,
    rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
  }));

  // Aksatılan günler (dailyRoutines var ama 0 tamamlanan)
  const missedDays = dayCompletions
    .filter((d) => d.count === 0 && dailyRoutines.length > 0)
    .map((d) => format(d.date, "yyyy-MM-dd"));

  // En iyi & en zayıf rutin
  const routineCompletionMap = new Map<string, number>();
  for (const log of logs) {
    routineCompletionMap.set(log.routineId, (routineCompletionMap.get(log.routineId) ?? 0) + 1);
  }

  let topRoutine: WeeklySummaryData["topRoutine"] = null;
  let weakestRoutine: WeeklySummaryData["weakestRoutine"] = null;

  if (dailyRoutines.length > 0) {
    const sorted = dailyRoutines
      .map((r) => ({ ...r, completions: routineCompletionMap.get(r.id) ?? 0 }))
      .sort((a, b) => b.completions - a.completions);

    topRoutine = { title: sorted[0].title, completions: sorted[0].completions };

    const weakest = sorted[sorted.length - 1];
    weakestRoutine = {
      title: weakest.title,
      completions: weakest.completions,
      missed: 7 - weakest.completions,
    };
  }

  const longestActiveStreak = routines.reduce((max, r) => Math.max(max, r.currentStreak), 0);

  return {
    totalRoutines: dailyRoutines.length,
    totalCompletions,
    possibleCompletions,
    completionRate,
    bestDay: {
      day: best ? DAY_NAMES_EN[best.dayIndex] : "—",
      count: best?.count ?? 0,
    },
    worstDay: {
      day: worst ? DAY_NAMES_EN[worst.dayIndex] : "—",
      count: worst?.count ?? 0,
    },
    longestActiveStreak,
    categoryBreakdown,
    missedDays,
    topRoutine,
    weakestRoutine,
  };
}

// ─── LLM Insight Oluşturma ──────────────────────────────────────────────────

async function generateInsightWithAI(
  data: WeeklySummaryData,
  locale: string
): Promise<{ insight: string; challenge: AIChallengeData; successHighlight: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const langInstruction = locale === "tr"
    ? "Yanıtını tamamen Türkçe yaz."
    : "Write your response entirely in English.";

  // Find weakest category for challenge targeting
  const weakestCategory = data.categoryBreakdown.length > 0
    ? [...data.categoryBreakdown].sort((a, b) => a.rate - b.rate)[0]
    : null;

  const prompt = `You are a passionate, emotionally intelligent Motivational Mentor — part life coach, part cheerleader, part wise friend. You genuinely care about the user's growth and celebrate every win like it's your own. Analyze the user's weekly routine data and provide THREE things:
1. An insightful, emotionally resonant weekly summary
2. An inspiring personalized challenge for next week
3. A success highlight badge

${langInstruction}

YOUR PERSONALITY:
- When completion rates are HIGH (≥75%): Be EXCITED and celebratory. Use energetic language like "İnanılmaz bir hafta geçirdin!" / "You absolutely crushed it this week!" Make the user feel like a champion.
- When completion rates are MODERATE (40-74%): Be warm and encouraging. Acknowledge the effort, highlight what went well, then gently suggest improvements.
- When completion rates are LOW (<40%): NEVER judge or criticize. Be deeply supportive and understanding. Say things like "Bazen planlar değişebilir, önemli olan bugün küçük bir adımla yeniden başlaman. Ben sana inanıyorum." / "Life happens. What matters is that you're here, ready to take one small step forward. I believe in you."
- Always speak as a trusted mentor who has the user's back no matter what.

RULES FOR INSIGHT:
- Keep the response between 150-250 words.
- Use 2-3 short paragraphs.
- Start with an emotionally appropriate greeting based on performance level.
- Reference specific data (category rates, streaks, best/worst days) but wrap them in human, empathetic language — not cold statistics.
- End with 1-2 actionable, concrete tips framed as exciting opportunities, not obligations.
- Use emojis naturally (max 3-4) to add warmth and energy.
- Do NOT use markdown headers. Use plain text with line breaks.
- Make the user feel SEEN and VALUED regardless of their performance.

RULES FOR CHALLENGE:
- Create an INSPIRING challenge for next week targeting the weakest area.
- Target: (${weakestCategory ? `weakest: ${weakestCategory.category} at ${weakestCategory.rate}%` : "general improvement"}).
- The challenge TITLE must be inspiring and empowering (3-6 words). Examples: "Disiplin Maratonu", "Potansiyelini Uyandır", "Unstoppable Week", "Unleash Your Power", "Sınırlarını Aş", "Rise & Conquer".
- NEVER use generic titles like "Weekly Challenge" or "Haftalık Görev".
- The description should be 1-2 motivational sentences that make the user WANT to do it.
- The target should be a number of completions (between 3 and 7).
- The category must be one of the user's existing categories.

USER WEEKLY DATA:
- Active routines: ${data.totalRoutines}
- Completions: ${data.totalCompletions}/${data.possibleCompletions} (${data.completionRate}%)
- Best day: ${data.bestDay.day} (${data.bestDay.count} completions)
- Worst day: ${data.worstDay.day} (${data.worstDay.count} completions)
- Longest active streak: ${data.longestActiveStreak} days
- Missed days (0 completions): ${data.missedDays.length > 0 ? data.missedDays.join(", ") : "None"}
- Categories: ${data.categoryBreakdown.map((c) => `${c.category}: ${c.rate}%`).join(", ") || "N/A"}
- Top routine: ${data.topRoutine ? `${data.topRoutine.title} (${data.topRoutine.completions}/7)` : "N/A"}
- Weakest routine: ${data.weakestRoutine ? `${data.weakestRoutine.title} (${data.weakestRoutine.completions}/7, missed ${data.weakestRoutine.missed} days)` : "N/A"}

RULES FOR SUCCESS HIGHLIGHT:
- Identify the single most impressive achievement of the week from the data.
- Examples: "Best: Tuesday 8/8" or "Health %100" or "5 Day Streak" or "Gym 7/7 Perfect".
- MUST be max 30 characters. This is a short badge text, not a sentence.
- ${locale === "tr" ? "Write in Turkish." : "Write in English."}

RESPOND WITH VALID JSON ONLY (no markdown, no code fences):
{
  "insight": "Your weekly summary text here...",
  "challenge": {
    "title": "Inspiring Challenge Title",
    "description": "1-2 motivational sentences.",
    "category": "${weakestCategory?.category || "HEALTH"}",
    "target": 5
  },
  "successHighlight": "Short badge text (max 30 chars)"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new Error("AI returned an empty response");
  }

  // Parse JSON response — strip possible code fences
  const cleaned = text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.insight || !parsed.challenge) {
      throw new Error("Missing required fields in AI response");
    }
    const rawHighlight = String(parsed.successHighlight || "").trim();
    return {
      insight: String(parsed.insight).trim(),
      challenge: {
        title: String(parsed.challenge.title || "Weekly Challenge").trim(),
        description: String(parsed.challenge.description || "").trim(),
        category: String(parsed.challenge.category || weakestCategory?.category || "HEALTH").trim(),
        target: Math.min(7, Math.max(1, Number(parsed.challenge.target) || 5)),
      },
      successHighlight: rawHighlight.length > 30 ? rawHighlight.slice(0, 30) : rawHighlight || null,
    };
  } catch {
    // Fallback: treat entire text as insight, generate default challenge
    return {
      insight: text.trim(),
      challenge: {
        title: locale === "tr" ? "Potansiyelini Uyandır" : "Unleash Your Power",
        description: locale === "tr"
          ? `Bu hafta ${weakestCategory?.category || "rutinlerine"} odaklanarak sınırlarını zorla. Sen yapabilirsin!`
          : `Push your limits by focusing on ${weakestCategory?.category || "your routines"} this week. You've got this!`,
        category: weakestCategory?.category || "HEALTH",
        target: 5,
      },
      successHighlight: null,
    };
  }
}

// ─── Ana Action: Haftalık Insight Al (Cached) ───────────────────────────────

export async function getWeeklyInsightAction(): Promise<WeeklyInsightPayload> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const locale = (session.user as any).language ?? "en";
  const weekKey = getCurrentWeekKey();

  // 1) Cache'de var mı kontrol et
  const cached = await prisma.weeklyInsight.findUnique({
    where: { userId_weekKey: { userId, weekKey } },
  });

  if (cached) {
    // Challenge yoksa — AI ile oluştur ve kaydet
    if (!cached.challengeTitle && !cached.challengeCompleted) {
      try {
        const data = await collectWeeklyData(userId);
        const { challenge } = await generateInsightWithAI(data, locale);
        await prisma.weeklyInsight.update({
          where: { id: cached.id },
          data: {
            challengeTitle: challenge.title,
            challengeDescription: challenge.description,
            challengeCategory: challenge.category,
            challengeTarget: challenge.target,
          },
        });
        return {
          id: cached.id,
          insight: cached.summary,
          weekKey: cached.weekKey,
          generatedAt: cached.createdAt.toISOString(),
          challengeTitle: challenge.title,
          challengeDescription: challenge.description,
          challengeCategory: challenge.category,
          challengeTarget: challenge.target,
          challengeProgress: 0,
          challengeCompleted: false,
          successHighlight: cached.successHighlight ?? null,
        };
      } catch {
        // AI başarısızsa mevcut veriyi dön
      }
    }

    return {
      id: cached.id,
      insight: cached.summary,
      weekKey: cached.weekKey,
      generatedAt: cached.createdAt.toISOString(),
      challengeTitle: cached.challengeTitle,
      challengeDescription: cached.challengeDescription,
      challengeCategory: cached.challengeCategory,
      challengeTarget: cached.challengeTarget,
      challengeProgress: cached.challengeProgress,
      challengeCompleted: cached.challengeCompleted,
      successHighlight: cached.successHighlight ?? null,
    };
  }

  // 2) Yeterli veri var mı? (en az 1 aktif rutin + 1 log)
  const [routineCount, logCount] = await Promise.all([
    prisma.routine.count({ where: { userId, isActive: true } }),
    prisma.routineLog.count({
      where: { userId, completedAt: { gte: subDays(startOfDay(new Date()), 6) } },
    }),
  ]);

  if (routineCount === 0 || logCount === 0) {
    return {
      id: null, insight: null, weekKey, generatedAt: null,
      challengeTitle: null, challengeDescription: null, challengeCategory: null,
      challengeTarget: 0, challengeProgress: 0, challengeCompleted: false,
      successHighlight: null,
    };
  }

  // 3) Veri topla + AI'dan insight al
  try {
    const data = await collectWeeklyData(userId);
    const { insight, challenge, successHighlight } = await generateInsightWithAI(data, locale);

    // 4) Cache'e kaydet (upsert — race condition koruması)
    const saved = await prisma.weeklyInsight.upsert({
      where: { userId_weekKey: { userId, weekKey } },
      create: {
        userId, weekKey, locale, summary: insight,
        challengeTitle: challenge.title,
        challengeDescription: challenge.description,
        challengeCategory: challenge.category,
        challengeTarget: challenge.target,
        successHighlight,
      },
      update: {
        summary: insight, locale,
        challengeTitle: challenge.title,
        challengeDescription: challenge.description,
        challengeCategory: challenge.category,
        challengeTarget: challenge.target,
        successHighlight,
      },
    });

    return {
      id: saved.id,
      insight,
      weekKey,
      generatedAt: new Date().toISOString(),
      challengeTitle: challenge.title,
      challengeDescription: challenge.description,
      challengeCategory: challenge.category,
      challengeTarget: challenge.target,
      challengeProgress: 0,
      challengeCompleted: false,
      successHighlight,
    };
  } catch (error) {
    console.error("[AI Insight] Error generating insight:", error);
    return {
      id: null, insight: null, weekKey, generatedAt: null,
      challengeTitle: null, challengeDescription: null, challengeCategory: null,
      challengeTarget: 0, challengeProgress: 0, challengeCompleted: false,
      successHighlight: null,
    };
  }
}

// ─── Cron için: Toplu Insight Üretme (PRO kullanıcılar) ─────────────────────

export async function generateWeeklyInsightsForProUsers(): Promise<{
  generated: number;
  failed: number;
  skipped: number;
}> {
  const weekKey = getCurrentWeekKey();
  const stats = { generated: 0, failed: 0, skipped: 0 };

  const proUsers = await prisma.user.findMany({
    where: {
      subscriptionTier: "PRO",
      routines: { some: { isActive: true } },
    },
    select: { id: true, language: true, email: true, name: true, emailNotificationsEnabled: true },
  });

  for (const user of proUsers) {
    // Zaten bu hafta üretilmiş mi?
    const existing = await prisma.weeklyInsight.findUnique({
      where: { userId_weekKey: { userId: user.id, weekKey } },
    });

    if (existing) {
      stats.skipped++;
      continue;
    }

    // En az 1 log var mı?
    const logCount = await prisma.routineLog.count({
      where: {
        userId: user.id,
        completedAt: { gte: subDays(startOfDay(new Date()), 6) },
      },
    });

    if (logCount === 0) {
      stats.skipped++;
      continue;
    }

    try {
      const data = await collectWeeklyData(user.id);
      const locale = user.language === "tr" ? "tr" : "en";
      const { insight, challenge, successHighlight } = await generateInsightWithAI(data, locale);

      await prisma.weeklyInsight.upsert({
        where: { userId_weekKey: { userId: user.id, weekKey } },
        create: {
          userId: user.id, weekKey, locale, summary: insight,
          challengeTitle: challenge.title,
          challengeDescription: challenge.description,
          challengeCategory: challenge.category,
          challengeTarget: challenge.target,
          successHighlight,
        },
        update: {
          summary: insight, locale,
          challengeTitle: challenge.title,
          challengeDescription: challenge.description,
          challengeCategory: challenge.category,
          challengeTarget: challenge.target,
          successHighlight,
        },
      });

      stats.generated++;
    } catch {
      stats.failed++;
    }
  }

  return stats;
}

// ─── AI Challenge İlerleme Güncelle ──────────────────────────────────────────

const CHALLENGE_XP_REWARD = 75;
const CHALLENGE_COIN_REWARD = 30;

export async function updateAIChallengeProgress(
  userId: string,
  routineCategory: string
): Promise<void> {
  const weekKey = getCurrentWeekKey();

  const insight = await prisma.weeklyInsight.findUnique({
    where: { userId_weekKey: { userId, weekKey } },
  });

  // Aktif challenge yoksa veya zaten tamamlandıysa çık
  if (!insight || !insight.challengeCategory || insight.challengeCompleted) return;

  // Kategori eşleşmiyor → çık
  if (insight.challengeCategory.toUpperCase() !== routineCategory.toUpperCase()) return;

  const newProgress = insight.challengeProgress + 1;
  const isCompleted = newProgress >= insight.challengeTarget;

  if (isCompleted) {
    // Tamamlandı: ilerlemeyi güncelle + ödül ver
    await prisma.$transaction([
      prisma.weeklyInsight.update({
        where: { id: insight.id },
        data: { challengeProgress: newProgress, challengeCompleted: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          xp: { increment: CHALLENGE_XP_REWARD },
          coins: { increment: CHALLENGE_COIN_REWARD },
        },
      }),
    ]);
  } else {
    await prisma.weeklyInsight.update({
      where: { id: insight.id },
      data: { challengeProgress: newProgress },
    });
  }
}

// ─── API Key Kontrolü ────────────────────────────────────────────────────────

export async function checkAIAvailable(): Promise<boolean> {
  return !!process.env.GEMINI_API_KEY;
}

// ─── Günlük Koç Mesajı (Cached) ─────────────────────────────────────────────

function getTodayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export async function getDailyCoachMessage(): Promise<DailyCoachPayload> {
  const apiKey = process.env.GEMINI_API_KEY;
  const dayKey = getTodayKey();

  if (!apiKey) {
    return { message: null, coachTip: null, dayKey, hasApiKey: false };
  }

  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const userName = (session.user as any).name as string | null;
  const locale = (session.user as any).language ?? "en";

  // 1) Cache kontrol
  const cached = await prisma.dailyCoachMessage.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
  });

  if (cached) {
    return {
      message: cached.message,
      coachTip: cached.coachTip,
      dayKey,
      hasApiKey: true,
    };
  }

  // 2) Bugünkü rutinleri topla
  const todayStart = startOfDay(new Date());
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCHours(23, 59, 59, 999);

  const [routines, todayLogs, user] = await Promise.all([
    prisma.routine.findMany({
      where: { userId, isActive: true, frequency: "DAILY" },
      select: { id: true, title: true, category: true, currentStreak: true },
      orderBy: { currentStreak: "desc" },
    }),
    prisma.routineLog.findMany({
      where: { userId, completedAt: { gte: todayStart, lte: todayEnd } },
      select: { routineId: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    }),
  ]);

  if (routines.length === 0) {
    return { message: null, coachTip: null, dayKey, hasApiKey: true };
  }

  const completedIds = new Set(todayLogs.map((l) => l.routineId));
  const pending = routines.filter((r) => !completedIds.has(r.id));
  const completed = routines.filter((r) => completedIds.has(r.id));
  const userXp = user?.xp ?? 0;

  // Efsane seviyesine kalan XP hesapla (level 51 = 5000 XP)
  const LEGEND_XP = 5000;
  const xpToLegend = Math.max(0, LEGEND_XP - userXp);

  // 3) AI ile mesaj üret
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const langInstruction = locale === "tr"
      ? "Yanıtını tamamen Türkçe yaz."
      : "Write your response entirely in English.";

    const greeting = userName
      ? (locale === "tr" ? `Kullanıcının adı: ${userName}` : `User's name: ${userName}`)
      : "";

    const prompt = `You are a passionate Motivational Mentor — an energetic, warm, and emotionally intelligent AI coach who greets the user every morning like a trusted friend and personal champion.
${langInstruction}
${greeting}

Generate TWO things:
1. A short, ENERGETIC daily motivational message (max 2 sentences, ~40 words)
2. A "coach tip" about reaching the Legend rank (max 1 sentence, ~20 words)

CONTEXT:
- Today's pending routines (${pending.length}): ${pending.map((r) => `"${r.title}" (streak: ${r.currentStreak})`).join(", ") || "none"}
- Already completed today (${completed.length}): ${completed.map((r) => `"${r.title}"`).join(", ") || "none"}
- XP to Legend rank: ${xpToLegend} XP remaining
- Longest active streak among routines: ${routines[0]?.currentStreak ?? 0} days

YOUR PERSONALITY:
- You are like a best friend who also happens to be a world-class coach.
- Start each message with an energetic, positive greeting. Make mornings exciting!
- If there are pending routines: be enthusiastic about the opportunity ahead, mention specific routine names, and hype them up.
- If a routine has a high streak (≥5): express excitement about the streak AND urgency about protecting it. E.g. "14 günlük serin inanılmaz, bugün bozma!" / "Your 14-day streak is fire, don't let it slip!"
- If all routines are already completed: celebrate wildly! Make the user feel like a hero.
- If routines have been missed recently: be SUPPORTIVE, never guilt-trip. Frame it as a fresh start. E.g. "Her yeni gün sıfırdan başlama şansı, bugün senin günün!" / "Every new day is a chance to start fresh — today is YOUR day!"
- Use 1-2 emojis naturally for warmth and energy.
- Do NOT use markdown.

RULES FOR COACH TIP:
- A quick, inspiring tip about progressing toward "Legend" rank.
- Frame it as an exciting journey, not a grind. E.g. "Her rutin seni Efsane'ye bir adım yaklaştırıyor!" / "Every routine completed brings you one step closer to Legend!"
- Mention XP remaining if relevant.
- Keep it actionable and motivating. 1 emoji max.

RESPOND WITH VALID JSON ONLY (no markdown, no code fences):
{
  "message": "Your daily message here...",
  "coachTip": "Your coach tip here..."
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    const message = String(parsed.message || "").trim();
    const coachTip = String(parsed.coachTip || "").trim();

    if (!message) throw new Error("Empty message");

    // 4) Cache'e kaydet
    await prisma.dailyCoachMessage.upsert({
      where: { userId_dayKey: { userId, dayKey } },
      create: { userId, dayKey, locale, message, coachTip: coachTip || null },
      update: { message, coachTip: coachTip || null, locale },
    });

    return { message, coachTip: coachTip || null, dayKey, hasApiKey: true };
  } catch (error) {
    console.error("[AI Coach] Daily message error:", error);
    return { message: null, coachTip: null, dayKey, hasApiKey: true };
  }
}
