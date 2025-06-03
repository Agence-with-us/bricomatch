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
exports.evaluerAppointmentService = exports.autoriserPaiementAppointmentService = exports.updateAppointmentStatus = exports.cancelAppointmentAdvancedService = exports.confirmAppointment = exports.createAppointment = void 0;
const firebase_1 = require("../config/firebase");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const types_1 = require("../types");
// import { invalidateCache } from '../config/redis';
const ClientError_1 = require("../helpers/ClientError");
const paymentService_1 = require("./paymentService");
const AppointmentHelpers_1 = require("../helpers/AppointmentHelpers");
const getAppointmentById = (appointmentId) => __awaiter(void 0, void 0, void 0, function* () {
    const docSnapshot = yield firebase_1.appointmentsCollection.doc(appointmentId).get();
    if (!docSnapshot.exists) {
        throw new ClientError_1.ClientError("Rendez‑vous introuvable", 404);
    }
    return Object.assign({ id: docSnapshot.id }, docSnapshot.data());
});
// Create a new appointment
const createAppointment = (appointmentData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const docRef = firebase_1.appointmentsCollection.doc();
        const newAppointment = {
            id: docRef.id,
            proId: appointmentData.proId,
            clientId: appointmentData.clientId,
            dateTime: appointmentData.dateTime,
            duration: appointmentData.duration,
            timeSlot: appointmentData.timeSlot,
            status: appointmentData.status, //|| AppointmentStatus.PENDING,
            montantTotal: appointmentData.montantTotal,
            montantHT: appointmentData.montantHT,
            stripePaymentIntentId: appointmentData.stripePaymentIntentId,
        };
        yield docRef.set(newAppointment);
        // Invalidate any related cache
        // await invalidateUserAppointmentsCache(newAppointment.proId);
        // await invalidateUserAppointmentsCache(newAppointment.clientId);
        return newAppointment;
    }
    catch (error) {
        console.error('Error creating appointment:', error);
        throw error;
    }
});
exports.createAppointment = createAppointment;
/**
 * Confirme un rendez-vous en faisant passer son statut à CONFIRMED.
 * Seul le professionnel propriétaire peut confirmer un rendez-vous déjà autorisé.
 *
 * @param appointmentId Identifiant du rendez-vous.
 * @param proId Identifiant du professionnel effectuant la confirmation.
 * @returns Le rendez-vous mis à jour.
 * @throws ClientError en cas d'erreur ou d'invalidité de l'opération.
 */
const confirmAppointment = (appointmentId, proId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Récupère le document du rendez-vous dans Firestore
        const appointmentRef = firebase_1.appointmentsCollection.doc(appointmentId);
        const doc = yield appointmentRef.get();
        if (!doc.exists) {
            throw new ClientError_1.ClientError("Rendez-vous introuvable", 404);
        }
        const appointment = Object.assign({ id: doc.id }, doc.data());
        // Vérifier que le professionnel est bien le propriétaire du rendez-vous
        if (appointment.proId !== proId) {
            throw new ClientError_1.ClientError("Non autorisé : vous ne pouvez confirmer que vos propres rendez-vous", 403);
        }
        // Vérifier que le rendez-vous est dans l'état PAYMENT_AUTHORIZED
        if (appointment.status !== types_1.AppointmentStatus.PAYMENT_AUTHORIZED) {
            throw new ClientError_1.ClientError(`Impossible de confirmer le rendez-vous avec le statut : ${appointment.status}`, 400);
        }
        // Capture du paiement (si nécessaire)
        if (appointment.stripePaymentIntentId) {
            yield (0, paymentService_1.capturePaymentIntent)(appointment.stripePaymentIntentId);
        }
        // Générer un roomId composé de 6 chiffres pour les appels
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        // Mettre à jour le statut du rendez-vous à CONFIRMED, enregistrer la date de mise à jour et ajouter le roomId
        const updatedAppointment = {
            status: types_1.AppointmentStatus.CONFIRMED,
            updatedAt: firebase_admin_1.default.firestore.Timestamp.now(),
            roomId: roomId
        };
        yield appointmentRef.update(updatedAppointment);
        // Invalide les caches liés pour rafraîchir les données
        // await Promise.all([
        //   invalidateUserAppointmentsCache(appointment.proId),
        //   invalidateUserAppointmentsCache(appointment.clientId),
        //   invalidateCache(`appointment:${appointmentId}`)
        // ]);
        return Object.assign(Object.assign({}, appointment), updatedAppointment);
    }
    catch (error) {
        console.error("Erreur lors de la confirmation du rendez-vous :", error);
        throw error;
    }
});
exports.confirmAppointment = confirmAppointment;
/**
 * Annule un rendez‑vous selon différents cas.
 *
 * @param appointmentId Identifiant du rendez‑vous.
 * @param userId Identifiant de l'utilisateur initiant l'annulation.
 * @param initiatedBy Qui annule : 'client' ou 'pro'.
 * @returns Le rendez‑vous mis à jour.
 * @throws ClientError en cas d'erreur.
 */
const cancelAppointmentAdvancedService = (appointmentId, userId, initiatedBy) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const appointment = yield getAppointmentById(appointmentId);
        (0, AppointmentHelpers_1.validateUserAccess)(appointment, userId, initiatedBy);
        // Switch sur le statut pour déterminer l'action
        switch (appointment.status) {
            case types_1.AppointmentStatus.PAYMENT_AUTHORIZED:
                return yield (0, AppointmentHelpers_1.handlePaymentAuthorizedCancellation)(appointment, initiatedBy);
            case types_1.AppointmentStatus.CONFIRMED:
                return yield (0, AppointmentHelpers_1.handleConfirmedCancellation)(appointment, initiatedBy);
            default:
                throw new ClientError_1.ClientError(`Impossible d'annuler un rendez‑vous avec le statut : ${appointment.status}`, 400);
        }
    }
    catch (error) {
        console.error("Erreur lors de l'annulation du rendez‑vous :", error);
        throw error;
    }
});
exports.cancelAppointmentAdvancedService = cancelAppointmentAdvancedService;
const updateAppointmentStatus = (appointment, newStatus, notificationMessage) => __awaiter(void 0, void 0, void 0, function* () {
    const appointmentRef = firebase_1.appointmentsCollection.doc(appointment.id);
    const updatedAt = firebase_admin_1.default.firestore.Timestamp.now();
    // Mise à jour du statut
    yield appointmentRef.update({
        status: newStatus,
        updatedAt
    });
    // Création de la notification
    yield firebase_1.notificationsCollection.add({
        message: notificationMessage,
        datetime: updatedAt,
        appointmentId: appointment.id,
    });
    // Invalidation du cache
    // await invalidateCache(`appointment:${appointment.id}`);
    return Object.assign(Object.assign({}, appointment), { status: newStatus, updatedAt });
});
exports.updateAppointmentStatus = updateAppointmentStatus;
/**
 * Met à jour le statut de paiement du rendez-vous vers PAYMENT_AUTHORIZED.
 * Seul le client (PARTICULIER) propriétaire du rendez-vous peut réaliser cette opération.
 *
 * @param appointmentId Identifiant du rendez-vous.
 * @param clientId Identifiant du client (PARTICULIER) effectuant l'opération.
 * @returns Le rendez-vous mis à jour ou null si non trouvé.
 */
const autoriserPaiementAppointmentService = (appointmentId, clientId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const appointmentRef = firebase_1.appointmentsCollection.doc(appointmentId);
        const docSnapshot = yield appointmentRef.get();
        if (!docSnapshot.exists) {
            return null;
        }
        const appointment = Object.assign({ id: docSnapshot.id }, docSnapshot.data());
        // Vérifier que l'utilisateur est bien le client propriétaire du rendez-vous
        if (appointment.clientId !== clientId) {
            throw new ClientError_1.ClientError("Non autorisé : vous ne pouvez autoriser que vos propres rendez-vous", 403);
        }
        // Vérifier que le rendez-vous est dans un état permettant l'autorisation
        if (appointment.status !== types_1.AppointmentStatus.PAYMENT_INITIATED) {
            throw new ClientError_1.ClientError(`Le rendez-vous ne peut être autorisé car son statut est "${appointment.status}"`, 400);
        }
        const updatedData = {
            status: types_1.AppointmentStatus.PAYMENT_AUTHORIZED,
        };
        yield appointmentRef.update(updatedData);
        // Invalider les caches liés
        // await Promise.all([
        //   invalidateUserAppointmentsCache(appointment.clientId),
        //   invalidateUserAppointmentsCache(appointment.proId),
        //   invalidateCache(`appointment:${appointmentId}`)
        // ]);
        return Object.assign(Object.assign({}, appointment), updatedData);
    }
    catch (error) {
        console.error("Erreur lors de la mise à jour du paiement :", error);
        throw error;
    }
});
exports.autoriserPaiementAppointmentService = autoriserPaiementAppointmentService;
/**
 * Service d'évaluation d'un rendez-vous - Version restructurée
 * Maintenant on ajoute seulement l'évaluation à l'historique
 */
const evaluerAppointmentService = (appointmentId, proId, clientId, rating) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Récupérer le document du rendez-vous
        const appointmentRef = firebase_1.appointmentsCollection.doc(appointmentId);
        const appointmentDoc = yield appointmentRef.get();
        if (!appointmentDoc.exists) {
            throw new ClientError_1.ClientError("Rendez-vous introuvable", 404);
        }
        const appointment = Object.assign({ id: appointmentDoc.id }, appointmentDoc.data());
        // Vérifier que le rendez-vous appartient bien au client actuel
        if (appointment.clientId !== clientId) {
            throw new ClientError_1.ClientError("Non autorisé : vous ne pouvez évaluer que vos propres rendez-vous", 403);
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
            evaluatedAt: firebase_admin_1.default.firestore.Timestamp.now(),
            processed: false // Pour savoir si cette évaluation a été traitée par le cron
        };
        // Récupérer l'historique des évaluations existant
        const currentEvaluations = appointment.evaluationHistory || [];
        // Ajouter la nouvelle évaluation à l'historique
        const updatedEvaluations = [...currentEvaluations, evaluation];
        // Mettre à jour le rendez-vous avec la nouvelle évaluation
        yield appointmentRef.update({
            evaluationHistory: updatedEvaluations,
            lastEvaluatedAt: firebase_admin_1.default.firestore.Timestamp.now()
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
    }
    catch (error) {
        console.error("Erreur lors de l'évaluation du rendez-vous :", error);
        throw error;
    }
});
exports.evaluerAppointmentService = evaluerAppointmentService;
// Helper function to invalidate user appointments cache
const invalidateUserAppointmentsCache = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    // await invalidateCache(`user:${userId}:appointments:pro`);
    // await invalidateCache(`user:${userId}:appointments:client`);
});
