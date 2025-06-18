import { getStripeClient } from '../config/stripe';
import Stripe from 'stripe';

// Create a payment intent
export const createPaymentIntent = async (
  amount: number,
  currency: string,
  metadata: Record<string, string | number>
): Promise<Stripe.PaymentIntent> => {
  try {
    const stripe = getStripeClient();
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      payment_method_types: ['card'],
      capture_method: 'manual', // We'll capture the payment manually when the PRO confirms
    });
    
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Capture a payment intent (when appointment is confirmed)
export const capturePaymentIntent = async (
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> => {
  try {
    const stripe = getStripeClient();
    
    // Capture the previously authorized payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    
    return paymentIntent;
  } catch (error) {
    console.error(`Error capturing payment intent ${paymentIntentId}:`, error);
    throw error;
  }
};

// Refund a payment (when appointment is cancelled)
export const refundPayment = async (
  paymentIntentId: string
): Promise<Stripe.Refund> => {
  try {
    const stripe = getStripeClient();
    
    // Get the payment intent to check its status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // If the payment intent is not captured yet, cancel it
    if (paymentIntent.status === 'requires_capture') {
      await stripe.paymentIntents.cancel(paymentIntentId);
      return {} as Stripe.Refund; // No actual refund needed
    }
    
    // If the payment is already captured, create a refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
    
    return refund;
  } catch (error) {
    console.error(`Error refunding payment ${paymentIntentId}:`, error);
    throw error;
  }
};