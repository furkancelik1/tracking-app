import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPushNotification } from '@/actions/push.actions';

const CRON_SECRET = process.env.CRON_SECRET;

const MORNING_HOUR = 9;
const EVENING_HOUR = 21;

const MESSAGES = {
  tr: {
    morning: (count: number) => `Güne disiplinle başla. ${count} rutin bekliyor.`,
    evening: (count: number) => `Gün bitiyor. Eksik kalan ${count} rutinini tamamla.`,
  },
  en: {
    morning: (count: number) => `Start your day with discipline. ${count} routines await.`,
    evening: (count: number) => `The day is ending. Complete your ${count} remaining routines.`,
  },
};

export async function POST(req: NextRequest) {
  // Security: Only allow Vercel Cron
  const secret = req.nextUrl.searchParams.get('cron_secret');
  if (!secret || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const hour = now.getUTCHours();
  const slot = hour === MORNING_HOUR ? 'morning' : hour === EVENING_HOUR ? 'evening' : null;
  if (!slot) {
    return NextResponse.json({ error: 'Not a valid slot' }, { status: 400 });
  }

  // Fetch all users
  const users = await db.user.findMany({
    select: { id: true, locale: true },
  });

  for (const user of users) {
    // Fetch incomplete routines for today
    const routines = await db.routine.findMany({
      where: {
        userId: user.id,
        completed: false,
        date: now.toISOString().slice(0, 10), // YYYY-MM-DD
      },
    });
    if (routines.length === 0) continue;
    const locale = user.locale === 'tr' ? 'tr' : 'en';
    const message = MESSAGES[locale][slot](routines.length);
    await sendPushNotification({
      userId: user.id,
      title: 'ZenTrack',
      body: message,
    });
  }

  return NextResponse.json({ ok: true });
}
