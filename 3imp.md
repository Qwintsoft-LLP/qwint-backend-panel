# Qwint Talk Admin Panel — PWA Implementation Plan
**Version:** 1.0.0 | **Stack:** React + Vite + Workbox | **Audience:** Frontend Engineer

---

## 0. What We're Building & Why

The admin panel runs in a browser tab today. This plan converts it into an installable Progressive Web App that:

- **Installs to home screen** on Android and iOS with a proper app icon, splash screen, and standalone window (no browser chrome)
- **Works fully offline after first load** — every page, every UI component, all static assets cached on install
- **Shows cached data when offline** — the last-fetched API data is visible even with no network
- **Updates silently in the background** — when a new build is deployed, the SW updates on next open without the user doing anything
- **Never shows a broken screen** — if a page was never loaded and there's no cache, it shows a proper offline fallback

This is not a "make it installable" checkbox task. The offline cache strategy, update lifecycle, and fallback behavior are all specified precisely below.

---

## 1. What Gets Cached & What Doesn't

Before writing a line of code, be clear about caching boundaries:

### Always cache (install-time, never stale)
```
All JS bundles          /assets/*.js
All CSS bundles         /assets/*.css
All fonts               /assets/*.woff2
App icons               /icons/*.png
index.html              /
Offline fallback page   /offline.html
```

### Cache-then-network (background revalidate, serve stale while fetching)
```
API responses from:
  GET /admin/keys
  GET /wallet/admin/balances
  GET /logs/latest
  GET /payment/products
  GET /payment/orders
```
These are cached with a 5-minute TTL. On load: serve cache immediately, fetch in background, update cache. User sees data instantly; data refreshes silently.

### Network-only (never cache — mutations & sensitive ops)
```
POST /admin/keys/generate
POST /admin/keys/generate-with-zip
PUT  /admin/keys/update-budget
POST /wallet/topup
POST /payment/free-key
POST /payment/create-order
POST /payment/verify
POST /payment/webhook
GET  /payment/download-plugin/:apiKey   (blob download)
```
If these fail offline, show a toast: "This action requires a connection."

### Never cache
```
Everything else not listed above
Auth endpoints (/auth/*)
Blob downloads
```

---

## 2. Tech Stack Additions

```bash
# Only two new deps
npm install -D vite-plugin-pwa workbox-window
```

That's it. `vite-plugin-pwa` wraps Workbox and generates the service worker at build time. `workbox-window` gives us the update detection API in React.

No manual service worker file. No `sw.js` to maintain. Workbox generates it from config.

---

## 3. File Structure

New files added to the project:

```
public/
├── manifest.json              ← PWA manifest
├── offline.html               ← Offline fallback page
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
└── screenshots/
    ├── desktop.png             ← For install prompt (1280×800)
    └── mobile.png              ← For install prompt (390×844)

src/
├── pwa/
│   ├── usePwaUpdate.ts         ← Update detection hook
│   ├── useInstallPrompt.ts     ← Install prompt hook
│   ├── UpdateBanner.tsx        ← "New version available" banner
│   ├── InstallButton.tsx       ← Install to home screen button
│   └── OfflineIndicator.tsx    ← Network status indicator
```

---

## 4. Icon Generation

Icons must be generated before any PWA config is set up.

### Source icon requirements
- Start with a **1024×1024 PNG** of the Qwint Admin logo (the violet Q/lightning bolt from the sidebar)
- Transparent background, icon centered with ~10% padding from edges
- This is the **only** source file needed — generate all sizes from it

### Generate all sizes (bash)

If you have ImageMagick:

```bash
mkdir -p public/icons
for size in 72 96 128 144 152 192 384 512; do
  convert public/icons/source-1024.png \
    -resize ${size}x${size} \
    public/icons/icon-${size}.png
done

# Maskable icon (icon fills the entire square, no padding)
# Used by Android for adaptive icons
convert public/icons/source-1024.png \
  -resize 512x512 \
  public/icons/icon-512-maskable.png
```

If you don't have ImageMagick, use https://maskable.app for the maskable variant and https://realfavicongenerator.net for all sizes.

### Apple-specific assets

```bash
# Apple touch icon (used on iOS home screen)
cp public/icons/icon-180.png public/apple-touch-icon.png

# iOS splash screens — generate for common sizes
# These go in public/splash/
# Sizes needed:
#   2048x2732  iPad Pro 12.9"
#   1668x2388  iPad Pro 11"
#   1536x2048  iPad Air / mini
#   1125x2436  iPhone X/XS
#   828x1792   iPhone XR/11
#   750x1334   iPhone 8/SE
```

For splash screens, use https://progressier.com/pwa-screenshots-generator or generate programmatically:

```bash
# Simple solid-color splash with centered icon
for size in "2048x2732" "1125x2436" "750x1334"; do
  w=$(echo $size | cut -dx -f1)
  h=$(echo $size | cut -dx -f2)
  convert -size ${w}x${h} xc:"#0A0A0A" \
    public/icons/icon-192.png \
    -gravity center -composite \
    public/splash/splash-${w}x${h}.png
done
```

---

## 5. Web App Manifest

**`public/manifest.json`**

```json
{
  "name": "Qwint Admin",
  "short_name": "Qwint",
  "description": "Qwint Talk Super Admin Panel",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone"],
  "orientation": "any",
  "theme_color": "#0A0A0A",
  "background_color": "#0A0A0A",
  "categories": ["productivity", "utilities"],
  "lang": "en",

  "icons": [
    { "src": "/icons/icon-72.png",            "sizes": "72x72",   "type": "image/png" },
    { "src": "/icons/icon-96.png",            "sizes": "96x96",   "type": "image/png" },
    { "src": "/icons/icon-128.png",           "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144.png",           "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152.png",           "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192.png",           "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512-maskable.png",  "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512.png",           "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ],

  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x800",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Dashboard view"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Mobile dashboard"
    }
  ],

  "shortcuts": [
    {
      "name": "API Keys",
      "url": "/api-keys",
      "icons": [{ "src": "/icons/icon-96.png", "sizes": "96x96" }]
    },
    {
      "name": "System Logs",
      "url": "/logs",
      "icons": [{ "src": "/icons/icon-96.png", "sizes": "96x96" }]
    },
    {
      "name": "Wallets",
      "url": "/wallets",
      "icons": [{ "src": "/icons/icon-96.png", "sizes": "96x96" }]
    }
  ],

  "prefer_related_applications": false
}
```

**Notes on key fields:**
- `display_override: ["window-controls-overlay"]` — on desktop PWA, this merges the browser title bar with the app's own topbar, giving a native app feel
- `shortcuts` — long-pressing the app icon on Android shows quick jump links
- `theme_color: "#0A0A0A"` — this colors the Android status bar. Light mode users get a jarring black bar. Handled in step 9.
- `start_url: "/dashboard"` — always opens to dashboard, not root

---

## 6. Vite PWA Plugin Config

**`vite.config.ts`** — full file:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },

  plugins: [
    react(),

    VitePWA({
      // Strategy: "injectManifest" gives us full control over SW logic.
      // "generateSW" is simpler but doesn't let us customize caching per-route.
      registerType: "prompt",
      // "prompt" = don't auto-update. We show a banner and let admin confirm.
      // This is critical for an admin tool — auto-refreshing mid-session is dangerous.

      injectManifest: {
        swSrc: "src/sw.ts",       // Our custom SW file (written in step 7)
        swDest: "sw.js",
        globDirectory: "dist",
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}"
        ],
      },

      manifest: false,
      // manifest: false because we manage public/manifest.json manually.
      // vite-plugin-pwa's auto-generated manifest is too opinionated.

      devOptions: {
        enabled: true,           // Enable SW in dev mode for testing
        type: "module",
        navigateFallback: "index.html",
      },

      workbox: {
        // These are passed to injectManifest under the hood
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
```

**`index.html`** — add manifest link and iOS meta tags inside `<head>`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Qwint Admin</title>

  <!-- PWA manifest -->
  <link rel="manifest" href="/manifest.json" />

  <!-- Theme color — switches with JS for light/dark (see step 9) -->
  <meta name="theme-color" content="#0A0A0A" id="theme-color-meta" />

  <!-- iOS PWA config -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Qwint Admin" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <!-- iOS splash screens -->
  <link rel="apple-touch-startup-image" href="/splash/splash-2048x2732.png"
    media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
  <link rel="apple-touch-startup-image" href="/splash/splash-1125x2436.png"
    media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash/splash-750x1334.png"
    media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />

  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96.png" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

---

## 7. Service Worker

This is the core. Written manually for full control, processed by Workbox's `injectManifest`.

**`src/sw.ts`**

```ts
/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import {
  StaleWhileRevalidate,
  NetworkFirst,
  NetworkOnly,
  CacheFirst,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { BackgroundSyncPlugin } from "workbox-background-sync";

declare const self: ServiceWorkerGlobalScope;

// ── 1. Take control immediately on install ──────────────────────────────
clientsClaim();

// ── 2. Precache all build assets (injected by Workbox at build time) ────
// __WB_MANIFEST is replaced with the actual asset list during build
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── 3. SPA navigation fallback ──────────────────────────────────────────
// All navigation requests (page loads) serve index.html from cache
// This enables offline navigation between routes
const handler = createHandlerBoundToURL("/index.html");
const navigationRoute = new NavigationRoute(handler, {
  denylist: [
    /^\/_/,                    // Ignore _/* paths
    /\/[^/?]+\.[^/]+$/,        // Ignore file extension URLs
    /^\/api\//,                // Ignore API calls
  ],
});
registerRoute(navigationRoute);

// ── 4. API caching strategy ─────────────────────────────────────────────
// Routes that get StaleWhileRevalidate (serve cache, update in background)
const CACHE_FIRST_API_ROUTES = [
  /\/admin\/keys($|\?)/,
  /\/wallet\/admin\/balances($|\?)/,
  /\/logs\/latest($|\?)/,
  /\/payment\/products($|\?)/,
  /\/payment\/orders($|\?)/,
  /\/payment\/key-status\//,
];

CACHE_FIRST_API_ROUTES.forEach(pattern => {
  registerRoute(
    ({ url }) => pattern.test(url.pathname + url.search),
    new StaleWhileRevalidate({
      cacheName: "qwint-api-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60,     // 5 minutes
          purgeOnQuotaError: true,
        }),
      ],
    }),
    "GET"
  );
});

// ── 5. Mutation routes — network only, no caching ───────────────────────
const NETWORK_ONLY_PATTERNS = [
  /\/admin\/keys\/generate/,
  /\/admin\/keys\/update-budget/,
  /\/wallet\/topup/,
  /\/payment\/free-key/,
  /\/payment\/create-order/,
  /\/payment\/verify/,
  /\/payment\/webhook/,
  /\/payment\/download-plugin/,
  /\/auth\//,
];

NETWORK_ONLY_PATTERNS.forEach(pattern => {
  registerRoute(
    ({ url }) => pattern.test(url.pathname),
    new NetworkOnly(),
    "POST"
  );
  registerRoute(
    ({ url }) => pattern.test(url.pathname),
    new NetworkOnly(),
    "PUT"
  );
});

// ── 6. Font caching — CacheFirst, 30 days ───────────────────────────────
registerRoute(
  ({ request }) => request.destination === "font",
  new CacheFirst({
    cacheName: "qwint-fonts",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 30 * 24 * 60 * 60,   // 30 days
      }),
    ],
  })
);

// ── 7. Image caching — CacheFirst, 7 days ───────────────────────────────
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "qwint-images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  })
);

// ── 8. Update lifecycle messages ─────────────────────────────────────────
// When the SW installs a new version, it posts a message to all clients
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    // Admin clicked "Update now" in the update banner
    self.skipWaiting();
  }
});

// ── 9. Offline fallback for API routes ───────────────────────────────────
// If an API request fails and there's no cache, return a structured error
// response so the UI can handle it gracefully instead of crashing
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isApiRoute = url.pathname.startsWith("/api") ||
                     url.hostname.includes("qwinttalk");

  if (!isApiRoute) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(
        JSON.stringify({ offline: true, error: "No network connection" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    })
  );
});
```

---

## 8. Offline Fallback Page

This page is served when the user navigates to a URL that was never cached — for example, `/wallets/some-user-id` they've never visited.

**`public/offline.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offline — Qwint Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0A0A0A;
      color: #F5F5F5;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 24px;
      text-align: center;
    }
    .icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: #1A1A1A;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }
    .icon svg { width: 24px; height: 24px; stroke: #7C3AED; }
    h1 { font-size: 16px; font-weight: 600; color: #F5F5F5; }
    p  { font-size: 13px; color: #888; max-width: 280px; line-height: 1.5; }
    button {
      margin-top: 8px;
      padding: 8px 20px;
      background: #7C3AED;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    button:hover { background: #6D28D9; }
    .hint { font-size: 11px; color: #555; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="icon">
    <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3l18 18M10.5 10.677A2 2 0 0112 10c1.105 0 2 .895 2 2 0 .545-.22 1.04-.575 1.4M8.15 8.16A6.5 6.5 0 0119.5 12M4.5 12a7.5 7.5 0 0010.44 6.94M2 2l20 20"/>
    </svg>
  </div>
  <h1>You're offline</h1>
  <p>This page isn't cached yet. Pages you've visited before are still available.</p>
  <button onclick="history.back()">Go Back</button>
  <button onclick="window.location.href='/dashboard'" style="background:transparent;border:1px solid #2A2A2A;color:#888;margin-left:8px;">
    Dashboard
  </button>
  <p class="hint">The app will reconnect automatically when you're back online.</p>
</body>
</html>
```

---

## 9. PWA Hooks & React Integration

### 9.1 Update detection hook

**`src/pwa/usePwaUpdate.ts`**

```ts
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export const usePwaUpdate = () => {
  const {
    needRefresh:   [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Poll for updates every 60 seconds while the app is open
      // This ensures the admin sees updates within a minute of deploy
      if (r) {
        setInterval(() => {
          r.update();
        }, 60_000);
      }
    },
    onRegisterError(error) {
      console.warn("SW registration failed:", error);
    },
  });

  return {
    needRefresh,
    update: () => updateServiceWorker(true),
  };
};
```

### 9.2 Network status hook

**`src/pwa/useNetworkStatus.ts`**

```ts
import { useEffect, useState } from "react";

export const useNetworkStatus = () => {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
};
```

### 9.3 Install prompt hook

**`src/pwa/useInstallPrompt.ts`**

```ts
import { useEffect, useState } from "react";

// Typed because TS doesn't know about BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const useInstallPrompt = () => {
  const [prompt, setPrompt]       = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  return { canInstall: !!prompt && !installed, installed, install };
};
```

---

## 10. UI Components

### 10.1 Update Banner

Sits at the very top of `AppShell`, above the topbar. Zero height when no update is available.

**`src/pwa/UpdateBanner.tsx`**

```tsx
import { usePwaUpdate } from "./usePwaUpdate";
import { RefreshCw } from "lucide-react";

export const UpdateBanner = () => {
  const { needRefresh, update } = usePwaUpdate();

  if (!needRefresh) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[var(--accent)] text-white text-xs shrink-0">
      <span className="flex items-center gap-2">
        <RefreshCw size={12} />
        A new version of Qwint Admin is available.
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={update}
          className="font-semibold underline hover:no-underline"
        >
          Update now
        </button>
        <span className="opacity-60 text-[10px]">(saves on next open otherwise)</span>
      </div>
    </div>
  );
};
```

### 10.2 Offline Indicator

A minimal strip that appears at the bottom of the screen when offline.

**`src/pwa/OfflineIndicator.tsx`**

```tsx
import { useNetworkStatus } from "./useNetworkStatus";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const OfflineIndicator = () => {
  const online = useNetworkStatus();

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2",
      "px-4 py-2 bg-[var(--bg-elevated)] border-t border-[var(--border)]",
      "text-xs text-[var(--text-secondary)] transition-transform duration-300",
      online ? "translate-y-full" : "translate-y-0"
    )}>
      <WifiOff size={12} className="text-[var(--warning)]" />
      <span>You're offline — showing cached data. Changes require a connection.</span>
    </div>
  );
};
```

### 10.3 Install Button

Placed in the Settings page and optionally in the sidebar footer.

**`src/pwa/InstallButton.tsx`**

```tsx
import { useInstallPrompt } from "./useInstallPrompt";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const InstallButton = ({ variant = "outline" }: { variant?: "outline" | "ghost" }) => {
  const { canInstall, installed, install } = useInstallPrompt();

  if (installed) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--success)]">
        <span>✓</span>
        <span>Installed as app</span>
      </div>
    );
  }

  if (!canInstall) return null;  // iOS or already installed or browser doesn't support

  return (
    <Button variant={variant} size="sm" onClick={install} className="gap-1.5 text-xs h-8">
      <Download size={12} />
      Install App
    </Button>
  );
};
```

### 10.4 iOS Install Instruction (Safari-specific)

On iOS, `beforeinstallprompt` never fires. We need to show manual instructions.

**`src/pwa/IosInstallHint.tsx`**

```tsx
import { useState, useEffect } from "react";

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window as any).MSStream;

const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

export const IosInstallHint = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isIos() && !isInStandaloneMode()) {
      // Only show once — store dismissal in sessionStorage
      const dismissed = sessionStorage.getItem("ios-hint-dismissed");
      if (!dismissed) setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] shadow-lg text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium text-[var(--text-primary)]">Install Qwint Admin</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Tap <strong>Share</strong> <span className="inline-block">⬆</span> then{" "}
            <strong>"Add to Home Screen"</strong> to install this app.
          </p>
        </div>
        <button
          onClick={() => {
            sessionStorage.setItem("ios-hint-dismissed", "1");
            setShow(false);
          }}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};
```

---

## 11. AppShell Integration

**`src/components/layout/AppShell.tsx`** — updated with all PWA components:

```tsx
import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar }           from "./Sidebar";
import { Topbar }            from "./Topbar";
import { UpdateBanner }      from "@/pwa/UpdateBanner";
import { OfflineIndicator }  from "@/pwa/OfflineIndicator";
import { IosInstallHint }    from "@/pwa/IosInstallHint";

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[var(--bg-base)]">
      {/* Update banner — zero height when no update */}
      <UpdateBanner />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar collapsed={!sidebarOpen} />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Topbar onMenuClick={() => setSidebarOpen(p => !p)} />
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Offline strip — slides in from bottom when offline */}
      <OfflineIndicator />

      {/* iOS install hint — only on Safari iOS, dismissable */}
      <IosInstallHint />
    </div>
  );
};
```

**Note:** `h-[100dvh]` instead of `h-screen`. On mobile, `100vh` includes the browser chrome height, which causes layout bugs when the soft keyboard opens. `100dvh` (dynamic viewport height) is the correct value for installed PWAs and mobile browsers.

---

## 12. Offline-Aware API Handling

When the service worker returns the `{ offline: true }` sentinel, TanStack Query needs to handle it gracefully instead of showing a generic error.

### Axios interceptor update

In `src/api/client.ts`, add an interceptor to detect the SW offline sentinel:

```ts
apiClient.interceptors.response.use(
  (res) => {
    // SW returned the offline sentinel
    if (res.data?.offline === true) {
      return Promise.reject({ status: 503, message: "offline", offline: true });
    }
    return res;
  },
  (err) => {
    // Existing error handler
    const status  = err.response?.status;
    const message = err.response?.data?.message ?? err.message ?? "Unknown error";
    const offline = !navigator.onLine || message === "Network Error";
    return Promise.reject({ status, message, offline, raw: err });
  }
);
```

### TanStack Query global error handler

In `src/main.tsx`, configure the QueryClient to handle offline errors differently:

```tsx
const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Never retry offline errors — they won't succeed
        if (error?.offline) return false;
        return failureCount < 1;
      },
      staleTime:          30_000,
      refetchOnWindowFocus: false,
      // When offline, keep showing cached data rather than error state
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "online",   // Mutations only run online
      onError: (error: any) => {
        if (error?.offline) {
          // This is handled at the component level — don't double-toast
          return;
        }
      },
    },
  },
});
```

### Offline mutation guard

Add this utility for all mutation handlers (generateKey, topup, updateBudget, etc.):

```ts
// src/lib/guards.ts
export const requireOnline = (onOffline?: () => void): boolean => {
  if (!navigator.onLine) {
    onOffline?.();
    return false;
  }
  return true;
};

// Usage in any mutation handler:
const handleGenerateKey = () => {
  if (!requireOnline(() => toast.error("This action requires a connection."))) return;
  mutation.mutate(payload);
};
```

### Offline state in table pages

When data comes from cache while offline, show a "cached" indicator next to the page title:

```tsx
// In any page that uses API data:
const { data, isError, error } = useQuery({ ... });
const online = useNetworkStatus();

// Show cached indicator if offline but data exists
{!online && data && (
  <span className="inline-flex items-center gap-1 text-[10px] text-[var(--warning)] border border-[var(--warning)]/30 rounded px-1.5 py-0.5 ml-2">
    <WifiOff size={9} />
    Cached
  </span>
)}
```

---

## 13. Theme Color Sync (Dark/Light mode → status bar)

The `theme-color` meta tag controls the Android status bar color. It needs to switch when the user toggles themes.

In `src/lib/theme.tsx`, update `applyTheme`:

```ts
const applyTheme = (t: Theme) => {
  const root   = document.documentElement;
  const isDark = t === "dark" ||
    (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", isDark);

  // Sync PWA status bar color with theme
  const meta = document.getElementById("theme-color-meta");
  if (meta) {
    meta.setAttribute("content", isDark ? "#0A0A0A" : "#FFFFFF");
  }

  // Also update manifest theme_color dynamically for desktop PWA window chrome
  // (only works in some Chromium builds but worth doing)
};
```

---

## 14. Settings Page: PWA Section

Add a "App & Updates" section to the Settings page:

```tsx
// In src/pages/Settings.tsx — add after the API configuration section:

import { InstallButton }  from "@/pwa/InstallButton";
import { usePwaUpdate }   from "@/pwa/usePwaUpdate";
import { useNetworkStatus } from "@/pwa/useNetworkStatus";

const PwaSettingsSection = () => {
  const { needRefresh, update } = usePwaUpdate();
  const online                  = useNetworkStatus();
  const isStandalone            = window.matchMedia("(display-mode: standalone)").matches;

  return (
    <div className="border-t border-[var(--border)] pt-5 mt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-4">
        App & Updates
      </p>

      <div className="space-y-3">
        {/* Install status */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-[var(--text-primary)]">Install as App</p>
            <p className="text-xs text-[var(--text-muted)]">
              {isStandalone
                ? "Running as installed PWA"
                : "Install for offline access and home screen shortcut"}
            </p>
          </div>
          <InstallButton />
        </div>

        {/* Network status */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-[var(--text-primary)]">Network Status</p>
            <p className="text-xs text-[var(--text-muted)]">
              {online ? "Connected" : "Offline — showing cached data"}
            </p>
          </div>
          <div className={`w-2 h-2 rounded-full ${online ? "bg-[var(--success)]" : "bg-[var(--warning)] animate-pulse"}`} />
        </div>

        {/* Update status */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-[var(--text-primary)]">App Version</p>
            <p className="text-xs text-[var(--text-muted)]">
              {needRefresh ? "Update available" : "Up to date"}
            </p>
          </div>
          {needRefresh
            ? <button
                onClick={update}
                className="text-xs text-[var(--accent)] hover:underline font-medium"
              >
                Update now
              </button>
            : <span className="text-xs text-[var(--text-muted)]">✓ Latest</span>
          }
        </div>

        {/* Cache info */}
        <div className="py-2">
          <p className="text-sm text-[var(--text-primary)] mb-1">Offline Cache</p>
          <p className="text-xs text-[var(--text-muted)]">
            API data (keys, wallets, logs, orders) is cached for up to 5 minutes.
            Static assets are cached until a new version is deployed.
            Read-only pages work offline; write actions require a connection.
          </p>
        </div>
      </div>
    </div>
  );
};
```

---

## 15. Build & Deployment

### Build command

```bash
npm run build
```

Vite generates:
```
dist/
├── index.html
├── sw.js                    ← Generated service worker with injected asset manifest
├── manifest.json            ← Copied from public/
├── workbox-*.js             ← Workbox runtime chunks
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── icons/
    └── ...
```

### Hosting requirements

The server **must** serve these headers for PWA to work correctly:

```
# Service worker — no-cache so updates propagate
GET /sw.js
  Cache-Control: no-cache, no-store, must-revalidate

# Workbox chunks — long cache (hashed filenames)
GET /workbox-*.js
  Cache-Control: public, max-age=31536000, immutable

# Manifest — short cache
GET /manifest.json
  Cache-Control: public, max-age=3600

# All other assets — long cache (Vite adds content hashes)
GET /assets/*
  Cache-Control: public, max-age=31536000, immutable

# HTTPS is mandatory for service workers
# Redirect all HTTP to HTTPS at the CDN/proxy level
```

### Nginx config snippet

```nginx
server {
  listen 443 ssl;
  root /var/www/qwint-admin/dist;
  index index.html;

  # Service worker — must not be cached by browser
  location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
  }

  # Hashed assets — cache forever
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # Manifest
  location = /manifest.json {
    add_header Cache-Control "public, max-age=3600";
    add_header Content-Type "application/manifest+json";
  }

  # SPA fallback — all navigation requests serve index.html
  location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache";
  }
}
```

---

## 16. Testing the PWA

### Local testing

```bash
# Build first — SW only works on built output, not dev server
npm run build
npm run preview        # Vite preview serves dist/ on localhost:4173
```

Open Chrome DevTools → Application tab:
- **Manifest** → check all icons load, name/short_name correct, start_url correct
- **Service Workers** → status should be "activated and is running"
- **Cache Storage** → should show `qwint-api-cache`, `qwint-fonts`, `qwint-images`, and the precache

### Offline simulation test

1. Open `http://localhost:4173/dashboard` → let it load fully
2. DevTools → Network → throttle to **Offline**
3. Refresh the page → should load from SW cache, no network errors
4. Navigate to `/api-keys` → should load UI, show cached key list with "Cached" badge
5. Try to click "Generate Key" → should show "This action requires a connection." toast
6. Navigate to `/wallets` → should show cached wallet data
7. Navigate back online (remove throttle) → "Cached" badge disappears, data refreshes

### Update flow test

1. Build and serve `v1`
2. Open in browser → SW installs
3. Make a change (even just a comment) → build again (`v2`)
4. Serve `v2` while browser still has `v1` open
5. Within 60 seconds (the update poll interval), `UpdateBanner` should appear
6. Click "Update now" → page reloads with `v2`

### Install test (Android Chrome)

1. Serve over HTTPS (required) or use `localhost` in Chrome
2. Open in Chrome Android
3. Chrome shows "Add to Home Screen" banner automatically after 30s engagement
4. Or: Chrome menu → "Add to Home Screen"
5. Installed app should open with no browser chrome, violet splash on open

### Lighthouse PWA audit

```bash
npx lighthouse http://localhost:4173 --only-categories=pwa --output=html --output-path=./lighthouse-pwa.html
```

Target scores:
- PWA: all checks green
- Performance: ≥ 90
- The two items that commonly fail for admin panels:
  - "Does not redirect HTTP traffic to HTTPS" — acceptable in local testing, required in prod
  - "Content is sized correctly for the viewport" — fix with `viewport-fit=cover` (already in index.html)

---

## 17. Implementation Order

```
Step 1 — Icons & Manifest
  Generate all icon sizes from source PNG
  Generate iOS splash screens
  Write public/manifest.json
  Write public/offline.html
  Verify manifest loads: chrome://inspect → manifest tab

Step 2 — Vite Plugin Config
  Install vite-plugin-pwa workbox-window
  Update vite.config.ts
  Update index.html with all meta tags
  Build and verify sw.js is generated in dist/

Step 3 — Service Worker
  Write src/sw.ts with all cache strategies
  Build and verify in DevTools → Application → Cache Storage
  Run offline simulation test (step 16)

Step 4 — React Hooks
  src/pwa/usePwaUpdate.ts
  src/pwa/useNetworkStatus.ts
  src/pwa/useInstallPrompt.ts

Step 5 — UI Components
  src/pwa/UpdateBanner.tsx
  src/pwa/OfflineIndicator.tsx
  src/pwa/InstallButton.tsx
  src/pwa/IosInstallHint.tsx

Step 6 — AppShell Integration
  Update AppShell.tsx with all PWA components
  Switch h-screen to h-[100dvh]
  Test all components render/hide correctly

Step 7 — Offline-aware API Layer
  Update axios interceptor
  Update QueryClient config (networkMode)
  Add requireOnline guard to all mutation handlers
  Add "Cached" indicator to table pages

Step 8 — Theme Color Sync
  Update applyTheme() in theme.tsx
  Test: switch to light mode → Android status bar turns white

Step 9 — Settings PWA Section
  Add PwaSettingsSection to Settings.tsx
  Test install button appears when not installed
  Test update button appears when update available

Step 10 — Final QA
  Full offline simulation test
  Update flow test
  Lighthouse PWA audit
  Test on physical Android device
  Test on iOS Safari (install hint shows correctly)
```

---

## 18. Definition of Done

- [ ] `npm run build` produces a `dist/sw.js` with injected asset manifest
- [ ] All static assets precached on first install
- [ ] Dashboard, API Keys, Wallets, Logs, Orders all load offline from cache
- [ ] "Cached" badge appears on all pages when offline
- [ ] All mutation buttons show toast when clicked offline
- [ ] Update banner appears within 60 seconds of a new build being deployed
- [ ] Clicking "Update now" reloads with new version
- [ ] App installs to Android home screen with correct icon and name
- [ ] Installed app opens standalone (no browser chrome)
- [ ] iOS Safari shows install hint with correct instructions
- [ ] Splash screen shows on open (Android and iOS)
- [ ] Status bar color matches current theme
- [ ] Lighthouse PWA audit: all checks green
- [ ] Offline fallback page (`offline.html`) serves for uncached routes
- [ ] `sw.js` served with `no-cache` header in production
- [ ] All hashed assets served with `immutable` header in production

---

*End of PWA Implementation Plan*
*Qwint Talk Admin Panel*