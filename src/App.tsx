import { RouterProvider, createBrowserRouter, Outlet, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"

import Dashboard from "@/pages/Dashboard"
import Users from "@/pages/Users"
import UserDetail from "@/pages/UserDetail"
import ApiKeys from "@/pages/ApiKeys"
import Wallets from "@/pages/Wallets"
import WalletDetail from "@/pages/WalletDetail"
import Products from "@/pages/Products"
import Orders from "@/pages/Orders"
import Logs from "@/pages/Logs"
import Settings from "@/pages/Settings"
import Analytics from "@/pages/Analytics"
import LangfusePage from "@/pages/Langfuse"
import LangfuseUserDetail from "@/pages/langfuse/LangfuseUserDetail"
import UsagePage from "@/pages/Usage"
import AppShell from "@/components/layout/AppShell"

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AppShell>
        <Outlet />
      </AppShell>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "usage",     element: <UsagePage /> },
      { path: "users", element: <Users /> },
      { path: "users/:userId", element: <UserDetail /> },
      { path: "api-keys",  element: <ApiKeys /> },
      { path: "wallets", element: <Wallets /> },
      { path: "wallets/:userId", element: <WalletDetail /> },
      { path: "payments/products", element: <Products /> },
      { path: "payments/orders", element: <Orders /> },
      { path: "logs",      element: <Logs /> },
      { path: "langfuse",  element: <LangfusePage /> },
      { path: "langfuse/users/:userId", element: <LangfuseUserDetail /> },
      { path: "settings",  element: <Settings /> },
      { path: "analytics", element: <Analytics /> },
    ],
  },
])

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
