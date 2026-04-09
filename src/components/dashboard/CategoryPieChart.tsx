"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type CategorySlice = {
  category: string;
  count: number;
};

type Props = {
  data: CategorySlice[];
  rangeDays?: number;
};

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

export function CategoryPieChart({ data, rangeDays = 30 }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const safeData = data ?? [];
  const hasData = safeData.length > 0;
  const total = safeData.reduce((s, d) => s + (d.count ?? 0), 0);

  return (
    <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Kategori Dağılımı</CardTitle>
            <CardDescription className="mt-0.5">
              Son {rangeDays} günde tamamlamalar
            </CardDescription>
          </div>
          {hasData && (
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold tabular-nums">{safeData.length}</p>
              <p className="text-[11px] text-muted-foreground">Kategori</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            Henüz kategori verisi yok
          </div>
        ) : !mounted ? (
          <div className="h-[260px] min-h-0 w-full">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : (
          <div className="h-[260px] min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={safeData}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={82}
                innerRadius={48}
                paddingAngle={3}
                label={({ name, value }: { name?: string; value?: number }) =>
                  `${name ?? ""} (${Math.round(((value ?? 0) / total) * 100)}%)`
                }
                labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
              >
                {safeData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                  boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                }}
                formatter={(value, name) => [
                  `${value} (${Math.round((Number(value ?? 0) / total) * 100)}%)`,
                  String(name),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
