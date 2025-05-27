// src/helpers/paymentHelper.ts

/**
 * Helper function to calculate TVA amount (20%)
 */
export const calculateTVA = (amountWithoutTVA: number): number => {
  return Math.round(amountWithoutTVA * 0.2);
};

/**
 * Helper function to calculate platform fee (1/3 of the total excluding VAT)
 */
export const calculatePlatformFeeHorsTVA = (amountHorsTVA: number): number => {
  return Math.round(amountHorsTVA / 3);
};

/**
 * Helper function to calculate professional's share (2/3 of the total excluding VAT)
 */
export const calculateProShareHorsTVA = (amountHorsTVA: number): number => {
  return Math.round((amountHorsTVA * 2) / 3);
};

/**
 * Calcule la répartition complète d'un paiement
 */
export const calculatePaymentBreakdown = (amountHorsTVA: number) => {
  const tva = calculateTVA(amountHorsTVA);
  const platformFee = calculatePlatformFeeHorsTVA(amountHorsTVA);
  const proShare = calculateProShareHorsTVA(amountHorsTVA);
  const totalAmount = amountHorsTVA + tva;

  return {
    amountHorsTVA,
    tva,
    totalAmount,
    platformFee,
    proShare
  };
};