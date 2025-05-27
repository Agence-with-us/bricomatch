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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConfirmedCancellation = exports.handlePaymentAuthorizedCancellation = exports.validateUserAccess = void 0;
const stripe_1 = require("../config/stripe");
const appointmentService_1 = require("../services/appointmentService");
const paymentService_1 = require("../services/paymentService");
const types_1 = require("../types");
const ClientError_1 = require("./ClientError");
const validateUserAccess = (appointment, userId, initiatedBy) => {
    const isAuthorized = (initiatedBy === types_1.UserRole.PARTICULIER && appointment.clientId === userId) ||
        (initiatedBy === types_1.UserRole.PRO && appointment.proId === userId);
    if (!isAuthorized) {
        throw new ClientError_1.ClientError("Non autorisé : vous ne pouvez annuler que vos propres rendez‑vous", 403);
    }
};
exports.validateUserAccess = validateUserAccess;
const handlePaymentAuthorizedCancellation = (appointment, initiatedBy) => __awaiter(void 0, void 0, void 0, function* () {
    if (initiatedBy !== types_1.UserRole.PRO) {
        throw new ClientError_1.ClientError("Seul le professionnel peut annuler à ce stade", 403);
    }
    const newStatus = types_1.AppointmentStatus.CANCELLED_BY_PRO;
    const message = "Rendez‑vous annulé par le professionnel (paiement non capturé).";
    return yield (0, appointmentService_1.updateAppointmentStatus)(appointment, newStatus, message);
});
exports.handlePaymentAuthorizedCancellation = handlePaymentAuthorizedCancellation;
const handleConfirmedCancellation = (appointment, initiatedBy) => __awaiter(void 0, void 0, void 0, function* () {
    const hoursUntilAppointment = getHoursUntilAppointment(appointment.dateTime);
    const isWithin24Hours = hoursUntilAppointment < 24;
    if (initiatedBy === types_1.UserRole.PARTICULIER) {
        return yield handleClientCancellation(appointment, isWithin24Hours);
    }
    else {
        return yield handleProCancellation(appointment, isWithin24Hours);
    }
});
exports.handleConfirmedCancellation = handleConfirmedCancellation;
const handleClientCancellation = (appointment, isWithin24Hours) => __awaiter(void 0, void 0, void 0, function* () {
    if (isWithin24Hours) {
        // Remboursement partiel (frais de 10€)
        yield processPartialRefund(appointment);
        const message = "Annulation effectuée : remboursement partiel (10€ de frais conservés).";
        return yield (0, appointmentService_1.updateAppointmentStatus)(appointment, types_1.AppointmentStatus.CANCELLED_BY_CLIENT, message);
    }
    else {
        // Remboursement intégral
        yield processFullRefund(appointment);
        const message = "Annulation effectuée : remboursement intégral effectué.";
        return yield (0, appointmentService_1.updateAppointmentStatus)(appointment, types_1.AppointmentStatus.CANCELLED_BY_CLIENT, message);
    }
});
const handleProCancellation = (appointment, isWithin24Hours) => __awaiter(void 0, void 0, void 0, function* () {
    if (isWithin24Hours) {
        // Annulation en attente de validation admin
        const message = "Rendez‑vous annulé par le professionnel. En attente de confirmation administrative.";
        return yield (0, appointmentService_1.updateAppointmentStatus)(appointment, types_1.AppointmentStatus.CANCELLED_BY_PRO_PENDING, message);
    }
    else {
        // Remboursement intégral au client
        yield processFullRefund(appointment);
        const message = "Rendez‑vous annulé par le professionnel : remboursement intégral effectué au client.";
        return yield (0, appointmentService_1.updateAppointmentStatus)(appointment, types_1.AppointmentStatus.CANCELLED_BY_PRO, message);
    }
});
// Utils functions
const getHoursUntilAppointment = (appointmentDateTime) => {
    const appointmentDate = appointmentDateTime.toDate();
    const now = new Date();
    const diffMs = appointmentDate.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60);
};
const processPartialRefund = (appointment) => __awaiter(void 0, void 0, void 0, function* () {
    if (!appointment.stripePaymentIntentId)
        return;
    const stripe = (0, stripe_1.getStripeClient)();
    const totalAmount = appointment.montantTotal || 0;
    const fee = 1000; // 10€ en centimes
    const refundAmount = totalAmount > fee ? totalAmount - fee : 0;
    if (refundAmount > 0) {
        yield stripe.refunds.create({
            payment_intent: appointment.stripePaymentIntentId,
            amount: refundAmount,
        });
    }
});
const processFullRefund = (appointment) => __awaiter(void 0, void 0, void 0, function* () {
    if (appointment.stripePaymentIntentId) {
        yield (0, paymentService_1.refundPayment)(appointment.stripePaymentIntentId);
    }
});
