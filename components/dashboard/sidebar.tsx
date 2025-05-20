"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Building2, FileText, Home, LogOut, Users, Menu } from "lucide-react";
import { useDispatch } from "react-redux";
import { signOut } from "@/lib/store/slices/authSlice";
import { AppDispatch } from "@/lib/store";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();

  const handleSignOut = async () => {
    await dispatch(signOut());
    router.push("/login");
  };

  const navItems = [
    { name: "Tableau de bord", href: "/dashboard", icon: Home },
    { name: "Utilisateurs", href: "/dashboard/users", icon: Users },
    { name: "Facturation", href: "/dashboard/invoices", icon: FileText },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="py-4 px-2">
        <div className="flex items-center px-3 py-2">
          <Building2 className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-2" />
          <span className="text-lg font-bold">Bricomatch</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
              >
                <span
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="mr-2 h-5 w-5" />
                  <span>{item.name}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="py-4 px-2 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start px-3 py-2 text-sm font-medium"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-5 w-5" />
          <span>Déconnexion</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop */}
      <div
        className={cn(
          "hidden md:flex h-full w-64 flex-col border-r",
          className
        )}
      >
        <SidebarContent />
      </div>
    </>
  );
}
