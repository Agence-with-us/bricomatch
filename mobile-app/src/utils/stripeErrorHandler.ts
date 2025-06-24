import { StripeError } from "../types/StripeError";
import { showToast } from "./toastNotification";


/**
 * Retourne un message d'erreur convivial en fonction du code d'erreur Stripe.
 * @param error L'erreur Stripe
 * @returns Le message adapté à l'affichage
 */
export function getStripeErrorMessage(error: StripeError): string {
    let stripeError
    if (!error) {
        stripeError = "Une erreur inconnue est survenue.";
    }
    switch (error.code) {
        case 'card_declined':
            stripeError = "Votre carte a été refusée. Veuillez vérifier vos informations ou utiliser une autre carte.";
        case 'expired_card':
            stripeError = "Votre carte a expiré. Veuillez utiliser une carte valide.";
        case 'incorrect_cvc':
            stripeError = "Le code de sécurité (CVC) est incorrect.";
        case 'processing_error':
            stripeError = "Une erreur de traitement est survenue lors du paiement. Veuillez réessayer.";
        case 'authentication_required':
            stripeError = "Votre carte nécessite une authentification supplémentaire. Veuillez suivre les instructions de votre banque.";
        case 'invalid_request_error':
            stripeError = "La demande de paiement est invalide. Veuillez vérifier vos informations et réessayer.";
        case 'api_error':
            stripeError = "Une erreur interne de Stripe est survenue. Veuillez réessayer plus tard.";
        case 'api_connection_error':
            stripeError = "Un problème de connexion à Stripe est survenu. Veuillez vérifier votre connexion internet.";
        // Vous pouvez ajouter d'autres cas spécifiques selon les codes d'erreur rencontrés.
        default:
            stripeError = error.message || "Une erreur inconnue est survenue lors du paiement.";
    }
    showToast("Erreur lors du paiement", stripeError, "error")
    return stripeError
}
