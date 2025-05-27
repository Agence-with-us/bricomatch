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
exports.refundPayment = exports.capturePaymentIntent = exports.createPaymentIntent = void 0;
const stripe_1 = require("../config/stripe");
// Create a payment intent
const createPaymentIntent = (amount, currency, metadata) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripe = (0, stripe_1.getStripeClient)();
        const paymentIntent = yield stripe.paymentIntents.create({
            amount,
            currency,
            metadata,
            payment_method_types: ['card'],
            capture_method: 'manual', // We'll capture the payment manually when the PRO confirms
        });
        return paymentIntent;
    }
    catch (error) {
        console.error('Error creating payment intent:', error);
        throw error;
    }
});
exports.createPaymentIntent = createPaymentIntent;
// Capture a payment intent (when appointment is confirmed)
const capturePaymentIntent = (paymentIntentId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripe = (0, stripe_1.getStripeClient)();
        // Capture the previously authorized payment
        const paymentIntent = yield stripe.paymentIntents.capture(paymentIntentId);
        return paymentIntent;
    }
    catch (error) {
        console.error(`Error capturing payment intent ${paymentIntentId}:`, error);
        throw error;
    }
});
exports.capturePaymentIntent = capturePaymentIntent;
// Refund a payment (when appointment is cancelled)
const refundPayment = (paymentIntentId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripe = (0, stripe_1.getStripeClient)();
        // Get the payment intent to check its status
        const paymentIntent = yield stripe.paymentIntents.retrieve(paymentIntentId);
        // If the payment intent is not captured yet, cancel it
        if (paymentIntent.status === 'requires_capture') {
            yield stripe.paymentIntents.cancel(paymentIntentId);
            return {}; // No actual refund needed
        }
        // If the payment is already captured, create a refund
        const refund = yield stripe.refunds.create({
            payment_intent: paymentIntentId,
        });
        return refund;
    }
    catch (error) {
        console.error(`Error refunding payment ${paymentIntentId}:`, error);
        throw error;
    }
});
exports.refundPayment = refundPayment;
