"use client";

import React, { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Swords, Coins, Copy, Check, Share2, Lock } from "lucide-react";
import { createPrivateDuel, joinDuelByCode } from "@/actions/duel.actions";

const MIN_STAKE = 10;
const MAX_STAKE = 500;

export function CreateDuel() {
  const t = useTranslations("duel");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");

  const [stake, setStake] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoinPending, startJoinTransition] = useTransition();

  const handleCreate = () => {
    const stakeNum = parseInt(stake, 10);

    if (isNaN(stakeNum) || stakeNum < MIN_STAKE || stakeNum > MAX_STAKE) {
      setError(t("errorInvalidStake", { min: MIN_STAKE, max: MAX_STAKE }));
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createPrivateDuel({ stake: stakeNum });

      if (!result.success) {
        const errorMap: Record<string, string> = {
          INVALID_STAKE: t("errorInvalidStake", { min: MIN_STAKE, max: MAX_STAKE }),
          MAX_DUELS: t("errorMaxDuels"),
          INSUFFICIENT_COINS: t("errorInsufficientCoins"),
        };
        setError(errorMap[result.error ?? ""] ?? result.error ?? "Unknown error");
        return;
      }

      setCreatedCode(result.inviteCode ?? null);
    });
  };

  const handleCopy = async () => {
    if (!createdCode) return;
    const url = `${window.location.origin}${window.location.pathname}?duelCode=${createdCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!createdCode) return;
    const url = `${window.location.origin}${window.location.pathname}?duelCode=${createdCode}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: t("privateDuel"),
          text: t("shareInviteText", { code: createdCode }),
          url,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    setJoinError(null);

    startJoinTransition(async () => {
      const result = await joinDuelByCode({ inviteCode: joinCode.trim() });

      if (!result.success) {
        const errorMap: Record<string, string> = {
          INVALID_CODE: t("errorInvalidCode"),
          ALREADY_STARTED: t("errorAlreadyStarted"),
          ALREADY_JOINED: t("errorAlreadyJoined"),
          SELF_DUEL: t("errorSelf"),
          NOT_FRIENDS: t("errorNotFriends"),
          MAX_DUELS: t("errorMaxDuels"),
          INSUFFICIENT_COINS: t("errorInsufficientCoins"),
        };
        setJoinError(errorMap[result.error ?? ""] ?? result.error ?? "Unknown error");
        return;
      }

      setOpen(false);
      setJoinCode("");
      setJoinError(null);
      router.refresh();
    });
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setStake("");
      setCreatedCode(null);
      setCopied(false);
      setError(null);
      setJoinCode("");
      setJoinError(null);
      setMode("create");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-[#D6FF00]/35 font-semibold uppercase tracking-wide text-[#D6FF00] hover:bg-[#D6FF00]/10"
        >
          <Lock className="size-3.5" aria-hidden />
          {t("privateDuel")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border border-white/10 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tight text-white">
            <Swords className="size-5 text-[#D6FF00]" aria-hidden />
            {t("privateDuel")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 rounded-xl border border-white/5 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setCreatedCode(null);
              setError(null);
            }}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-bold uppercase tracking-wide transition-colors",
              mode === "create"
                ? "bg-[#D6FF00] text-black shadow-[0_0_20px_rgba(214,255,0,0.2)]"
                : "text-zinc-500 hover:text-white"
            )}
          >
            {t("createDuel")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("join");
              setJoinError(null);
            }}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-bold uppercase tracking-wide transition-colors",
              mode === "join"
                ? "bg-[#D6FF00] text-black shadow-[0_0_20px_rgba(214,255,0,0.2)]"
                : "text-zinc-500 hover:text-white"
            )}
          >
            {t("joinDuel")}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === "create" ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4 pt-2"
            >
              {!createdCode ? (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="private-stake"
                      className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400"
                    >
                      <Coins className="size-3.5 text-[#D6FF00]" aria-hidden />
                      {t("stakeLabel")}
                    </Label>
                    <Input
                      id="private-stake"
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
                    <p className="text-[11px] text-zinc-500">{t("privateStakeHint")}</p>
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <Button
                    className="w-full bg-[#D6FF00] font-bold text-black hover:bg-[#c8f000]"
                    onClick={handleCreate}
                    disabled={isPending || !stake}
                  >
                    <Swords className="mr-1.5 size-4" aria-hidden />
                    {t("createDuel")}
                  </Button>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="space-y-3 rounded-xl border-2 border-dashed border-[#D6FF00]/35 bg-[#D6FF00]/5 p-6 text-center">
                    <Badge
                      variant="secondary"
                      className="border border-[#D6FF00]/35 bg-black/50 text-[#D6FF00]"
                    >
                      {t("waitingForOpponent")}
                    </Badge>
                    <p className="text-xs text-zinc-500">{t("shareCodeHint")}</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="font-mono text-2xl font-black tracking-[0.3em] text-[#D6FF00]">
                        {createdCode}
                      </code>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-1.5 border-white/15" onClick={handleCopy}>
                      {copied ? (
                        <>
                          <Check className="size-4 text-[#D6FF00]" aria-hidden />
                          {t("linkCopied")}
                        </>
                      ) : (
                        <>
                          <Copy className="size-4" aria-hidden />
                          {t("copyLink")}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="gap-1.5 border-white/15" onClick={handleShare}>
                      <Share2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-2">
                <Label htmlFor="join-code" className="text-xs font-semibold text-zinc-400">
                  {t("enterInviteCode")}
                </Label>
                <Input
                  id="join-code"
                  placeholder={t("inviteCodePlaceholder")}
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  className="border-white/10 bg-black/40 text-center font-mono text-lg uppercase tracking-[0.2em] text-white"
                  maxLength={8}
                />
              </div>

              {joinError && <p className="text-xs text-red-400">{joinError}</p>}

              <Button
                className="w-full bg-[#D6FF00] font-bold text-black hover:bg-[#c8f000]"
                onClick={handleJoin}
                disabled={isJoinPending || !joinCode.trim()}
              >
                <Swords className="mr-1.5 size-4" aria-hidden />
                {t("joinDuel")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
