"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Swords, Trophy, Plus, Sparkles, Users, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { sendChallengeAction } from "@/actions/challenge.actions";
import type { FriendEntry } from "@/actions/social.actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Duration Options ────────────────────────────────────────────────────────

const DURATIONS = [3, 7, 14, 21, 30] as const;

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  friends: FriendEntry[];
  preselectedFriendId?: string;
  preselectedFriendName?: string | null;
  trigger?: React.ReactNode;
};

export function ChallengeInviteDialog({
  friends,
  preselectedFriendId,
  preselectedFriendName,
  trigger,
}: Props) {
  const t = useTranslations("challenges");
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(preselectedFriendId ?? "");
  const [routineTitle, setRoutineTitle] = useState("");
  const [duration, setDuration] = useState(7);
  const [step, setStep] = useState<1 | 2>(preselectedFriendId ? 2 : 1);

  const selectedFriendData = friends.find((f) => f.id === selectedFriend);

  const handleSend = () => {
    if (!selectedFriend || !routineTitle.trim()) return;

    startTransition(async () => {
      try {
        await sendChallengeAction({
          opponentId: selectedFriend,
          routineTitle: routineTitle.trim(),
          durationDays: Math.min(30, Math.max(1, duration)),
        });
        toast.success(t("send"));
        setOpen(false);
        resetForm();
      } catch {
        toast.error("Error");
      }
    });
  };

  const resetForm = () => {
    if (!preselectedFriendId) {
      setSelectedFriend("");
      setStep(1);
    }
    setRoutineTitle("");
    setDuration(7);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            {t("send")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
              <Swords className="size-4 text-indigo-400" />
            </div>
            {t("inviteTitle")}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Friend */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 pt-2"
            >
              <Label className="flex items-center gap-1.5 text-sm">
                <Users className="size-3.5" />
                {t("opponent")}
              </Label>

              {friends.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t("selectFriend")}</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {friends.map((friend) => (
                    <motion.button
                      key={friend.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setSelectedFriend(friend.id);
                        setStep(2);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="size-9">
                        <AvatarImage src={friend.image ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(friend.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{friend.name ?? "?"}</p>
                        <p className="text-xs text-muted-foreground">{friend.xp} XP</p>
                      </div>
                      {friend.subscriptionTier === "PRO" && (
                        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[9px] px-1 py-0 gap-0.5 shrink-0">
                          <Sparkles className="size-2" /> PRO
                        </Badge>
                      )}
                      <Swords className="size-4 text-muted-foreground shrink-0" />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Configure Challenge */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5 pt-2"
            >
              {/* Selected opponent */}
              {selectedFriendData && (
                <div className="flex items-center gap-3 rounded-xl bg-accent/30 px-3 py-2.5">
                  <Avatar className="size-9">
                    <AvatarImage src={selectedFriendData.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(selectedFriendData.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {preselectedFriendName ?? selectedFriendData.name ?? "?"}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("opponent")}</p>
                  </div>
                  {!preselectedFriendId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setStep(1)}
                    >
                      Change
                    </Button>
                  )}
                </div>
              )}

              {/* Routine Title */}
              <div className="space-y-2">
                <Label>{t("routineLabel")}</Label>
                <Input
                  value={routineTitle}
                  onChange={(e) => setRoutineTitle(e.target.value)}
                  placeholder="e.g. 30 Push-ups, Read 20 pages"
                  maxLength={100}
                  autoFocus
                />
              </div>

              {/* Duration Selector */}
              <div className="space-y-2">
                <Label>{t("durationLabel")}</Label>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-all ${
                        duration === d
                          ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-sm"
                          : "border-border text-muted-foreground hover:border-foreground/20"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("daysLeft", { count: duration })}
                </p>
              </div>

              {/* Reward info */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 px-4 py-3 text-sm"
              >
                <Trophy className="size-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-amber-400">{t("reward")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("subtitle")}
                  </p>
                </div>
              </motion.div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  {t("cancelDialog")}
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={isPending || !selectedFriend || !routineTitle.trim()}
                  className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                >
                  <Zap className="size-4" />
                  {t("sendChallenge")}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
