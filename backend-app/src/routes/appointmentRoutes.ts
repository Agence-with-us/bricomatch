import express from 'express';
import {
  createAppointment,
  confirmAppointment,
  cancelAppointment,
  autoriserPaiementAppointment,
  evaluerAppointment
} from '../controllers/appointmentController';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { UserRole } from '../types';

const router = express.Router();

// Create a new appointment (client only)
router.post(
  '/',
  authenticate,
  authorizeRoles(UserRole.PARTICULIER),
  createAppointment
);

// Confirm an appointment (pro only)
router.patch(
  '/:id/confirm',
  authenticate,
  authorizeRoles(UserRole.PRO),
  confirmAppointment
);

router.patch(
  '/:id/payment/authorize',
  authenticate,
  authorizeRoles(UserRole.PARTICULIER),
  autoriserPaiementAppointment
);

// Cancel an appointment (pro only)
router.patch(
  '/:id/cancel',
  authenticate,
  cancelAppointment
);

// Évaluer un rendez-vous (client uniquement)
// Le client envoie dans le corps : appointmentId, proId et rating
router.post(
  '/evaluation',
  authenticate,
  authorizeRoles(UserRole.PARTICULIER),
  evaluerAppointment
);

export default router;