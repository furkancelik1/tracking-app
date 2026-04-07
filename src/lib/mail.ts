import { Resend } from "resend";
import * as React from "react";
import { HabitReminder, type PendingRoutine } from "@/components/emails/HabitReminder";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Rutin Takipçisi <merhaba@furkancelik.online>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Rutin Hatırlatıcı ────────────────────────────────────────────────────────

export async function sendRoutineReminderEmail({
  to,
  userName,
  pendingRoutines,
}: {
  to: string;
  userName: string;
  pendingRoutines: PendingRoutine[];
}) {
  console.log("Mail gönderme aşamasına gelindi...", { to, pendingCount: pendingRoutines.length });

  try {
    const data = await resend.emails.send({
      from: FROM,
      to,
      subject: `🔥 ${pendingRoutines.length} rutinin bugün seni bekliyor!`,
      react: React.createElement(HabitReminder, {
        userName,
        pendingRoutines,
        dashboardUrl: `${APP_URL}/dashboard`,
        settingsUrl: `${APP_URL}/settings`,
      }),
    });

    console.log("Resend Yanıtı:", data);
    return data;
  } catch (error) {
    console.error("Resend Hatası:", error);
    throw error;
  }
}
