import { AdblockDetector } from "@/components/AdblockDetector";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { OfflineScreen } from "@/components/OfflineScreen";
import { UpdateChecker } from "@/components/UpdateChecker";
import { Toaster } from "@/components/ui/sonner";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { QueryClient } from "@tanstack/react-query";
import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-8xl font-black text-gradient">404</h1>
        <h2 className="mt-4 font-display text-2xl font-bold">Senpai... this page doesn't exist</h2>
        <p className="mt-2 text-sm text-muted-foreground">The episode you're looking for isn't in the archive.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--gradient-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-glow)]">
          ▶ Back home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  console.error(error);
  const quota = /quota|429|403/i.test(error?.message || "");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl">😴</div>
        <h1 className="mt-4 font-display text-2xl font-bold">
          {quota ? "API-chan is tired!" : "Something broke"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {quota ? "We've hit the YouTube quota for now. Come back later." : error?.message || "Unknown error"}
        </p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-[var(--gradient-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-glow)]">
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  useSessionTimer();
  return (
    <>
      <OfflineScreen />
      <AdblockDetector />
      <DisclaimerModal />
      <UpdateChecker />
      <Toaster position="bottom-right" richColors closeButton />
      <Outlet />
    </>
  );
}
