import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

import appCss from "../styles.css?url";
import { Sidebar } from "@/components/Sidebar";
import { WalletButton } from "@/components/WalletButton";
import { AICopilot } from "@/components/AICopilot";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SpatioTrust — Decentralized Spatial Oracle Network" },
      {
        name: "description",
        content:
          "Verify the physical integrity of real-world 3D environments before releasing on-chain funds. ZK-proof attested spatial oracles.",
      },
      { name: "author", content: "SpatioTrust" },
      { property: "og:title", content: "SpatioTrust — Decentralized Spatial Oracle Network" },
      {
        property: "og:description",
        content:
          "Verify the physical integrity of real-world 3D environments before releasing on-chain funds. ZK-proof attested spatial oracles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@agpro001" },
      { name: "twitter:title", content: "SpatioTrust — Decentralized Spatial Oracle Network" },
      {
        name: "twitter:description",
        content:
          "Verify the physical integrity of real-world 3D environments before releasing on-chain funds. ZK-proof attested spatial oracles.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4a77d654-406e-4922-ab91-d9ab7435efe0/id-preview-6f8cb49f--b9b2efab-644f-494d-b0f5-30ca303c05bd.lovable.app-1780383003120.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4a77d654-406e-4922-ab91-d9ab7435efe0/id-preview-6f8cb49f--b9b2efab-644f-494d-b0f5-30ca303c05bd.lovable.app-1780383003120.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLanding = pathname === "/";

  return (
    <QueryClientProvider client={queryClient}>
      {isLanding ? (
        <div className="min-h-screen">
          <Outlet />
        </div>
      ) : (
        <div className="min-h-screen flex w-full">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 shrink-0 flex items-center justify-between gap-4 px-5 border-b border-border bg-background/70 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  oracle network · live
                </div>
              </div>
              <WalletButton />
            </header>
            <main className="flex-1 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      )}
      <AICopilot />
      <Toaster
        theme="dark"
        position="bottom-left"
        toastOptions={{
          style: {
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          },
        }}
      />
      <SpeedInsights />
      <Analytics />
    </QueryClientProvider>
  );
}
