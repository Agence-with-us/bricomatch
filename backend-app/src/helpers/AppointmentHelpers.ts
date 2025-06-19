import { getStripeClient } from "../config/stripe";
import { updateAppointmentStatus } from "../services/appointmentService";
import { refundPayment } from "../services/paymentService";
import { Appointment, AppointmentStatus, UserRole } from "../types";
import { ClientError } from "./ClientError";

export const validateUserAccess = (
  appointment: Appointment, 
  userId: string, 
  initiatedBy: UserRole
): void => {
  const isAuthorized = 
    (initiatedBy === UserRole.PARTICULIER && appointment.clientId === userId) ||
    (initiatedBy === UserRole.PRO && appointment.proId === userId);
  
  if (!isAuthorized) {
    throw new ClientError(
      "Non autorisé : vous ne pouvez annuler que vos propres rendez‑vous", 
      403
    );
  }
};


export const handlePaymentAuthorizedCancellation = async (
  appointment: Appointment, 
  initiatedBy: UserRole
): Promise<Appointment> => {
  if (initiatedBy !== UserRole.PRO) {
    throw new ClientError("Seul le professionnel peut annuler à ce stade", 403);
  }

  const newStatus = AppointmentStatus.CANCELLED_BY_PRO;
  const message = "Rendez‑vous annulé par le professionnel (paiement non capturé).";
  
  return await updateAppointmentStatus(appointment, newStatus, message);
};

export const handleConfirmedCancellation = async (
  appointment: Appointment, 
  initiatedBy: UserRole
): Promise<Appointment> => {
  const hoursUntilAppointment = getHoursUntilAppointment(appointment.dateTime);
  const isWithin24Hours = hoursUntilAppointment < 24;

  if (initiatedBy === UserRole.PARTICULIER) {
    return await handleClientCancellation(appointment, isWithin24Hours);
  } else {
    return await handleProCancellation(appointment, isWithin24Hours);
  }
};

const handleClientCancellation = async (
  appointment: Appointment, 
  isWithin24Hours: boolean
): Promise<Appointment> => {
  if (isWithin24Hours) {
    // Remboursement partiel (frais de 10€)
    await processPartialRefund(appointment);
    const message = "Annulation effectuée : remboursement partiel (10€ de frais conservés).";
    return await updateAppointmentStatus(
      appointment, 
      AppointmentStatus.CANCELLED_BY_CLIENT, 
      message
    );
  } else {
    // Remboursement intégral
    await processFullRefund(appointment);
    const message = "Annulation effectuée : remboursement intégral effectué.";
    return await updateAppointmentStatus(
      appointment, 
      AppointmentStatus.CANCELLED_BY_CLIENT, 
      message
    );
  }
};

const handleProCancellation = async (
  appointment: Appointment, 
  isWithin24Hours: boolean
): Promise<Appointment> => {
  if (isWithin24Hours) {
    // Annulation en attente de validation admin
    const message = "Rendez‑vous annulé par le professionnel. En attente de confirmation administrative.";
    return await updateAppointmentStatus(
      appointment, 
      AppointmentStatus.CANCELLED_BY_PRO_PENDING, 
      message
    );
  } else {
    // Remboursement intégral au client
    await processFullRefund(appointment);
    const message = "Rendez‑vous annulé par le professionnel : remboursement intégral effectué au client.";
    return await updateAppointmentStatus(
      appointment, 
      AppointmentStatus.CANCELLED_BY_PRO, 
      message
    );
  }
};

// Utils functions
const getHoursUntilAppointment = (appointmentDateTime: any): number => {
  const appointmentDate = appointmentDateTime.toDate();
  console.log("appointmentDate", appointmentDate);
  const now = new Date();
  console.log("now", now);
  const diffMs = appointmentDate.getTime() - now.getTime();
  console.log("diffMs", diffMs);
  console.log("diffMs / (1000 * 60 * 60)", diffMs / (1000 * 60 * 60));
  return diffMs / (1000 * 60 * 60);
};

const processPartialRefund = async (appointment: Appointment): Promise<void> => {
  if (!appointment.stripePaymentIntentId) return;
  
  const stripe = getStripeClient();
  const totalAmount = appointment.montantTotal || 0;
  const fee = 1000; // 10€ en centimes
  const refundAmount = totalAmount > fee ? totalAmount - fee : 0;
  
  if (refundAmount > 0) {
    await stripe.refunds.create({
      payment_intent: appointment.stripePaymentIntentId,
      amount: refundAmount,
    });
  }
};

const processFullRefund = async (appointment: Appointment): Promise<void> => {
  if (appointment.stripePaymentIntentId) {
    await refundPayment(appointment.stripePaymentIntentId);
  }
};

