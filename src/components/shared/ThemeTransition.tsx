"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function ThemeTransition() {
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    const handler = () => {
      setFlashing(true);
      // remove after animation completes
      setTimeout(() => setFlashing(false), 400);
    };
    window.addEventListener("theme-changed", handler);
    return () => window.removeEventListener("theme-changed", handler);
  }, []);

  return (
    <AnimatePresence>
      {flashing && (
        <motion.div
          key="theme-flash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.18 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-black pointer-events-none"
        />
      )}
    </AnimatePresence>
  );
}
