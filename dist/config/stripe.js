"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateProShareHorsTVA = exports.calculatePlatformFeeHorsTVA = exports.calculateTVA = exports.getStripeClient = exports.initializeStripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let stripe = null;
const initializeStripe = () => {
    if (!stripe) {
        try {
            if (!process.env.STRIPE_SECRET_KEY) {
                throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
            }
            stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
                apiVersion: '2023-08-16', // Use the latest API version
            });
            console.log('Stripe initialized successfully');
        }
        catch (error) {
            console.error('Stripe initialization error:', error);
            throw error;
        }
    }
    return stripe;
};
exports.initializeStripe = initializeStripe;
const getStripeClient = () => {
    if (!stripe) {
        return (0, exports.initializeStripe)();
    }
    return stripe;
};
exports.getStripeClient = getStripeClient;
// Helper function to calculate TVA amount (20%)
const calculateTVA = (amountWithoutTVA) => {
    return Math.round(amountWithoutTVA * 0.2);
};
exports.calculateTVA = calculateTVA;
// Helper function to calculate platform fee (1/3 of the total excluding VAT)
const calculatePlatformFeeHorsTVA = (amountHorsTVA) => {
    return Math.round(amountHorsTVA / 3);
};
exports.calculatePlatformFeeHorsTVA = calculatePlatformFeeHorsTVA;
// Helper function to calculate professional's share (2/3 of the total excluding VAT)
const calculateProShareHorsTVA = (amountHorsTVA) => {
    return Math.round((amountHorsTVA * 2) / 3);
};
exports.calculateProShareHorsTVA = calculateProShareHorsTVA;
