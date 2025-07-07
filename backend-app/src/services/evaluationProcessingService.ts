// src/services/evaluationProcessingService.ts
import { appointmentsCollection, notificationsCollection, usersCollection } from '../config/firebase';
import { calculateProShareHorsTVA, getStripeClient } from '../config/stripe';
import admin from 'firebase-admin';
import { Appointment, AppointmentStatus, NotificationType } from '../types';

/**
 * Traite toutes les évaluations en attente
 */
export const processEvaluations = async (): Promise<void> => {
    try {
        const now = new Date(); // Date actuelle

        // Récupérer les rendez-vous confirmés et passés
        const appointmentsSnapshot = await appointmentsCollection
            .where('status', '==', AppointmentStatus.CONFIRMED)
            .where('dateTime', '<', now)
            .get();

        // Filtrer manuellement les rendez-vous avec `evaluationHistory` et `lastEvaluatedAt` non null
        const filteredAppointments = appointmentsSnapshot.docs
            .map(doc => {
                const appointmentData = doc.data() as Appointment; // Cast explicite
                return { id: doc.id, ...appointmentData };
            })
            .filter(appointment => appointment.evaluationHistory && appointment.lastEvaluatedAt);

        console.log(`📊 ${filteredAppointments.length} rendez-vous valides trouvés`);
        // Traiter chaque rendez-vous
        for (const appointment of filteredAppointments) {
            const unprocessedEvaluations = appointment.evaluationHistory!.filter(evaluation => !evaluation.processed);

            if (unprocessedEvaluations.length > 0) {
                console.log(`🎯 Traitement de ${unprocessedEvaluations.length} évaluations pour le RDV ${appointment.id}`);
                await processAppointmentEvaluations(appointment, unprocessedEvaluations);
            }
        }

        console.log('✅ Traitement des évaluations terminé');
    } catch (error) {
        console.error('❌ Erreur lors du traitement des évaluations:', error);
        throw error;
    }
};

/**
 * Traite les évaluations d'un rendez-vous spécifique
 */
const processAppointmentEvaluations = async (
    appointment: Appointment,
    unprocessedEvaluations: any[]
): Promise<void> => {
    try {
        // Prendre la dernière évaluation (la plus récente)
        const lastEvaluation = unprocessedEvaluations[unprocessedEvaluations.length - 1];


        // Traitement selon la note et le statut
        if (lastEvaluation.rating < 4 || lastEvaluation.totalCallDuration < 10) {
            // Note < 4 : créer une notification
            if (lastEvaluation.rating < 4) {
                await createLowRatingNotification(NotificationType.LOW_RATING, appointment.id!, lastEvaluation.rating, lastEvaluation.totalCallDuration);
                console.log(`🚨 Notification créée pour note faible (${lastEvaluation.rating}) - RDV ${appointment.id}`);
            }

            // lastEvaluation.totalCallDuration : créer une notifications
            if (lastEvaluation.totalCallDuration < 10) {
                await createLowRatingNotification(NotificationType.SHORT_CALL_UNDER_10_MINUTES, appointment.id!, lastEvaluation.rating, lastEvaluation.totalCallDuration);
                console.log(`🚨 Notification créée pour une appelle qui a durée mois de 10 min (${lastEvaluation.totalCallDuration}) - RDV ${appointment.id}`);
            }
        } else {
            // Note >= 4 : changer le statut vers PENDING_PAYOUT et mettre à jour les stats du pro
            await updateAppointmentToPendingPayout(appointment);
            await updateProRatingStats(appointment.proId, lastEvaluation.rating);
            console.log(`✨ RDV ${appointment.id} mis en PENDING_PAYOUT avec note ${lastEvaluation.rating} et appele ${lastEvaluation.totalCallDuration} min `);
        }

        // Marquer toutes les évaluations comme traitées
        const updatedEvaluations = appointment.evaluationHistory!.map(evaluation => ({
            ...evaluation,
            processed: true
        }));

        await appointmentsCollection.doc(appointment.id!).update({
            evaluationHistory: updatedEvaluations
        });

    } catch (error) {
        console.error(`❌ Erreur lors du traitement des évaluations pour RDV ${appointment.id}:`, error);
        throw error;
    }
};

/**
 * Crée une notification pour une note faible
 */
const createLowRatingNotification = async (
    type: NotificationType,
    appointmentId: string,
    rating: number,
    totalCallDuration: number
): Promise<void> => {
    await notificationsCollection.add({
        type,
        message: `Attention: Rendez-vous ${appointmentId} noté ${rating}/5 (durée d'appel: ${totalCallDuration}min)`,
        appointmentId: appointmentId,
        rating: rating,
        totalCallDuration: totalCallDuration,
        datetime: admin.firestore.Timestamp.now(),
        });
};

/**
 * Met à jour le statut du rendez-vous vers PENDING_PAYOUT
 */
const updateAppointmentToPendingPayout = async (appointment: Appointment): Promise<void> => {
    await appointmentsCollection.doc(appointment.id!).update({
        status: AppointmentStatus.PENDING_PAYOUT,
        pendingPayoutSince: admin.firestore.Timestamp.now()
    });
};

/**
 * Met à jour les statistiques de notation du professionnel
 */
const updateProRatingStats = async (proId: string, newRating: number): Promise<void> => {
    const proRef = usersCollection.doc(proId);
    const proDoc = await proRef.get();

    if (proDoc.exists) {
        const proData = proDoc.data();
        const currentReviewsCount = proData?.reviewsCount || 0;
        const currentAverageRating = proData?.averageRating || 0;

        const newReviewsCount = currentReviewsCount + 1;
        const newAverageRating = ((currentAverageRating * currentReviewsCount) + newRating) / newReviewsCount;

        await proRef.update({
            reviewsCount: newReviewsCount,
            averageRating: newAverageRating,
        });

        console.log(`📈 Stats PRO ${proId} mises à jour: ${newReviewsCount} avis, moyenne ${newAverageRating.toFixed(2)}`);
    }
};

/**
 * Traite les paiements en attente depuis 48h
 */
export const processPendingPayouts = async (): Promise<void> => {
    try {
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

        // Récupérer tous les RDV en PENDING_PAYOUT depuis plus de 48h
        const pendingPayoutsSnapshot = await appointmentsCollection
            .where('status', '==', AppointmentStatus.PENDING_PAYOUT)
            .where('pendingPayoutSince', '<=', admin.firestore.Timestamp.fromDate(fortyEightHoursAgo))
            .get();

        console.log(`💸 ${pendingPayoutsSnapshot.docs.length} paiements à traiter (48h écoulées)`);

        for (const doc of pendingPayoutsSnapshot.docs) {
            const appointment = { id: doc.id, ...doc.data() } as Appointment;
            await processPayoutToStripe(appointment);
        }

        console.log('✅ Traitement des paiements terminé');
    } catch (error) {
        console.error('❌ Erreur lors du traitement des paiements:', error);
        throw error;
    }
};

/**
 * Effectue le paiement vers le compte Stripe du professionnel (via Stripe Connect)
 */
const processPayoutToStripe = async (appointment: Appointment): Promise<void> => {
    try {
        // 🔍 Récupération du professionnel
        const proDoc = await usersCollection.doc(appointment.proId).get();
        if (!proDoc.exists) throw new Error(`Professionnel ${appointment.proId} introuvable`);
        
        const proData = proDoc.data();

        // ✅ Vérifications Stripe Connect
        if (
            !proData?.stripeAccountId ||
            proData.stripeAccountStatus !== 'active' ||
            !proData.stripeOnboardingComplete
        ) {
            console.warn(`⚠️ Compte Stripe Connect non prêt pour le PRO ${appointment.proId}, paiement reporté`);
            return;
        }

        // 💶 Calcul du montant
        let proShare = calculateProShareHorsTVA(appointment.montantHT);
        const tva = appointment.montantTotal - appointment.montantHT;

        if (proData.TVA_SOUMI) proShare += tva;

        const stripe = getStripeClient();

        // 💸 Création du virement interne vers le compte Stripe Connect
        const transfer = await stripe.transfers.create({
            amount: Math.round(proShare * 100), // Montant en centimes
            currency: 'eur',
            destination: proData.stripeAccountId,
            description: `Paiement pour RDV ${appointment.id}`,
            metadata: {
                appointmentId: appointment.id!,
                proId: appointment.proId
            }
        });

        // 📝 Mise à jour du rendez-vous
        await appointmentsCollection.doc(appointment.id!).update({
            status: AppointmentStatus.PAID_OUT,
            paidOutAt: admin.firestore.Timestamp.now(),
            stripeTransferId: transfer.id,
            proSharePaid: proShare,
            TVASubmitted: proData?.TVA_SOUMI || false
        });

        console.log(`💰 Paiement effectué pour RDV ${appointment.id}: ${proShare}€ vers PRO ${appointment.proId}`);

    } catch (error: any) {
        console.error(`❌ Erreur lors du paiement pour RDV ${appointment.id}:`, error);

        // 🔔 Notification pour l’admin
        await notificationsCollection.add({
            type: NotificationType.PAYOUT_ERROR,
            message: `Erreur de paiement pour RDV ${appointment.id}: ${error?.message}`,
            appointmentId: appointment.id!,
            error: error?.message,
            datetime: admin.firestore.Timestamp.now(),
            processed: false
        });
    }
};
