import { Service } from "../services/types";

// types/UserType.ts
export interface UserLocal {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    description?: string;
    role: string;
    photoUrl?: string;
    serviceTypeId?: string;
    serviceInfo?: Service; // Information complète du service

    averageRating?: number;
    reviewsCount?: number;
}

export interface UsersState {
    proUsers: UserLocal[];
    proUsersByService: Record<string, UserLocal[]>;
    loading: boolean;
    error: null | string;
}

export enum UserRole {
    PRO = 'PRO',
    PARTICULIER = 'PARTICULIER',
}