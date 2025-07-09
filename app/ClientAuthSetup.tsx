"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { setUser, setToken } from "@/lib/store/slices/authSlice";
import { auth } from "@/lib/firebase";

export default function ClientAuthSetup() {
    const dispatch = useDispatch();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const token = await firebaseUser.getIdToken();
                dispatch(setUser({ user: firebaseUser, token }));
            } else {
                dispatch(setUser({ user: null, token: null }));
            }
        });

        return () => unsubscribe();
    }, [dispatch]);

    return null;
}
