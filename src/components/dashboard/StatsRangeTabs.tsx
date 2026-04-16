"use client";

import React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type StatsRangeValue = "7d" | "30d" | "all";

type Props = {
  value: StatsRangeValue;
};

const RANGE_OPTIONS: Array<{ value: StatsRangeValue; label: string }> = [
  { value: "7d", label: "Son 7 Gün" },
  { value: "30d", label: "Son 30 Gün" },
  { value: "all", label: "Tüm Zamanlar" },
];

export function StatsRangeTabs({ value }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onValueChange = (nextValue: string) => {
    if (nextValue !== "7d" && nextValue !== "30d" && nextValue !== "all") return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextValue);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 md:w-auto">
        {RANGE_OPTIONS.map((opt) => (
          <TabsTrigger key={opt.value} value={opt.value}>
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
