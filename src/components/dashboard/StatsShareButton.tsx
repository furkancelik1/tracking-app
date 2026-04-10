"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareCardModal } from "@/components/dashboard/ShareCardModal";
import type { ShareCardProps } from "@/components/dashboard/ShareCard";

type Props = {
  cardProps: ShareCardProps;
};

export function StatsShareButton({ cardProps }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Share2 className="size-4" />
        Haftalık Özetimi Paylaş
      </Button>

      <ShareCardModal
        open={open}
        onClose={() => setOpen(false)}
        cardProps={cardProps}
      />
    </>
  );
}
