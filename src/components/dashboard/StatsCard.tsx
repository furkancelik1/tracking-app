"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  trend?: number; // pozitif = yukarı, negatif = aşağı, 0 = nötr
};

export function StatsCard({
  title,
  value,
  subtitle,
  description,
  icon,
  trend,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
    <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm hover:border-zinc-700/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon ? (
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {icon}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </span>
          {trend !== undefined && trend !== 0 && (
            <span
              className={cn(
                "text-xs font-medium mb-0.5",
                trend > 0 ? "text-emerald-500" : "text-red-400"
              )}
            >
              {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
          )}
        </div>
        {(subtitle || description) && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle || description}
          </p>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
}
