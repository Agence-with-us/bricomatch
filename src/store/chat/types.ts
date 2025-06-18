// types/ChatTypes.ts

import { UserRole } from "../users/types";

export interface Message {
    id: string;
    senderId: string;
    text?: string;
    imageUrl?: string;
    timestamp: number;
    read: boolean;
}

export interface Chat {
    id: string;
    participants: {
        [userId: string]: {
            role: UserRole;
            lastRead: number; // timestamp of the last message read by this user
        }
    };
    lastMessage?: {
        text: string;
        timestamp: number;
        senderId: string;
    };
    createdAt: number;
    updatedAt: number;
}