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
exports.evaluerAppointment = exports.autoriserPaiementAppointment = exports.cancelAppointment = exports.confirmAppointment = exports.createAppointment = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const appointmentService_1 = require("../services/appointmentService");
const types_1 = require("../types");
const paymentService_1 = require("../services/paymentService");
const userService_1 = require("../services/userService");
const invoiceService_1 = require("../services/invoiceService");
const ClientError_1 = require("../helpers/ClientError");
const chatService_1 = require("../services/chatService");
// Create a new appointment and initialize payment
const createAppointment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { proId, dateTime, duration, timeSlot } = req.body;
        // Vérifie si l'utilisateur est authentifié
        if (!req.user) {
            throw new ClientError_1.ClientError("Authentification requise", 401);
        }
        // Vérifie que seul un utilisateur de type CLIENT (PARTICULIER) peut créer un rendez-vous
        if (req.user.role !== types_1.UserRole.PARTICULIER) {
            throw new ClientError_1.ClientError("Seuls les clients (PARTICULIER) peuvent créer des rendez-vous", 403);
        }
        // Vérification de la durée du rendez-vous
        if (duration !== 30 && duration !== 60) {
            throw new ClientError_1.ClientError("La durée doit être soit de 30 minutes, soit de 60 minutes", 400);
        }
        // Récupérer les données du professionnel
        const pro = yield (0, userService_1.getUserById)(proId);
        if (!pro || pro.role !== types_1.UserRole.PRO) {
            throw new ClientError_1.ClientError("Professionnel non trouvé", 404);
        }
        // On crée la date complète en combinant la date et le timeSlot
        const fullDate = new Date(dateTime); // Par exemple, "2025-06-07"
        const [hours, minutes] = timeSlot.split(':').map(Number); // Par exemple, "09:00"
        fullDate.setHours(hours, minutes, 0, 0);
        // Calculer le montant de base et le montant total avec TVA
        const baseAmount = duration * 100; // Montant hors TVA
        const vatAmount = Math.round(baseAmount * 0.2); // TVA à 20%
        const totalAmount = baseAmount + vatAmount; // Montant total
        // Créer l'intention de paiement via Stripe
        const paymentIntent = yield (0, paymentService_1.createPaymentIntent)(totalAmount, 'eur', {
            appointmentDuration: duration,
            clientId: req.user.id,
            proId: proId
        });
        if (!paymentIntent || !paymentIntent.id) {
            throw new ClientError_1.ClientError("La création du paiement a échoué", 500);
        }
        // Création du rendez-vous avec le statut PAYMENT_INITIATED
        const appointmentData = {
            proId,
            clientId: req.user.id,
            dateTime: firebase_admin_1.default.firestore.Timestamp.fromDate(fullDate),
            duration,
            timeSlot, // On conserve éventuellement le timeSlot si besoin
            status: types_1.AppointmentStatus.PAYMENT_INITIATED,
            // Stocker le montant total et le montant hors TVA
            montantTotal: totalAmount,
            montantHT: baseAmount,
            stripePaymentIntentId: paymentIntent.id
        };
        const appointment = yield (0, appointmentService_1.createAppointment)(appointmentData);
        return res.status(201).json({
            success: true,
            data: {
                appointment,
                clientSecret: paymentIntent.client_secret
            }
        });
    }
    catch (error) {
        // Transmet l'erreur au middleware de gestion des erreurs de l'application
        next(error);
    }
});
exports.createAppointment = createAppointment;
/**
 * Contrôleur pour confirmer un rendez-vous et traiter le paiement (réservé aux professionnels, PRO).
 */
const confirmAppointment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Vérification de l'authentification
        if (!req.user) {
            throw new ClientError_1.ClientError("L'authentification est requise", 401);
        }
        // Seul un professionnel (PRO) peut confirmer un rendez-vous
        if (req.user.role !== types_1.UserRole.PRO) {
            throw new ClientError_1.ClientError("Seuls les professionnels (PRO) peuvent confirmer les rendez-vous", 403);
        }
        // Récupérer le rendez-vous et vérifier que le pro en est bien le propriétaire
        const appointment = yield (0, appointmentService_1.confirmAppointment)(id, req.user.id);
        if (!appointment) {
            throw new ClientError_1.ClientError("Rendez-vous introuvable ou déjà confirmé", 404);
        }
        // Générer des factures pour le client et pour le professionnel
        const clientInvoice = yield (0, invoiceService_1.generateInvoice)(appointment, types_1.UserRole.PARTICULIER);
        const proInvoice = yield (0, invoiceService_1.generateInvoice)(appointment, types_1.UserRole.PRO);
        // Créer ou activer la discussion entre le PRO et le client
        let chatId = null;
        try {
            chatId = yield (0, chatService_1.createOrActivateChat)(req.user.id, // ID du PRO
            appointment.clientId, // ID du client
            appointment.id // ID du rendez-vous
            );
        }
        catch (chatError) {
            console.error('Erreur lors de la création/activation du chat:', chatError);
            // Ne pas faire échouer la confirmation si le chat échoue
        }
        return res.status(200).json({
            success: true,
            data: {
                appointment,
                clientInvoice,
                proInvoice
            },
            message: "Rendez-vous confirmé et paiement traité"
        });
    }
    catch (error) {
        next(error);
    }
});
exports.confirmAppointment = confirmAppointment;
// Cancel appointment and refund payment (PRO only)
const cancelAppointment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        // Vérification de l'authentification
        if (!req.user) {
            throw new ClientError_1.ClientError("L'authentification est requise", 401);
        }
        const updatedAppointment = yield (0, appointmentService_1.cancelAppointmentAdvancedService)(id, req.user.id, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
        return res.status(200).json({
            success: true,
            updatedAppointment,
            message: "Rendez‑vous annulé avec succès"
        });
    }
    catch (error) {
        next(error);
    }
});
exports.cancelAppointment = cancelAppointment;
/**
 * Contrôleur pour autoriser le paiement d'un rendez-vous.
 * Seuls les PARTICULIERS (clients) peuvent effectuer cette opération.
 */
const autoriserPaiementAppointment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Seuls les PARTICULIERS ont le droit d'autoriser le paiement
        if (req.user.role !== types_1.UserRole.PARTICULIER) {
            throw new ClientError_1.ClientError("Seuls les utilisateurs particuliers peuvent autoriser le paiement", 403);
        }
        // Appel du service pour mettre à jour le statut de paiement
        const appointment = yield (0, appointmentService_1.autoriserPaiementAppointmentService)(id, req.user.id);
        if (!appointment) {
            throw new ClientError_1.ClientError("Rendez-vous non trouvé ou pas éligible à l'autorisation de paiement", 404);
        }
        return res.status(200).json({
            success: true,
            data: appointment,
            message: "Le paiement a été autorisé"
        });
    }
    catch (error) {
        next(error);
    }
});
exports.autoriserPaiementAppointment = autoriserPaiementAppointment;
/**
 * Contrôleur pour évaluer un rendez-vous.
 * Le client envoie l'id du rendez-vous, l'id du professionnel et une note (rating sur 5).
 */
const evaluerAppointment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { appointmentId, proId, rating } = req.body;
        // Vérifier que l'utilisateur est authentifié
        if (!req.user) {
            throw new ClientError_1.ClientError("L'authentification est requise", 401);
        }
        // Seul un client (PARTICULIER) peut évaluer un rendez-vous
        if (req.user.role !== types_1.UserRole.PARTICULIER) {
            throw new ClientError_1.ClientError("Seul un client peut évaluer un rendez-vous", 403);
        }
        // Déléguer la logique métier au service
        const evaluationResult = yield (0, appointmentService_1.evaluerAppointmentService)(appointmentId, proId, req.user.id, Number(rating));
        return res.status(200).json({
            success: true,
            data: evaluationResult,
            message: "Évaluation enregistrée avec succès"
        });
    }
    catch (error) {
        next(error);
    }
});
exports.evaluerAppointment = evaluerAppointment;
