import { Resend } from "resend";
import * as React from "react";
import { HabitReminder, type PendingRoutine } from "@/components/emails/HabitReminder";
import { WeeklyInsightEmail } from "@/components/emails/WeeklyInsightEmail";
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
    dayUnit: lang === "tr" ? "gÃ¼n" : "days",
    copyright: `Â© ${new Date().getFullYear()} ${dictionaries[lang]?.common?.appName ?? "Zenith"}`,
  };
}

function getFromName(lang: Lang) {
  return lang === "tr"
    ? "Zenith <merhaba@furkancelik.online>"
    : "Zenith <merhaba@furkancelik.online>";
}

function getSubject(lang: Lang, count: number) {
  return lang === "tr"
    ? `ğŸ”¥ ${count} rutinin bugÃ¼n seni bekliyor!`
    : `ğŸ”¥ ${count} routines are waiting for you today!`;
}

// â”€â”€â”€ Rutin HatÄ±rlatÄ±cÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ HaftalÄ±k AI Insight E-postasÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function sendWeeklyInsightEmail({
  to,
  userName,
  insight,
  language = "en",
}: {
  to: string;
  userName: string;
  insight: string;
  language?: string;
}) {
  const lang = (language in dictionaries ? language : "en") as Lang;
  const firstName = userName.split(" ")[0] || userName;
  const d = (dictionaries[lang] as any)?.aiInsight ?? (dictionaries.en as any).aiInsight;

  const texts = {
    badge: "ğŸ§  AI Coach",
    headerTitle: d.emailTitle,
    greeting: d.emailGreeting.replace("{name}", firstName),
    intro: d.emailIntro,
    cta: d.emailCta,
    footerText: d.emailFooter,
    unsubscribe: dictionaries[lang]?.email?.reminder?.unsubscribe ?? "Unsubscribe",
    copyright: `Â© ${new Date().getFullYear()} ${dictionaries[lang]?.common?.appName ?? "Zenith"}`,
  };

  const subject = d.emailSubject;

  try {
    const data = await resend.emails.send({
      from: getFromName(lang),
      to,
      subject,
      react: React.createElement(WeeklyInsightEmail, {
        insight,
        dashboardUrl: `${APP_URL}/dashboard`,
        settingsUrl: `${APP_URL}/settings`,
        texts,
      }),
    });

    return data;
  } catch (error) {
    console.error("Resend Weekly Insight Error:", error);
    throw error;
  }
}
