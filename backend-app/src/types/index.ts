// User related types
export interface UserLocal {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  description?: string;
  role: UserRole;
  photoUrl?: string;
  serviceTypeId?: string; // For PRO users
  TVA_SOUMI?: boolean; // For PRO users
  IBAN?: string; // For PRO users

  // Nouveaux champs pour Stripe
  stripeAccountId?: string;
  stripeAccountStatus?: 'pending' | 'active' | 'restricted' | 'rejected';
  stripeOnboardingComplete?: boolean;
  stripeProcessed?: boolean; // Pour éviter les doublons

  averageRating: number;
  reviewsCount: number;
}

export enum UserRole {
  PARTICULIER = 'PARTICULIER',
  PRO = 'PRO',
  ADMIN = 'ADMIN'
}

// Appointment related types
export interface Appointment {
  id?: string;
  proId: string;
  clientId: string;
  dateTime: { toDate: () => Date };
  duration: number; // in minutes (30 or 60)
  timeSlot: string;
  status: AppointmentStatus;
  montantHT: number;
  montantTotal: number; // Total amount including VAT
  roomId?: string;
  stripePaymentIntentId?: string;

  callHistory?: Array<any>;
  totalCallDuration?: number;

  // Nouveau système d'évaluation
  evaluationHistory?: Array<EvaluationEntry>;
  lastEvaluatedAt?: { toDate: () => Date };

  // Champs pour le système de paiement
  pendingPayoutSince?: { toDate: () => Date };
  paidOutAt?: { toDate: () => Date };
  stripeTransferId?: string;
  proSharePaid?: number;

  createdAt?: { toDate: () => Date };
  updatedAt?: { toDate: () => Date };
}

export interface EvaluationEntry {
  rating: number;
  clientId: string;
  totalCallDuration: number;
  evaluatedAt: { toDate: () => Date };
  processed: boolean; // Pour savoir si cette évaluation a été traitée par le cron
}


export enum AppointmentStatus {
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',     // Paiement créé, en attente de confirmation carte
  PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED',   // Paiement autorisé, en attente validation PRO
  CONFIRMED = 'CONFIRMED',                     // RDV confirmé par le PRO, paiement capturé
  COMPLETED = 'COMPLETED',                     // RDV terminé (visio > 10min)
  CANCELLED_BY_CLIENT = 'CANCELLED_BY_CLIENT', // Annulé par le particulier
  CANCELLED_BY_PRO = 'CANCELLED_BY_PRO',       // Annulé par le PRO
  CANCELLED_BY_PRO_PENDING = 'CANCELLED_BY_PRO_PENDING',       // envoyé au admin pour confirmé
  PENDING_PAYOUT = 'PENDING_PAYOUT',           // En attente de notation pour versement
  PAID_OUT = 'PAID_OUT'                        // Argent versé au PRO
}

// Service related types
export interface Service {
  id: string;
  name: string;
  imageUrl: string;
  description?: string;
  pricePerHour?: number;
}

// Invoice related types
export interface Invoice {
  id: string;
  invoiceNumber: string;
  appointmentId: string;
  userId: string; // The user who receives the invoice
  userRole: UserRole; // Whether it's for PRO or PARTICULIER
  platformFee?: number; // Only for PRO invoices
  fileUrl: string;
  createdAt: { toDate: () => Date };
}

// Payment related types
export interface PaymentDetails {
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
}

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}



/// NotificationEntry

export interface NotificationEntry {
  id?: string;
  type: NotificationType;
  message: string;
  appointmentId?: string;
  rating?: number;
  totalCallDuration?: number;
  error?: string;
  datetime: { toDate: () => Date };
  processed: boolean;
}
export enum NotificationType {
  SHORT_CALL_UNDER_10_MINUTES = 'SHORT_CALL_UNDER_10_MINUTES',
  LOW_RATING = 'LOW_RATING',
  PAYOUT_ERROR = 'PAYOUT_ERROR',
  GENERAL = 'GENERAL'
}
