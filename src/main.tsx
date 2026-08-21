import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { registerRegionChangeCallback } from "./hooks/use-region";
import { registerSafeModeChangeCallback } from "./hooks/use-safe-mode";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000,      // 15 menit — data dianggap fresh, tidak re-fetch
      gcTime: 60 * 60 * 1000,          // 1 jam cache di memory — data tetap ada saat navigasi
      refetchOnWindowFocus: false,      // Tidak re-fetch saat tab di-focus — hemat quota
      refetchOnReconnect: false,        // Tidak re-fetch saat reconnect
      retry: (failureCount, error: any) => {
        if (error?.message?.includes("429")) return failureCount < 3;
        if (error?.message?.includes("403") || error?.message?.includes("quota")) return false;
        return failureCount < 1;
      },
      retryDelay: (attemptIndex, error: any) => {
        if (error?.message?.includes("429")) return Math.min(2000 * 2 ** attemptIndex, 15000);
        return Math.min(1000 * 2 ** attemptIndex, 10000);
      },
    },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreloadStaleTime: 0,
  defaultPreload: "intent",
  scrollRestoration: true,
});

// Invalidate semua queries saat region berubah → konten langsung refresh
registerRegionChangeCallback(() => {
  queryClient.invalidateQueries();
});

// Invalidate semua queries saat safe mode berubah → konten langsung refresh
registerSafeModeChangeCallback(() => {
  queryClient.invalidateQueries();
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root")!;
ReactDOM.createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
