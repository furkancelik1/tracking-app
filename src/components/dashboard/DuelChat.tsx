"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageCircle, Send, ChevronDown, ChevronUp, Ghost } from "lucide-react";
import {
  sendDuelMessage,
  getDuelMessages,
} from "@/actions/duel.actions";
import type { DuelMessageEntry } from "@/actions/duel.actions";
import { fireDuelToast } from "@/lib/duel-notifications";

// ─── Constants ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5000;
const BUBBLE_LIFETIME_MS = 5000;

type QuickMessageKey =
  | "quickComeOn"
  | "quickAwesome"
  | "quickCatchingUp"
  | "quickNoChance"
  | "quickGoodLuck";

const QUICK_MESSAGES: QuickMessageKey[] = [
  "quickComeOn",
  "quickAwesome",
  "quickCatchingUp",
  "quickNoChance",
  "quickGoodLuck",
];

// ─── Floating Bubble ─────────────────────────────────────────────────────────

function FloatingBubble({
  message,
  isMine,
  onExpire,
}: {
  message: DuelMessageEntry;
  isMine: boolean;
  onExpire: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onExpire(message.id), BUBBLE_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [message.id, onExpire]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6, y: -10, transition: { duration: 0.3 } }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(
        "flex items-end gap-1.5 max-w-[85%]",
        isMine ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <Avatar className="size-5 ring-1 ring-border shrink-0">
        <AvatarImage src={message.senderImage ?? undefined} />
        <AvatarFallback className="text-[8px]">
          {message.senderName?.[0]?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "rounded-2xl px-3 py-1.5 text-xs font-medium shadow-sm",
          isMine
            ? "bg-indigo-500 text-white rounded-br-sm"
            : "bg-violet-500/15 text-violet-700 dark:text-violet-300 rounded-bl-sm"
        )}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Props = {
  duelId: string;
  currentUserId: string;
  isActive: boolean;
};

export function DuelChat({ duelId, currentUserId, isActive }: Props) {
  const t = useTranslations("duel");
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<DuelMessageEntry[]>([]);
  const [floatingIds, setFloatingIds] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const lastPollRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, expanded]);

  // Poll for new messages
  const fetchMessages = useCallback(async () => {
    const result = await getDuelMessages({ duelId });
    setMessages(result);

    // New messages that just arrived → add to floating set
    for (const msg of result) {
      if (!seenIdsRef.current.has(msg.id)) {
        seenIdsRef.current.add(msg.id);
        setFloatingIds((prev) => new Set(prev).add(msg.id));

        // Rakipten gelen yeni mesaj → in-app toast (ilk yüklemeden sonra)
        if (initialLoadDoneRef.current && msg.senderId !== currentUserId) {
          const preview = msg.content.length > 30
            ? msg.content.slice(0, 30) + "…"
            : msg.content;
          fireDuelToast("message", {
            title: t("notifNewMessage"),
            description: t("notifNewMessageDesc", {
              name: msg.senderName ?? "?",
              preview,
            }),
          });
        }
      }
    }

    initialLoadDoneRef.current = true;
  }, [duelId, currentUserId, t]);

  useEffect(() => {
    if (!isActive) return;
    fetchMessages();
    const id = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isActive, fetchMessages]);

  const handleExpireBubble = useCallback((id: string) => {
    setFloatingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleSend = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || !isActive) return;

    setError(null);
    setInputValue("");

    startTransition(async () => {
      const result = await sendDuelMessage({ duelId, content: trimmed });
      if (!result.success) {
        const errorMap: Record<string, string> = {
          COOLDOWN: t("errorCooldown"),
          INVALID_MESSAGE: t("errorMessageTooLong"),
        };
        setError(errorMap[result.error ?? ""] ?? result.error ?? "");
        return;
      }

      if (result.message) {
        seenIdsRef.current.add(result.message.id);
        setMessages((prev) => [...prev, result.message!]);
        setFloatingIds((prev) => new Set(prev).add(result.message!.id));
      }
    });
  };

  // Get recent floating messages to show (max 3)
  const floatingMessages = messages
    .filter((m) => floatingIds.has(m.id))
    .slice(-3);

  if (!isActive) return null;

  return (
    <div className="space-y-2">
      {/* Floating Bubbles — always visible over arena */}
      <AnimatePresence mode="popLayout">
        {!expanded &&
          floatingMessages.map((msg) => (
            <FloatingBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === currentUserId}
              onExpire={handleExpireBubble}
            />
          ))}
      </AnimatePresence>

      {/* Expandable Chat Panel */}
      <div className="rounded-xl border bg-card/80 backdrop-blur-sm overflow-hidden">
        {/* Toggle header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="size-3.5 text-indigo-400" />
            <span className="text-xs font-semibold">{t("chat")}</span>
            {messages.length > 0 && (
              <span className="size-4 rounded-full bg-indigo-500 text-[9px] text-white flex items-center justify-center font-bold">
                {messages.length}
              </span>
            )}
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground/70">
              <Ghost className="size-2.5" />
              {t("ephemeralNote")}
            </span>
          </div>
          {expanded ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Messages list */}
              <div className="max-h-[200px] overflow-y-auto px-3 py-2 space-y-2 border-t">
                {messages.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-4">
                    {t("messagePlaceholder")}
                  </p>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: -5, transition: { duration: 0.4 } }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className={cn(
                          "flex items-end gap-1.5 max-w-[85%]",
                          msg.senderId === currentUserId
                            ? "ml-auto flex-row-reverse"
                            : "mr-auto"
                        )}
                      >
                        <Avatar className="size-5 ring-1 ring-border shrink-0">
                          <AvatarImage src={msg.senderImage ?? undefined} />
                          <AvatarFallback className="text-[8px]">
                            {msg.senderName?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "rounded-2xl px-3 py-1.5 text-xs",
                            msg.senderId === currentUserId
                              ? "bg-indigo-500 text-white rounded-br-sm"
                              : "bg-violet-500/15 text-violet-700 dark:text-violet-300 rounded-bl-sm"
                          )}
                        >
                          {msg.content}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Buttons */}
              <div className="px-3 py-2 border-t">
                <p className="text-[10px] text-muted-foreground mb-1.5">{t("quickReply")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MESSAGES.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleSend(t(key))}
                      disabled={isPending}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-accent hover:bg-accent/80 transition-colors disabled:opacity-50 font-medium"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="px-3 py-2 border-t flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(inputValue);
                    }
                  }}
                  placeholder={t("messagePlaceholder")}
                  className="h-8 text-xs"
                  maxLength={200}
                  disabled={isPending}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  onClick={() => handleSend(inputValue)}
                  disabled={isPending || !inputValue.trim()}
                >
                  <Send className="size-3.5 text-indigo-400" />
                </Button>
              </div>

              {/* Error */}
              {error && (
                <p className="text-[10px] text-destructive px-3 pb-2">{error}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
