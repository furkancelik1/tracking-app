"use client";

import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SocialActivityFeedItem } from "@/actions/social.actions";
import { useLocale } from "next-intl";

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Props = {
  items: SocialActivityFeedItem[];
};

export function ActivityFeed({ items }: Props) {
  const t = useTranslations("social.activityFeed");
  const tc = useTranslations("common");
  const locale = useLocale();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black uppercase tracking-tight text-white">{t("title")}</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <motion.li
            key={`${item.kind}-${item.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.25 }}
            className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-gradient-to-r from-zinc-950/90 to-black/80 px-4 py-3"
          >
            <Avatar className="size-10 shrink-0 ring-1 ring-white/10">
              <AvatarImage src={item.userImage ?? undefined} alt={item.userName ?? tc("anonymous")} />
              <AvatarFallback className="bg-zinc-800 text-xs font-bold">
                {initials(item.userName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {item.userName ?? tc("anonymous")}
              </p>
              {item.kind === "completion" ? (
                <p className="text-sm text-zinc-400 mt-0.5">
                  <CheckCircle2 className="inline size-3.5 text-[#D6FF00] mr-1 align-text-bottom" />
                  {t("completedRoutine", { name: item.routineTitle })}
                </p>
              ) : (
                <p className="text-sm text-zinc-400 mt-0.5 flex items-center gap-1.5">
                  <Award className="size-3.5 text-amber-400 shrink-0" />
                  {t("earnedBadge", { badge: item.badgeName })}
                </p>
              )}
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 mt-1 tabular-nums">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                }).format(new Date(item.at))}
              </p>
            </div>
            {item.kind === "completion" && item.routineColor && (
              <span
                className="size-3 rounded-full shrink-0 mt-2 ring-2 ring-white/20"
                style={{ backgroundColor: item.routineColor }}
                aria-hidden
              />
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
