"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { KimelaProvider } from "@/context/KimelaContext";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <KimelaProvider>{children}</KimelaProvider>
    </QueryClientProvider>
  );
}
