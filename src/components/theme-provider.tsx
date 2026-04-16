"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// React 19'un gereksiz yere fırlattığı "script tag" devasa hata ekranını susturuyoruz.
// Sadece geliştirme modunda çalışır ve projenin mantığını asla bozmaz.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) return;
    origError.apply(console, args);
  };
}

export function ThemeProvider({ children, ...props }: any) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
