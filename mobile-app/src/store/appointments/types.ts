import { Service } from "../services/types";

// Interface pour un rendez-vous
export interface Appointment {
    id?: string;
    proId?: string;
    clientId?: string;
    dateTime: { toDate: () => Date };
    duration: number;
    timeSlot: string;
    status: AppointmentStatus;
    roomId?: string;
    montantHT?: number;
    montantTotal?: number;// Total amount including VAT
    stripePaymentIntentId?: string;
    createdAt?: string | Date;
}

export interface AppointmentWithOtherUserInfo {
    appointment: Appointment;
    otherUser: {
        id: string;
        nom: string;
        prenom: string;
        photoUrl: string;
        serviceInfo?: Service;
    };
    endTime: any;
    fullDate: any;
    isOngoing: any;
    timeStatus: "past" | "ongoing" | "upcoming";
}

export enum AppointmentStatus {
    PENDING = 'PENDING',                       //
    PAYMENT_INITIATED = 'PAYMENT_INITIATED',     // Paiement créé, en attente de confirmation carte
    PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED',   // Paiement autorisé, en attente validation PRO
    CONFIRMED = 'CONFIRMED',                     // RDV confirmé par le PRO, paiement capturé
    COMPLETED = 'COMPLETED',                     // RDV terminé (visio > 10min)
    CANCELLED_BY_CLIENT = 'CANCELLED_BY_CLIENT', // Annulé par le particulier
    CANCELLED_BY_PRO = 'CANCELLED_BY_PRO',       // Annulé par le PRO
    CANCELLED_BY_PRO_PENDING = 'CANCELLED_BY_PRO_PENDING',       // envoyé au admin pour confirmé,
    PENDING_PAYOUT = 'PENDING_PAYOUT',                     // En attente de paiement
    PAID_OUT = 'PAID_OUT',                                 // Paiement capturé
}

export interface AppointmentsState {
    myAppointements: AppointmentWithOtherUserInfo[];
    loading: boolean;
    error: string | null;
}
