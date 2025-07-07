"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Building2,
  FileText,
  Home,
  LogOut,
  Users,
  Menu,
  Bell,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { signOut } from "@/lib/store/slices/authSlice";
import { AppDispatch } from "@/lib/store";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getAuth } from "firebase/auth";
interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) return;

        const token = await user.getIdToken();

        const res = await fetch("http://localhost:3000/api/notifications/unread-count", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Erreur API");

        const data = await res.json();
        setUnreadCount(data.unreadCount);
      } catch (error) {
        console.error("Erreur notifications :", error);
      }
    };

    fetchUnreadNotifications();
  }, []);

  const handleSignOut = async () => {
    await dispatch(signOut());
    router.push("/login");
  };

  const navItems = [
    { name: "Tableau de bord", href: "/dashboard", icon: Home },
    { name: "Utilisateurs", href: "/dashboard/users", icon: Users },
    { name: "Facturation", href: "/dashboard/invoices", icon: FileText },
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="py-4 px-2">
        <div className="flex items-center px-3 py-2">
          <img
            src="/logo.png"
            alt="Logo Bricomatch"
            width={32}
            height={32}
            className="object-contain"
          />
          <span className="text-lg font-bold pl-3">Bricomatch</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {navItems.map((item) => {
            let isActive = false;
            if (item.href === "/dashboard") {
              isActive = pathname === "/dashboard";
            } else {
              isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            }
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
                  <span className="relative flex items-center">
                    <item.icon className="mr-2 h-5 w-5" />
                    <span>{item.name}</span>
                    {item.name === "Notifications" && unreadCount > 0 && (
                      <span className="ml-1 flex items-center justify-center text-[10px] font-semibold text-white bg-red-600 rounded-full w-5 h-5 leading-none">
                        {unreadCount}
                      </span>
                    )}
                  </span>
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
    </div >
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
