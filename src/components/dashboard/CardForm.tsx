"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cardSchema, type CardInput } from "@/lib/validations/card";

const RESET_TYPES = [
  {
    value: "ROLLING" as const,
    label: "Rolling",
    description: "Resets X seconds after activation",
  },
  {
    value: "FIXED" as const,
    label: "Fixed (00:00)",
    description: "Resets at midnight every day",
  },
];

const DURATION_PRESETS = [
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
  { label: "1h", seconds: 3600 },
  { label: "2h", seconds: 7200 },
  { label: "4h", seconds: 14400 },
  { label: "8h", seconds: 28800 },
  { label: "24h", seconds: 86400 },
];

type EditableCard = {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  affiliateUrl: string | null;
  resetType: CardInput["resetType"];
  duration: number;
  isActive: boolean;
  sortOrder: number;
};

type Props = { card?: EditableCard };

export function CardForm({ card }: Props) {
  const router = useRouter();
  const isEditing = !!card;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CardInput>({
    resolver: zodResolver(cardSchema),
    defaultValues: card
      ? {
          title: card.title,
          description: card.description,
          content: card.content,
          category: card.category,
          affiliateUrl: card.affiliateUrl ?? "",
          resetType: card.resetType,
          duration: card.duration,
          isActive: card.isActive,
          sortOrder: card.sortOrder,
        }
      : {
          resetType: "ROLLING",
          duration: 3600,
          isActive: true,
          sortOrder: 0,
        },
  });

  const watchedResetType = watch("resetType");
  const watchedDuration = watch("duration");

  async function onSubmit(data: CardInput) {
    const url = isEditing ? `/api/v1/cards/${card.id}` : "/api/v1/cards";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        affiliateUrl: data.affiliateUrl || null,
      }),
    });

    const json = await res.json();

    if (!json.success) {
      toast.error(json.error ?? "Something went wrong.");
      return;
    }

    toast.success(isEditing ? "Card updated." : "Card created.");
    router.back();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <Field label="Title" error={errors.title?.message}>
        <Input {...register("title")} placeholder="e.g. Morning Walk" />
      </Field>

      {/* Description */}
      <Field label="Short Description" error={errors.description?.message}>
        <textarea
          {...register("description")}
          rows={2}
          placeholder="One or two sentences about this action…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        />
      </Field>

      {/* Content */}
      <Field
        label="Content (Markdown / HTML)"
        error={errors.content?.message}
        hint="Detailed instructions, tips, or affiliate context."
      >
        <textarea
          {...register("content")}
          rows={6}
          placeholder="## Instructions&#10;&#10;Write detailed content here…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
        />
      </Field>

      {/* Category */}
      <Field label="Category" error={errors.category?.message}>
        <Input {...register("category")} placeholder="e.g. Health, Focus, Finance" />
      </Field>

      {/* Affiliate URL */}
      <Field
        label="Affiliate URL"
        error={errors.affiliateUrl?.message}
        hint="Optional. Users will be redirected through your tracking link."
      >
        <Input
          {...register("affiliateUrl")}
          type="url"
          placeholder="https://example.com/product?ref=..."
        />
      </Field>

      {/* Reset Type */}
      <div className="space-y-2">
        <Label>Reset Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {RESET_TYPES.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => setValue("resetType", rt.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                watchedResetType === rt.value
                  ? "border-primary bg-primary/5"
                  : "border-input hover:border-primary/50"
              )}
            >
              <p className="font-medium text-sm">{rt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rt.description}
              </p>
            </button>
          ))}
        </div>
        {errors.resetType && (
          <p className="text-xs text-destructive">{errors.resetType.message}</p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label>
          Duration
          {watchedDuration != null && (
            <span className="ml-2 text-muted-foreground font-normal">
              ({Math.floor(watchedDuration / 3600)}h{" "}
              {Math.floor((watchedDuration % 3600) / 60)}m)
            </span>
          )}
        </Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {DURATION_PRESETS.map((p) => (
            <button
              key={p.seconds}
              type="button"
              onClick={() => setValue("duration", p.seconds)}
              className={cn(
                "px-3 py-1 rounded-full text-xs border transition-colors",
                watchedDuration === p.seconds
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:border-primary/50"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Input
          type="number"
          {...register("duration", { valueAsNumber: true })}
          placeholder="Seconds (e.g. 3600 = 1h)"
          min={60}
          max={86400}
        />
        {errors.duration && (
          <p className="text-xs text-destructive">{errors.duration.message}</p>
        )}
      </div>

      {/* Sort Order + Active toggle */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Sort Order" error={errors.sortOrder?.message}>
          <Input
            type="number"
            {...register("sortOrder", { valueAsNumber: true })}
            placeholder="0"
          />
        </Field>

        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex items-center gap-3 h-10">
            <button
              type="button"
              onClick={() => setValue("isActive", !watch("isActive"))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                watch("isActive") ? "bg-primary" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg transform transition-transform",
                  watch("isActive") ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
            <Badge variant={watch("isActive") ? "default" : "secondary"}>
              {watch("isActive") ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isEditing
              ? "Saving…"
              : "Creating…"
            : isEditing
              ? "Save Changes"
              : "Create Card"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
