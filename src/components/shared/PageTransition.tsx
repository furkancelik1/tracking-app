"use client";

import React from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

type Props = {
  children: ReactNode;
};

export function PageTransition({ children }: Props) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: "easeInOut" }}
        className="min-h-[50vh]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
