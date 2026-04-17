"use client";

import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, CheckCircle2, Hand, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SocialActivityFeedItem } from "@/actions/social.actions";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

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
  const [kudosId, setKudosId] = React.useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.985 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black uppercase tracking-tight text-white">{t("title")}</h2>
      <motion.ul variants={listVariants} initial="hidden" animate="show" className="space-y-3">
        {items.map((item) => {
          const itemKey = `${item.kind}-${item.id}`;
          const formattedDate = new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          }).format(new Date(item.at));

          if (item.kind === "badge") {
            return (
              <motion.li
                key={itemKey}
                variants={cardVariants}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950 to-black p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 shrink-0 ring-1 ring-white/10">
                    <AvatarImage src={item.userImage ?? undefined} alt={item.userName ?? tc("anonymous")} />
                    <AvatarFallback className="bg-zinc-800 text-xs font-bold">
                      {initials(item.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{item.userName ?? tc("anonymous")}</p>
                    <p className="text-sm text-zinc-400 mt-0.5 flex items-center gap-1.5">
                      <Award className="size-3.5 text-amber-400 shrink-0" />
                      {t("earnedBadge", { badge: item.badgeName })}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600">{formattedDate}</span>
                </div>
              </motion.li>
            );
          }

          const intensityColor =
            item.routineIntensity === "HIGH"
              ? "text-red-400"
              : item.routineIntensity === "LOW"
                ? "text-sky-300"
                : "text-[#D6FF00]";

          const showGlow = kudosId === itemKey;
          return (
            <motion.li
              key={itemKey}
              variants={cardVariants}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black p-5"
            >
              {item.routineImageUrl ? (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-40"
                    style={{ backgroundImage: `url(${item.routineImageUrl})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-900" />
                  <div className="absolute -top-20 -right-10 size-56 rounded-full bg-[#D6FF00]/10 blur-3xl" />
                </>
              )}

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-11 shrink-0 ring-1 ring-white/20">
                    <AvatarImage src={item.userImage ?? undefined} alt={item.userName ?? tc("anonymous")} />
                    <AvatarFallback className="bg-zinc-800 text-xs font-bold">
                      {initials(item.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-lg font-black tracking-tight text-white truncate">
                      {item.userName ?? tc("anonymous")}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{formattedDate}</p>
                  </div>
                </div>
                <span className={cn("text-xs font-black uppercase tracking-[0.18em]", intensityColor)}>
                  {item.routineIntensity}
                </span>
              </div>

              <div className="relative z-10 mt-6">
                <p className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                  {item.routineTitle}
                </p>
                <p className="mt-1 text-sm sm:text-base text-zinc-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#D6FF00]" />
                  {item.estimatedMinutes} dk antrenman tamamlandı
                </p>
              </div>

              <div className="relative z-10 mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setKudosId(itemKey);
                    window.setTimeout(() => {
                      setKudosId((prev) => (prev === itemKey ? null : prev));
                    }, 420);
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest transition",
                    "border-[#D6FF00]/35 text-[#D6FF00] hover:bg-[#D6FF00]/10",
                    showGlow && "shadow-[0_0_24px_rgba(214,255,0,0.45)] bg-[#D6FF00]/15"
                  )}
                >
                  <Hand className={cn("size-3.5", showGlow && "animate-pulse")} />
                  Tebrik Et
                </button>
                {!item.routineImageUrl && (
                  <span className="inline-flex items-center gap-1 text-[#D6FF00]/80 text-xs font-semibold">
                    <Zap className="size-3.5" />
                    NTC Mode
                  </span>
                )}
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-44 rounded bg-zinc-800/70 animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5"
        >
          <div className="h-11 w-11 rounded-full bg-zinc-800/80 animate-pulse" />
          <div className="mt-4 h-7 w-2/3 rounded bg-zinc-800/70 animate-pulse" />
          <div className="mt-2 h-4 w-1/2 rounded bg-zinc-800/60 animate-pulse" />
          <div className="mt-5 h-8 w-28 rounded-full bg-zinc-800/70 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
