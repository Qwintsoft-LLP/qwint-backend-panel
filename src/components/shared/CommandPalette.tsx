import { useState, useEffect } from "react";
import { CommandDialog, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command";
import { useNavigate } from "react-router-dom";

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate        = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(p => !p);
      }
    };
    const customHandler = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("open-command-palette", customHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("open-command-palette", customHandler);
    };
  }, []);

  const go = (path: string) => { navigate(path); setOpen(false); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Go to... (type page name or action)" className="text-sm border-none focus:ring-0" />
      <CommandList>
        <CommandGroup heading="Navigation">
          {[
            { label: "Dashboard",           path: "/dashboard" },
            { label: "API Keys",            path: "/api-keys" },
            { label: "Wallets & Users",     path: "/wallets" },
            { label: "Products & Pricing",  path: "/payments/products" },
            { label: "Orders",              path: "/payments/orders" },
            { label: "System Logs",         path: "/logs" },
            { label: "Settings",            path: "/settings" },
          ].map(item => (
            <CommandItem key={item.path} onSelect={() => go(item.path)} className="text-sm cursor-pointer">
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { go("/api-keys"); }} className="cursor-pointer">Generate New API Key</CommandItem>
          <CommandItem onSelect={() => { go("/wallets"); }} className="cursor-pointer">Manual Wallet Top-up</CommandItem>
          <CommandItem onSelect={() => { go("/logs"); }} className="cursor-pointer">View System Logs</CommandItem>
          <CommandItem onSelect={() => { go("/settings"); }} className="cursor-pointer">Open Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
