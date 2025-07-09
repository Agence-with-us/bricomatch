"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { setUser } from "@/lib/store/slices/authSlice";
import { auth } from "@/lib/firebase";

export default function ClientAuthSetup() {
    const dispatch = useDispatch();

    useEffect(() => {
        // 🔑 1) Récupère token localStorage
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

        if (token) {
            // ⚡️ optionnel : tu peux mettre un user `null` car seul le token t'intéresse pour l'instant
            dispatch(setUser({ user: null, token }));
        }

        // 🔑 2) Ecoute auth Firebase pour maj correct
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const freshToken = await firebaseUser.getIdToken();
                dispatch(setUser({ user: firebaseUser, token: freshToken }));
            } else {
                dispatch(setUser({ user: null, token: null }));
            }
        });

        return () => unsubscribe();
    }, [dispatch]);

    return null;
}
