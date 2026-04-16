"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const load = () => <Skeleton className="min-h-[260px] w-full rounded-xl" />;

/** recharts ağır — route ilk boyutunu düşürmek için ayrı chunk */
export const ActivityAreaChart = dynamic(
  () => import("./ActivityAreaChart").then((m) => m.ActivityAreaChart),
  { loading: load, ssr: false }
);

export const CategoryPieChart = dynamic(
  () => import("./CategoryPieChart").then((m) => m.CategoryPieChart),
  { loading: load, ssr: false }
);

export const ConsistencyRadarChart = dynamic(
  () => import("./ConsistencyRadarChart").then((m) => m.ConsistencyRadarChart),
  { loading: load, ssr: false }
);
