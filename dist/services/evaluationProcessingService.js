"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPendingPayouts = exports.processEvaluations = void 0;
// src/services/evaluationProcessingService.ts
const firebase_1 = require("../config/firebase");
const stripe_1 = require("../config/stripe");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const types_1 = require("../types");
/**
 * Traite toutes les évaluations en attente
 */
const processEvaluations = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date(); // Date actuelle
        // Récupérer les rendez-vous confirmés et passés
        const appointmentsSnapshot = yield firebase_1.appointmentsCollection
            .where('status', '==', types_1.AppointmentStatus.CONFIRMED)
            .where('dateTime', '<', now)
            .get();
        // Filtrer manuellement les rendez-vous avec `evaluationHistory` et `lastEvaluatedAt` non null
        const filteredAppointments = appointmentsSnapshot.docs
            .map(doc => {
            const appointmentData = doc.data(); // Cast explicite
            return Object.assign({ id: doc.id }, appointmentData);
        })
            .filter(appointment => appointment.evaluationHistory && appointment.lastEvaluatedAt);
        console.log(`📊 ${filteredAppointments.length} rendez-vous valides trouvés`);
        // Traiter chaque rendez-vous
        for (const appointment of filteredAppointments) {
            const unprocessedEvaluations = appointment.evaluationHistory.filter(evaluation => !evaluation.processed);
            if (unprocessedEvaluations.length > 0) {
                console.log(`🎯 Traitement de ${unprocessedEvaluations.length} évaluations pour le RDV ${appointment.id}`);
                yield processAppointmentEvaluations(appointment, unprocessedEvaluations);
            }
        }
        console.log('✅ Traitement des évaluations terminé');
    }
    catch (error) {
        console.error('❌ Erreur lors du traitement des évaluations:', error);
        throw error;
    }
});
exports.processEvaluations = processEvaluations;
/**
 * Traite les évaluations d'un rendez-vous spécifique
 */
const processAppointmentEvaluations = (appointment, unprocessedEvaluations) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Prendre la dernière évaluation (la plus récente)
        const lastEvaluation = unprocessedEvaluations[unprocessedEvaluations.length - 1];
        // Traitement selon la note et le statut
        if (lastEvaluation.rating < 4 || lastEvaluation.totalCallDuration < 10) {
            // Note < 4 : créer une notification
            if (lastEvaluation.rating <= 4) {
                yield createLowRatingNotification(types_1.NotificationType.LOW_RATING, appointment.id, lastEvaluation.rating, lastEvaluation.totalCallDuration);
                console.log(`🚨 Notification créée pour note faible (${lastEvaluation.rating}) - RDV ${appointment.id}`);
            }
            // lastEvaluation.totalCallDuration : créer une notification s
            if (lastEvaluation.totalCallDuration < 10) {
                yield createLowRatingNotification(types_1.NotificationType.SHORT_CALL_UNDER_10_MINUTES, appointment.id, lastEvaluation.rating, lastEvaluation.totalCallDuration);
                console.log(`🚨 Notification créée pour une appelle qui a durée mois de 10 min (${lastEvaluation.totalCallDuration}) - RDV ${appointment.id}`);
            }
        }
        else {
            // Note >= 4 : changer le statut vers PENDING_PAYOUT et mettre à jour les stats du pro
            yield updateAppointmentToPendingPayout(appointment);
            yield updateProRatingStats(appointment.proId, lastEvaluation.rating);
            console.log(`✨ RDV ${appointment.id} mis en PENDING_PAYOUT avec note ${lastEvaluation.rating} et appele ${lastEvaluation.totalCallDuration} min `);
        }
        // Marquer toutes les évaluations comme traitées
        const updatedEvaluations = appointment.evaluationHistory.map(evaluation => (Object.assign(Object.assign({}, evaluation), { processed: true })));
        yield firebase_1.appointmentsCollection.doc(appointment.id).update({
            evaluationHistory: updatedEvaluations
        });
    }
    catch (error) {
        console.error(`❌ Erreur lors du traitement des évaluations pour RDV ${appointment.id}:`, error);
        throw error;
    }
});
/**
 * Crée une notification pour une note faible
 */
const createLowRatingNotification = (type, appointmentId, rating, totalCallDuration) => __awaiter(void 0, void 0, void 0, function* () {
    yield firebase_1.notificationsCollection.add({
        type,
        message: `Attention: Rendez-vous ${appointmentId} noté ${rating}/5 (durée d'appel: ${totalCallDuration}min)`,
        appointmentId: appointmentId,
        rating: rating,
        totalCallDuration: totalCallDuration,
        datetime: firebase_admin_1.default.firestore.Timestamp.now(),
    });
});
/**
 * Met à jour le statut du rendez-vous vers PENDING_PAYOUT
 */
const updateAppointmentToPendingPayout = (appointment) => __awaiter(void 0, void 0, void 0, function* () {
    yield firebase_1.appointmentsCollection.doc(appointment.id).update({
        status: types_1.AppointmentStatus.PENDING_PAYOUT,
        pendingPayoutSince: firebase_admin_1.default.firestore.Timestamp.now()
    });
});
/**
 * Met à jour les statistiques de notation du professionnel
 */
const updateProRatingStats = (proId, newRating) => __awaiter(void 0, void 0, void 0, function* () {
    const proRef = firebase_1.usersCollection.doc(proId);
    const proDoc = yield proRef.get();
    if (proDoc.exists) {
        const proData = proDoc.data();
        const currentReviewsCount = (proData === null || proData === void 0 ? void 0 : proData.reviewsCount) || 0;
        const currentAverageRating = (proData === null || proData === void 0 ? void 0 : proData.averageRating) || 0;
        const newReviewsCount = currentReviewsCount + 1;
        const newAverageRating = ((currentAverageRating * currentReviewsCount) + newRating) / newReviewsCount;
        yield proRef.update({
            reviewsCount: newReviewsCount,
            averageRating: newAverageRating,
        });
        console.log(`📈 Stats PRO ${proId} mises à jour: ${newReviewsCount} avis, moyenne ${newAverageRating.toFixed(2)}`);
    }
});
/**
 * Traite les paiements en attente depuis 48h
 */
const processPendingPayouts = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
        // Récupérer tous les RDV en PENDING_PAYOUT depuis plus de 48h
        const pendingPayoutsSnapshot = yield firebase_1.appointmentsCollection
            .where('status', '==', types_1.AppointmentStatus.PENDING_PAYOUT)
            .where('pendingPayoutSince', '<=', firebase_admin_1.default.firestore.Timestamp.fromDate(fortyEightHoursAgo))
            .get();
        console.log(`💸 ${pendingPayoutsSnapshot.docs.length} paiements à traiter (48h écoulées)`);
        for (const doc of pendingPayoutsSnapshot.docs) {
            const appointment = Object.assign({ id: doc.id }, doc.data());
            yield processPayoutToStripe(appointment);
        }
        console.log('✅ Traitement des paiements terminé');
    }
    catch (error) {
        console.error('❌ Erreur lors du traitement des paiements:', error);
        throw error;
    }
});
exports.processPendingPayouts = processPendingPayouts;
/**
 * Effectue le paiement vers le compte Stripe du professionnel (via Stripe Connect)
 */
const processPayoutToStripe = (appointment) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 🔍 Récupération du professionnel
        const proDoc = yield firebase_1.usersCollection.doc(appointment.proId).get();
        if (!proDoc.exists)
            throw new Error(`Professionnel ${appointment.proId} introuvable`);
        const proData = proDoc.data();
        // ✅ Vérifications Stripe Connect
        if (!(proData === null || proData === void 0 ? void 0 : proData.stripeAccountId) ||
            proData.stripeAccountStatus !== 'active' ||
            !proData.stripeOnboardingComplete) {
            console.warn(`⚠️ Compte Stripe Connect non prêt pour le PRO ${appointment.proId}, paiement reporté`);
            return;
        }
        // 💶 Calcul du montant
        let proShare = (0, stripe_1.calculateProShareHorsTVA)(appointment.montantHT);
        const tva = appointment.montantTotal - appointment.montantHT;
        if (proData.TVA_SOUMI)
            proShare += tva;
        const stripe = (0, stripe_1.getStripeClient)();
        // 💸 Création du virement interne vers le compte Stripe Connect
        const transfer = yield stripe.transfers.create({
            amount: Math.round(proShare * 100), // Montant en centimes
            currency: 'eur',
            destination: proData.stripeAccountId,
            description: `Paiement pour RDV ${appointment.id}`,
            metadata: {
                appointmentId: appointment.id,
                proId: appointment.proId
            }
        });
        // 📝 Mise à jour du rendez-vous
        yield firebase_1.appointmentsCollection.doc(appointment.id).update({
            status: types_1.AppointmentStatus.PAID_OUT,
            paidOutAt: firebase_admin_1.default.firestore.Timestamp.now(),
            stripeTransferId: transfer.id,
            proSharePaid: proShare,
            TVASubmitted: (proData === null || proData === void 0 ? void 0 : proData.TVA_SOUMI) || false
        });
        console.log(`💰 Paiement effectué pour RDV ${appointment.id}: ${proShare}€ vers PRO ${appointment.proId}`);
    }
    catch (error) {
        console.error(`❌ Erreur lors du paiement pour RDV ${appointment.id}:`, error);
        // 🔔 Notification pour l’admin
        yield firebase_1.notificationsCollection.add({
            type: types_1.NotificationType.PAYOUT_ERROR,
            message: `Erreur de paiement pour RDV ${appointment.id}: ${error === null || error === void 0 ? void 0 : error.message}`,
            appointmentId: appointment.id,
            error: error === null || error === void 0 ? void 0 : error.message,
            datetime: firebase_admin_1.default.firestore.Timestamp.now(),
            processed: false
        });
    }
});
