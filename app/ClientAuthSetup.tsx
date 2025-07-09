"use client";

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setToken } from '@/lib/store/slices/authSlice';

export default function ClientAuthSetup() {
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            const { store } = require('@/lib/store'); // safe côté client uniquement
            store.dispatch(setToken(savedToken));
        }
    }, []);

    return null;
}
