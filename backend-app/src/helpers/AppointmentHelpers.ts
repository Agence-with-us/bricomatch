import { getStripeClient } from "../config/stripe";
import { updateAppointmentStatus } from "../services/appointmentService";
import notificationPushService from "../services/notificationPushService";
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
  const newStatus = AppointmentStatus.CANCELLED_BY_PRO;
  const message = "Rendez‑vous annulé par le professionnel (paiement non capturé).";

  if (initiatedBy !== UserRole.PRO && initiatedBy !== UserRole.PARTICULIER) {
    throw new ClientError("Statut de rendez-vous non valide", 400);
  }

  const notificationConfig = notificationPushService.getNotificationMessages(appointment, 'payment_authorized', initiatedBy);
  if (notificationConfig) {
    await notificationPushService.sendCancellationNotifications(appointment, notificationConfig);
  }

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

    const notificationConfig = notificationPushService.getNotificationMessages(appointment, 'client_partial');
    if (notificationConfig) {
      await notificationPushService.sendCancellationNotifications(appointment, notificationConfig);
    }

    return await updateAppointmentStatus(
      appointment, 
      AppointmentStatus.CANCELLED_BY_CLIENT, 
      message
    );
  } else {
    // Remboursement intégral
    await processFullRefund(appointment);
    const message = "Annulation effectuée : remboursement intégral effectué.";

    const notificationConfig = notificationPushService.getNotificationMessages(appointment, 'client_full');
    if (notificationConfig) {
      await notificationPushService.sendCancellationNotifications(appointment, notificationConfig);
    }

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
    const updatedAppointment = await updateAppointmentStatus(
      appointment, 
      AppointmentStatus.CANCELLED_BY_PRO_PENDING, 
      message
    );

    throw new ClientError("Vous ne pouvez pas annuler un rendez‑vous qui est dans les 24 heures. Veuillez contacter l'administrateur pour plus d'informations.", 400);
  } else {
    // Remboursement intégral au client
    await processFullRefund(appointment);
    const message = "Rendez‑vous annulé par le professionnel : remboursement intégral effectué au client.";

    const notificationConfig = notificationPushService.getNotificationMessages(appointment, 'pro_cancellation');
    if (notificationConfig) {
      await notificationPushService.sendCancellationNotifications(appointment, notificationConfig);
    }

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
  const now = new Date();
  const diffMs = appointmentDate.getTime() - now.getTime();
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

