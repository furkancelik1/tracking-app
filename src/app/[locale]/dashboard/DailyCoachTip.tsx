"use client";

// src/app/[locale]/dashboard/DailyCoachTip.tsx
import React, { useEffect, useState } from "react";
// Prisma schema: DailyCoachMessage
// match the Prisma model exactly here
interface CoachTip {
  message: string;
  coachTip?: string | null;
}

type LocalCoachTip = CoachTip & { seen?: boolean };

interface Props {
  tip: CoachTip;
}

const DailyCoachTip = ({ tip }: Props) => {
  const [isMounted, setIsMounted] = useState(false);
  const [coachTips, setCoachTips] = useState<LocalCoachTip[]>([]);

  useEffect(() => {
    setIsMounted(true);
    try {
      const raw = window.localStorage.getItem("coachTips");
      if (raw) setCoachTips(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  const setStoredCoachTips = (next: LocalCoachTip[] | ((prev: LocalCoachTip[]) => LocalCoachTip[])) => {
    setCoachTips((prev) => {
      const value = next instanceof Function ? next(prev) : next;
      try {
        window.localStorage.setItem("coachTips", JSON.stringify(value));
      } catch (_) {}
      return value;
    });
  };

  // İşlemi için bir günlük ipucu seç
  const selectDailyTip = () => {
    const dailyTip = coachTips.find((t) => !t.seen);
    if (dailyTip) {
      setStoredCoachTips((prevTips) =>
        prevTips.map((t) => (t === dailyTip ? { ...dailyTip, seen: true } : t))
      );
    }
  };

  if (!isMounted) {
    return (
      <div className="h-24 w-full animate-pulse rounded-md bg-zinc-900/10" aria-hidden />
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-bold">Koçun Notu</h2>
      <p className="text-gray-600">{tip.message}</p>
      {tip.coachTip ? (
        <p className="mt-2 text-sm italic text-[#D6FF00]/90">{tip.coachTip}</p>
      ) : null}
      <button
        className="mt-3 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={selectDailyTip}
      >
        Günlük Tavsiye Al
      </button>
    </div>
  );
};

export default DailyCoachTip;