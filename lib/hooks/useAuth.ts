"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { setUser, setStatus, setIsAdmin } from "@/lib/store/slices/authSlice";
import { RootState } from "@/lib/store";

export function useAuth({ required = true }: { required?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user, status } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(setStatus("loading"));

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const token = await fbUser.getIdToken(true);
        dispatch(setUser({ user: fbUser, token }));

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/checkAdmin`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const isAdmin = res.ok;
          dispatch(setIsAdmin(isAdmin));

          if (!isAdmin) {
            router.push("/login");
          } else if (pathname === "/login") {
            router.push("/dashboard");
          }
        } catch (err) {
          console.error("Erreur lors de la vérification admin:", err);
          dispatch(setIsAdmin(false));
          router.push("/login");
        }
      } else {
        dispatch(setUser({ user: null, token: null }));
        dispatch(setIsAdmin(false));
        if (required && pathname !== "/login") {
          router.push("/login");
        }
      }
    });

    return () => unsubscribe();
  }, [dispatch, router, pathname, required]);

  return { user, status, isAuthenticated: !!user };
}
