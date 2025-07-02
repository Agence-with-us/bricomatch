import { appointmentsCollection, getFirestore, notificationsCollection } from '../config/firebase';
import admin from 'firebase-admin';


import { Appointment, AppointmentStatus, UserRole } from '../types';
// import { invalidateCache } from '../config/redis';
import { ClientError } from '../helpers/ClientError';
import { capturePaymentIntent } from './paymentService';
import { handleConfirmedCancellation, handlePaymentAuthorizedCancellation, validateUserAccess } from '../helpers/AppointmentHelpers';
import notificationPushService from './notificationPushService';
import { getUserById } from './userService';
import { setReminders, ReminderEntry, addReminder, removeReminder, getReminders } from './reminderFileService';



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
      createdAt: admin.firestore.Timestamp.now(),
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

    // Ajout au fichier reminders.json
    await addReminder({
      id: appointment.id!,
      proId: appointment.proId,
      clientId: appointment.clientId,
      dateTime: appointment.dateTime,
      duration: appointment.duration,
      timeSlot: appointment.timeSlot,
      status: AppointmentStatus.CONFIRMED,
      roomId: roomId || '',
    });

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

    // Vérifier que l'utilisateur est bien le propriétaire du rendez-vous
    validateUserAccess(appointment, userId, initiatedBy);

    let updatedAppointment: Appointment | null = null;
    switch (appointment.status) {

      // Si le rendez-vous est PAYMENT_AUTHORIZED, on annule (Pas de paiement capturé donc pas de remboursement)
      case AppointmentStatus.PAYMENT_AUTHORIZED:
        updatedAppointment = await handlePaymentAuthorizedCancellation(appointment, initiatedBy);
        break;
      case AppointmentStatus.CONFIRMED:
        updatedAppointment = await handleConfirmedCancellation(appointment, initiatedBy);
        break;
      default:
        throw new ClientError(
          `Impossible d'annuler un rendez‑vous avec le statut : ${appointment.status}`,
          400
        );
    }
    // Si le rendez-vous n'est plus confirmé, le retirer du fichier
    if (updatedAppointment && updatedAppointment.status !== AppointmentStatus.CONFIRMED) {
      await removeReminder(appointmentId);
    }
    return updatedAppointment;
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



/**
 * Supprime tous les rendez-vous PAYMENT_INITIATED créés il y a plus de 10 minutes.
 */
export const processExpiredPaymentInitiatedAppointments = async (): Promise<void> => {
  const firestore = getFirestore();
  const now = admin.firestore.Timestamp.now();
  const tenMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 10 * 60 * 1000);

  // Chercher tous les rendez-vous PAYMENT_INITIATED créés il y a plus de 10 min
  const snapshot = await appointmentsCollection
    .where('status', '==', AppointmentStatus.PAYMENT_INITIATED)
    .where('createdAt', '<=', tenMinutesAgo)
    .get();

  if (snapshot.empty) {
    console.log('Aucun rendez-vous PAYMENT_INITIATED expiré à supprimer.');
    return;
  }

  const batch = firestore.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`${snapshot.size} rendez-vous PAYMENT_INITIATED expirés supprimés.`);
};

/**
 * Envoie les notifications de rappel RDV (15min, 5min, 2min avant) aux clients.
 * Désormais, lit les rendez-vous depuis reminders.json
 */
export const processAppointmentReminders = async (): Promise<void> => {
  const now = admin.firestore.Timestamp.now();
  const nowDate = now.toDate();

  // Lire les rendez-vous à rappeler depuis reminders.json
  const reminders = await getReminders();

  for (const appointment of reminders) {
    if (!appointment.dateTime || !appointment.clientId || !appointment.proId) continue;

    const appointmentDate = appointment.dateTime.toDate ? appointment.dateTime.toDate() : new Date(appointment.dateTime._seconds ? appointment.dateTime._seconds * 1000 : appointment.dateTime);
    const diffMs = appointmentDate.getTime() - nowDate.getTime();
    const diffMin = Math.round(diffMs / 60000);

    // Récupérer le nom du pro
    let proName = 'votre professionnel';
    try {
      const pro = await getUserById(appointment.proId);
      if (pro) {
        proName = `${pro.prenom} ${pro.nom}`;
      }
    } catch (e) { /* ignore */ }

    // Rappel 15 minutes avant (entre 14 et 16 minutes)
    if (diffMin >= 14 && diffMin <= 16) {
      await notificationPushService.sendAppointmentReminder15min(
        appointment.clientId,
        proName,
        appointmentDate.toLocaleDateString('fr-FR'),
        appointment.timeSlot || ''
      );
    }

    // Rappel 5 minutes avant (entre 4 et 6 minutes)
    if (diffMin >= 4 && diffMin <= 6) {
      await notificationPushService.sendAppointmentReminder5min(
        appointment.clientId,
        proName,
        appointmentDate.toLocaleDateString('fr-FR'),
        appointment.timeSlot || ''
      );
    }

    // Rappel 2 minutes avant (entre 1 et 3 minutes)
    if (diffMin >= 1 && diffMin <= 3) {
      await notificationPushService.sendAppointmentReminder2min(
        appointment.clientId,
        proName,
        appointmentDate.toLocaleDateString('fr-FR'),
        appointment.timeSlot || ''
      );
    }

    // Notification 5 min avant la fin du RDV (entre 4 et 6 minutes avant la fin)
    if (appointment.duration) {
      const endDate = new Date(appointmentDate.getTime() + appointment.duration * 60000);
      const diffEndMs = endDate.getTime() - nowDate.getTime();
      const diffEndMin = Math.round(diffEndMs / 60000);
      if (diffEndMin >= 4 && diffEndMin <= 6) {
        await notificationPushService.sendAppointmentEndingSoon(
          appointment.clientId,
          proName,
          appointmentDate.toLocaleDateString('fr-FR'),
          appointment.timeSlot || ''
        );
      }
    }

    // Rappel 2 jours avant (entre 2870 et 2890 minutes = environ 48h ± 10min)
    const diff2jMin = Math.round((appointmentDate.getTime() - nowDate.getTime()) / 60000);
    if (diff2jMin >= 2870 && diff2jMin <= 2890) {
      let clientName = 'votre client';
      let serviceName = '';
      try {
        const pro = await getUserById(appointment.proId);
        if (pro) {
          serviceName = pro.serviceTypeId || '';
        }
        const client = await getUserById(appointment.clientId);
        if (client) {
          clientName = `${client.prenom} ${client.nom}`;
        }
      } catch (e) { /* ignore */ }
      // Notification au client
      await notificationPushService.sendAppointment2DaysReminder(
        appointment.clientId,
        proName,
        serviceName,
        appointmentDate.toLocaleDateString('fr-FR'),
        appointment.timeSlot || '',
        false
      );
      // Notification au pro
      await notificationPushService.sendAppointment2DaysReminder(
        appointment.proId,
        clientName,
        serviceName,
        appointmentDate.toLocaleDateString('fr-FR'),
        appointment.timeSlot || '',
        true
      );
    }
  }
};

/**
 * Génère le fichier reminders.json avec les rendez-vous CONFIRMED du jour et dans 2 jours
 */
export const generateDailyRemindersFile = async (): Promise<void> => {
  const now = admin.firestore.Timestamp.now();
  const today = now.toDate();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const in2Days = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 23, 59, 59, 999);

  // RDV du jour
  const todaySnapshot = await appointmentsCollection
    .where('status', '==', AppointmentStatus.CONFIRMED)
    .where('dateTime', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
    .where('dateTime', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
    .get();

  // RDV dans 2 jours
  const in2DaysStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 0, 0, 0, 0);
  const in2DaysEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 23, 59, 59, 999);
  const in2DaysSnapshot = await appointmentsCollection
    .where('status', '==', AppointmentStatus.CONFIRMED)
    .where('dateTime', '>=', admin.firestore.Timestamp.fromDate(in2DaysStart))
    .where('dateTime', '<=', admin.firestore.Timestamp.fromDate(in2DaysEnd))
    .get();

  const reminders: ReminderEntry[] = [];
  for (const doc of todaySnapshot.docs.concat(in2DaysSnapshot.docs)) {
    const data = doc.data() as Appointment;
    reminders.push({
      id: doc.id,
      proId: data.proId,
      clientId: data.clientId,
      dateTime: data.dateTime,
      duration: data.duration,
      timeSlot: data.timeSlot,
      status: data.status,
      ...(data.roomId ? { roomId: data.roomId } : {}),
    });
  }
  await setReminders(reminders);
};