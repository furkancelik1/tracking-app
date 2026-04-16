"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // QueryClient'Ä±n her render'da sÄ±fÄ±rdan oluÅŸmasÄ±nÄ± engellemek iÃ§in useState iÃ§inde tutuyoruz
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
