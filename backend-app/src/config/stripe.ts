import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

let stripe: Stripe | null = null;

export const initializeStripe = (): Stripe => {
  if (!stripe) {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
      }
      
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-08-16', // Use the latest API version
      });
      
      console.log('Stripe initialized successfully');
    } catch (error) {
      console.error('Stripe initialization error:', error);
      throw error;
    }
  }
  
  return stripe;
};

export const getStripeClient = (): Stripe => {
  if (!stripe) {
    return initializeStripe();
  }
  return stripe;
};

// Helper function to calculate TVA amount (20%)
export const calculateTVA = (amountWithoutTVA: number): number => {
  return Math.round(amountWithoutTVA * 0.2);
};

// Helper function to calculate platform fee (1/3 of the total excluding VAT)
export const calculatePlatformFeeHorsTVA = (amountHorsTVA: number): number => {
  return Math.round(amountHorsTVA / 3);
};

// Helper function to calculate professional's share (2/3 of the total excluding VAT)
export const calculateProShareHorsTVA = (amountHorsTVA: number): number => {
  return Math.round((amountHorsTVA * 2) / 3);
};