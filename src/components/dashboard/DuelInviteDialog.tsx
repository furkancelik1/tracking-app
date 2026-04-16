"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Swords, Coins } from "lucide-react";
import { createDuelInvitation } from "@/actions/duel.actions";
import type { FriendEntry } from "@/actions/social.actions";

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  friends: FriendEntry[];
};

const MIN_STAKE = 10;
const MAX_STAKE = 500;

// ─── Main Component ──────────────────────────────────────────────────────────

export function DuelInviteDialog({ friends }: Props) {
  const t = useTranslations("duel");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [stake, setStake] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSend = () => {
    if (!selectedFriend) return;
    const stakeNum = parseInt(stake, 10);

    if (isNaN(stakeNum) || stakeNum < MIN_STAKE || stakeNum > MAX_STAKE) {
      setError(t("errorInvalidStake", { min: MIN_STAKE, max: MAX_STAKE }));
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createDuelInvitation({
        opponentId: selectedFriend,
        stake: stakeNum,
      });

      if (!result.success) {
        const errorMap: Record<string, string> = {
          SELF_DUEL: t("errorSelf"),
          NOT_FRIENDS: t("errorNotFriends"),
          MAX_DUELS: t("errorMaxDuels"),
          INSUFFICIENT_COINS: t("errorInsufficientCoins"),
          INVALID_STAKE: t("errorInvalidStake", { min: MIN_STAKE, max: MAX_STAKE }),
        };
        setError(errorMap[result.error ?? ""] ?? result.error ?? "Unknown error");
        return;
      }

      setOpen(false);
      setSelectedFriend(null);
      setStake("");
      setError(null);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
        >
          <Swords className="size-3.5" />
          {t("sendInvite")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="size-5 text-red-400" />
            {t("readyQuestion")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Friend selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {t("subtitle")}
            </Label>
            <div className="grid gap-2 max-h-[200px] overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t("noDuelDesc")}
                </p>
              ) : (
                friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFriend(f.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors text-left",
                      selectedFriend === f.id
                        ? "bg-red-500/10 border border-red-500/30"
                        : "bg-card hover:bg-accent border border-transparent"
                    )}
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={f.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {f.name
                          ? f.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name ?? "?"}</p>
                      <p className="text-[11px] text-muted-foreground">{f.xp} XP</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Stake input */}
          <div className="space-y-2">
            <Label htmlFor="stake" className="flex items-center gap-1.5 text-xs font-medium">
              <Coins className="size-3.5 text-yellow-500" />
              {t("stakeLabel")}
            </Label>
            <Input
              id="stake"
              type="number"
              min={MIN_STAKE}
              max={MAX_STAKE}
              step={1}
              placeholder={t("stakePlaceholder", { min: MIN_STAKE, max: MAX_STAKE })}
              value={stake}
              onChange={(e) => {
                setStake(e.target.value);
                setError(null);
              }}
            />
            <p className="text-[11px] text-muted-foreground">{t("stakeHint")}</p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
              onClick={handleSend}
              disabled={isPending || !selectedFriend || !stake}
            >
              <Swords className="size-4 mr-1.5" />
              {t("sendInvite")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
