"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  subDays,
  format,
  getISOWeek,
  getISOWeekYear,
  eachDayOfInterval,
  getDay,
} from "date-fns";

// ─── Rate-limit cooldown (module-level, survives across requests in same process) ──
let _geminiCooldownUntil = 0; // epoch ms — skip Gemini calls until this time
const COOLDOWN_MS = 5 * 60 * 1000; // 5 min cooldown after a 429

// ─── Dual-Model Yapılandırması ───────────────────────────────────────────────
const MODEL_FLASH = "gemini-2.5-flash";
const MODEL_PRO   = "gemini-2.5-pro";

type AnalysisDepth = "weekly" | "deep";

/** Ay sonuna yakınlık kontrolü — son 5 gün ise deep analiz */
function resolveAnalysisDepth(): AnalysisDepth {
  const now = new Date();
  const dayOfMonth = now.getUTCDate();
  const lastDayOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
  const daysUntilEnd = lastDayOfMonth - dayOfMonth;
  return daysUntilEnd <= 4 ? "deep" : "weekly";
}

function pickModel(depth: AnalysisDepth): string {
  return depth === "deep" ? MODEL_PRO : MODEL_FLASH;
}

// ─── Motive Edici Mentor — Sabit Kişilik Sistemi ────────────────────────────
const MENTOR_SYSTEM_PROMPT = `Sen tutkulu, duygusal zekâsı yüksek bir Motive Edici Mentor'sun — kısmen yaşam koçu, kısmen amigo, kısmen bilge bir dost. Kullanıcının gelişimini gerçekten önemsiyorsun ve her başarıyı kendi başarın gibi kutluyorsun.

KİŞİLİK KURALLARIN:
- Tamamlama oranı YÜKSEK (≥%75): HEYECANLI ve kutlamacı ol. "İnanılmaz bir hafta geçirdin!" gibi enerjik dil kullan.
- Tamamlama oranı ORTA (%40-74): Sıcak ve cesaretlendirici ol. Çabayı kabul et, iyi gideni vurgula, nazikçe geliştirme öner.
- Tamamlama oranı DÜŞÜK (<%40): ASLA yargılama veya eleştirme. "Bazen planlar değişebilir, önemli olan bugün küçük bir adımla yeniden başlaman. Ben sana inanıyorum." de.
- Her zaman kullanıcının arkasında duran güvenilir bir mentor gibi konuş.
- Emoji kullan (maks 3-4) ama doğal olsun.
- Markdown başlıkları KULLANMA. Düz metin ve satır sonları kullan.`;

/** UTC midnight of today */
function todayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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
  const today = todayUTC();
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
    const dayStart = new Date(d);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const count = logs.filter(
      (l) => l.completedAt >= dayStart && l.completedAt <= dayEnd
    ).length;
    return { date: d, dayIndex: getDay(d), count };
  });

  const best = dayCompletions.length > 0
    ? dayCompletions.reduce((a, b) => (b.count > a.count ? b : a))
    : undefined;
  const worst = dayCompletions.length > 0
    ? dayCompletions.reduce((a, b) => (b.count < a.count ? b : a))
    : undefined;

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

    const top = sorted[0];
    if (top) {
      topRoutine = { title: top.title, completions: top.completions };
    }

    const weakest = sorted[sorted.length - 1];
    if (weakest) {
      weakestRoutine = {
        title: weakest.title,
        completions: weakest.completions,
        missed: 7 - weakest.completions,
      };
    }
  }

  const longestActiveStreak = routines.reduce((max, r) => Math.max(max, r.currentStreak), 0);

  return {
    totalRoutines: dailyRoutines.length,
    totalCompletions,
    possibleCompletions,
    completionRate,
    bestDay: {
      day: best ? (DAY_NAMES_EN[best.dayIndex] ?? "—") : "—",
      count: best?.count ?? 0,
    },
    worstDay: {
      day: worst ? (DAY_NAMES_EN[worst.dayIndex] ?? "—") : "—",
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

type TrendContext = {
  dailyScores: { day: string; score: number }[];
  avgScore: number;
  trend: "up" | "down" | "stable";
  streakDays: number;
  biggestDrop: { from: string; to: string; delta: number } | null;
  biggestSurge: { from: string; to: string; delta: number } | null;
};

/** Inline trend context hesapla (stats.actions bağımlılığı olmadan) */
async function buildTrendContext(userId: string, locale: string): Promise<TrendContext> {
  const SHORT_DAYS_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const SHORT_DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNames = locale === "tr" ? SHORT_DAYS_TR : SHORT_DAYS_EN;

  const today = todayUTC();
  const weekAgo = subDays(today, 6);

  const [dailyRoutines, logs] = await Promise.all([
    prisma.routine.count({ where: { userId, isActive: true, frequency: "DAILY" } }),
    prisma.routineLog.findMany({
      where: { userId, completedAt: { gte: weekAgo } },
      select: { completedAt: true },
    }),
  ]);

  const days = eachDayOfInterval({ start: weekAgo, end: today });
  const scores = days.map((d) => {
    const dayStart = new Date(d); dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setUTCHours(23, 59, 59, 999);
    const completed = logs.filter((l) => l.completedAt >= dayStart && l.completedAt <= dayEnd).length;
    const score = dailyRoutines > 0 ? Math.round((completed / dailyRoutines) * 100) : 0;
    return { day: dayNames[getDay(d)] ?? "", score };
  });

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, p) => s + p.score, 0) / scores.length) : 0;

  const mid = Math.floor(scores.length / 2);
  const avgFirst = scores.slice(0, mid).reduce((s, p) => s + p.score, 0) / Math.max(1, mid);
  const avgSecond = scores.slice(mid).reduce((s, p) => s + p.score, 0) / Math.max(1, scores.length - mid);
  const diff = avgSecond - avgFirst;
  const trend: TrendContext["trend"] = diff > 10 ? "up" : diff < -10 ? "down" : "stable";

  let streakDays = 0;
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i]!.score >= 50) streakDays++;
    else break;
  }

  let biggestDrop: TrendContext["biggestDrop"] = null;
  let biggestSurge: TrendContext["biggestSurge"] = null;
  for (let i = 1; i < scores.length; i++) {
    const delta = scores[i]!.score - scores[i - 1]!.score;
    if (delta < 0 && (!biggestDrop || delta < biggestDrop.delta))
      biggestDrop = { from: scores[i - 1]!.day, to: scores[i]!.day, delta };
    if (delta > 0 && (!biggestSurge || delta > biggestSurge.delta))
      biggestSurge = { from: scores[i - 1]!.day, to: scores[i]!.day, delta };
  }

  return { dailyScores: scores, avgScore, trend, streakDays, biggestDrop, biggestSurge };
}

async function generateInsightWithAI(
  data: WeeklySummaryData,
  locale: string,
  depthOverride?: AnalysisDepth,
  trendCtx?: TrendContext | null
): Promise<{ insight: string; challenge: AIChallengeData; successHighlight: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const depth = depthOverride ?? resolveAnalysisDepth();
  const selectedModel = pickModel(depth);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: selectedModel,
    systemInstruction: MENTOR_SYSTEM_PROMPT,
  });

  const langInstruction = locale === "tr"
    ? "Yanıtını tamamen Türkçe yaz."
    : "Write your response entirely in English.";

  // Find weakest category for challenge targeting
  const weakestCategory = data.categoryBreakdown.length > 0
    ? [...data.categoryBreakdown].sort((a, b) => a.rate - b.rate)[0]
    : null;

  const depthLabel = depth === "deep" ? "DEEP MONTHLY ANALYSIS" : "WEEKLY SUMMARY";

  const prompt = `Analyze the user's routine data and provide THREE things (${depthLabel}):
1. An insightful, emotionally resonant ${depth === "deep" ? "monthly deep-dive analysis" : "weekly summary"}
2. An inspiring personalized challenge for ${depth === "deep" ? "next month" : "next week"}
3. A success highlight badge

${langInstruction}

${depth === "deep" ? `DEEP ANALYSIS MODE: This is an end-of-month review. Be more thorough, reference long-term patterns, mention monthly trends, and provide deeper strategic advice. Use 200-300 words.` : ""}

RULES FOR INSIGHT:
- Keep the response between ${depth === "deep" ? "200-300" : "150-250"} words.
- Use 2-3 short paragraphs.
- Start with an emotionally appropriate greeting based on performance level.
- Reference specific data (category rates, streaks, best/worst days) but wrap them in human, empathetic language — not cold statistics.
- End with 1-2 actionable, concrete tips framed as exciting opportunities, not obligations.
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

DAILY DISCIPLINE TREND (chart data):
${trendCtx ? `- Daily scores: ${trendCtx.dailyScores.map((d) => `${d.day}: ${d.score}%`).join(" → ")}
- Week average: ${trendCtx.avgScore}%
- Trend direction: ${trendCtx.trend === "up" ? "📈 IMPROVING" : trendCtx.trend === "down" ? "📉 DECLINING" : "➡️ STABLE"}
- Consecutive days ≥50%: ${trendCtx.streakDays}
${trendCtx.biggestDrop ? `- ⚠️ Biggest drop: ${trendCtx.biggestDrop.from} → ${trendCtx.biggestDrop.to} (${trendCtx.biggestDrop.delta}%)` : "- No significant drops"}
${trendCtx.biggestSurge ? `- 🚀 Biggest surge: ${trendCtx.biggestSurge.from} → ${trendCtx.biggestSurge.to} (+${trendCtx.biggestSurge.delta}%)` : "- No significant surges"}` : "- Trend data not available"}

IMPORTANT: If there is a big drop in the daily scores, acknowledge it empathetically and suggest how to prevent it. If there is a surge, celebrate it enthusiastically!

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

  let text = "";
  const MAX_RETRIES = 1;
  let lastError: any;
  let currentModel = selectedModel;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AI Coach] 📤 İstek Gönderiliyor... (attempt ${attempt + 1}/${MAX_RETRIES + 1}, model: ${currentModel}, depth: ${depth}, locale:`, locale, ")");
      const activeModel = genAI.getGenerativeModel({
        model: currentModel,
        systemInstruction: MENTOR_SYSTEM_PROMPT,
      });
      const result = await activeModel.generateContent(prompt);
      const response = result.response;
      text = response.text();
      console.log(`[AI Coach] ✅ Yanıt Alındı! (model: ${currentModel}) Response length:`, text?.length ?? 0);
      lastError = null;
      break;
    } catch (apiError: any) {
      lastError = apiError;
      const status = apiError?.status ?? apiError?.code ?? "unknown";
      const msg = apiError?.message ?? String(apiError);
      // URL'yi hata mesajından çıkar
      const urlMatch = msg.match(/https:\/\/[^\s:]+/);
      const failedUrl = urlMatch ? urlMatch[0] : "unknown";
      console.error(`[AI Insight] Gemini API call FAILED (attempt ${attempt + 1}, model: ${currentModel}) — status: ${status}`);
      console.error(`[AI Insight] 404 Hatası Alınan URL: ${failedUrl}`);
      console.error(`[AI Insight] Error message: ${msg}`);

      const is404 = String(status) === "404" || msg.includes("404") || msg.toLowerCase().includes("not found");
      const is429 = msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("quota");

      // 404 = model bulunamadı → hemen Flash'a düş
      if (is404 && currentModel !== MODEL_FLASH && attempt < MAX_RETRIES) {
        console.warn(`[AI Insight] ⚠️ Model '${currentModel}' bulunamadı (404) — ${MODEL_FLASH} modeline geri dönülüyor...`);
        currentModel = MODEL_FLASH;
        continue;
      }

      // Pro model failed → fallback to Flash
      if (currentModel === MODEL_PRO && attempt < MAX_RETRIES) {
        console.warn(`[AI Insight] ⚠️ ${MODEL_PRO} başarısız — ${MODEL_FLASH} modeline geri dönülüyor (fallback)...`);
        currentModel = MODEL_FLASH;
        if (is429) {
          const delayMatch = msg.match(/retry in ([\d.]+)s/i);
          const waitMs = Math.min(delayMatch ? Math.ceil(parseFloat(delayMatch[1])) * 1000 : 5_000, 15_000);
          console.log(`[AI Insight] Waiting ${waitMs / 1000}s before fallback retry...`);
          await new Promise((r) => setTimeout(r, waitMs));
        }
        continue;
      }

      if (is429) {
        const delayMatch = msg.match(/retry in ([\d.]+)s/i);
        const suggestedDelay = delayMatch ? Math.ceil(parseFloat(delayMatch[1])) * 1000 : 35_000;

        _geminiCooldownUntil = Date.now() + COOLDOWN_MS;
        console.error(`[AI Insight] >>> RATE LIMIT / QUOTA exceeded. Cooldown set for ${COOLDOWN_MS / 1000}s.`);

        if (attempt < MAX_RETRIES) {
          const waitMs = Math.min(suggestedDelay, 40_000);
          console.log(`[AI Insight] Waiting ${waitMs / 1000}s before retry...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      } else if (msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("invalid") || msg.includes("401") || msg.includes("403")) {
        console.error("[AI Insight] >>> INVALID API KEY or permission denied. Check GEMINI_API_KEY.");
      }
      if (!is429) break;
    }
  }

  if (lastError) {
    throw lastError;
  }

  if (!text || text.trim().length === 0) {
    console.error("[AI Insight] Gemini returned EMPTY response body.");
    throw new Error("AI returned an empty response");
  }

  // Parse JSON response — strip possible code fences
  const cleaned = text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.insight || !parsed.challenge) {
      console.error("[AI Insight] Parsed JSON missing required fields. Keys found:", Object.keys(parsed));
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
  } catch (parseError) {
    console.error("[AI Insight] JSON parse failed. Raw text (first 500 chars):", cleaned.slice(0, 500));
    console.error("[AI Insight] Parse error:", parseError);
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

export async function getWeeklyInsightAction(
  options?: { force?: boolean }
): Promise<WeeklyInsightPayload> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const locale = (session.user as any).language ?? "en";
  const weekKey = getCurrentWeekKey();
  const force = options?.force ?? false;

  console.log(`[AI Insight] getWeeklyInsightAction called — userId: ${userId}, weekKey: ${weekKey}, locale: ${locale}, force: ${force}`);

  // 1) Cache'de var mı kontrol et
  const cached = await prisma.weeklyInsight.findUnique({
    where: { userId_weekKey: { userId, weekKey } },
  });

  console.log(`[AI Insight] Cache lookup result: ${cached ? `FOUND (id: ${cached.id}, summary length: ${cached.summary?.length})` : "NOT FOUND"}`);

  if (cached && !force) {
    // Challenge yoksa — AI ile oluştur ve kaydet
    if (!cached.challengeTitle && !cached.challengeCompleted) {
      try {
        console.log("[AI Insight] Cache hit but no challenge — generating challenge via AI...");
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
      } catch (challengeErr) {
        console.error("[AI Insight] Failed to back-fill challenge:", challengeErr);
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
      where: { userId, completedAt: { gte: subDays(todayUTC(), 6) } },
    }),
  ]);

  console.log(`[AI Insight] Data check — activeRoutines: ${routineCount}, logsLast7Days: ${logCount}`);

  if (routineCount === 0 || logCount === 0) {
    console.log("[AI Insight] Insufficient data — returning empty payload.");
    return {
      id: null, insight: null, weekKey, generatedAt: null,
      challengeTitle: null, challengeDescription: null, challengeCategory: null,
      challengeTarget: 0, challengeProgress: 0, challengeCompleted: false,
      successHighlight: null,
    };
  }

  // 3) Rate-limit cooldown kontrolü
  if (Date.now() < _geminiCooldownUntil) {
    const secsLeft = Math.ceil((_geminiCooldownUntil - Date.now()) / 1000);
    console.warn(`[AI Insight] ⏳ Gemini cooldown active — ${secsLeft}s remaining. Returning empty.`);
    return {
      id: null, insight: null, weekKey, generatedAt: null,
      challengeTitle: null, challengeDescription: null, challengeCategory: null,
      challengeTarget: 0, challengeProgress: 0, challengeCompleted: false,
      successHighlight: null,
    };
  }

  // 4) Veri topla + AI'dan insight al
  try {
    console.log("[AI Insight] Generating fresh insight via Gemini...");
    const data = await collectWeeklyData(userId);
    const trendCtx = await buildTrendContext(userId, locale);
    console.log(`[AI Insight] Weekly data collected — completionRate: ${data.completionRate}%, totalCompletions: ${data.totalCompletions}/${data.possibleCompletions}, trend: ${trendCtx.trend}`);
    const { insight, challenge, successHighlight } = await generateInsightWithAI(data, locale, undefined, trendCtx);

    // 5) Cache'e kaydet (upsert — race condition koruması)
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

    console.log(`[AI Insight] ✅ Insight başarıyla kaydedildi! (id: ${saved.id}, weekKey: ${weekKey}, userId: ${userId})`);

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
  } catch (error: any) {
    console.error("[AI Insight] ✘ FULL ERROR generating insight:");
    console.error("[AI Insight] Error name:", error?.name);
    console.error("[AI Insight] Error message:", error?.message);
    console.error("[AI Insight] Error stack:", error?.stack?.slice(0, 500));
    if (error?.status) console.error(`[AI Insight] HTTP status: ${error.status} — requested URL: ${error?.url ?? error?.requestUrl ?? "unknown"}`);
    if (error?.errorDetails) console.error("[AI Insight] Error details:", JSON.stringify(error.errorDetails));

    // Dummy data fallback — kullanıcıya statik mesaj dön
    const dummyInsight = locale === "tr"
      ? "Şu an koçluk verilerine ulaşılamıyor. Verileriniz hazır olduğunda AI Koç devreye girecek. Bu arada rutinlerinizi tamamlamaya devam edin! 💪"
      : "Coaching data is temporarily unavailable. Your AI Coach will activate once your data is ready. Keep completing your routines! 💪";

    return {
      id: null, insight: dummyInsight, weekKey, generatedAt: null,
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
        completedAt: { gte: subDays(todayUTC(), 6) },
      },
    });

    if (logCount === 0) {
      stats.skipped++;
      continue;
    }

    try {
      const data = await collectWeeklyData(user.id);
      const locale = user.language === "tr" ? "tr" : "en";
      const trendCtx = await buildTrendContext(user.id, locale);
      const { insight, challenge, successHighlight } = await generateInsightWithAI(data, locale, undefined, trendCtx);

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

      console.log(`[AI Cron] ✅ Insight başarıyla kaydedildi! (userId: ${user.id}, weekKey: ${weekKey})`);
      stats.generated++;
    } catch (cronErr: any) {
      console.error(`[AI Cron] Failed for user ${user.id}:`, cronErr?.message ?? cronErr);
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
  const todayStart = todayUTC();
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
    const model = genAI.getGenerativeModel({
      model: MODEL_FLASH,
      systemInstruction: MENTOR_SYSTEM_PROMPT,
    });

    const langInstruction = locale === "tr"
      ? "Yanıtını tamamen Türkçe yaz."
      : "Write your response entirely in English.";

    const greeting = userName
      ? (locale === "tr" ? `Kullanıcının adı: ${userName}` : `User's name: ${userName}`)
      : "";

    const prompt = `Greet the user and provide daily motivation.
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

RULES:
- Start each message with an energetic, positive greeting. Make mornings exciting!
- If there are pending routines: be enthusiastic about the opportunity ahead, mention specific routine names, and hype them up.
- If a routine has a high streak (≥5): express excitement about the streak AND urgency about protecting it. E.g. "14 günlük serin inanılmaz, bugün bozma!" / "Your 14-day streak is fire, don't let it slip!"
- If all routines are already completed: celebrate wildly! Make the user feel like a hero.
- If routines have been missed recently: be SUPPORTIVE, never guilt-trip. Frame it as a fresh start.
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

    console.log(`[AI Coach] 📤 Günlük koç mesajı isteği gönderiliyor... (model: ${MODEL_FLASH})`);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("[AI Coach] ✅ Günlük koç mesajı yanıtı alındı! Length:", text?.length ?? 0);
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
  } catch (error: any) {
    const errMsg = error?.message ?? String(error);
    const urlMatch = errMsg.match(/https:\/\/[^\s:]+/);
    const failedUrl = urlMatch ? urlMatch[0] : "unknown";
    console.error("[AI Coach] Daily message error:");
    console.error("[AI Coach] Error name:", error?.name);
    console.error("[AI Coach] Error message:", errMsg);
    if (error?.status) console.error(`[AI Coach] HTTP status: ${error.status} — URL: ${failedUrl}`);

    // Dummy fallback — kullanıcıya statik mesaj dön
    const dummyMessage = locale === "tr"
      ? "Günaydın! Şu an koçluk verilerine ulaşılamıyor ama rutinlerin seni bekliyor. Bugün küçük bir adımla başla! 💪"
      : "Good morning! Coaching data is temporarily unavailable, but your routines are waiting. Start with a small step today! 💪";

    return { message: dummyMessage, coachTip: null, dayKey, hasApiKey: true };
  }
}
