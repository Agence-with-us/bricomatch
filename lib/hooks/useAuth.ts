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
    if (DISABLE_AUTH) {
      return;
    }

    dispatch(setStatus("loading"));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      dispatch(setUser(user));

      if (required && !user) {
        if (pathname !== "/login") {
          router.push("/login");
        }
      } else if (user && pathname === "/login") {
        router.push("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [dispatch, router, pathname, required]);

  return { user, status, isAuthenticated: !!user };
}
