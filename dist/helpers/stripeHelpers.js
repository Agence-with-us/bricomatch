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
exports.createOnboardingLink = exports.createStripeConnectAccountWithValidation = exports.validateIBAN = exports.createStripeConnectAccount = void 0;
const stripe_1 = require("../config/stripe");
// Créer un compte Stripe Connect pour un professionnel
const createStripeConnectAccount = (user) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripe = (0, stripe_1.getStripeClient)();
        console.log(`🔄 Création compte Stripe pour PRO ${user.id} - ${user.email}`);
        const account = yield stripe.accounts.create({
            type: 'express',
            country: 'FR',
            email: user.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: 'individual',
            metadata: {
                userId: user.id,
                userRole: user.role,
                userName: `${user.prenom} ${user.nom}`
            }
        });
        // Si IBAN fourni, l'ajouter comme compte externe
        if (user.IBAN) {
            try {
                // Nettoyer l'IBAN
                const cleanIban = user.IBAN.replace(/\s/g, '').toUpperCase();
                // Créer un token de compte bancaire via l'API Stripe
                const bankAccountToken = yield stripe.tokens.create({
                    bank_account: {
                        country: 'FR',
                        currency: 'eur',
                        account_number: cleanIban,
                        account_holder_name: `${user.prenom} ${user.nom}`,
                        account_holder_type: 'individual'
                    }
                });
                yield stripe.accounts.createExternalAccount(account.id, {
                    external_account: bankAccountToken.id
                });
                console.log(`✅ IBAN ajouté au compte Stripe ${account.id}`);
            }
            catch (ibanError) {
                console.error(`⚠️ Erreur ajout IBAN pour ${user.id}:`, ibanError);
                // Log plus détaillé pour comprendre l'erreur
                if (ibanError.type === 'StripeInvalidRequestError') {
                    console.error(`Code d'erreur: ${ibanError.code}`);
                    console.error(`Message: ${ibanError.message}`);
                    console.error(`Paramètre: ${ibanError.param}`);
                }
                // On continue sans l'IBAN, l'utilisateur pourra l'ajouter plus tard via le dashboard Stripe
            }
        }
        return account.id;
    }
    catch (error) {
        console.error(`❌ Erreur création compte Stripe pour ${user.id}:`, error);
        throw error;
    }
});
exports.createStripeConnectAccount = createStripeConnectAccount;
// Alternative : Fonction pour valider l'IBAN avant de l'envoyer à Stripe
const validateIBAN = (iban) => {
    // Nettoyer l'IBAN (supprimer espaces et convertir en majuscules)
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    // Vérifier le format français (FR + 2 chiffres + 23 caractères)
    const frenchIbanRegex = /^FR\d{2}[A-Z0-9]{23}$/;
    if (!frenchIbanRegex.test(cleanIban)) {
        return false;
    }
    // Validation basique du check digit (algorithme mod-97)
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numericString = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());
    let remainder = 0;
    for (let i = 0; i < numericString.length; i++) {
        remainder = (remainder * 10 + parseInt(numericString[i])) % 97;
    }
    return remainder === 1;
};
exports.validateIBAN = validateIBAN;
// Version améliorée avec validation IBAN
const createStripeConnectAccountWithValidation = (user) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripe = (0, stripe_1.getStripeClient)();
        console.log(`🔄 Création compte Stripe pour PRO ${user.id} - ${user.email}`);
        const account = yield stripe.accounts.create({
            type: 'express',
            country: 'FR',
            email: user.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: 'individual',
            metadata: {
                userId: user.id,
                userRole: user.role,
                userName: `${user.prenom} ${user.nom}`
            }
        });
        // Si IBAN fourni, le valider puis l'ajouter
        if (user.IBAN) {
            const cleanIban = user.IBAN.replace(/\s/g, '').toUpperCase();
            if (!(0, exports.validateIBAN)(cleanIban)) {
                console.warn(`⚠️ IBAN invalide pour ${user.id}: ${user.IBAN}`);
                // Ne pas essayer d'ajouter un IBAN invalide
                return account.id;
            }
            try {
                const cleanIban = user.IBAN.replace(/\s/g, '').toUpperCase();
                // Créer un token de compte bancaire
                const bankAccountToken = yield stripe.tokens.create({
                    bank_account: {
                        country: 'FR',
                        currency: 'eur',
                        account_number: cleanIban,
                        account_holder_name: `${user.prenom} ${user.nom}`,
                        account_holder_type: 'individual'
                    }
                });
                yield stripe.accounts.createExternalAccount(account.id, {
                    external_account: bankAccountToken.id
                });
                console.log(`✅ IBAN validé et ajouté au compte Stripe ${account.id}`);
            }
            catch (ibanError) {
                console.error(`⚠️ Erreur ajout IBAN pour ${user.id}:`, ibanError);
                // Dans certains cas, il peut être préférable de ne pas ajouter l'IBAN
                // et laisser l'utilisateur le faire via le processus d'onboarding Stripe
                console.log(`ℹ️ L'IBAN sera configuré via le processus d'onboarding Stripe`);
            }
        }
        return account.id;
    }
    catch (error) {
        console.error(`❌ Erreur création compte Stripe pour ${user.id}:`, error);
        throw error;
    }
});
exports.createStripeConnectAccountWithValidation = createStripeConnectAccountWithValidation;
// Créer le lien d'onboarding Stripe (inchangé)
const createOnboardingLink = (stripeAccountId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripe = (0, stripe_1.getStripeClient)();
        const accountLink = yield stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.FRONTEND_URL}/stripe/refresh`,
            return_url: `${process.env.FRONTEND_URL}/stripe/success`,
            type: 'account_onboarding',
        });
        return accountLink.url;
    }
    catch (error) {
        console.error('Erreur création lien onboarding:', error);
        throw error;
    }
});
exports.createOnboardingLink = createOnboardingLink;
