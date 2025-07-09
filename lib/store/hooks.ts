// lib/store/hooks.ts

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

// 👉 useDispatch avec type AppDispatch
export const useAppDispatch = () => useDispatch<AppDispatch>();

// 👉 useSelector avec type RootState
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
