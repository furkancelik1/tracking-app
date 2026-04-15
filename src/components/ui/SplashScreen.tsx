"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

const NEON_GREEN = "#39FF14";

export function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
        >
          {/* Neon glow ring behind the logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center justify-center"
          >
            {/* Outer pulse ring */}
            <motion.div
              animate={{
                boxShadow: [
                  `0 0 20px ${NEON_GREEN}40, 0 0 60px ${NEON_GREEN}20`,
                  `0 0 30px ${NEON_GREEN}60, 0 0 80px ${NEON_GREEN}30`,
                  `0 0 20px ${NEON_GREEN}40, 0 0 60px ${NEON_GREEN}20`,
                ],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute h-28 w-28 rounded-full"
              style={{ border: `2px solid ${NEON_GREEN}30` }}
            />

            {/* Logo circle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: `radial-gradient(circle, ${NEON_GREEN}15, transparent 70%)`,
                border: `2px solid ${NEON_GREEN}50`,
              }}
            >
              <motion.span
                animate={{
                  textShadow: [
                    `0 0 8px ${NEON_GREEN}80, 0 0 20px ${NEON_GREEN}40`,
                    `0 0 14px ${NEON_GREEN}A0, 0 0 30px ${NEON_GREEN}60`,
                    `0 0 8px ${NEON_GREEN}80, 0 0 20px ${NEON_GREEN}40`,
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-3xl font-bold tracking-tighter"
                style={{ color: NEON_GREEN }}
              >
                Z
              </motion.span>
            </motion.div>
          </motion.div>

          {/* Brand text */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="absolute bottom-[30%] text-base font-black tracking-[0.45em] uppercase"
            style={{
              color: NEON_GREEN,
              textShadow: `0 0 12px ${NEON_GREEN}70, 0 0 28px ${NEON_GREEN}30`,
            }}
          >
            ZENITH
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
