"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { setUser } from "../../lib/store/slices/authSlice";
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, status } = useAuth();
  const { theme } = useTheme();
  const dispatch = useDispatch();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        dispatch(setUser({ user, token }));
      } else {
        dispatch(setUser({ user: null, token: null }));
      }
    });
    return () => unsubscribe();
  }, []);

  if (status === "loading") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // if (!isAuthenticated && status !== "loading") {
  //   return null;
  // }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
