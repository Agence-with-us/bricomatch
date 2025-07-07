"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { setUser, setStatus } from "@/lib/store/slices/authSlice";
import { RootState } from "@/lib/store";

export function useAuth({ required = true }: { required?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user, status } = useSelector((state: RootState) => state.auth);

  const DISABLE_AUTH = false;

  useEffect(() => {
    if (DISABLE_AUTH) return;

    dispatch(setStatus("loading"));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      dispatch(setUser(user));

      if (user) {
        try {
          // ⚠️ Forcer un refresh du token pour récupérer les custom claims (admin)
          const token = await user.getIdToken(true);
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/checkAdmin`, {

            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            console.warn("Non-admin détecté. Redirection vers /login.");
            router.push("/login");
            return;
          }

          // ✅ Admin autorisé : rediriger vers /dashboard s'il est sur /login
          if (pathname === "/login") {
            router.push("/dashboard");
          }
        } catch (err) {
          console.error("Erreur lors de la vérification admin:", err);
          router.push("/login");
        }
      } else if (required) {
        // 🚫 Pas connecté du tout
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
    });

    return () => unsubscribe();
  }, [dispatch, router, pathname, required]);

  return { user, status, isAuthenticated: !!user };
}
