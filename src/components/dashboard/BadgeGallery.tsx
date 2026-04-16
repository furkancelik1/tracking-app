"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Trophy,
  Flame,
  Target,
  Coins,
  Star,
  CheckCircle2,
  Compass,
  Award,
  Lock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { getAllBadges, type BadgeWithStatus } from "@/actions/badge.actions";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Flame,
  Target,
  Coins,
  Star,
  CheckCircle2,
  Compass,
  Award,
};

function BadgeIcon({ icon, className, style }: { icon: string | null; className?: string; style?: React.CSSProperties }) {
  const Icon = BADGE_ICONS[icon ?? ""] ?? Award;
  return <Icon className={className} style={style} />;
}

export function BadgeGallery({ open, onOpenChange }: Props) {
  const t = useTranslations("badges");
  const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBadges = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllBadges();
      setBadges(data);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) loadBadges();
  }, [open, loadBadges]);

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: "#39FF14", filter: "drop-shadow(0 0 6px #39FF14)" }} />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { earned: earned.length, total: badges.length })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : badges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Award className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* KazanÄ±lan rozetler */}
            {earned.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {t("earned")}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {earned.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-3 rounded-lg p-3"
                      style={{
                        border: "1px solid rgba(57,255,20,0.25)",
                        background: "linear-gradient(135deg, rgba(57,255,20,0.06) 0%, rgba(57,255,20,0.02) 100%)",
                        boxShadow: "0 0 12px rgba(57,255,20,0.08)",
                      }}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: "rgba(57,255,20,0.1)" }}
                      >
                        <BadgeIcon
                          icon={badge.icon}
                          className="h-5 w-5"
                          style={{ color: "#39FF14", filter: "drop-shadow(0 0 4px #39FF14)" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t(`items.${badge.name}.name`)}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {t(`items.${badge.name}.description`)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kilitli rozetler */}
            {locked.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {t("locked")}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {locked.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-3 rounded-lg border border-muted p-3 opacity-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-muted-foreground">
                          {t(`items.${badge.name}.name`)}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {t(`items.${badge.name}.hint`)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
