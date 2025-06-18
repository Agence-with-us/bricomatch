/**
 * Interface décrivant une erreur retournée par Stripe.
 */
export interface StripeError {
    code?: string;
    message: string;
    decline_code?: string;
    type?: string;
}