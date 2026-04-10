import { Resend } from "resend";
import * as React from "react";
import { HabitReminder, type PendingRoutine } from "@/components/emails/HabitReminder";
import en from "../../messages/en.json";
import tr from "../../messages/tr.json";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const dictionaries = { en, tr } as const;
type Lang = keyof typeof dictionaries;

function getEmailTexts(lang: Lang, count: number, firstName: string, atRiskCount: number) {
  const d = dictionaries[lang]?.email?.reminder ?? dictionaries.en.email.reminder;
  return {
    badge: d.badge,
    headerTitle: d.headerTitle,
    headerSub: d.headerSub.replace("{count}", String(count)),
    greeting: d.greeting.replace("{name}", firstName),
    lead: d.lead.replace(/{count}/g, String(count)),
    alertRisk: d.alertRisk.replace(/{count}/g, String(atRiskCount)),
    cta: d.cta,
    footerText: d.footer,
    unsubscribe: d.unsubscribe,
    dayUnit: lang === "tr" ? "gün" : "days",
    copyright: `© ${new Date().getFullYear()} ${dictionaries[lang]?.common?.appName ?? "Routine Tracker"}`,
  };
}

function getFromName(lang: Lang) {
  return lang === "tr"
    ? "Rutin Takipçisi <merhaba@furkancelik.online>"
    : "Routine Tracker <merhaba@furkancelik.online>";
}

function getSubject(lang: Lang, count: number) {
  return lang === "tr"
    ? `🔥 ${count} rutinin bugün seni bekliyor!`
    : `🔥 ${count} routines are waiting for you today!`;
}

// ─── Rutin Hatırlatıcı ────────────────────────────────────────────────────────

export async function sendRoutineReminderEmail({
  to,
  userName,
  pendingRoutines,
  language = "en",
}: {
  to: string;
  userName: string;
  pendingRoutines: PendingRoutine[];
  language?: string;
}) {
  const lang = (language in dictionaries ? language : "en") as Lang;
  const firstName = userName.split(" ")[0] || userName;
  const atRisk = pendingRoutines.filter((r) => r.currentStreak >= 3);
  const texts = getEmailTexts(lang, pendingRoutines.length, firstName, atRisk.length);

  try {
    const data = await resend.emails.send({
      from: getFromName(lang),
      to,
      subject: getSubject(lang, pendingRoutines.length),
      react: React.createElement(HabitReminder, {
        pendingRoutines,
        dashboardUrl: `${APP_URL}/dashboard`,
        settingsUrl: `${APP_URL}/settings`,
        texts,
      }),
    });

    return data;
  } catch (error) {
    console.error("Resend Error:", error);
    throw error;
  }
}
