"use client";

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

export type CategorySlice = {
  category: string;
  count: number;
};

type Props = {
  data: CategorySlice[];
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

export function CategoryPieChart({ data }: Props) {
  const hasData = data.length > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Kategori Dağılımı</CardTitle>
        <CardDescription>Son 30 gündeki tamamlamalar</CardDescription>
      </CardHeader>
      <CardContent className="h-[260px]">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Henüz kategori verisi yok
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={82}
                innerRadius={48}
                paddingAngle={3}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="hsl(var(--background))"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                formatter={(value) => [value ?? 0, "Tamamlama"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
