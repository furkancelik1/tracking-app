// ─── ZenTrack Notification Templates ──────────────────────────────────────────
// Single source of truth for all push notification copy.
// Tone: Stoic, direct, minimal. No emojis in body text.

export const NOTIFICATION_BRAND = {
  title: "ZenTrack",
  icon: "/icons/icon-192x192.png",
  badge: "/icons/icon-192x192.png",
  url: "/dashboard",
} as const;

// ── Template types ──────────────────────────────────────────────────────────

export type NotificationSlot = "morning" | "midday" | "evening";

type TemplateSet = {
  /** Single pending routine */
  single: (routineTitle: string) => string;
  /** Multiple pending routines */
  multiple: (count: number) => string;
  /** Streak at risk */
  streakRisk: (days: number) => string;
};

// ── Templates by locale ─────────────────────────────────────────────────────

const en: Record<NotificationSlot, TemplateSet> = {
  morning: {
    single: (t) => `"${t}" is waiting. Start your day with intention.`,
    multiple: (n) => `${n} routines ahead. A disciplined morning sets the tone.`,
    streakRisk: (d) => `${d}-day streak on the line. Don't break the chain.`,
  },
  midday: {
    single: (t) => `"${t}" is still pending. Midday check-in.`,
    multiple: (n) => `${n} routines remain. The day is not over yet.`,
    streakRisk: (d) => `${d}-day streak at risk. There's still time.`,
  },
  evening: {
    single: (t) => `"${t}" — last call. Close the day strong.`,
    multiple: (n) => `${n} routines unfinished. The day ends soon.`,
    streakRisk: (d) => `${d}-day streak ends tonight if you don't act.`,
  },
};

const tr: Record<NotificationSlot, TemplateSet> = {
  morning: {
    single: (t) => `"${t}" seni bekliyor. Güne niyetle başla.`,
    multiple: (n) => `${n} rutin önünde. Disiplinli bir sabah günün tonunu belirler.`,
    streakRisk: (d) => `${d} günlük seri tehlikede. Zinciri kırma.`,
  },
  midday: {
    single: (t) => `"${t}" hâlâ bekliyor. Öğle kontrolü.`,
    multiple: (n) => `${n} rutin kaldı. Gün daha bitmedi.`,
    streakRisk: (d) => `${d} günlük seri risk altında. Hâlâ vakit var.`,
  },
  evening: {
    single: (t) => `"${t}" — son çağrı. Günü güçlü kapat.`,
    multiple: (n) => `${n} rutin tamamlanmadı. Gün bitiyor.`,
    streakRisk: (d) => `${d} günlük seri bu gece sona erer, harekete geç.`,
  },
};

const templates = { en, tr } as const;

// ── Public API ──────────────────────────────────────────────────────────────

type Locale = "en" | "tr";

interface PendingRoutine {
  title: string;
  currentStreak: number;
}

export function buildNotificationBody(
  locale: Locale,
  slot: NotificationSlot,
  pending: PendingRoutine[],
): string {
  const t = templates[locale]?.[slot] ?? templates.en[slot];
  const maxStreak = Math.max(...pending.map((r) => r.currentStreak), 0);

  // Streak at risk takes priority
  if (maxStreak >= 3) {
    return t.streakRisk(maxStreak);
  }

  if (pending.length === 1 && pending[0]) {
    return t.single(pending[0].title);
  }

  return t.multiple(pending.length);
}

export function buildPushPayload(
  locale: Locale,
  slot: NotificationSlot,
  pending: PendingRoutine[],
) {
  return {
    title: NOTIFICATION_BRAND.title,
    body: buildNotificationBody(locale, slot, pending),
    icon: NOTIFICATION_BRAND.icon,
    badge: NOTIFICATION_BRAND.badge,
    url: NOTIFICATION_BRAND.url,
    tag: `routine-${slot}`,
  };
}

// ── Test notification ───────────────────────────────────────────────────────

export function buildTestPayload(locale: Locale) {
  const body = locale === "tr"
    ? "Push bildirimleri aktif. Her şey yolunda."
    : "Push notifications active. Everything is working.";

  return {
    title: NOTIFICATION_BRAND.title,
    body,
    icon: NOTIFICATION_BRAND.icon,
    badge: NOTIFICATION_BRAND.badge,
    url: NOTIFICATION_BRAND.url,
    tag: "test-push",
  };
}
