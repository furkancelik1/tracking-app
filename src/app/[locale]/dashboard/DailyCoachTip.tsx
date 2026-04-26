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
import { CoachTip } from '../../../types';

interface Props {
  tip: CoachTip;
}

const DailyCoachTip = ({ tip }: Props) => {
  const [coachTips, setCoachTips] = useLocalStorage<CoachTip[]>('coachTips', []);

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
      <h2 className="text-lg font-bold">{tip.title}</h2>
      <p className="text-gray-600">{tip.message}</p>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={selectDailyTip}
      >
        Günlük Tavsiye Al
      </button>
    </div>
  );
};

export default DailyCoachTip;