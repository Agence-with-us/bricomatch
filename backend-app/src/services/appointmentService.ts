import { appointmentsCollection, getFirestore, notificationsCollection } from '../config/firebase';
import admin from 'firebase-admin';


import { Appointment, AppointmentStatus, UserRole } from '../types';
// import { invalidateCache } from '../config/redis';
import { ClientError } from '../helpers/ClientError';
import { capturePaymentIntent } from './paymentService';
import { handleConfirmedCancellation, handlePaymentAuthorizedCancellation, validateUserAccess } from '../helpers/AppointmentHelpers';



const getAppointmentById = async (appointmentId: string): Promise<Appointment> => {
  const docSnapshot = await appointmentsCollection.doc(appointmentId).get();
  if (!docSnapshot.exists) {
    throw new ClientError("Rendez‑vous introuvable", 404);
  }
  return { id: docSnapshot.id, ...docSnapshot.data() } as Appointment;
};

// Create a new appointment
export const createAppointment = async (
  appointmentData: Partial<Appointment>
): Promise<Appointment> => {
  try {
    const docRef = appointmentsCollection.doc();

    const newAppointment: Appointment = {
      id: docRef.id,
      proId: appointmentData.proId!,
      clientId: appointmentData.clientId!,
      dateTime: appointmentData.dateTime!,
      duration: appointmentData.duration!,
      timeSlot: appointmentData.timeSlot!,
      status: appointmentData.status!, //|| AppointmentStatus.PENDING,
      montantTotal: appointmentData.montantTotal!,
      montantHT: appointmentData.montantHT!,
      stripePaymentIntentId: appointmentData.stripePaymentIntentId,
    };

    await docRef.set(newAppointment);

    // Invalidate any related cache
    // await invalidateUserAppointmentsCache(newAppointment.proId);
    // await invalidateUserAppointmentsCache(newAppointment.clientId);

    return newAppointment;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

/**
 * Confirme un rendez-vous en faisant passer son statut à CONFIRMED.
 * Seul le professionnel propriétaire peut confirmer un rendez-vous déjà autorisé.
 *
 * @param appointmentId Identifiant du rendez-vous.
 * @param proId Identifiant du professionnel effectuant la confirmation.
 * @returns Le rendez-vous mis à jour.
 * @throws ClientError en cas d'erreur ou d'invalidité de l'opération.
 */
export const confirmAppointment = async (
  appointmentId: string,
  proId: string
): Promise<Appointment | null> => {
  try {
    // Récupère le document du rendez-vous dans Firestore
    const appointmentRef = appointmentsCollection.doc(appointmentId);
    const doc = await appointmentRef.get();

    if (!doc.exists) {
      throw new ClientError("Rendez-vous introuvable", 404);
    }

    const appointment = { id: doc.id, ...doc.data() } as Appointment;

    // Vérifier que le professionnel est bien le propriétaire du rendez-vous
    if (appointment.proId !== proId) {
      throw new ClientError("Non autorisé : vous ne pouvez confirmer que vos propres rendez-vous", 403);
    }

    // Vérifier que le rendez-vous est dans l'état PAYMENT_AUTHORIZED
    if (appointment.status !== AppointmentStatus.PAYMENT_AUTHORIZED) {
      throw new ClientError(`Impossible de confirmer le rendez-vous avec le statut : ${appointment.status}`, 400);
    }

    // Capture du paiement (si nécessaire)
    if (appointment.stripePaymentIntentId) {
      await capturePaymentIntent(appointment.stripePaymentIntentId);
    }

    // Générer un roomId composé de 6 chiffres pour les appels
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();

    // Mettre à jour le statut du rendez-vous à CONFIRMED, enregistrer la date de mise à jour et ajouter le roomId
    const updatedAppointment: Partial<Appointment> = {
      status: AppointmentStatus.CONFIRMED,
      updatedAt: admin.firestore.Timestamp.now(),
      roomId: roomId
    };

    await appointmentRef.update(updatedAppointment);

    // Invalide les caches liés pour rafraîchir les données
    // await Promise.all([
    //   invalidateUserAppointmentsCache(appointment.proId),
    //   invalidateUserAppointmentsCache(appointment.clientId),
    //   invalidateCache(`appointment:${appointmentId}`)
    // ]);

    return {
      ...appointment,
      ...updatedAppointment
    } as Appointment;
  } catch (error) {
    console.error("Erreur lors de la confirmation du rendez-vous :", error);
    throw error;
  }
};

/**
 * Annule un rendez‑vous selon différents cas.
 *
 * @param appointmentId Identifiant du rendez‑vous.
 * @param userId Identifiant de l'utilisateur initiant l'annulation.
 * @param initiatedBy Qui annule : 'client' ou 'pro'.
 * @returns Le rendez‑vous mis à jour.
 * @throws ClientError en cas d'erreur.
 */
export const cancelAppointmentAdvancedService = async (
  appointmentId: string,
  userId: string,
  initiatedBy: UserRole
): Promise<Appointment | null> => {
  try {
    const appointment = await getAppointmentById(appointmentId);
    console.log("appointment", appointment);
    validateUserAccess(appointment, userId, initiatedBy);

    // Switch sur le statut pour déterminer l'action
    switch (appointment.status) {
      case AppointmentStatus.PAYMENT_AUTHORIZED:
        return await handlePaymentAuthorizedCancellation(appointment, initiatedBy);

      case AppointmentStatus.CONFIRMED:
        return await handleConfirmedCancellation(appointment, initiatedBy);

      default:
        throw new ClientError(
          `Impossible d'annuler un rendez‑vous avec le statut : ${appointment.status}`,
          400
        );
    }
  } catch (error) {
    console.error("Erreur lors de l'annulation du rendez‑vous :", error);
    throw error;
  }
};

export const updateAppointmentStatus = async (
  appointment: Appointment,
  newStatus: AppointmentStatus,
  notificationMessage: string
): Promise<Appointment> => {
  const appointmentRef = appointmentsCollection.doc(appointment.id!);
  const updatedAt = admin.firestore.Timestamp.now();
  
  // Mise à jour du statut
  await appointmentRef.update({
    status: newStatus,
    updatedAt
  });
  
  // Création de la notification
  await notificationsCollection.add({
    message: notificationMessage,
    datetime: updatedAt,
    appointmentId: appointment.id,
  });
  
  // Invalidation du cache
  // await invalidateCache(`appointment:${appointment.id}`);
  
  return {
    ...appointment,
    status: newStatus,
    updatedAt
  } as Appointment;
};



/**
 * Met à jour le statut de paiement du rendez-vous vers PAYMENT_AUTHORIZED.
 * Seul le client (PARTICULIER) propriétaire du rendez-vous peut réaliser cette opération.
 *
 * @param appointmentId Identifiant du rendez-vous.
 * @param clientId Identifiant du client (PARTICULIER) effectuant l'opération.
 * @returns Le rendez-vous mis à jour ou null si non trouvé.
 */
export const autoriserPaiementAppointmentService = async (
  appointmentId: string,
  clientId: string
): Promise<Appointment | null> => {
  try {
    const appointmentRef = appointmentsCollection.doc(appointmentId);
    const docSnapshot = await appointmentRef.get();

    if (!docSnapshot.exists) {
      return null;
    }

    const appointment = { id: docSnapshot.id, ...docSnapshot.data() } as Appointment;

    // Vérifier que l'utilisateur est bien le client propriétaire du rendez-vous
    if (appointment.clientId !== clientId) {
      throw new ClientError("Non autorisé : vous ne pouvez autoriser que vos propres rendez-vous", 403);
    }

    // Vérifier que le rendez-vous est dans un état permettant l'autorisation
    if (appointment.status !== AppointmentStatus.PAYMENT_INITIATED) {
      throw new ClientError(`Le rendez-vous ne peut être autorisé car son statut est "${appointment.status}"`, 400);
    }

    const updatedData: Partial<Appointment> = {
      status: AppointmentStatus.PAYMENT_AUTHORIZED,
    };

    await appointmentRef.update(updatedData);

    // Invalider les caches liés
    // await Promise.all([
    //   invalidateUserAppointmentsCache(appointment.clientId),
    //   invalidateUserAppointmentsCache(appointment.proId),
    //   invalidateCache(`appointment:${appointmentId}`)
    // ]);

    return {
      ...appointment,
      ...updatedData
    } as Appointment;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du paiement :", error);
    throw error;
  }
};


/**
 * Service d'évaluation d'un rendez-vous - Version restructurée
 * Maintenant on ajoute seulement l'évaluation à l'historique
 */
export const evaluerAppointmentService = async (
  appointmentId: string,
  proId: string,
  clientId: string,
  rating: number
): Promise<any> => {
  try {
    // Récupérer le document du rendez-vous
    const appointmentRef = appointmentsCollection.doc(appointmentId);
    const appointmentDoc = await appointmentRef.get();
    if (!appointmentDoc.exists) {
      throw new ClientError("Rendez-vous introuvable", 404);
    }
    const appointment = { id: appointmentDoc.id, ...appointmentDoc.data() } as Appointment;

    // Vérifier que le rendez-vous appartient bien au client actuel
    if (appointment.clientId !== clientId) {
      throw new ClientError("Non autorisé : vous ne pouvez évaluer que vos propres rendez-vous", 403);
    }

    // Calculer la durée totale des appels à partir du callHistory (en minutes)
    let totalDuration = 0;
    if (appointment.callHistory && Array.isArray(appointment.callHistory)) {
      appointment.callHistory.forEach(call => {
        totalDuration += Number(call.durationMinutes) || 0;
      });
    }

    // Créer l'objet d'évaluation
    const evaluation = {
      rating: rating,
      clientId: clientId,
      totalCallDuration: totalDuration,
      evaluatedAt: admin.firestore.Timestamp.now(),
      processed: false // Pour savoir si cette évaluation a été traitée par le cron
    };

    // Récupérer l'historique des évaluations existant
    const currentEvaluations = appointment.evaluationHistory || [];
    
    // Ajouter la nouvelle évaluation à l'historique
    const updatedEvaluations = [...currentEvaluations, evaluation];

    // Mettre à jour le rendez-vous avec la nouvelle évaluation
    await appointmentRef.update({
      evaluationHistory: updatedEvaluations,
      lastEvaluatedAt: admin.firestore.Timestamp.now()
    });

    // Invalider les caches liés
    // await Promise.all([
    //   invalidateCache(`user:${appointment.clientId}:appointments:client`),
    //   invalidateCache(`user:${appointment.proId}:appointments:pro`),
    //   invalidateCache(`appointment:${appointmentId}`)
    // ]);

    return {
      appointmentId,
      proId,
      totalDuration,
      rating,
      evaluationAdded: true,
      message: "Évaluation ajoutée avec succès. Elle sera traitée par notre système dans les prochaines heures."
    };
  } catch (error) {
    console.error("Erreur lors de l'évaluation du rendez-vous :", error);
    throw error;
  }
};

// Helper function to invalidate user appointments cache
const invalidateUserAppointmentsCache = async (userId: string): Promise<void> => {
  // await invalidateCache(`user:${userId}:appointments:pro`);
  // await invalidateCache(`user:${userId}:appointments:client`);
};