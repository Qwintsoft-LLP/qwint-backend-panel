# Qwint Talk — Super Admin Panel
## Product Requirements Document (PRD)
**Version:** 1.0.0 | **Stack:** React + shadcn/ui + Tailwind CSS | **Audience:** Internal Engineering

---

## 0. Document Purpose

This PRD defines the complete specification for the Qwint Talk Super Admin Panel — an internal, single-page application giving administrators full control over API keys, wallets, payments, users, and system logs. Every section maps directly to an existing backend route or database table. There is no ambiguity about what to build.

---

## 1. Design Philosophy & Visual System

### 1.1 Core Principle

> **Density without clutter. Control without complexity.**

This is an operator tool, not a marketing page. Every pixel earns its place. No hero banners, no decorative illustrations, no wasted whitespace. The UI must feel like a professional terminal-grade dashboard — fast to scan, keyboard-navigable, and information-dense.

### 1.2 Design Token System

#### Color Palette

```
Dark Mode (default)
─────────────────────────────────────────────────────
--bg-base:        #0A0A0A   Root canvas
--bg-surface:     #111111   Cards, panels, sidebar
--bg-elevated:    #1A1A1A   Modals, dropdowns, inputs
--bg-hover:       #222222   Row/item hover states
--border:         #2A2A2A   All borders
--border-focus:   #3A3A3A   Focused input borders

--text-primary:   #F5F5F5   Headings, values
--text-secondary: #888888   Labels, metadata
--text-muted:     #555555   Disabled, placeholders

--accent:         #7C3AED   Primary CTA (violet)
--accent-hover:   #6D28D9
--success:        #22C55E   PAID, CREDIT, active
--warning:        #F59E0B   PENDING states
--error:          #EF4444   FAILED, errors, debit
--info:           #3B82F6   Info badges, links

Light Mode
─────────────────────────────────────────────────────
--bg-base:        #FAFAFA
--bg-surface:     #FFFFFF
--bg-elevated:    #F4F4F5
--bg-hover:       #F0F0F0
--border:         #E4E4E7
--text-primary:   #09090B
--text-secondary: #71717A
--text-muted:     #A1A1AA
```

#### Typography

```
Font Stack:
  Display/Headings: "Geist" or "Inter" — weight 500–600
  Body/Data:        "Geist Mono" or "JetBrains Mono" for values, keys, IDs
  System fallback:  -apple-system, BlinkMacSystemFont, sans-serif

Scale:
  xs:   11px / 0.6875rem   Metadata, timestamps
  sm:   12px / 0.75rem     Table cells, labels
  base: 14px / 0.875rem    Body, form fields
  lg:   16px / 1rem        Section titles
  xl:   20px / 1.25rem     Page headings
  2xl:  24px / 1.5rem      Dashboard metrics
```

#### Spacing System (8px base grid)

```
2px  — Micro gaps (badge padding)
4px  — Tight (icon-to-label)
8px  — Component internal padding
12px — Card padding default
16px — Section gaps
24px — Card margins
32px — Page section separation
```

No extra outer padding on tables. Table rows flush to card edges.

#### Component Tokens (shadcn overrides)

```css
/* Card */
--card-padding: 0;              /* Tables go edge-to-edge inside cards */
--card-radius: 6px;
--card-border: 1px solid var(--border);

/* Table */
--table-row-height: 40px;
--table-header-height: 36px;
--table-cell-px: 12px;

/* Badge */
--badge-radius: 4px;
--badge-px: 6px;
--badge-py: 2px;
--badge-font-size: 11px;
--badge-font-weight: 500;

/* Input */
--input-height: 32px;
--input-radius: 6px;
--input-border: 1px solid var(--border);

/* Button */
--btn-height-sm: 28px;
--btn-height-md: 32px;
--btn-radius: 6px;
```

### 1.3 Layout Architecture

```
┌────────────────────────────────────────────────────────┐
│  [Logo]  [Nav Links]                    [Mode] [User]  │  ← Topbar (48px)
├──────────┬─────────────────────────────────────────────┤
│          │                                             │
│  Sidebar │  Main Content Area                          │
│  (220px) │  - Page title + action buttons (40px)       │
│          │  - Content (tables / forms / metrics)        │
│          │                                             │
└──────────┴─────────────────────────────────────────────┘
```

- Sidebar collapses to icon-only (48px) on `<= 1024px`
- Below `768px`: sidebar becomes a bottom sheet / drawer
- No nested sidebars or tabbed panes inside pages — one level of navigation only

---

## 2. Application Shell

### 2.1 Routing Structure

```
/                         → redirect to /dashboard
/dashboard                → Overview (metrics + recent activity)
/api-keys                 → API Key Management
/api-keys/:key/budget     → Budget update drawer (URL-addressable)
/wallets                  → User Wallet Balances
/wallets/:userId          → User transaction history
/payments/products        → Product listing & pricing
/payments/orders          → Order tracking
/logs                     → System logs
/settings                 → Auth key config (master key, admin key)
```

### 2.2 Sidebar Navigation

```
[Q] Qwint Admin                         ← Brand mark

── OVERVIEW ──
  Dashboard

── MANAGEMENT ──
  API Keys
  Wallets & Users

── BILLING ──
  Products & Pricing
  Orders

── SYSTEM ──
  Logs

── CONFIG ──
  Settings
```

Active state: violet left border (`3px solid var(--accent)`) + `bg-hover` background. No pill shapes.

### 2.3 Topbar

```
[Sidebar toggle]  [Breadcrumb]                    [Theme toggle]  [Auth status indicator]
```

Auth status indicator: a small dot — green if master key + admin key are both configured, amber if only one, red if neither. Clicking it opens a popover explaining which keys are missing.

### 2.4 Global State Requirements

The app must store the following in `localStorage` (not hardcoded):

| Key | Used for |
|---|---|
| `qw_master_key` | `x-master-key` header on all admin routes |
| `qw_admin_key` | `x-admin-key` header on wallet routes |
| `qw_jwt` | `Authorization: Bearer <token>` on user routes |
| `qw_api_base_url` | Backend base URL (configurable per environment) |
| `qw_theme` | `dark` / `light` |

These are set from `/settings`. No env-file hardcoding.

---

## 3. Dashboard (Overview)

**Route:** `/dashboard`

**Purpose:** At-a-glance health and activity metrics. The landing screen.

### 3.1 Metric Cards (Top Row)

Four compact stat cards in a single row:

| Card | Value Source | Label |
|---|---|---|
| Total Active API Keys | `GET /admin/keys` → count where `is_active: true` | Active Keys |
| Total API Key Budget Remaining | Sum of `remaining_budget` from all keys | Budget Remaining |
| Recent Errors (last 50 logs) | `GET /logs/latest` → count `level: error` | System Errors |
| Recent Credits Deducted | Sum of `credits_deducted` from latest logs | Credits Used (Recent) |

Card anatomy:
```
┌──────────────────────┐
│ 42                   │  ← Value (2xl, text-primary, mono)
│ Active API Keys      │  ← Label (xs, text-secondary)
└──────────────────────┘
```
No icons, no trend arrows unless data supports it. Values left-aligned. Border-only cards (no fills).

### 3.2 Recent Activity Feed

Two columns below the metric cards:

**Left (60%):** Latest 10 system log entries as a compact list
```
[METHOD]  /proxy/direct-caption        200   42ms   −1.2 cr   2m ago
[POST]    /stt/                         500   —       —        5m ago
```

**Right (40%):** Latest 5 wallet transactions
```
USER: 8f3a...   +500 cr   Manual Top-up   2h ago
USER: 1c9b...   −12 cr    API Usage       3h ago
```

No charts, no graphs. The panel is a control surface, not analytics.

### 3.3 Data Refresh

- Auto-refresh every 60 seconds (configurable, toggle-able with a "Live" pill button)
- Manual refresh button (rotate icon) in the page action bar

---

## 4. API Key Management

**Route:** `/api-keys`
**Auth:** `x-master-key` header on all requests

### 4.1 Page Layout

```
[Page Title: API Keys]          [+ Generate Key]  [Generate + ZIP]
─────────────────────────────────────────────────────────────────────
[Search: username or key...]    [Filter: Active / Inactive / All]
─────────────────────────────────────────────────────────────────────
[Table]
```

### 4.2 API Keys Table

| Column | Source Field | Notes |
|---|---|---|
| Username | `username` | Plain text |
| API Key | `key` | Masked by default: `sk-••••••••••••XXXX`. Eye icon to reveal |
| Budget | `budget` | Right-aligned, 2 decimal places |
| Remaining | `remaining_budget` | Right-aligned, color-coded: green ≥70%, amber 30–70%, red <30% |
| Status | `is_active` | Badge: `Active` (green) / `Inactive` (gray) |
| Created | `created_at` | Relative (`3 days ago`) with title attr for full date |
| Last Used | `last_used` | Relative, or `—` if never used |
| Note | `note` | Truncated to 120 chars, full text in tooltip |
| Actions | — | `···` menu: **Update Budget**, **Copy Key**, **View Order** |

- Sortable: Username, Remaining Budget, Created At, Last Used
- Default sort: Created At DESC
- Pagination: 25 rows per page, page controls at table bottom-right
- Row click: no action (use `···` menu explicitly)

### 4.3 Generate Key — Slide-over Panel (Right)

Triggered by **[+ Generate Key]** button. Slide-over from right (400px wide), overlays content.

```
Generate New API Key
─────────────────────────────
Username *         [_____________]
Budget             [100         ]  (default: 100)
Note               [_____________]
                   [_____________]  (2-row textarea)
─────────────────────────────
               [Cancel]  [Generate Key →]
```

On success:
- Show inline success state with the new key displayed (with copy button)
- Do NOT close the panel immediately — let admin copy the key first
- "Close" button appears after generation

### 4.4 Generate Key + ZIP

Same form as 4.3, with one difference: on success, the response triggers `GET /payment/download-plugin/:apiKey` to download the ZIP automatically. Show a progress state while downloading.

### 4.5 Update Budget — Modal

Triggered from `···` menu on a row. Opens a compact centered modal (not slide-over).

```
Update Budget
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Key:    sk-••••XXXX (username)
Current Remaining: $42.80

Operation   ◉ Credit   ○ Debit
Amount *    [_______]
Description [_______________________]  ← required for audit

            [Cancel]  [Apply Changes]
```

- Validate: amount > 0, description non-empty
- On success: toast + table row updates in-place (optimistic update)
- On error: inline error below the form

---

## 5. Wallets & User Management

**Route:** `/wallets`
**Auth:** `x-admin-key` + `Authorization: Bearer <jwt>`

### 5.1 Page Layout

```
[Page Title: Wallets & Users]          [+ Manual Top-up]
────────────────────────────────────────────────────────
[Search: user ID or mobile...]
────────────────────────────────────────────────────────
[Table]
```

### 5.2 All User Balances Table

Data source: `GET /wallet/admin/balances`

| Column | Source | Notes |
|---|---|---|
| User ID | `user_id` | Truncated UUID with copy icon |
| Name | `users.name` | `—` if null |
| Mobile | `users.mobile` | Masked: `+91 ••••••0123` |
| Balance | `balance_credits` | Right-aligned, mono font |
| Status | `users.is_active` | Badge |
| Joined | `users.created_at` | Relative |
| Actions | — | **View Transactions**, **Top-up** |

- Row click → navigate to `/wallets/:userId`

### 5.3 Top-up Modal

Triggered from **[+ Manual Top-up]** button or row action.

```
Manual Wallet Top-up
━━━━━━━━━━━━━━━━━━━━━━━━━━━
User ID *    [_____________]   [or select from search]
Credits *    [_____________]   (integer, positive)
Note *       [_____________]   (reason for top-up)

             [Cancel]  [Add Credits]
```

Uses: `POST /wallet/topup` with `x-admin-key`.

### 5.4 User Transaction History

**Route:** `/wallets/:userId`

```
← Back to Wallets    User: [Name / ID]    Balance: [X credits]
─────────────────────────────────────────────────────────────────
[Table of transactions]
```

Data source: `GET /wallet/transactions` scoped to user.

| Column | Source | Notes |
|---|---|---|
| Date | `created_at` | Full timestamp |
| Type | `type` | Badge: `CREDIT` (green) / `DEBIT` (red) |
| Amount | `amount` | Signed: +500 / −12 |
| App | `app_name` | Small gray text |
| Status | `status` | Badge |
| Description | `description` | Full text (no truncation) |
| Reference | `reference_id` | Mono, copy icon, truncated |

- No pagination limit — load all (or 100 + load more)
- No filtering needed on this page (it's already user-scoped)

---

## 6. Products & Pricing

**Route:** `/payments/products`
**Auth:** None for read; admin key for modifications (if endpoint supports it)

### 6.1 Product List

Data source: `GET /payment/products`

Rendered as a table (not cards — cards waste space):

| Column | Notes |
|---|---|
| Product ID | Mono, copyable |
| Name/Label | |
| Amount | Right-aligned, with currency |
| Credits Allocated | |
| Currency | |
| Actions | **Edit** |

### 6.2 Edit Product — Inline Row Edit

On **Edit**: the row turns into an editable form in-place. No modal.

```
[Product ID]  [Name field]  [Amount input]  [Credits input]  [Currency]   [✓ Save]  [✗ Cancel]
```

Inline edits reduce context-switching for rapid pricing changes.

---

## 7. Orders

**Route:** `/payments/orders`

### 7.1 Orders Table

No dedicated backend list-all endpoint is documented; the table will aggregate from available data. If the endpoint exists, use it. Display:

| Column | Source | Notes |
|---|---|---|
| Order ID | `razorpay_order_id` | Mono, copy icon |
| Customer | `customer_name` + `customer_mobile` | Two-line cell |
| Product | `product_id` | |
| Amount | `amount` | With currency |
| Status | `status` | Badge: `PENDING` (amber) / `PAID` (green) / `FAILED` (red) |
| Payment ID | `razorpay_payment_id` | Mono, `—` if null |
| Created | `created_at` | Relative |
| Actions | — | **Check Key Status**, **Issue Free Key** |

### 7.2 Check Key Status

**Action:** `GET /payment/key-status/:identifier`

Opens a small popover/tooltip panel below the row — not a modal — showing:
- Identifier
- Key status response
- Timestamp

### 7.3 Issue Free Key — Modal

```
Issue Promotional Key
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mobile / Email *  [_____________]
Budget            [100         ]
Note              [Promotional - Q3 2025]

                  [Cancel]  [Issue Key]
```

Uses: `POST /payment/free-key`.

On success: shows generated key with copy button inside the modal.

---

## 8. System Logs

**Route:** `/logs`
**Data source:** `GET /logs/latest` (latest 50 entries)

### 8.1 Filter Bar

```
[Search: message or URL]  [Level: All ▾]  [App: All ▾]  [API Key...]  [User ID...]  [⟳ Refresh]
```

Filters are client-side on the 50 loaded entries. No server-side filter endpoint exists per the spec.

Level filter options: `All`, `info`, `warn`, `error`
App filter options: `All`, `qwint_talk`, `qwint_caption` + any others from data

### 8.2 Logs Table

Compact rows, high density. Font size 12px for this table only.

| Column | Width | Notes |
|---|---|---|
| Time | 80px | `HH:MM:SS` relative |
| Level | 52px | Badge: `INFO` (blue) `WARN` (amber) `ERROR` (red) |
| Method | 52px | `POST` `GET` badges, muted |
| URL | flex | Truncated, full in tooltip |
| Status | 52px | Color-coded: 2xx green, 4xx amber, 5xx red |
| Duration | 64px | `XXXms`, mono, right-aligned |
| Credits | 64px | `−1.2` mono, right-aligned, `—` if null |
| API Key | 96px | Last 8 chars, copy icon |
| User ID | 96px | Last 8 chars of UUID, copy icon |
| Actions | 32px | `↗` expand icon |

### 8.3 Log Detail Drawer

Clicking `↗` on a row opens a right-side drawer (480px) with full log data:

```
Log Detail
────────────────────────────────
Level         ERROR
Timestamp     2025-07-12 14:32:01 UTC
Method        POST
URL           /proxy/direct-caption
Status        500
Duration      1,240ms
App           qwint_caption
API Key       sk-••••••••XXXXXXXX
User ID       8f3a...
Credits       —

Message
"Deepgram timeout after 1200ms"

Metadata
{
  "file_size": "48MB",
  "codec": "h264"
}

Response Data
{ "error": "upstream_timeout" }

SRT Output
(empty)
```

All JSON shown in a syntax-highlighted code block (use `react-json-view` or styled `<pre>`).

### 8.4 Auto-refresh

Toggle at top-right of page: **"Live (30s)"** toggle. When on, polls every 30 seconds. New entries prepend with a subtle highlight animation (1 second fade from `bg-accent/10` to transparent).

---

## 9. Settings

**Route:** `/settings`

Simple form page. Not a modal, not a sidebar overlay.

```
Settings
────────────────────────────────────────────────
Configuration keys are stored in your browser's
localStorage and never sent to any server.

API Configuration
─────────────────
Base URL *            [https://api.qwinttalk.com]
Master Key *          [•••••••••••••••••  👁]
Admin Key             [•••••••••••••••••  👁]
JWT Token             [•••••••••••••••••  👁]

Appearance
──────────
Theme                 ◉ Dark  ○ Light  ○ System

                      [Save Settings]
```

- All sensitive fields masked by default, eye icon to reveal
- Save writes to localStorage
- On save: toast "Settings saved" + re-validates connectivity by hitting `GET /wallet/balance` (lightweight check)
- No "Test connection" button needed — save implies test

---

## 10. Component Specifications

### 10.1 Data Table (shared component)

All tables use a shared `<AdminTable>` component. Rules:

- No outer padding on the table itself — the card provides zero padding, table fills edge-to-edge
- Header row: `bg-elevated`, 36px height, uppercase labels 11px weight-500 text-secondary, `border-b`
- Data rows: 40px height, hover `bg-hover`, `border-b border-border/50`
- Last row: no border-b
- Checkbox column (optional, 40px) for bulk actions
- Sticky header when table > viewport height
- Empty state: centered, 80px height, "No data" in text-muted. No illustrations.
- Loading state: skeleton rows (3 rows of shimmer), same height as real rows

### 10.2 Status Badges

Single `<StatusBadge>` component with variants:

```tsx
type BadgeVariant = 
  | "success"   // green  — PAID, CREDIT, Active, info
  | "error"     // red    — FAILED, DEBIT, Inactive, error
  | "warning"   // amber  — PENDING, warn
  | "neutral"   // gray   — unknown/default states
  | "info"      // blue   — info level logs, GET method
  | "ghost"     // muted  — POST, PUT method indicators
```

All badges: uppercase, 11px, 500 weight, 4px border-radius, 6px horizontal padding.

### 10.3 Copy Field

```tsx
<CopyField value="sk-abcdef123456" masked />
```

Renders: truncated value + copy icon. On click: copies full value to clipboard, icon changes to checkmark for 2 seconds. No toast for copy — inline feedback only.

### 10.4 Confirmation Dialog

For destructive actions (budget debit, etc.):

```
Are you sure?
─────────────────
This will deduct $50 from key sk-••••XXXX.
This action cannot be undone.

[Cancel]  [Confirm — Deduct $50]
```

Confirm button: destructive variant (red). Must type `CONFIRM` for actions > $500 budget changes.

### 10.5 Slide-over Panel

Right-side panel, 400px wide on desktop. Full-screen on mobile (`< 640px`). Backdrop overlay `bg-black/40`. Close on backdrop click or `Escape` key.

### 10.6 Toast Notifications

Bottom-right, stack up to 3. Auto-dismiss after 4 seconds. Types: `success`, `error`, `info`. No `warning` toasts (use inline form errors instead).

```
✓  API key generated successfully        ✕
✗  Failed to update budget: Network error  ✕
```

---

## 11. API Integration Map

Every UI action maps to exactly one backend call:

| UI Action | Method | Endpoint | Auth Header |
|---|---|---|---|
| Load all API keys | GET | `/admin/keys` | `x-master-key` |
| Generate key | POST | `/admin/keys/generate` | `x-master-key` |
| Generate key + ZIP | POST | `/admin/keys/generate-with-zip` | `x-master-key` |
| Download plugin | GET | `/payment/download-plugin/:apiKey` | `x-master-key` |
| Update key budget | PUT | `/admin/keys/update-budget` | `x-master-key` |
| Get wallet balances | GET | `/wallet/admin/balances` | `x-admin-key` + JWT |
| Manual top-up | POST | `/wallet/topup` | `x-admin-key` + JWT |
| Get user transactions | GET | `/wallet/transactions` | JWT |
| Get products | GET | `/payment/products` | — |
| Create order | POST | `/payment/create-order` | — |
| Check key status | GET | `/payment/key-status/:identifier` | — |
| Issue free key | POST | `/payment/free-key` | — |
| Get logs | GET | `/logs/latest` | — |

### 11.1 Error Handling

- **401/403:** Show a banner at top of page: "Authentication failed — check your keys in Settings." With a link to `/settings`.
- **5xx:** Toast error with the status code and message from response body.
- **Network error:** Toast "Could not reach server — check Base URL in Settings."
- **422/400:** Show inline field errors in forms, not toasts.

### 11.2 Loading States

- Table initial load: skeleton rows
- Action (button click): button shows spinner, disabled state. No full-page loading overlay.
- Modal/slide-over submit: button spinner + disabled form

---

## 12. Responsiveness

| Breakpoint | Behavior |
|---|---|
| `>= 1280px` | Full layout. Sidebar 220px. All table columns visible. |
| `1024–1279px` | Sidebar collapses to 48px (icons only). Hover to see labels. |
| `768–1023px` | Sidebar hidden. Top nav with hamburger. Tables scroll horizontally. |
| `< 768px` | Bottom tab bar (Dashboard, Keys, Wallets, Logs). All tables full-width horizontal scroll. Slide-overs go full-screen. |

Tables on mobile: prioritize `Username/Name`, `Amount/Balance`, `Status`, `Actions`. Other columns hidden, accessible via row expand.

---

## 13. Security Requirements (Frontend)

- Keys stored in `localStorage` — never in React state that could be serialized to URLs
- No keys in URL params, query strings, or `console.log`
- Auto-logout from `localStorage` is **not** implemented (this is an internal tool without session management). Auth is via keys, not sessions.
- Master key and Admin key fields in Settings always render masked
- Copy-to-clipboard of API keys logs a `console.info` event (for developer audit; not visible to end users)
- Content-Security-Policy: implemented by the hosting environment, not this app

---

## 14. Tech Stack Specification

### Core

```
React 18+              — UI framework
React Router v6        — Client-side routing
TypeScript             — Strict mode enabled
Vite                   — Build tool
```

### UI Layer

```
shadcn/ui              — Component primitives (Button, Input, Dialog, Sheet, Table, Badge, Toast)
Tailwind CSS v3        — Utility classes (no custom CSS files except token overrides)
lucide-react           — Icons (single icon library, no mixing)
```

### Data

```
TanStack Query v5      — Server state, caching, auto-refetch
axios                  — HTTP client (interceptors for auth headers)
```

### Utilities

```
date-fns               — Date formatting (relative times)
clsx + tailwind-merge  — Conditional classNames (cn() utility)
```

### No External Dependencies Allowed For

- Charts/graphs (not needed per spec)
- Animation libraries (CSS transitions only)
- Rich text editors
- Third-party form libraries (use controlled React state or React Hook Form only)

---

## 15. File Structure

```
src/
├── api/
│   ├── client.ts           ← axios instance, interceptors
│   ├── admin.ts            ← /admin/* endpoints
│   ├── wallet.ts           ← /wallet/* endpoints
│   ├── payment.ts          ← /payment/* endpoints
│   └── logs.ts             ← /logs/* endpoints
├── components/
│   ├── ui/                 ← shadcn generated components (do not edit)
│   ├── shared/
│   │   ├── AdminTable.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── CopyField.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── SlideOver.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Topbar.tsx
│       └── AppShell.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── ApiKeys.tsx
│   ├── Wallets.tsx
│   ├── WalletDetail.tsx
│   ├── Products.tsx
│   ├── Orders.tsx
│   ├── Logs.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useApiKeys.ts
│   ├── useWallets.ts
│   ├── useLogs.ts
│   └── useSettings.ts
├── lib/
│   ├── utils.ts            ← cn(), formatCredits(), etc.
│   └── storage.ts          ← localStorage helpers
└── main.tsx
```

---

## 16. Acceptance Criteria

### Per-Feature Checklist

**API Keys**
- [ ] Table loads all keys from `GET /admin/keys` with master key
- [ ] API key value masked by default; reveal on click
- [ ] Generate Key slide-over submits and shows generated key before closing
- [ ] Generate + ZIP triggers file download on success
- [ ] Update Budget modal validates operation + amount + description before submitting
- [ ] Table rows update without full page reload after budget change

**Wallets**
- [ ] All user balances table loads from `GET /wallet/admin/balances`
- [ ] Top-up modal accepts userId, credits, note — submits to `POST /wallet/topup`
- [ ] Clicking a user navigates to transaction history page
- [ ] Transaction history shows CREDIT in green, DEBIT in red

**Payments**
- [ ] Products table loads and all fields are editable inline
- [ ] Orders table shows PENDING/PAID/FAILED with correct badge colors
- [ ] Check key status opens an in-row popover, not a modal
- [ ] Issue free key modal shows generated key on success

**Logs**
- [ ] Latest 50 logs load on page mount
- [ ] Client-side filtering by level, app, api_key, user_id works
- [ ] Row expand drawer shows full metadata as formatted JSON
- [ ] Auto-refresh toggle works and new entries animate in

**Settings**
- [ ] All key fields masked with toggle reveal
- [ ] Save writes to localStorage
- [ ] Dark/light/system theme switch works instantly

**Global**
- [ ] 401/403 → settings banner
- [ ] 5xx → toast with message
- [ ] Network error → toast
- [ ] All tables have loading skeletons
- [ ] All tables have empty states
- [ ] App is usable on 375px viewport (mobile)
- [ ] Theme persists across page reload

---

## 17. Out of Scope (v1.0)

The following are explicitly excluded from this version:

- User creation or deletion (no backend endpoint)
- Role management / multiple admin users
- Analytics charts / graphs / trend lines
- Export to CSV / PDF
- Audit log of admin actions (separate backend concern)
- Email / notification integrations
- Multi-tenant or workspace support
- Real-time WebSocket updates (polling only)

---

*End of PRD — v1.0.0*
*Prepared for: Qwint Talk Engineering*