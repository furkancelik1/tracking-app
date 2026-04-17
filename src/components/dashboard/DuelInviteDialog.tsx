"use client";

import React, { useState, useTransition } from "react";
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

type Props = {
  friends: FriendEntry[];
};

const MIN_STAKE = 10;
const MAX_STAKE = 500;

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
          className="gap-1.5 bg-[#D6FF00] font-bold uppercase tracking-wide text-black shadow-[0_0_24px_rgba(214,255,0,0.25)] hover:bg-[#c8f000]"
        >
          <Swords className="size-3.5" aria-hidden />
          {t("sendInvite")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border border-white/10 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tight text-white">
            <Swords className="size-5 text-[#D6FF00]" aria-hidden />
            {t("readyQuestion")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-400">{t("subtitle")}</Label>
            <div className="grid max-h-[200px] gap-2 overflow-y-auto pr-1">
              {friends.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-500">{t("noDuelDesc")}</p>
              ) : (
                friends.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFriend(f.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                      selectedFriend === f.id
                        ? "border-[#D6FF00]/40 bg-[#D6FF00]/10 shadow-[0_0_20px_rgba(214,255,0,0.08)]"
                        : "border-white/5 bg-black/30 hover:border-white/10 hover:bg-white/[0.03]"
                    )}
                  >
                    <Avatar className="size-8 ring-1 ring-white/10">
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
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{f.name ?? "?"}</p>
                      <p className="text-[11px] text-zinc-500">{f.xp} XP</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stake" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              <Coins className="size-3.5 text-[#D6FF00]" aria-hidden />
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
              className="border-white/10 bg-black/40 text-white"
            />
            <p className="text-[11px] text-zinc-500">{t("stakeHint")}</p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-white/15 text-zinc-300 hover:bg-white/5 hover:text-white"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              className="flex-1 bg-[#D6FF00] font-bold text-black hover:bg-[#c8f000]"
              onClick={handleSend}
              disabled={isPending || !selectedFriend || !stake}
            >
              <Swords className="mr-1.5 size-4" aria-hidden />
              {t("sendInvite")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
