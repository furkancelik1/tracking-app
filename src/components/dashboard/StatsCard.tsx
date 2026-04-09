import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReactNode } from "react";

type StatsCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
};

export function StatsCard({ title, value, description, icon }: StatsCardProps) {
  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        {description ? (
          <CardDescription className="mt-1">{description}</CardDescription>
        ) : null}
      </CardContent>
    </Card>
  );
}
