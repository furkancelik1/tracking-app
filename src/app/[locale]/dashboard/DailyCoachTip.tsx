// src/components/dashboard/DailyCoachTip.tsx
import React, { useState } from 'react';

const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setStoredValue = (value: T | ((prevValue: T) => T)) => {
    try {
      setValue((prevValue) => {
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.log(error);
    }
  };

  return [value, setStoredValue] as const;
};
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
  const [coachTips, setCoachTips] = useLocalStorage<LocalCoachTip[]>('coachTips', []);

  // İşlemi için bir günlük ipucu seç
  const selectDailyTip = () => {
    const dailyTip = coachTips.find((tip) => !tip.seen);
    if (dailyTip) {
      setCoachTips((prevTips) =>
        prevTips.map((tip) => (tip === dailyTip ? { ...dailyTip, seen: true } : tip))
      );
    }
  };

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