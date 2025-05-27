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
exports.createStripeConnectAccount = void 0;
const firebase_1 = require("../config/firebase");
const stripeHelpers_1 = require("../helpers/stripeHelpers");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const ClientError_1 = require("../helpers/ClientError");
const email_1 = require("../config/email");
const emailTemplates_1 = require("../templates/emailTemplates");
const createStripeConnectAccount = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Vérifie si l'utilisateur est authentifié
        if (!req.user) {
            throw new ClientError_1.ClientError("Authentification requise", 401);
        }
        // Récupérer l'utilisateur depuis Firestore
        const userDoc = yield firebase_1.usersCollection.doc(req.user.id).get();
        if (!userDoc.exists) {
            throw new ClientError_1.ClientError("Utilisateur introuvable", 404);
        }
        const user = Object.assign({ id: userDoc.id }, userDoc.data());
        console.log(`🔄 Traitement nouveau PRO: ${user.id} - ${user.email}`);
        // Créer le compte Stripe
        const stripeAccountId = yield (0, stripeHelpers_1.createStripeConnectAccount)(user);
        // Créer le lien d'onboarding
        const onboardingUrl = yield (0, stripeHelpers_1.createOnboardingLink)(stripeAccountId);
        yield (0, email_1.sendEmail)({
            to: user.email,
            subject: "🎯 Finalisez votre inscription BricoMatch - Dernière étape !",
            html: (0, emailTemplates_1.getCompleteProfileTemplate)(user.nom, onboardingUrl)
        });
        // Mettre à jour l'utilisateur dans Firestore
        yield firebase_1.usersCollection.doc(user.id).update({
            stripeAccountId,
            stripeAccountStatus: 'pending',
            stripeOnboardingComplete: false,
            stripeProcessed: true,
            updatedAt: firebase_admin_1.default.firestore.Timestamp.now()
        });
        // Créer une notification pour informer l'utilisateur
        yield firebase_1.notificationsCollection.add({
            type: 'STRIPE_SETUP_REQUIRED',
            userId: user.id,
            title: 'Configuration des paiements',
            message: 'Votre compte professionnel a été créé. Complétez la configuration de vos paiements.',
            data: {
                onboardingUrl,
                stripeAccountId
            },
            createdAt: firebase_admin_1.default.firestore.Timestamp.now(),
            read: false,
            processed: false
        });
        console.log(`✅ Compte Stripe créé pour ${user.id}: ${stripeAccountId}`);
        console.log(`🔗 Lien onboarding: ${onboardingUrl}`);
        return res.status(201).json({
            success: true
        });
    }
    catch (error) {
        // Marquer comme traité même en cas d'erreur pour éviter les tentatives répétées
        yield firebase_1.usersCollection.doc((_a = req.user) === null || _a === void 0 ? void 0 : _a.id).update({
            stripeProcessed: true,
            stripeError: error.message,
            updatedAt: firebase_admin_1.default.firestore.Timestamp.now()
        });
        // Créer une notification d'erreur
        yield firebase_1.notificationsCollection.add({
            type: 'STRIPE_SETUP_ERROR',
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
            title: 'Erreur configuration paiements',
            message: 'Une erreur est survenue lors de la configuration de vos paiements. Contactez le support.',
            data: {
                error: error.message
            },
            createdAt: firebase_admin_1.default.firestore.Timestamp.now(),
            read: false,
            processed: false
        });
        next(error);
    }
});
exports.createStripeConnectAccount = createStripeConnectAccount;
