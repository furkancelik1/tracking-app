// â”€â”€â”€ ZenTrack Notification Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Single source of truth for all push notification copy.
// Tone: Stoic, direct, minimal. No emojis in body text.

export const NOTIFICATION_BRAND = {
  title: "ZenTrack",
  icon: "/icons/icon-192x192.png",
  badge: "/icons/icon-192x192.png",
  url: "/dashboard",
} as const;

// â”€â”€ Template types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type NotificationSlot = "morning" | "midday" | "evening";

type TemplateSet = {
  /** Single pending routine */
  single: (routineTitle: string) => string;
  /** Multiple pending routines */
  multiple: (count: number) => string;
  /** Streak at risk */
  streakRisk: (days: number) => string;
};

// â”€â”€ Templates by locale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    single: (t) => `"${t}" â€” last call. Close the day strong.`,
    multiple: (n) => `${n} routines unfinished. The day ends soon.`,
    streakRisk: (d) => `${d}-day streak ends tonight if you don't act.`,
  },
};

const tr: Record<NotificationSlot, TemplateSet> = {
  morning: {
    single: (t) => `"${t}" seni bekliyor. GÃ¼ne niyetle baÅŸla.`,
    multiple: (n) => `${n} rutin Ã¶nÃ¼nde. Disiplinli bir sabah gÃ¼nÃ¼n tonunu belirler.`,
    streakRisk: (d) => `${d} gÃ¼nlÃ¼k seri tehlikede. Zinciri kÄ±rma.`,
  },
  midday: {
    single: (t) => `"${t}" hÃ¢lÃ¢ bekliyor. Ã–ÄŸle kontrolÃ¼.`,
    multiple: (n) => `${n} rutin kaldÄ±. GÃ¼n daha bitmedi.`,
    streakRisk: (d) => `${d} gÃ¼nlÃ¼k seri risk altÄ±nda. HÃ¢lÃ¢ vakit var.`,
  },
  evening: {
    single: (t) => `"${t}" â€” son Ã§aÄŸrÄ±. GÃ¼nÃ¼ gÃ¼Ã§lÃ¼ kapat.`,
    multiple: (n) => `${n} rutin tamamlanmadÄ±. GÃ¼n bitiyor.`,
    streakRisk: (d) => `${d} gÃ¼nlÃ¼k seri bu gece sona erer, harekete geÃ§.`,
  },
};

const templates = { en, tr } as const;

// â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Test notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildTestPayload(locale: Locale) {
  const body = locale === "tr"
    ? "Push bildirimleri aktif. Her ÅŸey yolunda."
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
