"use strict";
// src/helpers/paymentHelper.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePaymentBreakdown = exports.calculateProShareHorsTVA = exports.calculatePlatformFeeHorsTVA = exports.calculateTVA = void 0;
/**
 * Helper function to calculate TVA amount (20%)
 */
const calculateTVA = (amountWithoutTVA) => {
    return Math.round(amountWithoutTVA * 0.2);
};
exports.calculateTVA = calculateTVA;
/**
 * Helper function to calculate platform fee (1/3 of the total excluding VAT)
 */
const calculatePlatformFeeHorsTVA = (amountHorsTVA) => {
    return Math.round(amountHorsTVA / 3);
};
exports.calculatePlatformFeeHorsTVA = calculatePlatformFeeHorsTVA;
/**
 * Helper function to calculate professional's share (2/3 of the total excluding VAT)
 */
const calculateProShareHorsTVA = (amountHorsTVA) => {
    return Math.round((amountHorsTVA * 2) / 3);
};
exports.calculateProShareHorsTVA = calculateProShareHorsTVA;
/**
 * Calcule la répartition complète d'un paiement
 */
const calculatePaymentBreakdown = (amountHorsTVA) => {
    const tva = (0, exports.calculateTVA)(amountHorsTVA);
    const platformFee = (0, exports.calculatePlatformFeeHorsTVA)(amountHorsTVA);
    const proShare = (0, exports.calculateProShareHorsTVA)(amountHorsTVA);
    const totalAmount = amountHorsTVA + tva;
    return {
        amountHorsTVA,
        tva,
        totalAmount,
        platformFee,
        proShare
    };
};
exports.calculatePaymentBreakdown = calculatePaymentBreakdown;
